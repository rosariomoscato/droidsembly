import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { runFixtureProcess } from './fixtureProcess.ts';

const root = path.resolve(import.meta.dirname, '..');
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'droidsembly-entry-'));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
afterAll(() => fs.rmSync(home, { recursive: true, force: true }));

describe('canonical CLI and legacy checkout entry', () => {
  it('publishes only the droidsembly command at its canonical path, with matching lock metadata', () => {
    expect(pkg.bin).toEqual({ droidsembly: 'bin/droidsembly.js' });
    const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
    expect(lock.packages[''].bin).toEqual(pkg.bin);
    for (const entry of ['droidsembly', 'cubefarm']) {
      expect(fs.readFileSync(path.join(root, 'bin', `${entry}.js`), 'utf8')).toMatch(/^#!\/usr\/bin\/env node\n/);
    }
  });

  it.each(['--version', '--help', '--not-a-real-option'])('preserves arguments, output and exit status for %s', async (arg) => {
    const results = await Promise.all(['droidsembly', 'cubefarm'].map((entry) => runFixtureProcess(process.execPath, [path.join(root, 'bin', `${entry}.js`), arg], {
      cwd: home, env: { ...process.env, SWARM_HOME: home, NO_COLOR: '1' }, timeout: 4000,
    })));
    const [current, legacy] = results;
    for (const result of results) {
      expect(result.error).toBeUndefined();
      expect(result.signal).toBeNull();
      expect(result.status).toBe(arg === '--not-a-real-option' ? 1 : 0);
    }
    expect(legacy.stdout).toBe(current.stdout);
    expect(legacy.stderr).toBe(current.stderr);
    if (arg === '--version') expect(current.stdout.trim()).toBe(pkg.version);
    if (arg === '--help') {
      expect(current.stdout).toContain(`npx droidsembly@${pkg.publishConfig.tag}`);
      expect(current.stdout).toContain('~/.cubefarm');
      expect(current.stdout).toContain('~/.droidsembly');
      expect(current.stdout).toContain('DROIDSEMBLY_HOME');
    }
    expect(fs.readdirSync(home)).toEqual([]); // no office or credential initialization
  });
});
