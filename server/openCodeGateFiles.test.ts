import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
import { boxGateAcceptanceScript, writeBoxGateAcceptance } from './openCodeGateFiles.ts';
import type { BoxApi } from './box.ts';

describe('opt-in gate acceptance file transport', () => {
  it('writes the controller-owned acceptance file outside the worktree with exclusive/no-follow flags', () => {
    let written: Buffer | undefined, closed = false, output = '';
    const code = boxGateAcceptanceScript('0123456789abcdef', 'synthetic è😀').slice("node -e '".length, -1).replaceAll("'\"'\"'", "'");
    const fs = {
      constants: { O_WRONLY: 1, O_NOFOLLOW: 2, O_CREAT: 4, O_EXCL: 8 }, realpathSync: (file: string) => file,
      openSync: (file: string, flags: number, mode: number) => { expect(file).toBe('/workspace/home/.cubefarm/gate-0123456789abcdef.mjs'); expect(flags).toBe(15); expect(mode).toBe(0o600); return 9; },
      fstatSync: () => ({ isFile: () => true, uid: 1002, size: 0 }), writeFileSync: (fd: number, value: Buffer) => { expect(fd).toBe(9); written = value; }, closeSync: () => { closed = true; },
    };
    vm.runInNewContext(code, { Buffer, process: { geteuid: () => 1002, stdout: { write: (s: string) => { output += s; } }, exitCode: 0 }, require: () => fs });
    expect(written!.toString('utf8')).toBe('synthetic è😀'); expect(output).toBe('DS_GATE_ACCEPTANCE=written'); expect(closed).toBe(true);
  });
  it('rejects acceptance traversal/oversize content and refuses transport failures without SDK fallback', async () => {
    for (const id of ['../index', 'bad;command', '/absolute']) expect(() => boxGateAcceptanceScript(id, 'x')).toThrow();
    expect(() => boxGateAcceptanceScript('0123456789abcdef', 'x'.repeat(16385))).toThrow();
    const run = vi.fn(async () => ({ code: 1, output: 'PRIVATE' })), write = vi.fn();
    await expect(writeBoxGateAcceptance({ run, write } as unknown as BoxApi, 'box', '0123456789abcdef', 'x')).rejects.toThrow(/^Independent acceptance file could not be prepared$/);
    expect(run).toHaveBeenCalledOnce(); expect(write).not.toHaveBeenCalled();
  });
});
