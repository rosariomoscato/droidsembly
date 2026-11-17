import fs from 'node:fs/promises';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { askedFor, ceoJobPrompt, ceoSystemPrompt, NOT_ASKED } from './ceo.ts';
import { createDemoBackend } from './demo.ts';
import { Swarm } from './swarm.ts';
import type { Backend } from './backend.ts';
import { fixtureOffice } from '../scripts/fixtureOffice.ts';

const { home } = vi.hoisted(() => ({ home: `${process.env.SWARM_HOME}/ceo-asks-${process.pid}` }));
vi.mock('./config.ts', async (original) => ({
  ...await original<typeof import('./config.ts')>(),
  HOME_DIR: home, STATE_FILE: `${home}/state.json`, WORKSPACE_ROOT: `${home}/workspaces`,
}));

// Only the manager decides on new work: the CEO files issues only in a job the manager started by asking for work
// (a plan from their brief, or their message), never in its own reviews, onboarding or triage.
type Internals = {
  ensureCeo(interrupted: unknown[]): void;
  fileIssue(x: { floor: number; title: string; body: string }): Promise<string>;
  ceoAsked: boolean;
  state: { ceo: { queue: { kind: string; repoId?: string }[] } };
};

let active: ReturnType<typeof fixtureOffice> | undefined;
let openingTail: Promise<void> = Promise.resolve();
let cleanupFailure: unknown;
let retained = 0;
afterEach(async (context) => {
  // A timed-out body may still be opening an office or filing an issue. Never
  // remove its home or restore tracking spies until all owned work has settled.
  try {
    await openingTail;
    await active?.close();
    if (context.task.result?.state === 'fail') {
      // A later test must not overwrite evidence from a failed but quiescent office.
      await fs.rename(home, `${home}-failed-${Date.now()}-${++retained}`).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== 'ENOENT') throw error;
      });
    } else await fs.rm(home, { recursive: true, force: true, maxRetries: 5 });
    active = undefined;
    openingTail = Promise.resolve();
    vi.restoreAllMocks();
  } catch (error) {
    cleanupFailure = error; // Retain the home and refuse all later profile reuse.
    throw error;
  }
});

function office(mission?: string, configure?: (backend: Backend) => void) {
  // Serialize profile reuse too: even two opens requested concurrently must not
  // construct separate writers for the same state.json.tmp.
  const opening = openingTail.then(async () => {
    if (cleanupFailure) throw cleanupFailure;
    await active?.close();
    const backend = createDemoBackend();
    configure?.(backend);
    const swarm = new Swarm(backend);
    const owner = fixtureOffice(() => swarm.shutdown());
    active = owner; // Register before any initialization can outlive the test.
    const runtime = swarm as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>;
    for (const method of ['cloneRepo', 'syncRepo', 'sweepFloor', 'syncFolder', 'advanceMerges', 'lookUpIssueAges', 'runCeoJob', 'journalSample']) {
      const original = runtime[method].bind(swarm);
      vi.spyOn(runtime, method).mockImplementation((...args) => owner.background(original(...args)));
    }
    const previews = (swarm as unknown as { previews: { refreshDefault: (...args: unknown[]) => Promise<unknown> } }).previews;
    const refresh = previews.refreshDefault.bind(previews);
    vi.spyOn(previews, 'refreshDefault').mockImplementation((...args) => owner.background(refresh(...args)));
    const fileIssue = runtime.fileIssue.bind(swarm);
    vi.spyOn(runtime, 'fileIssue').mockImplementation((...args) => owner.track(fileIssue(...args)));
    const initialized = (async () => {
      await swarm.connectRepo('demo-co/pixel-todo', { mission });
      const internals = swarm as unknown as Internals;
      internals.ensureCeo([]);
      return { swarm, internals, close: () => owner.close(), drain: () => owner.drain() };
    })();
    return owner.track(initialized);
  });
  // The body still receives the original failure; teardown needs its settlement.
  openingTail = opening.then(() => undefined, () => undefined);
  return opening;
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

describe('who asks for new work', () => {
  it("is the manager: their plans and messages, not the CEO's own jobs", () => {
    expect(askedFor({ kind: 'plan' })).toBe(true);
    expect(askedFor({ kind: 'chat' })).toBe(true);
    for (const kind of ['review', 'onboard', 'triage'] as const) expect(askedFor({ kind })).toBe(false);
  });

  it('is in the prompts: reviews and onboarding suggest work instead of filing it', () => {
    const system = ceoSystemPrompt({ name: 'Luna', company: 'Acme', manager: 'Sam', notesFile: 'notes.md', sessionLimit: 0, maxAgents: 10, scaling: 'approve' });
    expect(system).toContain('Never decide on new work yourself.');
    const review = ceoJobPrompt({ kind: 'review', at: 0 }, null);
    expect(review).not.toContain('plan the next milestone');
    expect(review).toContain('file no issues');
    const floor = { floor: 2, fullName: 'acme/app', clone: '/clones/app', mission: 'Add voice messages', backlog: 0 };
    const onboard = ceoJobPrompt({ kind: 'onboard', repoId: 'r1', at: 0 }, floor);
    expect(onboard).toContain('File no issues');
    expect(onboard).not.toContain('plan the first milestone');
    expect(ceoJobPrompt({ kind: 'onboard', repoId: 'r1', at: 0 }, { ...floor, mission: '', backlog: 3 })).toContain('file no new ones');
  });
});

describe("the CEO's file_issue", () => {
  it("is refused in a job the manager didn't ask for", async () => {
    const { internals } = await office();
    internals.ceoAsked = false;
    await expect(internals.fileIssue({ floor: 1, title: 'Add a dark mode', body: 'Nobody asked.' })).rejects.toThrow(NOT_ASKED);
  });

  it('files work the manager asked for', async () => {
    const { internals } = await office();
    internals.ceoAsked = true;
    await expect(internals.fileIssue({ floor: 1, title: 'Add a dark mode', body: 'The manager asked.' })).resolves.toMatch(/^Filed #\d+ on floor 1: Add a dark mode\.$/);
  });

  it('plans a brief given when the project moves in, as a job of its own after onboarding', async () => {
    expect((await office('A cozy island bakery')).internals.state.ceo.queue.map((j) => j.kind)).toEqual(['onboard', 'plan']);
    expect((await office()).internals.state.ceo.queue.map((j) => j.kind)).toEqual(['onboard']);
  });
});

describe('CEO ask fixture ownership', () => {
  it('holds profile reuse until an in-flight initialization has settled and shut down', async () => {
    const held = deferred(), entered = deferred();
    const opening = office(undefined, (backend) => {
      const meta = backend.repoMeta;
      backend.repoMeta = async (...args) => { entered.resolve(); await held.promise; return meta(...args); };
    });
    await entered.promise;
    let replacementConstructed = false;
    const replacement = office(undefined, () => { replacementConstructed = true; });
    try {
      await Promise.resolve(); await Promise.resolve();
      expect(replacementConstructed).toBe(false);
    } finally { held.resolve(); }
    const first = await opening;
    await replacement;
    expect(replacementConstructed).toBe(true);
    await expect(first.close()).resolves.toBeUndefined();
  });

  it('drains a delayed clone and its nested sweep before constructing the next office', async () => {
    const clone = deferred(), sweep = deferred(), sweepEntered = deferred();
    await fs.mkdir(home, { recursive: true });
    await fs.writeFile(`${home}/held-marker`, 'retained while work is pending');
    const first = await office(undefined, (backend) => {
      const ensureClone = backend.ensureClone, sweepDesks = backend.sweepDesks;
      backend.ensureClone = async (...args) => { await clone.promise; return ensureClone(...args); };
      backend.sweepDesks = async (...args) => { sweepEntered.resolve(); await sweep.promise; return sweepDesks(...args); };
    });
    const shutdown = vi.spyOn(first.swarm, 'shutdown');
    let replacementConstructed = false;
    const replacement = office(undefined, () => { replacementConstructed = true; });
    try {
      await Promise.resolve(); await Promise.resolve();
      expect(replacementConstructed).toBe(false);
      clone.resolve(); await sweepEntered.promise;
      expect(replacementConstructed).toBe(false);
      expect(shutdown).not.toHaveBeenCalled();
      expect(await fs.readFile(`${home}/held-marker`, 'utf8')).toBe('retained while work is pending');
    } finally { clone.resolve(); sweep.resolve(); }
    await replacement;
    expect(shutdown).toHaveBeenCalledOnce();
    expect(replacementConstructed).toBe(true);
  });

  it('waits for an in-flight real demo issue operation before reusing its profile', async () => {
    const held = deferred(), entered = deferred();
    const first = await office(undefined, (backend) => {
      const createIssue = backend.createIssue;
      backend.createIssue = async (...args) => { entered.resolve(); await held.promise; return createIssue(...args); };
    });
    await first.drain();
    const shutdown = vi.spyOn(first.swarm, 'shutdown');
    first.internals.ceoAsked = true;
    const filed = first.internals.fileIssue({ floor: 1, title: 'Keep real demo persistence', body: 'Synthetic fixture work.' });
    await entered.promise;
    let replacementConstructed = false;
    const replacement = office(undefined, () => { replacementConstructed = true; });
    try {
      await Promise.resolve(); await Promise.resolve();
      expect(replacementConstructed).toBe(false);
      expect(shutdown).not.toHaveBeenCalled();
    } finally { held.resolve(); }
    await expect(filed).resolves.toMatch(/^Filed #\d+ on floor 1: Keep real demo persistence\.$/);
    await replacement;
    const numbers = JSON.parse(await fs.readFile(`${home}/demo-github.json`, 'utf8')) as Record<string, number>;
    expect(numbers['demo-co/pixel-todo']).toBeGreaterThan(0);
    const state = JSON.parse(await fs.readFile(`${home}/state.json`, 'utf8')) as { repos: { fullName: string }[] };
    expect(state.repos.some((repo) => repo.fullName === 'demo-co/pixel-todo')).toBe(true);
    expect(replacementConstructed).toBe(true);
    expect(shutdown).toHaveBeenCalledOnce();
  });
});
