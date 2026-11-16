import { EventEmitter } from 'node:events';
import path from 'node:path';
import type { Socket } from 'node:net';
import { describe, expect, it } from 'vitest';
import { encode, hostSocket, ptyExitCode, readMessages, type ToHost } from './ptyProtocol.ts';

describe('hostSocket', () => {
  it('names one named pipe per office home on Windows, whatever the path looks like', () => {
    const a = hostSocket('C:\\Users\\Ada\\.cubefarm', 'win32');
    expect(a).toMatch(/^\\\\\.\\pipe\\cubefarm-pty-[0-9a-f]{12}$/);
    expect(hostSocket('c:\\users\\ada\\.cubefarm', 'win32')).toBe(a);
    expect(hostSocket('C:\\Users\\Ada\\other-home', 'win32')).not.toBe(a);
  });

  it('puts the socket in the office home elsewhere', () => {
    expect(hostSocket('/home/ada/.cubefarm', 'linux')).toBe(path.join('/home/ada/.cubefarm', 'pty.sock'));
  });
});

describe('readMessages', () => {
  it('reads one message per line, across chunks, skipping lines that are not JSON', () => {
    const sock = Object.assign(new EventEmitter(), { setEncoding: () => undefined }) as unknown as Socket;
    const got: ToHost[] = [];
    readMessages<ToHost>(sock, (m) => got.push(m));
    const a = encode({ op: 'write', id: 'x', data: 'line one\nline two' });
    sock.emit('data', a.slice(0, 10));
    sock.emit('data', `${a.slice(10)}not json\n${encode({ op: 'kill', id: 'x' })}`);
    expect(got).toEqual([
      { op: 'write', id: 'x', data: 'line one\nline two' },
      { op: 'kill', id: 'x' },
    ]);
  });
});

describe('exit status boundary', () => {
  it.each([0, 3, 73, -1, 4294967295])('preserves verified integer status %s', (code) => {
    expect(ptyExitCode(code)).toBe(code);
  });
  it.each([undefined, null, NaN, Infinity, -Infinity, 0.5, '3', {}, Number.MAX_SAFE_INTEGER + 1])('fails closed for an unavailable or invalid exit status %s', (code) => {
    expect(ptyExitCode(code)).toBe(-1);
    expect(JSON.parse(encode({ op: 'exit', id: 'synthetic', code: ptyExitCode(code) })))
      .toEqual({ op: 'exit', id: 'synthetic', code: -1 });
  });
});
