import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BoxApi, BoxSessionOptions } from './box.ts';
import { BoxPty, boxHooksReady, exitCode } from './boxCli.ts';

const cases: { name: string; code: unknown; expected: number }[] = [
  { name: 'zero', code: 0, expected: 0 },
  { name: 'failure', code: 3, expected: 3 },
  { name: 'signal-style failure', code: 137, expected: 137 },
  { name: 'unknown failure', code: -1, expected: -1 },
  { name: 'largest safe integer', code: Number.MAX_SAFE_INTEGER, expected: Number.MAX_SAFE_INTEGER },
  { name: 'smallest safe integer', code: Number.MIN_SAFE_INTEGER, expected: Number.MIN_SAFE_INTEGER },
  { name: 'missing', code: undefined, expected: -1 },
  { name: 'null', code: null, expected: -1 },
  { name: 'empty string', code: '', expected: -1 },
  { name: 'whitespace', code: ' ', expected: -1 },
  { name: 'numeric success string', code: '0', expected: -1 },
  { name: 'numeric failure string', code: '137', expected: -1 },
  { name: 'nonnumeric string', code: 'invalid', expected: -1 },
  { name: 'false', code: false, expected: -1 },
  { name: 'true', code: true, expected: -1 },
  { name: 'fraction', code: 0.5, expected: -1 },
  { name: 'unsafe integer', code: Number.MAX_SAFE_INTEGER + 1, expected: -1 },
  { name: 'NaN', code: NaN, expected: -1 },
  { name: 'positive infinity', code: Infinity, expected: -1 },
  { name: 'negative infinity', code: -Infinity, expected: -1 },
  { name: 'array', code: [], expected: -1 },
  { name: 'object', code: {}, expected: -1 },
];
const exit = (code: unknown) => ({ hook_event_name: 'CubefarmExit', ...(code === undefined ? {} : { code }) });
const line = (event: Record<string, unknown>) => `${JSON.stringify(event)}\n`;

afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

describe('Box exit event status contract', () => {
  it.each(cases)('parses $name without coercing an invalid status to success', ({ code, expected }) => {
    expect(exitCode([exit(code)])).toBe(expected);
  });

  it('distinguishes no exit event from an invalid final exit event', () => {
    expect(exitCode([])).toBeNull();
    expect(exitCode([{ hook_event_name: 'TurnComplete' }])).toBeNull();
    expect(exitCode([exit(0), exit(undefined)])).toBe(-1);
    expect(exitCode([exit(undefined), exit(3)])).toBe(3);
  });

  it.each(cases)('replay delivers $name once even after a completed turn', async ({ code, expected }) => {
    vi.useFakeTimers();
    const event = vi.fn(), save = vi.fn(), gone = vi.fn(), onExit = vi.fn();
    const pty = new BoxPty({ api: {} as BoxApi, boxId: 'fake', token: 'fake', cols: 80, rows: 24,
      offset: 0, event, save, gone }, '/fake');
    pty.onExit(onExit);
    boxHooksReady();
    pty.replay([{ hook_event_name: 'TurnComplete' }, exit(code)], { offset: 100, turnAt: 0 });
    await vi.advanceTimersByTimeAsync(6000);
    expect(onExit).toHaveBeenCalledExactlyOnceWith(expected);
    expect(gone).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledExactlyOnceWith(100, 0, null);
    expect(event).toHaveBeenCalledExactlyOnceWith({ hook_event_name: 'TurnComplete' });
    pty.replay([{ hook_event_name: 'TurnComplete' }, exit(0)], { offset: 200, turnAt: 100 });
    await vi.advanceTimersByTimeAsync(6000);
    expect(onExit).toHaveBeenCalledOnce();
    expect(gone).toHaveBeenCalledOnce();
    expect(event).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledOnce();
  });

  // JSON transports NaN/Infinity as null; direct parser/replay cases above also
  // exercise the original non-finite values, without pretending JSON preserves them.
  it.each(cases)('live JSON delivers $name once without later events resurrecting it', async ({ code, expected }) => {
    vi.useFakeTimers();
    const sessions: BoxSessionOptions[] = [];
    const api = { session: async (_id: string, options: BoxSessionOptions) => {
      sessions.push(options);
      return { write: () => undefined, resize: () => undefined, close: vi.fn(), done: new Promise<number>(() => undefined) };
    } } as unknown as BoxApi;
    const event = vi.fn(), save = vi.fn(), gone = vi.fn(), onExit = vi.fn();
    const pty = new BoxPty({ api, boxId: 'fake', token: 'fake', cols: 80, rows: 24,
      offset: 0, event, save, gone }, '/fake');
    pty.onExit(onExit);
    boxHooksReady();
    await pty.open('new');
    await vi.advanceTimersByTimeAsync(0);
    const tail = sessions.find(s => s.cmd.includes('tail -c'))!;
    tail.onData(line({ hook_event_name: 'TurnComplete' }) + line(exit(code)));
    expect(onExit).toHaveBeenCalledExactlyOnceWith(expected);
    expect(gone).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledOnce();
    expect(event).toHaveBeenCalledExactlyOnceWith({ hook_event_name: 'TurnComplete' });
    tail.onData(line({ hook_event_name: 'TurnComplete' }) + line(exit(0)));
    expect(onExit).toHaveBeenCalledOnce();
    expect(gone).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledOnce();
    expect(event).toHaveBeenCalledOnce();
  });

  it.each([true, false])('preserves replay fallback when an exit event is absent (completed=%s)', async completed => {
    vi.useFakeTimers();
    const onExit = vi.fn();
    const pty = new BoxPty({ api: {} as BoxApi, boxId: 'fake', token: 'fake', cols: 80, rows: 24,
      offset: 0, event: vi.fn(), save: vi.fn(), gone: vi.fn() }, '/fake');
    pty.onExit(onExit);
    boxHooksReady();
    pty.replay(completed ? [{ hook_event_name: 'TurnComplete' }] : [], { offset: 100, turnAt: 0 });
    await vi.advanceTimersByTimeAsync(6000);
    expect(onExit).toHaveBeenCalledExactlyOnceWith(completed ? 0 : -1);
  });
});
