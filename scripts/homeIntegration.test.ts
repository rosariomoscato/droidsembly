import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { runFixtureProcess } from './fixtureProcess.ts';
import { fixtureWork } from './fixtureWork.ts';

const root = path.resolve(import.meta.dirname, '..');
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'droidsembly-home-integration-'));
const work = fixtureWork();
let failed = false;
afterEach((context) => { if (context.task.result?.state === 'fail') failed = true; });
afterAll(async () => {
  await work.drain(); // a deadline does not cancel a child-process promise
  if (!failed) fs.rmSync(temp, { recursive: true, force: true });
  else console.error(`Home integration fixture retained: ${temp}`);
});
function run(args: string[], env: NodeJS.ProcessEnv, label: string) {
  const at = performance.now();
  const task = runFixtureProcess(process.execPath, args, { cwd: root, env, timeout: 4000 });
  void task.then((result) => {
    const bad = result.error || result.status !== (label.startsWith('ambiguous-') ? 1 : 0);
    if (bad) failed = true;
    if (bad || process.env.HOME_FIXTURE_TRACE === '1') console.info('HOME_FIXTURE_TRACE', JSON.stringify({
      label, ms: performance.now() - at, status: result.status, signal: result.signal,
      error: result.error?.message, observation: result.observation,
      phases: result.stderr.split(/\r?\n/).filter(line => line.startsWith('HOME_FIXTURE_PHASE ')),
    }));
  });
  return work.track(task);
}
const envFor = (home: string): NodeJS.ProcessEnv => ({
  PATH: process.env.PATH, SystemRoot: process.env.SystemRoot,
  TEMP: process.env.TEMP, TMP: process.env.TMP,
  HOME: home, USERPROFILE: home, NO_COLOR: '1', CI: '1',
  SWARM_PORT: '0', DROIDSEMBLY_PORT: '0', SWARM_PREVIEW_PORT: '9300',
});

describe('shared launcher / source server home contract', () => {
  it.each(['new', 'legacy', 'current', 'explicit'] as const)('selects the same %s office without writing any files', async (scenario) => {
    const home = path.join(temp, scenario);
    fs.mkdirSync(home);
    if (scenario !== 'new') fs.mkdirSync(path.join(home, scenario === 'legacy' ? '.cubefarm' : '.droidsembly'));
    const env = envFor(home);
    const expected = path.join(home, scenario === 'legacy' ? '.cubefarm' : '.droidsembly');
    if (scenario === 'explicit') {
      env.DROIDSEMBLY_HOME = expected;
      env.SWARM_HOME = path.join(home, 'wrong');
      env.DROIDSEMBLY_PORT = '4321'; env.SWARM_PORT = '5432';
      env.DROIDSEMBLY_HOST = '127.0.0.2'; env.SWARM_HOST = '0.0.0.0';
      env.DROIDSEMBLY_PREVIEW_PORT = '9400';
    }
    // Observations only: loader startup remains inside the same four-second deadline.
    const code = `const mark=phase=>console.error('HOME_FIXTURE_PHASE '+JSON.stringify({phase,ms:performance.now()})); mark('entry'); const c=await import(${JSON.stringify(pathToFileURL(path.join(root, 'server/config.ts')).href)}); mark('server-config'); const l=await import(${JSON.stringify(pathToFileURL(path.join(root, 'scripts/officeSteps.mjs')).href)}); mark('launcher'); console.log(JSON.stringify({server:c.HOME_DIR,launcher:l.swarmHome(),port:c.PORT,host:c.HOST,preview:c.PREVIEW_PORT}));`;
    const result = await run(['--import', 'tsx', '--input-type=module', '-e', code], env, scenario);
    expect(result.error).toBeUndefined(); expect(result.status).toBe(0);
    const data = JSON.parse(result.stdout);
    expect(data.server).toBe(expected); expect(data.launcher).toBe(expected);
    const phases = result.stderr.split(/\r?\n/).filter(line => line.startsWith('HOME_FIXTURE_PHASE ')).map(line => JSON.parse(line.slice('HOME_FIXTURE_PHASE '.length)) as { phase: string; ms: number });
    expect(phases.map(p => p.phase)).toEqual(['entry', 'server-config', 'launcher']);
    expect(phases.every(p => Number.isFinite(p.ms) && p.ms >= 0)).toBe(true);
    if (scenario === 'explicit') expect(data).toMatchObject({ port: 4321, host: '127.0.0.2', preview: 9400 });
    expect(fs.existsSync(path.join(home, 'wrong'))).toBe(false);
    expect(fs.existsSync(path.join(expected, 'state.json'))).toBe(false);
  });

  it.each(['cli', 'launcher'] as const)('refuses ambiguous defaults in the %s before starting an office', async (entry) => {
    const home = path.join(temp, entry);
    fs.mkdirSync(home);
    for (const name of ['.droidsembly', '.cubefarm']) fs.mkdirSync(path.join(home, name));
    const script = entry === 'cli' ? 'bin/droidsembly.js' : 'scripts/office.mjs';
    const result = await run([path.join(root, script), '--demo', '--no-open'], envFor(home), `ambiguous-${entry}`);
    expect(result.error).toBeUndefined(); expect(result.status).toBe(1);
    expect(result.stderr).toContain('Both .droidsembly and .cubefarm exist');
    expect(result.stderr).toContain('DROIDSEMBLY_HOME');
    for (const name of ['.droidsembly', '.cubefarm']) expect(fs.readdirSync(path.join(home, name))).toEqual([]);
  });
});
