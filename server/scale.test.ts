import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it, vi } from 'vitest';
import type { WebSocket } from 'ws';
import type { ServerEvent } from '../shared/types.ts';
import { closeOfficeFixture } from '../scripts/officeFixture.ts';
import type { AgentTerminal } from './terminal.ts';

// A whole office writes its state, secrets and voice cache: a folder of its own, so other tests' files are left alone.
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'cubefarm-scale-'));
process.env.SWARM_HOME = home;
const { createDemoBackend } = await import('./demo.ts');
const { Swarm } = await import('./swarm.ts');
let office: InstanceType<typeof Swarm> | undefined;

// The scale budget (#228): the demo's big company, 10 floors of 15 busy people, run for a few minutes of fake time,
// must fit the snapshot a tab loads and the traffic one tab gets into budgets, so a change that makes either grow with
// the company (terminal lines in the snapshot, every agent change sent in full) fails here, not in someone's office.

const SNAPSHOT_BUDGET = 600_000; // bytes; it was 2 MB and growing with every log line before #228
const TRAFFIC_BUDGET = 80_000; // bytes per second to a tab on one floor with the workers list out; 124 KB/s before

afterAll(async () => {
  // The gameplay logger is quiet during measurement, not during persistence
  // cleanup. Surface write failures and retain the fixture if closing fails.
  vi.restoreAllMocks();
  // A timed-out hook may never reach finally. Emit each boundary as it occurs
  // so CI identifies the unfinished phase, without wrapping runtime methods.
  const started = performance.now();
  const terminalQueues = { observed: 0, settled: 0 };
  const trace = (phase: string) => console.info('scale teardown', { phase, elapsedMs: performance.now() - started, terminalQueues: { ...terminalQueues } });
  const timed = async (phase: string, work: () => Promise<void>) => {
    trace(`${phase}-begin`);
    try { await work(); }
    finally { trace(`${phase}-settled`); }
  };
  // Diagnostic only: observe existing queued saves and pass through every
  // shutdown call/argument/result/error. No queue or clock algorithm changes.
  if (office) {
    const runtime = office as unknown as {
      agentRt: Map<string, { terminal?: { saving: Promise<void> } }>;
      writeState(): Promise<void>;
      saveTerminals(all?: boolean): Promise<void>;
      backend: { releaseClis(restart: boolean): Promise<void> };
      previews: { stopAll(repos: unknown): Promise<void> };
    };
    for (const rt of runtime.agentRt.values()) if (rt.terminal) {
      terminalQueues.observed++;
      void rt.terminal.saving.then(() => { terminalQueues.settled++; }, () => { terminalQueues.settled++; });
    }
    const writeState = runtime.writeState.bind(runtime);
    vi.spyOn(runtime, 'writeState').mockImplementation(() => timed('state', writeState));
    const closeJournal = office.journal.close.bind(office.journal);
    vi.spyOn(office.journal, 'close').mockImplementation(() => timed('journal', closeJournal));
    const releaseClis = runtime.backend.releaseClis.bind(runtime.backend);
    vi.spyOn(runtime.backend, 'releaseClis').mockImplementation(restart => timed('clis', () => releaseClis(restart)));
    const saveTerminals = runtime.saveTerminals.bind(runtime);
    vi.spyOn(runtime, 'saveTerminals').mockImplementation(all => timed('terminals', () => saveTerminals(all)));
    const stopPreviews = runtime.previews.stopAll.bind(runtime.previews);
    vi.spyOn(runtime.previews, 'stopAll').mockImplementation(repos => timed('previews', () => stopPreviews(repos)));
  }
  trace('parser-drain-begin');
  const warnings: string[] = [];
  const warn = console.warn.bind(console);
  vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
    warnings.push(args.map(String).join(' '));
    warn(...args);
  });
  const remove = () => {
    trace('shutdown-complete');
    expect(warnings.filter(line => /could not (save the state|write the journal|save a terminal)/.test(line))).toEqual([]);
    trace('remove-begin');
    fs.rmSync(home, { recursive: true, force: true, maxRetries: 5 });
    trace('remove-complete');
  };
  try {
    // Measurement is over. Do not discard xterm's yielded parser continuations:
    // request a flush of every current terminal and tick until callbacks finish.
    // This advances fake time only during teardown, under a new 5s bound and
    // the unchanged 10s hook limit, not during the measured workload.
    if (office) {
      const runtime = office as unknown as { agentRt: Map<string, { terminal?: AgentTerminal }> };
      let parsed = false;
      const pending = Promise.all([...runtime.agentRt.values()].flatMap(rt => rt.terminal ? [rt.terminal.flush()] : []));
      void pending.then(() => { parsed = true; }, () => { parsed = true; });
      await vi.waitFor(() => expect(parsed).toBe(true), { timeout: 5_000, interval: 1 });
      await pending; // Preserve parser failures, not just the settled condition.
    }
    trace('parser-drain-complete');
    trace('shutdown-begin');
    if (office) await closeOfficeFixture(office, remove, async (shutdown) => {
      let settled = false;
      void shutdown.then(() => { settled = true; }, () => { settled = true; });
      // Saves queued behind filesystem I/O can schedule more parser work after
      // the first barrier. Service it until shutdown finishes, within the same
      // overall 10s hook budget; never discard a parser's pending callback.
      await vi.waitFor(() => expect(settled).toBe(true), { timeout: Math.max(1, 10_000 - (performance.now() - started)), interval: 1 });
      await shutdown;
      vi.clearAllTimers();
      vi.useRealTimers();
    });
    else {
      vi.clearAllTimers();
      vi.useRealTimers();
      remove();
    }
  } finally {
    if (vi.isFakeTimers()) vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
    trace('hook-settled');
  }
});

describe('a big company', () => {
  it('fits the snapshot and websocket budgets', { timeout: 120_000 }, async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
    for (const m of ['log', 'warn', 'info'] as const) vi.spyOn(console, m).mockImplementation(() => undefined);
    const swarm = office = new Swarm(createDemoBackend({ floors: 10, agents: 15 }));
    const init = swarm.init();
    await vi.advanceTimersByTimeAsync(5_000);
    await init;
    await vi.advanceTimersByTimeAsync(2 * 60_000); // everyone at work, PRs opened, tested and merged

    const sent: string[] = [];
    const listeners: Record<string, (data: unknown) => void> = {};
    const tab = { OPEN: 1, readyState: 1, send: (m: string) => sent.push(m), on: (ev: string, fn: (data: unknown) => void) => void (listeners[ev] = fn) };
    swarm.addClient(tab as unknown as WebSocket);
    listeners.message?.(JSON.stringify({ type: 'lines', floor: 1, agents: [], workers: true }));
    const snapshot = JSON.parse(sent[0]) as Extract<ServerEvent, { type: 'snapshot' }>;
    expect(snapshot.data.agents).toHaveLength(151);
    expect(snapshot.data.agents.filter((a) => a.status === 'working').length).toBeGreaterThan(60);
    expect(snapshot.data.agents.every((a) => a.log.length === 0)).toBe(true);
    expect(sent[0].length).toBeLessThan(SNAPSHOT_BUDGET);

    sent.length = 0;
    await vi.advanceTimersByTimeAsync(60_000);
    const bytes = sent.reduce((n, m) => n + Buffer.byteLength(m), 0);
    expect(bytes / 60).toBeLessThan(TRAFFIC_BUDGET);
    // only floor 1's terminal lines came, and agent changes came in batches
    const types = sent.map((m) => JSON.parse(m) as ServerEvent);
    const floorOf = new Map(snapshot.data.agents.map((a) => [a.id, snapshot.data.repos.find((r) => r.id === a.repoId)?.floor ?? 0]));
    const lineFloors = new Set(types.flatMap((e) => (e.type === 'logs' ? Object.keys(e.tails).map((id) => floorOf.get(id)) : [])));
    expect([...lineFloors]).toEqual([1]);
    expect(types.filter((e) => e.type === 'agent').length).toBe(0);
    expect(types.filter((e) => e.type === 'agents').length).toBeLessThanOrEqual(4 * 60 + 1);
  });
});
