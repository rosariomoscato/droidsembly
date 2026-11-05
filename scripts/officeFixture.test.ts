import { describe, expect, it, vi } from 'vitest';
import { closeOfficeFixture } from './officeFixture.ts';
import { AgentTerminal } from '../server/terminal.ts';

describe('office fixture teardown', () => {
  it('retains and drains a yielded xterm parser continuation before clearing fake timers', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
    const terminal = new AgentTerminal();
    try {
      terminal.write('first synthetic chunk\r\n');
      terminal.write('second synthetic chunk\r\n');
      let parsed = false;
      const pending = terminal.flush().then(() => { parsed = true; });
      // Force xterm's existing 12ms parser-yield branch deterministically,
      // without a slow payload or a change to the application's timing budget.
      let clock = 0;
      const now = vi.spyOn(performance, 'now').mockImplementation(() => (clock += 13));
      try { await vi.advanceTimersByTimeAsync(0); }
      finally { now.mockRestore(); }
      expect(parsed).toBe(false);
      expect(vi.getTimerCount()).toBeGreaterThan(0);
      await vi.advanceTimersByTimeAsync(1);
      await pending;
      vi.clearAllTimers();
      vi.useRealTimers();
      await terminal.flush();
      expect(terminal.snapshot()).toContain('first synthetic chunk');
      expect(terminal.snapshot()).toContain('second synthetic chunk');
    } finally {
      vi.restoreAllMocks();
      terminal.dispose();
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });

  it('drains due xterm work before returning a frozen clock to real timers', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
    const terminal = new AgentTerminal();
    try {
      terminal.write('synthetic terminal fixture\r\n');
      let parsed = false;
      const pending = terminal.flush().then(() => { parsed = true; });
      await Promise.resolve();
      expect(parsed).toBe(false);
      const at = Date.now();
      await vi.advanceTimersByTimeAsync(0);
      await pending;
      expect(Date.now()).toBe(at);
      vi.clearAllTimers();
      vi.useRealTimers();
      await terminal.flush();
      expect(terminal.snapshot()).toContain('synthetic terminal fixture');
    } finally {
      terminal.dispose();
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });

  it('does not remove the fixture before shutdown completes', async () => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const shutdown = vi.fn(() => gate);
    const remove = vi.fn();
    const closing = closeOfficeFixture({ shutdown }, remove);
    try {
      expect(shutdown).toHaveBeenCalledTimes(1);
      await Promise.resolve();
      expect(remove).not.toHaveBeenCalled();
    } finally {
      release();
      await closing;
    }
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('retains the fixture and propagates a failed shutdown', async () => {
    const failure = new Error('synthetic shutdown failure');
    const remove = vi.fn();
    await expect(closeOfficeFixture({ shutdown: async () => { throw failure; } }, remove)).rejects.toBe(failure);
    expect(remove).not.toHaveBeenCalled();
  });

  it('awaits removal and does not hide a removal failure', async () => {
    const failure = new Error('synthetic removal failure');
    await expect(closeOfficeFixture({ shutdown: async () => undefined }, async () => { throw failure; })).rejects.toBe(failure);
  });
});
