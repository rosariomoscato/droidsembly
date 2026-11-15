import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { officeEnv, officeHome, officeOverrides } from '../bin/environment.js';
import { swarmHome, clientPort } from './officeSteps.mjs';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'droidsembly-home-test-'));
afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

describe('canonical environment compatibility', () => {
  it.each(['HOME', 'PORT', 'HOST', 'CLIENT_PORT', 'DEMO', 'DEMO_FLOORS', 'DEMO_AGENTS', 'PREVIEW_PORT', 'PR_PREVIEW_IDLE_MIN', 'LAUNCHER', 'DEMO_LAUNCHER'])('supports both generations of %s with canonical precedence', (suffix) => {
    const legacy = `SWARM_${suffix}`;
    const current = `DROIDSEMBLY_${suffix}`;
    expect(officeEnv({ [legacy]: 'old' }, legacy)).toBe('old');
    expect(officeEnv({ [current]: 'new', [legacy]: 'old' }, legacy)).toBe('new');
    expect(officeEnv({ [current]: '', [legacy]: 'old' }, legacy)).toBe('');
  });

  it.each(['CLAUDE_TOKEN', 'OLLAMA_URL', 'LMSTUDIO_URL', 'LLAMACPP_URL', 'OMLX_URL'])('supports CUBEFARM_%s without changing the input map', (suffix) => {
    const env = Object.freeze({ [`CUBEFARM_${suffix}`]: 'old', [`DROIDSEMBLY_${suffix}`]: 'new' });
    expect(officeEnv(env, `CUBEFARM_${suffix}`)).toBe('new');
  });

  it('propagates explicit CLI/launcher options under both names over inherited aliases', () => {
    const original = { DROIDSEMBLY_PORT: '9999', SWARM_PORT: '8888', DROIDSEMBLY_HOME: 'inherited' };
    const child = officeOverrides(original, { SWARM_PORT: '4317', SWARM_HOME: 'selected' });
    expect(child).toMatchObject({ DROIDSEMBLY_PORT: '4317', SWARM_PORT: '4317', DROIDSEMBLY_HOME: 'selected', SWARM_HOME: 'selected' });
    expect(original.DROIDSEMBLY_PORT).toBe('9999');
    expect(clientPort({ DROIDSEMBLY_CLIENT_PORT: '4422', SWARM_CLIENT_PORT: '5522' })).toBe(4422);
  });
});

describe('office home selection without migration', () => {
  it.each(['new', 'legacy', 'current', 'both'] as const)('handles %s default folders without creating, merging or moving data', (scenario) => {
    const home = path.join(root, scenario);
    fs.mkdirSync(home);
    for (const dir of scenario === 'both' ? ['.droidsembly', '.cubefarm'] : scenario === 'legacy' ? ['.cubefarm'] : scenario === 'current' ? ['.droidsembly'] : []) {
      fs.mkdirSync(path.join(home, dir));
      fs.writeFileSync(path.join(home, dir, 'sentinel'), `unchanged-${dir}`);
    }
    const before = fs.readdirSync(home);
    if (scenario === 'both') {
      expect(() => officeHome({}, home)).toThrow(/Both.*Set DROIDSEMBLY_HOME/);
      expect(() => swarmHome({}, home)).toThrow(/Both/);
    } else {
      const chosen = path.join(home, scenario === 'legacy' ? '.cubefarm' : '.droidsembly');
      expect(officeHome({}, home)).toBe(chosen);
      expect(swarmHome({}, home)).toBe(chosen);
    }
    expect(fs.readdirSync(home)).toEqual(before);
    for (const dir of before) expect(fs.readFileSync(path.join(home, dir, 'sentinel'), 'utf8')).toBe(`unchanged-${dir}`);
  });

  it('permits an explicit selection despite both defaults, with canonical precedence', () => {
    const home = path.join(root, 'explicit');
    fs.mkdirSync(home);
    const old = path.join(home, '.cubefarm'), current = path.join(home, '.droidsembly');
    fs.mkdirSync(old); fs.mkdirSync(current);
    expect(officeHome({ DROIDSEMBLY_HOME: current, SWARM_HOME: old }, home)).toBe(current);
    expect(officeHome({ SWARM_HOME: old }, home)).toBe(old);
    expect(officeHome({ DROIDSEMBLY_HOME: path.join(home, 'absent') }, home)).toBe(path.join(home, 'absent'));
    expect(fs.existsSync(path.join(home, 'absent'))).toBe(false);
  });

  it('rejects blank explicit choices rather than falling back to an inherited legacy home', () => {
    expect(() => officeHome({ DROIDSEMBLY_HOME: '', SWARM_HOME: 'old' }, root)).toThrow(/must not be empty/);
    expect(() => officeHome({ SWARM_HOME: '  ' }, root)).toThrow(/must not be empty/);
  });

  it('does not treat a file or an I/O failure as an absent old office', () => {
    const home = path.join(root, 'collision');
    fs.mkdirSync(home);
    fs.writeFileSync(path.join(home, '.cubefarm'), 'keep');
    expect(() => officeHome({}, home)).toThrow(/not a directory/);
    expect(() => officeHome({}, home, () => { throw new Error('EACCES'); })).toThrow('EACCES');
    expect(fs.readFileSync(path.join(home, '.cubefarm'), 'utf8')).toBe('keep');
    expect(fs.existsSync(path.join(home, '.droidsembly'))).toBe(false);
  });
});
