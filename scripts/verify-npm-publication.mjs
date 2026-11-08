// Read-only registry checks; never publish, change dist-tags, retry Release, or use auth.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { releaseInfo } from '../bin/distribution.js';
import { capturePublication, integrity, waitForPublication } from './npmPublication.mjs';

const root = path.resolve(import.meta.dirname, '..');
assert.ok(process.env.RELEASE_EVIDENCE, 'RELEASE_EVIDENCE must name an isolated evidence directory');
const dir = path.resolve(process.env.RELEASE_EVIDENCE);
const snapshot = path.join(dir, 'before.json');
const report = path.join(dir, 'availability.json');
const mode = process.argv[2];
if (mode === 'capture') {
  assert.ok(!fs.existsSync(snapshot), 'Do not overwrite a previous publication snapshot');
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json')));
  const { channel } = releaseInfo(pkg.version, process.env.RELEASE_TAG);
  const [pack] = JSON.parse(fs.readFileSync(path.join(dir, 'pack.json')));
  assert.equal(pack.name, pkg.name);
  assert.equal(pack.version, pkg.version);
  assert.equal(pack.filename, `droidsembly-${pkg.version}.tgz`);
  const tarball = path.join(dir, pack.filename);
  const bytes = fs.readFileSync(tarball);
  assert.equal(bytes.length, pack.size);
  assert.equal(integrity(bytes), pack.integrity);
  const gitHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const before = await capturePublication({ name: pkg.name, version: pkg.version, channel, gitHead, integrity: pack.integrity, size: bytes.length });
  fs.writeFileSync(snapshot, JSON.stringify(before, null, 2), { flag: 'wx' });
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `tarball=${tarball}\n`);
  console.log('Captured unpublished identity, exact artifact integrity and current channels');
} else if (mode === 'verify') {
  assert.ok(!fs.existsSync(report), 'Preserve previous availability results');
  const before = JSON.parse(fs.readFileSync(snapshot));
  const record = { startedAt: new Date().toISOString(), expected: before, observations: [], outcome: 'in-progress' };
  const save = () => fs.writeFileSync(report, JSON.stringify(record, null, 2));
  save();
  try {
    const result = await waitForPublication(before, { observe: observation => { record.observations.push(observation); save(); } });
    fs.writeFileSync(path.join(dir, 'public.tgz'), result.bytes, { flag: 'wx' });
    record.outcome = 'canonical-public-artifact-and-channels-verified';
    record.channels = result.channels;
    record.sha256 = result.sha256;
  } catch (error) {
    record.outcome = 'public-availability-not-confirmed-do-not-republish';
    record.error = error.message;
    process.exitCode = 1;
  } finally {
    record.endedAt = new Date().toISOString();
    save();
    console.log(record.outcome);
  }
} else {
  throw new Error('Expected capture or verify');
}
