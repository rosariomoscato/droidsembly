import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, it, vi } from 'vitest';
import { AgentTerminal } from '../server/terminal.ts';

it('exposes parser work scheduled by a queued save after the current-parser barrier', async () => {
  const home = await fs.mkdtemp(path.join(os.tmpdir(), 'droidsembly-parser-queue-'));
  const file = path.join(home, 'terminal.txt');
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
  const terminal = new AgentTerminal();
  let release!: () => void;
  const gate = new Promise<void>(done => { release = done; });
  const rename = fs.rename.bind(fs);
  let entered = false;
  vi.spyOn(fs, 'rename').mockImplementationOnce(async (...args) => {
    entered = true;
    await gate;
    return rename(...args);
  });
  const first = terminal.save(file);
  const second = terminal.save(file);
  const settled = Promise.allSettled([first, second]);
  let drained = false;
  void settled.then(() => { drained = true; });
  try {
    await vi.waitFor(() => expect(entered).toBe(true), { interval: 1 });
    let parsed = false;
    const barrier = terminal.flush().then(() => { parsed = true; });
    await vi.waitFor(() => expect(parsed).toBe(true), { interval: 1 });
    await barrier;
    expect(vi.getTimerCount()).toBe(0);
    release();
    await first;
    await Promise.resolve();
    // The old teardown would now discard this newly scheduled parser callback.
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    expect(drained).toBe(false);
  } finally {
    release();
    // Never strand a write, even if the diagnostic assertion fails.
    await vi.waitFor(() => expect(drained).toBe(true), { interval: 1 });
    const results = await settled;
    vi.restoreAllMocks();
    terminal.dispose();
    vi.clearAllTimers();
    vi.useRealTimers();
    await fs.rm(home, { recursive: true, force: true, maxRetries: 3 });
    expect(results.map(result => result.status)).toEqual(['fulfilled', 'fulfilled']);
  }
});
