// Read-only guards around the workflow's separately authorized next alignment.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { releaseInfo } from '../bin/distribution.js';
import { assertNextAlignment, inspectPublication } from './npmPublication.mjs';

assert.ok(process.env.RELEASE_EVIDENCE);
const dir = path.resolve(process.env.RELEASE_EVIDENCE);
const before = JSON.parse(fs.readFileSync(path.join(dir, 'before.json')));
const report = JSON.parse(fs.readFileSync(path.join(dir, 'availability.json')));
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url)));
const release = releaseInfo(pkg.version, process.env.RELEASE_TAG);
assert.equal(before.name, pkg.name);
assert.equal(before.version, pkg.version);
assert.equal(before.channel, release.channel);
assert.equal(before.gitHead, execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim());
assert.equal(report.outcome, 'canonical-public-artifact-and-channels-verified');
const mode = process.argv[2];
assert.ok(mode === 'before' || mode === 'after');
const result = await inspectPublication(before);
assert.equal(result.available, true, 'Published artifact must be available before changing channels');
assertNextAlignment(before, result.channels, mode === 'after');
if (mode === 'after') {
  fs.writeFileSync(path.join(dir, 'next-alignment.json'), JSON.stringify({
    verifiedAt: new Date().toISOString(), version: before.version, channels: result.channels,
  }, null, 2), { flag: 'wx' });
}
console.log(`Verified ${mode} next alignment; no package publication performed`);
