import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { spawn } from 'node:child_process';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { runFixtureProcess } from './fixtureProcess.ts';

vi.mock('node:child_process', () => ({ spawn: vi.fn() }));

const fakeChild = (pid: number) => Object.assign(new EventEmitter(), {
  pid, exitCode: null as number | null, signalCode: null as NodeJS.Signals | null,
  stdout: new PassThrough(), stderr: new PassThrough(),
  kill: vi.fn(() => true), unref: vi.fn(),
});
let root: ReturnType<typeof fakeChild>, killer: ReturnType<typeof fakeChild>;
let groupKill: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.useFakeTimers();
  root = fakeChild(4242); killer = fakeChild(4343);
  vi.mocked(spawn).mockReset().mockReturnValueOnce(root as unknown as ReturnType<typeof spawn>)
    .mockReturnValueOnce(killer as unknown as ReturnType<typeof spawn>);
  groupKill = vi.spyOn(process, 'kill').mockImplementation(() => true);
});
afterEach(() => {
  root.stdout.destroy(); root.stderr.destroy(); killer.stdout.destroy(); killer.stderr.destroy();
  vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks();
});
const run = () => runFixtureProcess('synthetic-command', [], { cwd: '.', env: {}, timeout: 10000 });
function exit(code = 0) { root.exitCode = code; root.emit('exit', code, null); }
function close(code = 0) { root.emit('close', code, null); }
function killFinished(code = 0) { killer.exitCode = code; killer.emit('close', code, null); }

it('refuses an expired root PID while inherited pipes remain open', async () => {
  const pending = run();
  exit(0);
  await vi.advanceTimersByTimeAsync(10000);
  expect(spawn).toHaveBeenCalledTimes(1);
  expect(groupKill).not.toHaveBeenCalled();
  expect(root.kill).not.toHaveBeenCalled();
  const result = await pending;
  expect(result.status).toBe(0);
  expect(result.error).toMatchObject({ cause: { code: 'ETIMEDOUT' } });
  expect((result.error as AggregateError).errors[1].message).toMatch(/root exited.*descendant.*unverified/i);
  expect(root.stdout.destroyed && root.stderr.destroyed).toBe(true);
});

it('also refuses exitCode already set before the exit listener is delivered', async () => {
  const pending = run();
  root.exitCode = 0;
  await vi.advanceTimersByTimeAsync(10000);
  expect(spawn).toHaveBeenCalledTimes(1);
  expect(groupKill).not.toHaveBeenCalled();
  expect(root.kill).not.toHaveBeenCalled();
  expect((await pending).error).toMatchObject({ cause: { code: 'ETIMEDOUT' } });
});

it('preserves normal output and nonzero exit after complete stream close', async () => {
  const pending = run();
  root.emit('spawn');
  root.stdout.emit('data', 'out'); root.stderr.emit('data', 'err');
  exit(73); close(73);
  expect(await pending).toEqual({ stdout: 'out', stderr: 'err', status: 73, signal: null,
    observation: { spawnMs: expect.any(Number), firstStdoutMs: expect.any(Number), firstStderrMs: expect.any(Number), exitMs: expect.any(Number), closeMs: expect.any(Number),
      timeoutSource: null, timerExpectedMs: 10000, timerFiredMs: null, timerDelayMs: null,
      stopRequestedMs: null, taskkillRequestedMs: null, taskkillCloseMs: null, taskkillOutcome: null } });
  await vi.advanceTimersByTimeAsync(11000);
  expect(spawn).toHaveBeenCalledTimes(1); expect(groupKill).not.toHaveBeenCalled();
});

it('does not turn a late close into success when timer delivery is delayed', async () => {
  const clock = vi.spyOn(performance, 'now').mockReturnValue(0);
  const pending = run();
  clock.mockReturnValue(10001);
  exit(0); close(0);
  const result = await pending;
  expect(result.status).toBe(0);
  expect(result.error).toMatchObject({ code: 'ETIMEDOUT' });
  expect(spawn).toHaveBeenCalledTimes(1);
  expect(root.kill).not.toHaveBeenCalled(); expect(groupKill).not.toHaveBeenCalled();
});

it('counts synchronous process creation against the original command deadline', async () => {
  const clock = vi.spyOn(performance, 'now').mockReturnValue(0);
  vi.mocked(spawn).mockReset().mockImplementationOnce(() => {
    clock.mockReturnValue(3000);
    return root as unknown as ReturnType<typeof spawn>;
  }).mockReturnValueOnce(killer as unknown as ReturnType<typeof spawn>);
  const pending = run();
  await vi.advanceTimersByTimeAsync(7000);
  if (process.platform === 'win32') killFinished();
  exit(1); close(1);
  expect((await pending).error).toMatchObject({ code: 'ETIMEDOUT' });
});

it('retains the original timeout when live tree termination and close succeed', async () => {
  const pending = run();
  await vi.advanceTimersByTimeAsync(10000);
  if (process.platform === 'win32') {
    expect(spawn).toHaveBeenLastCalledWith('taskkill', ['/PID', '4242', '/T', '/F'], expect.any(Object));
    killFinished();
  } else expect(groupKill).toHaveBeenCalledWith(-4242, 'SIGKILL');
  exit(1); close(1);
  expect((await pending).error).toMatchObject({ code: 'ETIMEDOUT' });
  expect(root.kill).not.toHaveBeenCalled();
});

it('bounds stalled termination separately from pipe draining', async () => {
  const pending = run();
  let result: Awaited<typeof pending> | undefined;
  void pending.then((value) => { result = value; });
  const grace = process.platform === 'win32' ? 5000 : 1000;
  await vi.advanceTimersByTimeAsync(10000 + grace - 1);
  expect(result).toBeUndefined();
  await vi.advanceTimersByTimeAsync(1);
  expect(result?.error).toMatchObject({ cause: { code: 'ETIMEDOUT' } });
  expect((result?.error as AggregateError).errors[1].message).toMatch(new RegExp(`${grace} ms.*unverified`, 'i'));
  expect(root.kill).toHaveBeenCalledWith('SIGKILL');
  if (process.platform === 'win32') expect(killer.kill).toHaveBeenCalledWith('SIGKILL');
  expect(root.stdout.destroyed && root.stderr.destroyed).toBe(true);
});

it('allows a Windows killer beyond one second, then bounds its separate pipe drain', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(process, 'platform')!;
  Object.defineProperty(process, 'platform', { ...descriptor, value: 'win32' });
  try {
    const pending = run();
    let result: Awaited<typeof pending> | undefined;
    void pending.then((value) => { result = value; });
    await vi.advanceTimersByTimeAsync(11250);
    expect(result).toBeUndefined();
    expect(root.kill).not.toHaveBeenCalled(); expect(killer.kill).not.toHaveBeenCalled();
    exit(1); killFinished();
    await vi.advanceTimersByTimeAsync(999);
    expect(result).toBeUndefined();
    close(1);
    expect((await pending).error).toMatchObject({ code: 'ETIMEDOUT' });
    await vi.advanceTimersByTimeAsync(10000);
    expect(root.kill).not.toHaveBeenCalled(); expect(killer.kill).not.toHaveBeenCalled();
  } finally { Object.defineProperty(process, 'platform', descriptor); }
});

it('fails after the full separate drain second even when Windows termination succeeded', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(process, 'platform')!;
  Object.defineProperty(process, 'platform', { ...descriptor, value: 'win32' });
  try {
    const pending = run();
    let result: Awaited<typeof pending> | undefined;
    void pending.then((value) => { result = value; });
    await vi.advanceTimersByTimeAsync(11250);
    exit(0); killFinished();
    await vi.advanceTimersByTimeAsync(999);
    expect(result).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    expect(result?.error).toMatchObject({ cause: { code: 'ETIMEDOUT' } });
    expect((result?.error as AggregateError).errors[1].message).toMatch(/stream drain exceeded 1000 ms/);
    expect(root.kill).not.toHaveBeenCalled(); expect(killer.kill).not.toHaveBeenCalled();
  } finally { Object.defineProperty(process, 'platform', descriptor); }
});

it('does not call a root kill handle again after exit during stalled pipe drain', async () => {
  const pending = run();
  await vi.advanceTimersByTimeAsync(10000);
  if (process.platform === 'win32') killFinished();
  exit(0); // no close: an unverified descendant still holds a pipe
  await vi.advanceTimersByTimeAsync(1000);
  const result = await pending;
  expect(result.error).toMatchObject({ cause: { code: 'ETIMEDOUT' } });
  expect(root.kill).not.toHaveBeenCalled();
  expect(killer.kill).not.toHaveBeenCalled();
});

it('preserves termination failure rather than treating root status zero as success', async () => {
  const pending = run();
  await vi.advanceTimersByTimeAsync(10000);
  exit(0);
  if (process.platform === 'win32') killFinished(128);
  else await vi.advanceTimersByTimeAsync(1000);
  const result = await pending;
  expect(result.status).toBe(0);
  expect(result.error).toMatchObject({ cause: { code: 'ETIMEDOUT' } });
  if (process.platform === 'win32') expect((result.error as AggregateError).errors[1].message).toContain('(128)');
  expect(root.kill).not.toHaveBeenCalled();
});

it('preserves a spawn error without requiring a later close event', async () => {
  const pending = run();
  const error = Object.assign(new Error('Synthetic spawn failure'), { code: 'ENOENT' });
  Object.assign(root, { pid: undefined });
  root.emit('error', error);
  const result = await pending;
  expect(result.error).toBe(error);
  expect(spawn).toHaveBeenCalledTimes(1); expect(groupKill).not.toHaveBeenCalled();
});
