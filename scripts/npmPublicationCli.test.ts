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

function fixture() {
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
  return { dir, pkg, channel, oldChannels, publicChannels, gitHead, bytes, filename, preload, env, run };
}

it('runs actual capture/verify CLIs offline, writes exact artifact/output/report, and refuses report overwrite', () => {
  const { dir, publicChannels, bytes, filename, env, run } = fixture();
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
});

// These are independent guard scenarios, not more subprocesses in the original publication test.
it.runIf(JSON.parse(fs.readFileSync('package.json', 'utf8')).version === '0.5.0-beta.1').each([
  { name: 'accepts the pre-alignment channels', mode: 'before', aligned: false, overwrite: false, success: true },
  { name: 'refuses an incomplete alignment', mode: 'after', aligned: false, overwrite: false, success: false },
  { name: 'refuses an already changed pre-alignment channel', mode: 'before', aligned: true, overwrite: false, success: false },
  { name: 'records a verified alignment', mode: 'after', aligned: true, overwrite: false, success: true },
  { name: 'preserves existing alignment evidence', mode: 'after', aligned: true, overwrite: true, success: false },
])('$name', ({ mode, aligned, overwrite, success }) => {
  const f = fixture();
  fs.writeFileSync(path.join(f.dir, 'before.json'), JSON.stringify({
    name: f.pkg.name, version: f.pkg.version, channel: f.channel, gitHead: f.gitHead,
    integrity: integrity(f.bytes), size: f.bytes.length, previousChannels: f.oldChannels,
  }));
  fs.writeFileSync(path.join(f.dir, 'availability.json'), JSON.stringify({
    outcome: 'canonical-public-artifact-and-channels-verified', channels: f.publicChannels,
  }));
  const evidence = path.join(f.dir, 'next-alignment.json');
  if (overwrite) fs.writeFileSync(evidence, 'preserve this evidence');
  const result = spawnSync(process.execPath,
    ['--import', pathToFileURL(f.preload).href, 'scripts/check-npm-next.mjs', mode],
    { env: { ...f.env, TEST_NEXT_ALIGNED: aligned ? '1' : '0' }, encoding: 'utf8' });
  if (success) expect(result.status, result.stderr).toBe(0);
  else expect(result.status, result.stderr).not.toBe(0);
  if (overwrite) expect(fs.readFileSync(evidence, 'utf8')).toBe('preserve this evidence');
  else if (success && mode === 'after') {
    expect(JSON.parse(fs.readFileSync(evidence, 'utf8')).channels)
      .toEqual({ latest: f.pkg.version, next: f.pkg.version });
  } else expect(fs.existsSync(evidence)).toBe(false);
});
