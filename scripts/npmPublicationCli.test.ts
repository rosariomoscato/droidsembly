import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { afterEach, expect, it } from 'vitest';
import { integrity } from './npmPublication.mjs';
import { releaseInfo } from '../bin/distribution.js';

const fixtures: string[] = [];
afterEach(() => {
  for (const dir of fixtures.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

it('runs actual capture/verify CLIs offline, writes exact artifact/output/report, and refuses report overwrite', () => {
  const parent = path.join(os.tmpdir(), 'opencode');
  fs.mkdirSync(parent, { recursive: true });
  const dir = fs.mkdtempSync(path.join(parent, 'publication-cli-'));
  fixtures.push(dir);
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const { channel } = releaseInfo(pkg.version, `droidsembly-v${pkg.version}`);
  const oldChannels = { latest: '0.4.0-beta.1', next: '0.0.0-old' };
  const publicChannels = { ...oldChannels, [channel]: pkg.version };
  const gitHead = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const bytes = Buffer.from('synthetic CLI publication artifact');
  const filename = `droidsembly-${pkg.version}.tgz`;
  fs.writeFileSync(path.join(dir, filename), bytes);
  fs.writeFileSync(path.join(dir, 'pack.json'), JSON.stringify([{ name: pkg.name, version: pkg.version, filename, size: bytes.length, integrity: integrity(bytes) }]));
  const preload = path.join(dir, 'mock-registry.mjs');
  fs.writeFileSync(preload, `
    import assert from 'node:assert/strict';
    const version = ${JSON.stringify(pkg.version)};
    const artifact = Buffer.from(${JSON.stringify(bytes.toString('base64'))}, 'base64');
    const metadata = { name: 'droidsembly', version, gitHead: ${JSON.stringify(gitHead)}, dist: { integrity: ${JSON.stringify(integrity(bytes))}, tarball: 'https://registry.npmjs.org/droidsembly/-/droidsembly-' + version + '.tgz' } };
    globalThis.fetch = async (url, options) => {
      assert.deepEqual(options.headers, { 'Cache-Control': 'no-cache' });
      assert.equal(options.redirect, 'error');
      if (String(url).endsWith('/dist-tags')) return Response.json(process.argv[2] === 'capture'
        ? ${JSON.stringify(oldChannels)} : process.env.TEST_NEXT_ALIGNED === '1'
          ? { ...${JSON.stringify(publicChannels)}, next: version } : ${JSON.stringify(publicChannels)});
      if (String(url).endsWith('/' + version)) return process.argv[2] === 'capture' ? new Response('', { status: 404 }) : Response.json(metadata);
      if (String(url) === metadata.dist.tarball) return new Response(artifact);
      throw new Error('Unexpected network access: ' + url);
    };
  `);
  const env = { ...process.env, RELEASE_EVIDENCE: dir, RELEASE_TAG: `droidsembly-v${pkg.version}`, GITHUB_OUTPUT: path.join(dir, 'outputs') };
  const run = (mode: string) => spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, 'scripts/verify-npm-publication.mjs', mode], { env, encoding: 'utf8' });
  const capture = run('capture');
  expect(capture.status, capture.stderr).toBe(0);
  expect(fs.readFileSync(env.GITHUB_OUTPUT, 'utf8')).toBe(`tarball=${path.join(dir, filename)}\n`);
  const verify = run('verify');
  expect(verify.status, verify.stderr).toBe(0);
  expect(fs.readFileSync(path.join(dir, 'public.tgz'))).toEqual(bytes);
  const beforeReport = fs.readFileSync(path.join(dir, 'availability.json'), 'utf8');
  expect(JSON.parse(beforeReport)).toMatchObject({ outcome: 'canonical-public-artifact-and-channels-verified', channels: publicChannels });
  expect(run('verify').status).not.toBe(0);
  expect(fs.readFileSync(path.join(dir, 'availability.json'), 'utf8')).toBe(beforeReport);
  if (pkg.version === '0.5.0-beta.1') {
    const check = (mode: string, aligned = false) => spawnSync(process.execPath,
      ['--import', pathToFileURL(preload).href, 'scripts/check-npm-next.mjs', mode],
      { env: { ...env, TEST_NEXT_ALIGNED: aligned ? '1' : '0' }, encoding: 'utf8' });
    const ready = check('before');
    expect(ready.status, ready.stderr).toBe(0);
    expect(check('after').status).not.toBe(0);
    expect(check('before', true).status).not.toBe(0);
    const aligned = check('after', true);
    expect(aligned.status, aligned.stderr).toBe(0);
    expect(JSON.parse(fs.readFileSync(path.join(dir, 'next-alignment.json'), 'utf8')).channels)
      .toEqual({ latest: pkg.version, next: pkg.version });
    expect(check('after', true).status).not.toBe(0);
  }
});
