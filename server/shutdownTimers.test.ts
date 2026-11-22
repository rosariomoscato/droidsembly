// An initialized office must stop starting maintenance work as soon as shutdown begins.
import fs from 'node:fs/promises';
import { afterEach, expect, it, vi } from 'vitest';
import { createDemoBackend } from './demo.ts';
import { Swarm } from './swarm.ts';

const { home } = vi.hoisted(() => ({ home: `${process.env.SWARM_HOME}/shutdown-timers-${process.pid}` }));
vi.mock('./config.ts', async (original) => ({
  ...await original<typeof import('./config.ts')>(),
  HOME_DIR: home, STATE_FILE: `${home}/state.json`, WORKSPACE_ROOT: `${home}/workspaces`,
  QA_SHOTS_DIR: `${home}/qa`,
}));

afterEach(async () => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  await fs.rm(home, { recursive: true, force: true, maxRetries: 5 });
});

it.each([0, 60_000])('stops maintenance timers during and after shutdown at %i ms', async (runningMs) => {
  vi.useFakeTimers();
  const backend = createDemoBackend();
  vi.spyOn(backend, 'listMyRepos').mockResolvedValue([]);
  const office = new Swarm(backend);
  const runtime = office as unknown as {
    writeState(): Promise<void>;
    schedule(): void;
    greet(): void;
    emitOps(): void;
    notifyStuck(): void;
    watchdogTick(): void;
    trimIdleDesks(): Promise<void>;
    sweepMachines(): Promise<void>;
    backgroundTimeout(run: () => void, ms: number): void;
    backgroundIntervals: Set<NodeJS.Timeout>;
    backgroundTimeouts: Set<NodeJS.Timeout>;
  };
  for (const method of ['schedule', 'greet', 'emitOps', 'notifyStuck', 'watchdogTick'] as const) {
    vi.spyOn(runtime, method).mockImplementation(() => undefined);
  }
  for (const method of ['writeState', 'trimIdleDesks', 'sweepMachines'] as const) {
    vi.spyOn(runtime, method).mockResolvedValue(undefined);
  }
  vi.spyOn(office.voice, 'init').mockResolvedValue(undefined);
  vi.spyOn(office.weather, 'init').mockResolvedValue(undefined);
  vi.spyOn(office.notifier, 'init').mockResolvedValue(undefined);
  vi.spyOn(office.cloud, 'init').mockResolvedValue(undefined);
  vi.spyOn(office.journal, 'start').mockResolvedValue(undefined);
  vi.spyOn(office.journal, 'hasPastDays').mockResolvedValue(true);
  const prune = vi.spyOn(office.voice, 'prune').mockResolvedValue({ clips: 0, bytes: 0, saved: [] });
  vi.spyOn(office.journal, 'prune').mockResolvedValue(0);
  let unblock!: () => void;
  const gate = new Promise<void>(resolve => { unblock = resolve; });
  vi.spyOn(backend, 'releaseClis').mockImplementation(() => gate);
  let closing: Promise<void> | undefined;
  try {
    await office.init();
    await vi.advanceTimersByTimeAsync(runningMs);
    expect(prune).toHaveBeenCalledTimes(runningMs / 60_000);
    prune.mockClear();
    vi.mocked(runtime.greet).mockClear();
    const delayed = vi.fn();
    runtime.backgroundTimeout(delayed, 1500);
    closing = office.shutdown();
    expect(runtime.backgroundIntervals.size).toBe(0);
    expect(runtime.backgroundTimeouts.size).toBe(0);
    // A stale async callback cannot register fresh maintenance after the barrier.
    runtime.backgroundTimeout(delayed, 1500);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(delayed).not.toHaveBeenCalled();
    expect(prune).not.toHaveBeenCalled();
    expect(runtime.greet).not.toHaveBeenCalled();
    unblock();
    await closing;
    await vi.advanceTimersByTimeAsync(60_000);
    expect(prune).not.toHaveBeenCalled();
    expect(runtime.greet).not.toHaveBeenCalled();
  } finally {
    unblock();
    await (closing ?? office.shutdown());
  }
});
