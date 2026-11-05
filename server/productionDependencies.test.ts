// Offline dependency regressions, not attacks on an office/provider. No new direct dependency.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Hono, type MiddlewareHandler } from 'hono';
import { serveStatic as coreStatic } from 'hono/serve-static';
import { serveStatic as nodeStatic } from '@hono/node-server/serve-static';
import * as uri from 'fast-uri';
import { Address4, Address6 } from 'ip-address';
import { RE_ZONE_STRING } from 'ip-address/dist/v6/constants.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

const dirs: string[] = [];
afterEach(() => {
  vi.restoreAllMocks();
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

function staticFixture(adapter: 'core' | 'node') {
  const files = new Map([
    ['/private/marker.txt', 'PRIVATE_FIXTURE'],
    ['/hello world.txt', 'PUBLIC_SPACE'],
    ['/炎.txt', 'PUBLIC_UNICODE'],
  ]);
  let middleware: MiddlewareHandler;
  if (adapter === 'node') {
    const parent = path.join(os.tmpdir(), 'opencode');
    fs.mkdirSync(parent, { recursive: true });
    const root = fs.mkdtempSync(path.join(parent, 'droidsembly-static-'));
    dirs.push(root);
    for (const [name, content] of files) {
      const file = path.join(root, name);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, content);
    }
    middleware = nodeStatic({ root });
  } else {
    middleware = coreStatic({ root: '/fixture', join: path.posix.join, getContent: async file => files.get(file.slice('/fixture'.length)) ?? null });
  }
  const app = new Hono();
  app.use('/private/*', async c => c.text('denied', 403));
  app.use('*', middleware);
  return app;
}

describe.each(['core', 'node'] as const)('%s static-path decoding', adapter => {
  it('does not bypass prefix middleware through a second decode', async () => {
    const app = staticFixture(adapter);
    for (const file of ['/private/marker.txt', '/%70rivate/marker.txt']) {
      const res = await app.request('http://fixture.invalid' + file);
      expect(res.status).toBe(403);
      expect(await res.text()).toBe('denied');
    }
    // First partial decode produces %70rivate; decoding that again must not serve private/.
    const res = await app.request('http://fixture.invalid/%%37%30rivate/marker.txt');
    expect(res.status).toBe(404);
    expect(await res.text()).not.toContain('PRIVATE_FIXTURE');
  });

  it('still serves ordinary percent-encoded spaces and Unicode', async () => {
    const app = staticFixture(adapter);
    for (const [file, content] of [['/hello%20world.txt', 'PUBLIC_SPACE'], ['/%E7%82%8E.txt', 'PUBLIC_UNICODE']]) {
      const res = await app.request('http://fixture.invalid' + file);
      expect(res.status).toBe(200);
      expect(await res.text()).toBe(content);
    }
  });
});

describe('URI normalization safety and compatibility', () => {
  it.each(['%6Aavascript:alert(1)', '%u006Aavascript:alert(1)'])('does not promote encoded schemes: %s', value => {
    expect(uri.normalize(value)).not.toBe('javascript:alert(1)');
    expect(() => uri.resolve('https://fixture.invalid/base/', value)).toThrow(/scheme is malformed/);
    expect(uri.parse(value).error).toBeTruthy();
    expect(uri.parse(value).scheme).not.toBe('javascript');
  });

  it('does not equate an encoded HTTP scheme with the plain one', () => {
    expect(uri.equal('%68ttp://a/', 'http://a/')).toBe(false);
  });

  it.each(['../x', 'a/../b'])('preserves relative-reference meaning: %s', value => {
    const base = 'https://fixture.invalid/parent/child/';
    expect(uri.resolve(base, uri.normalize(value))).toBe(uri.resolve(base, value));
  });

  it.each(['http://a@b@evil.example/', 'http://exa\tmple.com/', 'http://exa\nmple.com/', 'http://exa\rmple.com/'])('flags ambiguous authorities: %s', value => {
    expect(uri.parse(value).error).toBeTruthy();
  });

  it.each(['javascript:alert(1)', 'data:text/plain,fixture', 'vbscript:fixture'])('does not emit a live scheme in suffix output: %s', value => {
    // Suffix output omits the component's scheme. Its path must therefore not
    // acquire a different, live scheme when reparsed without suffix options.
    const serialized = uri.serialize({ scheme: 'https', path: value }, { reference: 'suffix' });
    expect(uri.parse(serialized).scheme).toBeUndefined();
  });

  it('still resolves ordinary references and schema-style identifiers', () => {
    expect(uri.resolve('https://fixture.invalid/a/b', '../c')).toBe('https://fixture.invalid/c');
    expect(uri.normalize('https://EXAMPLE.COM:443/a')).toBe('https://example.com/a');
    expect(uri.parse('urn:fixture:example').scheme).toBe('urn');
  });
});

describe('IPv6 zone parsing without the deprecated quadratic regexp', () => {
  it.each(['\n', '\r', '\u2028', '\u2029'])('rejects line terminator %j without scanning the legacy zone regexp', terminator => {
    const legacy = vi.spyOn(RE_ZONE_STRING, 'exec');
    expect(Address6.isValid('%'.repeat(512) + terminator)).toBe(false);
    // Mechanism check, not a timing budget. On the old package this fails before
    // the larger input is attempted, avoiding a baseline CPU-exhaustion fixture.
    expect(legacy).not.toHaveBeenCalled();
    expect(Address6.isValid('%'.repeat(100_000) + terminator)).toBe(false);
    expect(legacy).not.toHaveBeenCalled();
  });

  it('retains valid IPv4, IPv6 and scoped IPv6 handling', () => {
    expect(Address4.isValid('127.0.0.1')).toBe(true);
    expect(Address6.isValid('::1')).toBe(true);
    expect(new Address6('fe80::1%eth0').zone).toBe('%eth0');
    expect(Address6.isValid('not an address')).toBe(false);
  });
});
