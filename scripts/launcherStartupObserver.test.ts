import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { instrumentLauncherStartup, observeLauncherStartup } from './launcherStartupObserver.ts';

const homes: string[] = [];
function home() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'launcher-startup-unit-'));
  homes.push(dir);
  return dir;
}
function file(dir: string, stage: 'before' | 'after') { return path.join(dir, `startup-${stage}-console.bin`); }
const result = { stderr: '', status: 1, error: undefined };
afterEach(() => {
  vi.restoreAllMocks();
  for (const dir of homes.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe('synthetic startup checkpoint protocol, no PowerShell subprocess', () => {
  it('wraps only the first Console statement, preserving the original remainder and quoted paths', () => {
    const dir = path.join(home(), "private'quoted");
    fs.mkdirSync(dir);
    const first = "[Console]::Error.WriteLine('probe script-enter ms=0')";
    const rest = '\n$probeClock=[Diagnostics.Stopwatch]::StartNew()\noriginal-body\n';
    const generated = instrumentLauncherStartup(first + rest, dir);
    const lines = generated.split('\n');
    expect(lines[0]).toContain("startup-before-console.bin', [byte[]]@(49)");
    expect(lines[0]).toContain("private''quoted");
    expect(lines[1]).toBe(first);
    expect(lines[2]).toContain("startup-after-console.bin', [byte[]]@(49)");
    expect(generated.slice(generated.indexOf('\n', generated.indexOf(lines[2])))).toBe(rest);
    expect(generated.match(/probe observer-error/g)).toHaveLength(2);
    expect(generated.match(/exit 97/g)).toHaveLength(2);
  });
  it('rejects changed entry and preexisting checkpoint files instead of reusing stale evidence', () => {
    const dir = home(), script = "[Console]::Error.WriteLine('probe script-enter ms=0')\nbody";
    expect(() => instrumentLauncherStartup('unexpected\n' + script, dir)).toThrow('Unexpected launcher fixture entry');
    for (const stage of ['before', 'after'] as const) {
      fs.writeFileSync(file(dir, stage), '1');
      expect(() => instrumentLauncherStartup(script, dir)).toThrow('Startup checkpoint already exists');
      fs.unlinkSync(file(dir, stage));
    }
  });
  it.each([
    [undefined, undefined, 'absent', 'absent', false],
    ['1', undefined, 'present', 'absent', false],
    ['1', '1', 'present', 'present', false],
    [undefined, '1', 'absent', 'present', true],
    ['', 'private-data', 'invalid', 'invalid', true],
    ['11', '0', 'invalid', 'invalid', true],
  ] as const)('classifies bytes without inferring cause: %s/%s', async (before, after, beforeState, afterState, error) => {
    const dir = home();
    if (before !== undefined) fs.writeFileSync(file(dir, 'before'), before);
    if (after !== undefined) fs.writeFileSync(file(dir, 'after'), after);
    const observed = await observeLauncherStartup(Promise.resolve(result), dir);
    expect(observed.result).toBe(result);
    expect(observed.startup).toEqual({ observerVersion: 1, beforeConsole: beforeState, afterConsole: afterState, observerError: error });
    expect(JSON.stringify(observed.startup)).not.toContain('private');
    expect(JSON.stringify(observed.startup)).not.toContain(dir);
  });
  it('reads no more than two bytes per file and closes each owned descriptor', async () => {
    const dir = home();
    fs.writeFileSync(file(dir, 'before'), Buffer.alloc(4096, 49));
    fs.writeFileSync(file(dir, 'after'), '1');
    const read = vi.spyOn(fs, 'readSync'), close = vi.spyOn(fs, 'closeSync');
    const observed = await observeLauncherStartup(Promise.resolve(result), dir);
    expect(observed.startup.beforeConsole).toBe('invalid');
    expect(read).toHaveBeenCalledTimes(2);
    for (const args of read.mock.calls) expect(args.slice(2)).toEqual([0, 2, 0]);
    expect(close).toHaveBeenCalledTimes(2);
  });
  it('sanitizes read failure and still closes the descriptor', async () => {
    const dir = home();
    fs.writeFileSync(file(dir, 'before'), '1');
    vi.spyOn(fs, 'readSync').mockImplementation(() => { throw Object.assign(new Error('private path'), { code: 'EACCES' }); });
    const close = vi.spyOn(fs, 'closeSync');
    const { startup } = await observeLauncherStartup(Promise.resolve(result), dir);
    expect(startup).toEqual({ observerVersion: 1, beforeConsole: 'read-error', afterConsole: 'absent', observerError: true });
    expect(close).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(startup)).not.toContain('private');
  });
  it('recognizes only the fixed observer-error line, not arbitrary stderr substrings', async () => {
    const dir = home();
    for (const [stderr, expected] of [['private probe observer-error suffix', false], ['probe observer-error\r\n', true]] as const) {
      const { startup } = await observeLauncherStartup(Promise.resolve({ stderr }), dir);
      expect(startup.observerError).toBe(expected);
      expect(Object.keys(startup)).toEqual(['observerVersion', 'beforeConsole', 'afterConsole', 'observerError']);
    }
  });
  it('waits for settlement and reads only the supplied home, not another fixture', async () => {
    const dir = home(), other = home();
    fs.writeFileSync(file(other, 'before'), 'private');
    let settle!: (value: typeof result) => void;
    const pending = new Promise<typeof result>((resolve) => { settle = resolve; });
    const open = vi.spyOn(fs, 'openSync');
    const observed = observeLauncherStartup(pending, dir);
    await Promise.resolve();
    expect(open).not.toHaveBeenCalled();
    fs.writeFileSync(file(dir, 'before'), '1');
    fs.writeFileSync(file(dir, 'after'), '1');
    open.mockClear();
    settle(result);
    expect((await observed).startup.observerError).toBe(false);
    expect(open.mock.calls.map((args) => args[0])).toEqual([file(dir, 'before'), file(dir, 'after')]);
    expect(fs.readFileSync(file(other, 'before'), 'utf8')).toBe('private');
  });
  it('preserves rejected process promises without reading partial evidence', async () => {
    const dir = home(), error = new Error('process failure');
    const open = vi.spyOn(fs, 'openSync');
    await expect(observeLauncherStartup(Promise.reject(error), dir)).rejects.toBe(error);
    expect(open).not.toHaveBeenCalled();
  });
  it('does not read files when process settlement reports unverified cleanup', async () => {
    const dir = home(), open = vi.spyOn(fs, 'openSync');
    const failure = { stderr: '', error: new AggregateError([new Error('private cleanup')]) };
    const observed = await observeLauncherStartup(Promise.resolve(failure), dir);
    expect(observed.result).toBe(failure);
    expect(open).not.toHaveBeenCalled();
    expect(observed.startup).toEqual({ observerVersion: 1, beforeConsole: 'read-error', afterConsole: 'read-error', observerError: true });
    expect(JSON.stringify(observed.startup)).not.toContain('private');
  });
  it('sanitizes open errors without mistaking access failure for absence', async () => {
    const dir = home();
    vi.spyOn(fs, 'openSync').mockImplementation(() => { throw Object.assign(new Error('private path'), { code: 'EACCES' }); });
    const { startup } = await observeLauncherStartup(Promise.resolve(result), dir);
    expect(startup).toEqual({ observerVersion: 1, beforeConsole: 'read-error', afterConsole: 'read-error', observerError: true });
  });
});
