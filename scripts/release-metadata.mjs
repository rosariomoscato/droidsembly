// Read-only release validation; optional Actions outputs, never a publish or version bump.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { releaseInfo } from '../bin/distribution.js';

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const lock = JSON.parse(fs.readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8'));
assert.equal(pkg.name, 'droidsembly');
assert.equal(pkg.repository.url, 'git+https://github.com/rosariomoscato/droidsembly.git');
assert.deepEqual(pkg.bin, { droidsembly: 'bin/droidsembly.js' });
assert.equal(pkg.license, 'MIT');
for (const key of ['name', 'version']) {
  assert.equal(pkg[key], lock[key]);
  assert.equal(pkg[key], lock.packages[''][key]);
}
assert.deepEqual(pkg.bin, lock.packages[''].bin);
const release = releaseInfo(pkg.version, process.env.RELEASE_TAG);
assert.equal(pkg.publishConfig.access, 'public');
assert.equal(pkg.publishConfig.registry, 'https://registry.npmjs.org/');
assert.equal(pkg.publishConfig.tag, release.channel, 'publishConfig.tag must match the release channel');
if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT,
  `channel=${release.channel}\nversion=${pkg.version}\nprerelease=${pkg.version.includes('-')}\n`);
console.log(JSON.stringify({ package: pkg.name, version: pkg.version, ...release }));
