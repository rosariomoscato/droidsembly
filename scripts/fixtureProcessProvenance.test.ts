import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { spawn } from 'node:child_process';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { runFixtureProcess } from './fixtureProcess.ts';

vi.mock('node:child_process', () => ({ spawn: vi.fn() }));

const fakeChild = (pid: number) => Object.assign(new EventEmitter(), {
  pid, exitCode: null as number | null, signalCode: null as NodeJS.Signals | null,
  stdout: new PassThrough(), stderr: new PassThrough(), kill: vi.fn(() => true), unref: vi.fn(),
});
let root: ReturnType<typeof fakeChild>, killer: ReturnType<typeof fakeChild>, now: number;
const platform = Object.getOwnPropertyDescriptor(process, 'platform')!;

beforeEach(() => {
  vi.useFakeTimers();
  now = 0;
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  Object.defineProperty(process, 'platform', { ...platform, value: 'win32' });
  root = fakeChild(4242); killer = fakeChild(4343);
  vi.mocked(spawn).mockReset().mockReturnValueOnce(root as unknown as ReturnType<typeof spawn>)
    .mockReturnValueOnce(killer as unknown as ReturnType<typeof spawn>);
});
afterEach(() => {
  root.stdout.destroy(); root.stderr.destroy(); killer.stdout.destroy(); killer.stderr.destroy();
  vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks();
  Object.defineProperty(process, 'platform', platform);
});
const run = () => runFixtureProcess('synthetic-private-command', ['synthetic-private-argument'],
  { cwd: '.', env: { SYNTHETIC_PRIVATE: 'synthetic-private-value' }, timeout: 4000 });
function exit(code = 1) { root.exitCode = code; root.emit('exit', code, null); }
function close(code = 1) { root.emit('close', code, null); }

const runWithStartup = () => runFixtureProcess('synthetic-command', [],
  { cwd: '.', env: {}, timeout: 4000, startup: { timeout: 10000, stderrLine: 'fixture-ready' } });

it('gives a bounded cold start its own budget and preserves four seconds after exact readiness', async () => {
  const pending = runWithStartup();
  now = 8000;
  await vi.advanceTimersByTimeAsync(8000);
  root.stderr.emit('data', 'fixture-');
  expect(spawn).toHaveBeenCalledTimes(1);
  root.stderr.emit('data', 'ready\r\n');
  now = 11999;
  await vi.advanceTimersByTimeAsync(3999);
  exit(); close();
  const result = await pending;
  expect(result.error).toBeUndefined();
  expect(result.observation).toMatchObject({
    startupMs: 8000, startupTimeoutMs: 10000, commandTimeoutMs: 4000,
    timerExpectedMs: 12000, timeoutPhase: null,
  });
});

it('times out startup even if arbitrary output keeps arriving', async () => {
  const pending = runWithStartup();
  root.stdout.emit('data', 'fixture-ready\n');
  root.stderr.emit('data', 'not-fixture-ready\nfixture-ready');
  now = 10000;
  await vi.advanceTimersByTimeAsync(10000);
  expect(spawn).toHaveBeenCalledTimes(2);
  exit(); close(); killer.emit('close', 0);
  const result = await pending;
  expect(result.error).toMatchObject({ code: 'ETIMEDOUT' });
  expect(result.observation).toMatchObject({ startupMs: null, timeoutPhase: 'startup', timerExpectedMs: 10000 });
});

it('does not restart the functional deadline on repeated readiness lines', async () => {
  const pending = runWithStartup();
  now = 3000;
  await vi.advanceTimersByTimeAsync(3000);
  root.stderr.emit('data', 'fixture-ready\n');
  now = 6000;
  await vi.advanceTimersByTimeAsync(3000);
  root.stderr.emit('data', 'fixture-ready\n');
  now = 7000;
  await vi.advanceTimersByTimeAsync(1000);
  exit(); close(); killer.emit('close', 0);
  const result = await pending;
  expect(result.error).toMatchObject({ code: 'ETIMEDOUT' });
  expect(result.observation).toMatchObject({ startupMs: 3000, timeoutPhase: 'command', timerExpectedMs: 7000 });
});

it('rejects readiness observed after startup expiry even before its timer callback', async () => {
  const pending = runWithStartup();
  now = 10001;
  root.stderr.emit('data', 'fixture-ready\n');
  exit(); close(); killer.emit('close', 0);
  const result = await pending;
  expect(result.error).toMatchObject({ code: 'ETIMEDOUT' });
  expect(result.observation).toMatchObject({ startupMs: null, timeoutSource: 'late-ready', timeoutPhase: 'startup' });
});

it('rejects an early exit without readiness rather than treating it as success', async () => {
  const pending = runWithStartup();
  now = 10; exit(0); close(0);
  expect((await pending).error).toMatchObject({ code: 'EPROTO' });
  expect(spawn).toHaveBeenCalledTimes(1);
});

it('rejects a late functional close without waiting for timer delivery', async () => {
  const pending = runWithStartup();
  now = 3000; root.stderr.emit('data', 'fixture-ready\n');
  now = 7001; exit(); close();
  const result = await pending;
  expect(result.error).toMatchObject({ code: 'ETIMEDOUT' });
  expect(result.observation).toMatchObject({ timeoutSource: 'late-close', timeoutPhase: 'command' });
  expect(spawn).toHaveBeenCalledTimes(1);
});

it('rejects invalid readiness contracts before starting any process', () => {
  for (const startup of [{ timeout: Infinity, stderrLine: 'ready' }, { timeout: 0, stderrLine: 'ready' }, { timeout: 1, stderrLine: 'ready\n' }])
    expect(() => runFixtureProcess('synthetic-command', [], { cwd: '.', env: {}, timeout: 4000, startup })).toThrow();
  expect(spawn).not.toHaveBeenCalled();
});

it('exports only a fixed bounded schema while preserving ordinary output and status', async () => {
  const pending = run();
  now = 6; root.emit('spawn');
  root.stdout.emit('data', 'synthetic-private-output');
  root.stderr.emit('data', 'synthetic-private-stderr');
  now = 20; exit(73); close(73);
  const result = await pending;
  expect(result.error).toBeUndefined(); expect(result.status).toBe(73);
  expect(result.stdout).toBe('synthetic-private-output');
  expect(result.stderr).toBe('synthetic-private-stderr');
  expect(Object.keys(result.observation).sort()).toEqual([
    'spawnMs', 'firstStdoutMs', 'firstStderrMs', 'exitMs', 'closeMs', 'timeoutSource',
    'timerExpectedMs', 'timerFiredMs', 'timerDelayMs', 'stopRequestedMs',
    'taskkillRequestedMs', 'taskkillCloseMs', 'taskkillOutcome',
  ].sort());
  expect(result.observation).toMatchObject({
    timeoutSource: null, timerExpectedMs: 4000, timerFiredMs: null, timerDelayMs: null,
    stopRequestedMs: null, taskkillRequestedMs: null, taskkillCloseMs: null, taskkillOutcome: null,
  });
  for (const value of Object.values(result.observation)) {
    if (value !== null) {
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0); expect(value).toBeLessThanOrEqual(999999999);
    }
  }
  expect(JSON.stringify(result.observation)).not.toContain('synthetic-private');
});

it('distinguishes a late close without timer delivery or a kill request', async () => {
  const pending = run();
  now = 4098; exit(); close();
  const result = await pending;
  expect(result.error).toMatchObject({ code: 'ETIMEDOUT' });
  expect(result.status).toBe(1);
  expect(result.observation).toMatchObject({
    timeoutSource: 'late-close', timerExpectedMs: 4000, timerFiredMs: null, timerDelayMs: null,
    stopRequestedMs: null, taskkillRequestedMs: null, taskkillCloseMs: null, taskkillOutcome: null,
    exitMs: 4098, closeMs: 4098,
  });
  expect(spawn).toHaveBeenCalledTimes(1);
  expect(root.kill).not.toHaveBeenCalled();
});

it('records timer-triggered termination separately from the observed root exit', async () => {
  const pending = run();
  now = 4000;
  await vi.advanceTimersByTimeAsync(4000);
  expect(spawn).toHaveBeenLastCalledWith('taskkill', ['/PID', '4242', '/T', '/F'], expect.any(Object));
  now = 4098; exit(); close();
  now = 4100; killer.emit('close', 0);
  const result = await pending;
  expect(result.error).toMatchObject({ code: 'ETIMEDOUT' });
  expect(result.status).toBe(1);
  expect(result.observation).toMatchObject({
    timeoutSource: 'timer', timerExpectedMs: 4000, timerFiredMs: 4000, timerDelayMs: 0,
    stopRequestedMs: 4000, taskkillRequestedMs: 4000, taskkillCloseMs: 4100,
    taskkillOutcome: 'success', exitMs: 4098, closeMs: 4098,
  });
});

it('measures late timer callback delivery without calling it child CPU time', async () => {
  const pending = run();
  now = 4500;
  await vi.advanceTimersByTimeAsync(4000);
  now = 4598; exit(); close(); killer.emit('close', 0);
  const result = await pending;
  expect(result.error).toMatchObject({ code: 'ETIMEDOUT' });
  expect(result.observation).toMatchObject({
    timeoutSource: 'timer', timerExpectedMs: 4000, timerFiredMs: 4500, timerDelayMs: 500,
    stopRequestedMs: 4500, taskkillRequestedMs: 4500,
  });
});

it('keeps the timer target at the original deadline when spawn setup consumes budget', async () => {
  vi.mocked(spawn).mockReset().mockImplementationOnce(() => {
    now = 3000;
    return root as unknown as ReturnType<typeof spawn>;
  }).mockReturnValueOnce(killer as unknown as ReturnType<typeof spawn>);
  const pending = run();
  now = 4000;
  await vi.advanceTimersByTimeAsync(999);
  expect(spawn).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1);
  exit(); close(); killer.emit('close', 0);
  const result = await pending;
  expect(result.error).toMatchObject({ code: 'ETIMEDOUT' });
  expect(result.observation).toMatchObject({
    timeoutSource: 'timer', timerExpectedMs: 4000, timerFiredMs: 4000, timerDelayMs: 0,
  });
});

it('does not infer a kill request from timer expiry when the root already exited', async () => {
  const pending = run();
  now = 3999; exit(0);
  now = 4000; await vi.advanceTimersByTimeAsync(4000);
  const result = await pending;
  expect(result.error).toMatchObject({ cause: { code: 'ETIMEDOUT' } });
  expect(result.observation).toMatchObject({
    timeoutSource: 'timer', stopRequestedMs: 4000,
    taskkillRequestedMs: null, taskkillCloseMs: null, taskkillOutcome: null,
  });
  expect(spawn).toHaveBeenCalledTimes(1);
});

it.each([[128, 'nonzero'], [null, 'signal']] as const)('normalizes taskkill close %s without removing cleanup failure', async (code, outcome) => {
  const pending = run();
  now = 4000; await vi.advanceTimersByTimeAsync(4000);
  now = 4098; exit(); close(); killer.emit('close', code);
  const result = await pending;
  expect(result.error).toMatchObject({ cause: { code: 'ETIMEDOUT' } });
  expect((result.error as AggregateError).errors).toHaveLength(2);
  expect(result.observation).toMatchObject({
    timeoutSource: 'timer', taskkillRequestedMs: 4000, taskkillCloseMs: 4098, taskkillOutcome: outcome,
  });
});

it('retains killer spawn failure while excluding raw errors and private process data from observations', async () => {
  const pending = run();
  now = 4000; await vi.advanceTimersByTimeAsync(4000);
  killer.emit('error', new Error('synthetic-private-path'));
  const result = await pending;
  expect(result.error).toMatchObject({ cause: { code: 'ETIMEDOUT' } });
  expect(result.observation).toMatchObject({
    timeoutSource: 'timer', taskkillRequestedMs: 4000, taskkillCloseMs: null, taskkillOutcome: 'spawn-error',
  });
  const safe = JSON.stringify(result.observation);
  for (const value of ['synthetic-private', '4242', '4343', 'SYNTHETIC_PRIVATE']) expect(safe).not.toContain(value);
});

it('bounds exported times without changing late-close timeout classification', async () => {
  const pending = run();
  now = 2_000_000_000; exit(0); close(0);
  const result = await pending;
  expect(result.error).toMatchObject({ code: 'ETIMEDOUT' });
  expect(result.observation).toMatchObject({
    timeoutSource: 'late-close', timerExpectedMs: 4000, exitMs: 999999999, closeMs: 999999999,
  });
});

it('records a non-timeout stop without misclassifying output overflow as a timeout', async () => {
  const pending = run();
  now = 10; root.stdout.emit('data', 'x'.repeat(1024 * 1024 + 1));
  expect(spawn).toHaveBeenLastCalledWith('taskkill', ['/PID', '4242', '/T', '/F'], expect.any(Object));
  now = 20; exit(); close(); killer.emit('close', 0);
  const result = await pending;
  expect(result.error).toMatchObject({ code: 'ENOBUFS' });
  expect(result.observation).toMatchObject({
    timeoutSource: null, timerExpectedMs: 4000, timerFiredMs: null, timerDelayMs: null,
    stopRequestedMs: 10, taskkillRequestedMs: 10, taskkillCloseMs: 20, taskkillOutcome: 'success',
  });
  expect(vi.getTimerCount()).toBe(0);
});
