import { afterEach, describe, expect, it, vi } from 'vitest';
import { backoff, BoxPty, boxHooksReady, EventLines, exitCode, finishedTurn, readFrom, type BoxCliRecord } from './boxCli.ts';
import type { BoxApi, BoxSessionOptions } from './box.ts';

const line = (ev: Record<string, unknown>) => `${JSON.stringify(ev)}\n`;

afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

describe('BoxPty callbacks that close the CLI', () => {
  it.each(['kill', 'detach'] as const)('does not save a stale record or deliver later replay events after %s', async (action) => {
    vi.useFakeTimers();
    const save = vi.fn();
    const gone = vi.fn();
    const exits = vi.fn();
    const received: string[] = [];
    const run = vi.fn(async () => ({ code: 0, output: '' }));
    const pty = new BoxPty({ api: { run } as unknown as BoxApi, boxId: 'fake', token: 'fake', cols: 80, rows: 24, offset: 0,
      event: e => { received.push(String(e.hook_event_name)); pty[action](); }, save, gone,
    }, '/fake');
    pty.onExit(exits);
    boxHooksReady();
    pty.replay([{ hook_event_name: 'TurnError', signed_out: true }, { hook_event_name: 'TurnComplete', last_assistant_message: 'stale' }], { offset: 100, turnAt: 0 });
    await vi.advanceTimersByTimeAsync(6000);
    expect(received).toEqual(['TurnError']);
    expect(save).not.toHaveBeenCalled();
    expect(gone).toHaveBeenCalledTimes(action === 'kill' ? 1 : 0);
    expect(exits).toHaveBeenCalledTimes(action === 'kill' ? 1 : 0);
    expect(run).toHaveBeenCalledTimes(action === 'kill' ? 1 : 0);
  });

  it.each(['kill', 'detach'] as const)('does not save a stale record or deliver later live events after %s', async (action) => {
    vi.useFakeTimers();
    const sessions: BoxSessionOptions[] = [];
    const api = { run: async () => ({ code: 0, output: '' }), session: async (_id: string, options: BoxSessionOptions) => {
      sessions.push(options);
      return { write: () => undefined, resize: () => undefined, close: () => undefined, done: new Promise<number>(() => undefined) };
    } } as unknown as BoxApi;
    const save = vi.fn();
    const gone = vi.fn();
    const received: string[] = [];
    const pty = new BoxPty({ api, boxId: 'fake', token: 'fake', cols: 80, rows: 24, offset: 0,
      event: e => { received.push(String(e.hook_event_name)); pty[action](); }, save, gone,
    }, '/fake');
    boxHooksReady();
    await pty.open('new');
    await vi.advanceTimersByTimeAsync(0);
    sessions.find(s => s.cmd.includes('tail -c'))!.onData(line({ hook_event_name: 'TurnError', signed_out: true }) + line({ hook_event_name: 'TurnComplete' }) + line({ hook_event_name: 'CubefarmExit', code: 0 }));
    expect(received).toEqual(['TurnError']);
    expect(save).not.toHaveBeenCalled();
    expect(gone).toHaveBeenCalledTimes(action === 'kill' ? 1 : 0);
  });

  it('still replays and saves a normal completed turn, then reports its exit once', async () => {
    vi.useFakeTimers();
    const event = vi.fn();
    const save = vi.fn();
    const gone = vi.fn();
    const exits = vi.fn();
    const pty = new BoxPty({ api: {} as BoxApi, boxId: 'fake', token: 'fake', cols: 80, rows: 24, offset: 0, event, save, gone }, '/fake');
    pty.onExit(exits);
    boxHooksReady();
    pty.replay([{ hook_event_name: 'TurnComplete', last_assistant_message: 'Done' }, { hook_event_name: 'CubefarmExit', code: 0 }], { offset: 100, turnAt: 0 });
    await vi.advanceTimersByTimeAsync(6000);
    expect(event).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledExactlyOnceWith(100, 0, null);
    expect(gone).toHaveBeenCalledOnce();
    expect(exits).toHaveBeenCalledExactlyOnceWith(0);
  });
});

describe('EventLines', () => {
  it('hands on whole lines only, counting the bytes handled', () => {
    const r = new EventLines(0);
    const a = line({ hook_event_name: 'PreToolUse', tool_name: 'Bash' });
    const b = line({ hook_event_name: 'Stop', last_assistant_message: 'done' });
    expect(r.push(a + b.slice(0, 10))).toEqual([{ hook_event_name: 'PreToolUse', tool_name: 'Bash' }]);
    expect(r.offset).toBe(a.length);
    expect(r.push(b.slice(10))).toEqual([{ hook_event_name: 'Stop', last_assistant_message: 'done' }]);
    expect(r.offset).toBe(a.length + b.length);
  });

  it('starts counting where the office left off, and skips lines that are not events', () => {
    const r = new EventLines(500);
    expect(r.push('not json\n\n[1,2]\n')).toEqual([]);
    expect(r.offset).toBe(500 + 'not json\n\n[1,2]\n'.length);
  });

  it("remembers where the last turn's end starts, to read again from after a restart", () => {
    const start = line({ hook_event_name: 'UserPromptSubmit', prompt: 'go' });
    const stop = line({ hook_event_name: 'Stop' });
    const tool = line({ hook_event_name: 'PreToolUse' });
    const r = new EventLines(100);
    r.push(start + stop + tool);
    expect(r.turnAt).toBe(100 + start.length);
    expect(readFrom({ offset: r.offset, turnAt: r.turnAt } as BoxCliRecord)).toBe(100 + start.length);
    expect(readFrom({ offset: 40 } as BoxCliRecord)).toBe(40);
  });
});

describe('finishedTurn', () => {
  const ev = (hook_event_name: string, extra: Record<string, unknown> = {}) => ({ hook_event_name, ...extra });

  it.each(['TurnError', 'Interrupt'])('preserves a remote OpenCode %s for restart replay, not success or a new task', (event) => {
    const reader = new EventLines();
    const prompt = line(ev('UserPromptSubmit'));
    const end = line(ev(event));
    const events = reader.push(prompt + end);
    expect(finishedTurn(events)).toBe(true);
    expect(reader.turnAt).toBe(prompt.length);
    expect(finishedTurn([...events, ev('UserPromptSubmit')])).toBe(false);
  });

  it('counts a turn that ended after the last prompt it was given', () => {
    expect(finishedTurn([ev('UserPromptSubmit'), ev('PreToolUse'), ev('Stop')])).toBe(true);
    expect(finishedTurn([ev('TurnComplete')])).toBe(true);
    expect(finishedTurn([ev('CubefarmExit', { code: 1 })])).toBe(true);
  });

  it("doesn't count an earlier turn when a new one started after it", () => {
    expect(finishedTurn([ev('Stop'), ev('UserPromptSubmit'), ev('PreToolUse')])).toBe(false);
    expect(finishedTurn([])).toBe(false);
  });

  it('reads the exit code the launcher wrote', () => {
    expect(exitCode([ev('Stop'), ev('CubefarmExit', { code: 0 })])).toBe(0);
    expect(exitCode([ev('CubefarmExit', { code: 137 })])).toBe(137);
    expect(exitCode([ev('Stop')])).toBeNull();
  });
});

describe('backoff', () => {
  it('waits longer after each failed try, up to half a minute', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 20].map(backoff)).toEqual([1000, 2000, 4000, 8000, 16_000, 30_000, 30_000, 30_000]);
  });
});
