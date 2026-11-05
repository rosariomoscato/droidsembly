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
  };
  swarm.agentRt.clear();
  terminals.forEach((terminal, i) => swarm.agentRt.set(`fixture-${i}`, { terminal }));
  return swarm;
}
afterEach(() => vi.restoreAllMocks());

describe('bounded terminal save batch', () => {
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
