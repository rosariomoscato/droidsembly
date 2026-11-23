// Periodic state persistence must not queue full snapshots faster than disk can write.
import { afterEach, expect, it, vi } from 'vitest';
import { Swarm } from './swarm.ts';
import { createDemoBackend } from './demo.ts';

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it.each([false, true])('coalesces changes during a pending write (failure: %s)', async (fails) => {
  vi.useFakeTimers();
  const office = new Swarm(createDemoBackend()) as unknown as {
    save(): void;
    writeState(): Promise<void>;
    saveTimer: NodeJS.Timeout | null;
  };
  const failure = new Error('synthetic slow disk failure');
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  let release!: () => void;
  const pending = new Promise<void>((resolve, reject) => {
    release = () => fails ? reject(failure) : resolve();
  });
  const write = vi.spyOn(office, 'writeState').mockImplementationOnce(() => {
    office.saveTimer = null;
    return pending;
  }).mockImplementation(async () => { office.saveTimer = null; });
  try {
    office.save();
    await vi.advanceTimersByTimeAsync(1500);
    expect(write).toHaveBeenCalledTimes(1);
    for (let i = 0; i < 10; i++) {
      office.save();
      await vi.advanceTimersByTimeAsync(1500);
    }
    expect(write).toHaveBeenCalledTimes(1);
    release();
    await vi.advanceTimersByTimeAsync(1500);
    expect(write).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(15_000);
    expect(write).toHaveBeenCalledTimes(2);
    if (fails) expect(warn).toHaveBeenCalledExactlyOnceWith('could not save the state', failure);
    else expect(warn).not.toHaveBeenCalled();
  } finally {
    release();
    await pending.catch(() => undefined);
  }
});

it('does not rearm periodic persistence when a pending write settles during shutdown', async () => {
  vi.useFakeTimers();
  const office = new Swarm(createDemoBackend()) as unknown as {
    save(): void;
    writeState(): Promise<void>;
    saveTimer: NodeJS.Timeout | null;
    stopping: boolean;
  };
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  const write = vi.spyOn(office, 'writeState').mockImplementation(() => {
    office.saveTimer = null;
    return pending;
  });
  try {
    office.save();
    await vi.advanceTimersByTimeAsync(1500);
    office.save();
    office.stopping = true;
  } finally {
    release();
    await pending;
  }
  await vi.advanceTimersByTimeAsync(15_000);
  expect(write).toHaveBeenCalledTimes(1);
  expect(office.saveTimer).toBeNull();
});
