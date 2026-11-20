// Install the real tarball in isolation and exercise its public CLI in demo mode only.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { officeOverrides } from '../bin/environment.js';
import { smokeStep } from './smokeStep.mjs';

const root = path.resolve(import.meta.dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
assert.equal(pkg.name, 'droidsembly');
assert.deepEqual(pkg.bin, { droidsembly: 'bin/droidsembly.js' });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'droidsembly-package-'));
console.log(`Package smoke fixture: ${tmp}`);
const mark = (row) => {
  fs.appendFileSync(path.join(tmp, 'smoke-phases.jsonl'), `${JSON.stringify(row)}\n`);
  console.log(`[package-smoke] ${JSON.stringify(row)}`);
};
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const dataHome = path.join(tmp, 'home');
const env = { ...officeOverrides(process.env, { SWARM_HOME: dataHome, SWARM_HOST: '127.0.0.1', SWARM_DEMO: '1' }), CI: '1' };
if (process.env.P11_NPM_TRACE === '1') {
  env.npm_config_logs_dir = path.join(tmp, 'npm-diagnostics');
  env.npm_config_timing = 'true';
}
// Deliberately disagree with the canonical aliases: no legacy home may be touched.
env.SWARM_HOME = path.join(tmp, 'legacy-unselected');
env.SWARM_DEMO = '0';
delete env.SWARM_DEMO_FLOORS;
delete env.SWARM_DEMO_AGENTS;
delete env.DROIDSEMBLY_DEMO_FLOORS;
delete env.DROIDSEMBLY_DEMO_AGENTS;
const sh = (label, cmd, cwd) => {
  const res = smokeStep(label, () => spawnSync(cmd, { cwd, shell: true, encoding: 'utf8', env }), mark);
  if (res.status !== 0) throw new Error(`${cmd} failed:\n${res.stdout}\n${res.stderr}`);
  return res.stdout.trim();
};

let server;
let verified = false;
try {
  // Optional retained tarball: validate exactly the artifact that was reviewed.
  let tarball = process.argv[2] && path.resolve(process.argv[2]);
  if (!tarball) {
    const packed = JSON.parse(sh('npm-pack', `${npm} pack --ignore-scripts --json --pack-destination "${tmp}"`, root))[0];
    const paths = packed.files.map((f) => f.path);
    assert.ok(!paths.some((f) => /PerChatGPT|STACK_E_ARCHITETTURA|FORK_CHANGELOG|NPM_DISTRIBUTION_PLAN/.test(f)), 'local documents must not be packed');
    tarball = path.join(tmp, packed.filename);
  }
  sh('npm-init', `${npm} init -y`, tmp);
  sh('npm-install', `${npm} install --no-audit --no-fund "${tarball}"`, tmp);
  const cli = path.join(tmp, 'node_modules', '.bin', process.platform === 'win32' ? 'droidsembly.cmd' : 'droidsembly');
  assert.equal(sh('cli-version', `"${cli}" --version`, tmp), pkg.version);
  const help = sh('cli-help', `"${cli}" --help`, tmp);
  assert.ok(help.includes(`Droidsembly ${pkg.version}`));
  assert.ok(help.includes(`npx droidsembly@${pkg.publishConfig.tag}`));
  assert.ok(help.includes('~/.cubefarm') && help.includes('~/.droidsembly') && help.includes('DROIDSEMBLY_HOME'), 'home selection compatibility is documented');
  console.log(`droidsembly --version/--help: ${pkg.version}`);

  const installed = path.join(tmp, 'node_modules', pkg.name);
  for (const file of ['LICENSE', 'README.md', 'README.it.md', 'docs/app-starter.md', 'docs/app-starter-provenance.md', 'bin/droidsembly.js', 'bin/cubefarm.js', 'bin/environment.js', 'bin/distribution.js', 'dist/icons/Sora-OFL.txt', 'dist-server/index.js', 'dist-server/skills/ceo-app-starter.md', 'dist/third-party-licenses.json', 'dist/THIRD_PARTY_LICENSES.txt']) {
    assert.ok(fs.existsSync(path.join(installed, file)), `missing package file: ${file}`);
  }
  assert.equal(sh('legacy-version', `"${process.execPath}" "${path.join(installed, 'bin', 'cubefarm.js')}" --version`, tmp), pkg.version);
  assert.equal(sh('legacy-help', `"${process.execPath}" "${path.join(installed, 'bin', 'cubefarm.js')}" --help`, tmp), help);
  const licenses = JSON.parse(fs.readFileSync(path.join(installed, 'dist/third-party-licenses.json'), 'utf8'));
  const notices = fs.readFileSync(path.join(installed, 'dist/THIRD_PARTY_LICENSES.txt'), 'utf8');
  assert.ok(licenses.length > 0, 'empty client license inventory');
  for (const entry of licenses) {
    assert.ok(entry.text?.trim(), `missing license text: ${entry.name}`);
    assert.ok(notices.includes(`${entry.name}@${entry.version}`) && notices.includes(entry.text), `missing readable license: ${entry.name}`);
    for (const notice of entry.notices) assert.ok(notices.includes(notice.text), `missing additional notice: ${entry.name}/${notice.file}`);
  }
  for (const name of ['react', 'three', '@react-three/fiber', '@react-three/rapier', '@dimforge/rapier3d-compat', 'postprocessing']) {
    assert.ok(licenses.some((entry) => entry.name === name), `missing bundled library: ${name}`);
  }
  console.log(`Installed client license texts verified: ${licenses.length} packages`);
  const mcpPkg = createRequire(path.join(installed, 'dist-server', 'index.js')).resolve('@playwright/mcp/package.json');
  const mcp = spawnSync(process.execPath, [path.join(path.dirname(mcpPkg), 'cli.js'), '--version'], { encoding: 'utf8', env });
  if (mcp.status !== 0) throw new Error(`the pinned browser tool does not run:\n${mcp.stdout}\n${mcp.stderr}`);

  // Use an unused loopback port; never probe or attach to an existing office.
  const socket = net.createServer();
  socket.listen(Number(process.env.SWARM_PORT) || 0, '127.0.0.1');
  await once(socket, 'listening');
  const port = socket.address().port;
  await new Promise((resolve, reject) => socket.close((error) => error ? reject(error) : resolve()));
  server = spawn(process.execPath, [path.join(installed, pkg.bin.droidsembly), '--demo', '--no-open', '--port', String(port)], {
    env: officeOverrides(env, { SWARM_PORT: String(port) }), stdio: ['ignore', 'inherit', 'inherit'],
  });
  let startupError;
  server.on('error', (error) => { startupError = error; });
  let state = null;
  for (let i = 0; i < 120 && !state; i++) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (startupError) throw startupError;
    if (server.exitCode !== null) throw new Error(`the office exited with code ${server.exitCode}`);
    state = await fetch(`http://127.0.0.1:${port}/api/state`, { signal: AbortSignal.timeout(2000) })
      .then((r) => r.json()).catch(() => null);
  }
  assert.ok(state && Array.isArray(state.repos), 'demo office never answered /api/state');
  const page = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(5000) }).then((r) => r.text());
  assert.ok(page.includes('<title>Droidsembly</title>'), 'client not served');
  // HTTP readiness precedes the debounced state write (currently 1500 ms).
  // Wait for a valid persisted snapshot, not an arbitrary startup delay.
  let saved;
  for (let i = 0; i < 100 && !saved; i++) {
    if (server.exitCode !== null) throw new Error(`the office exited before saving state: ${server.exitCode}`);
    try {
      saved = JSON.parse(fs.readFileSync(path.join(dataHome, 'demo-state.json'), 'utf8'));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    if (!saved) await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(saved && Array.isArray(saved.repos) && Array.isArray(saved.agents), 'demo state not saved in the isolated home');
  assert.deepEqual(saved.repos.map((r) => r.id).sort(), state.repos.map((r) => r.id).sort(), 'persisted state must belong to this demo');
  assert.ok(!fs.existsSync(path.join(dataHome, 'state.json')), 'real state must not be created');
  assert.ok(!fs.existsSync(env.SWARM_HOME), 'shadowed legacy home must not be created');
  console.log(`demo office up: ${state.repos.length} floors, ${state.agents.length} agents; isolated data and client verified`);
  const skill = fs.readFileSync(path.join(installed, 'dist-server/skills/ceo-app-starter.md'), 'utf8');
  assert.ok(skill.includes('Original Droidsembly instructions') && skill.includes('planning only'));
  const created = await fetch(`http://127.0.0.1:${port}/api/repos/new`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'package-planning-smoke', visibility: 'private', onboardCeo: true, autoAssign: false }),
  });
  assert.ok(created.ok, `create new guided demo app: HTTP ${created.status}`);
  const project = await created.json();
  let interview;
  for (let i = 0; i < 60 && !interview; i++) {
    const snapshot = await fetch(`http://127.0.0.1:${port}/api/state`).then((r) => r.json());
    const repo = snapshot.repos.find((r) => r.id === project.id);
    assert.ok(repo?.appStarter, 'installed server did not create a scoped draft');
    assert.equal(repo.issues.length, 0, 'plan issues before approval');
    assert.equal(snapshot.agents.filter((a) => a.repoId === project.id).length, 0, 'worker prepared before approval');
    if (repo.appStarter.messages.some((m) => m.from === 'ceo')) interview = repo.appStarter;
    else await new Promise((resolve) => setTimeout(resolve, 500));
  }
  assert.ok(interview, 'installed bundled CEO did not load its local planning resource and save a question');
  assert.equal(interview.status, 'interview');
  assert.equal(interview.approved, undefined);
  console.log('Installed CEO app-starter resource loaded: persisted scoped question, zero plan issues/workers');
  verified = true;
} finally {
  if (server?.pid && server.exitCode === null && server.signalCode === null) {
    const closed = once(server, 'close');
    server.kill();
    await closed;
  }
  if (verified) fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5 });
  else console.error(`Package smoke failed; isolated fixture retained for diagnosis: ${tmp}`);
}
