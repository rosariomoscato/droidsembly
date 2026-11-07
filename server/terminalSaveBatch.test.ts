import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDemoBackend } from './demo.ts';
import { Swarm } from './swarm.ts';

interface FakeTerminal { dirty: boolean; save(file: string): Promise<void> }
function fixture(terminals: FakeTerminal[]) {
  // No office init, timers, real providers or actual file writes. Exercise only
  // the existing private periodic/shutdown terminal-save entry point.
  const swarm = new Swarm(createDemoBackend()) as unknown as {
    agentRt: Map<string, { terminal: FakeTerminal }>;
    saveTerminals(all?: boolean): Promise<void>;
    stopping: boolean;
  };
  swarm.agentRt.clear();
  terminals.forEach((terminal, i) => swarm.agentRt.set(`fixture-${i}`, { terminal }));
  return swarm;
}
afterEach(() => vi.restoreAllMocks());

describe('bounded terminal save batch', () => {
  it('coalesces overlapping periodic requests instead of multiplying the eight-save batch', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    let active = 0;
    let peak = 0;
    const saves = Array.from({ length: 20 }, () => vi.fn(async () => {
      active++;
      peak = Math.max(peak, active);
      try { await gate; } finally { active--; }
    }));
    const swarm = fixture(saves.map((save) => ({ dirty: true, save })));
    const first = swarm.saveTerminals();
    const overlapping = Array.from({ length: 5 }, () => swarm.saveTerminals());
    try {
      expect(active).toBe(8);
      for (const pending of overlapping) expect(pending).toBe(first);
    } finally {
      release();
      await Promise.all([first, ...overlapping]);
    }
    expect(peak).toBe(8);
    for (const save of saves) expect(save).toHaveBeenCalledTimes(1);
  });

  it('queues a complete final save after an active batch and retains the newest screen', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    let screen = 'before shutdown';
    const written: string[] = [];
    const dirty = { dirty: true, save: vi.fn(async () => {
      const captured = screen;
      await gate;
      written.push(captured);
    }) };
    const clean = { dirty: false, save: vi.fn(async () => undefined) };
    const swarm = fixture([dirty, clean]);
    const periodic = swarm.saveTerminals();
    screen = 'latest screen at shutdown';
    swarm.stopping = true;
    const final = swarm.saveTerminals(true);
    const latePeriodic = swarm.saveTerminals();
    try {
      expect(dirty.save).toHaveBeenCalledTimes(1);
      expect(clean.save).not.toHaveBeenCalled();
      expect(latePeriodic).toBe(final);
    } finally {
      release();
      await Promise.all([periodic, final, latePeriodic]);
    }
    expect(written).toEqual(['before shutdown', 'latest screen at shutdown']);
    expect(clean.save).toHaveBeenCalledTimes(1);
  });

  it('does not start periodic writes once shutdown has begun', async () => {
    const save = vi.fn(async () => undefined);
    const swarm = fixture([{ dirty: true, save }]);
    swarm.stopping = true;
    await swarm.saveTerminals();
    expect(save).not.toHaveBeenCalled();
    await swarm.saveTerminals(true);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('starts eight independent saves without exceeding eight active operations', async () => {
    let release!: () => void;
    const gate = new Promise<void>(done => { release = done; });
    let active = 0;
    let peak = 0;
    let completed = 0;
    const saves = Array.from({ length: 20 }, () => vi.fn(async () => {
      active++;
      peak = Math.max(peak, active);
      try { await gate; completed++; }
      finally { active--; }
    }));
    const swarm = fixture(saves.map(save => ({ dirty: true, save })));
    const pending = swarm.saveTerminals(true);
    try {
      expect(saves.filter(save => save.mock.calls.length)).toHaveLength(8);
      expect(active).toBe(8);
    } finally {
      release();
      await pending;
    }
    expect(peak).toBe(8);
    expect(completed).toBe(20);
    for (const save of saves) expect(save).toHaveBeenCalledTimes(1);
  });

  it('preserves dirty-only periodic saves and all-terminal shutdown saves', async () => {
    const clean = { dirty: false, save: vi.fn(async () => undefined) };
    const dirty = { dirty: true, save: vi.fn(async () => undefined) };
    const swarm = fixture([clean, dirty]);
    await swarm.saveTerminals();
    expect(clean.save).not.toHaveBeenCalled();
    expect(dirty.save).toHaveBeenCalledTimes(1);
    await swarm.saveTerminals(true);
    expect(clean.save).toHaveBeenCalledTimes(1);
    expect(dirty.save).toHaveBeenCalledTimes(2);
  });

  it('reports an individual failure and still awaits the other terminal saves', async () => {
    const failure = new Error('synthetic terminal save failure');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const failing = { dirty: true, save: vi.fn(async () => { throw failure; }) };
    const others = Array.from({ length: 10 }, () => ({ dirty: true, save: vi.fn(async () => undefined) }));
    await fixture([failing, ...others]).saveTerminals(true);
    expect(warn).toHaveBeenCalledExactlyOnceWith('could not save a terminal', failure);
    for (const terminal of others) expect(terminal.save).toHaveBeenCalledTimes(1);
  });
});
