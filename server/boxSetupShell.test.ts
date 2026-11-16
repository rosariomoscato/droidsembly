import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, it } from 'vitest';
import { BOX_HOME, setupMarker, setupScript, sq } from './boxScripts.ts';
import { withFixtureCleanup } from '../scripts/fixtureCleanup.ts';
import { runFixtureProcess } from '../scripts/fixtureProcess.ts';

const versions = { claude: '2.1.283', playwrightMcp: '0.0.83', codex: '0.163.0', opencode: '2.2.6' };

// Real local shells; every Box path is remapped and installers/Git are inert
// fixture executables. No network, cloud, real credentials or global config.
async function fixture(check: (f: {
  marker: string; installLog: string; cli: string;
  run: (env?: NodeJS.ProcessEnv) => ReturnType<typeof runFixtureProcess>;
}) => Promise<void>) {
  const parent = path.join(os.tmpdir(), 'opencode');
  fs.mkdirSync(parent, { recursive: true });
  const root = fs.mkdtempSync(path.join(parent, 'box-setup-shell-'));
  const posix = (p: string) => process.platform === 'win32' ? p.replaceAll('\\', '/').replace(/^([A-Za-z]):/, (_, d: string) => '/' + d.toLowerCase()) : p;
  const bash = process.platform === 'win32' ? path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Git', 'bin', 'bash.exe') : '/bin/bash';
  await withFixtureCleanup(async () => {
    expect(fs.existsSync(bash), 'local bash prerequisite').toBe(true);
    const box = path.join(root, 'box home');
    const bin = path.join(root, 'bin');
    const cli = path.join(box, '.cubefarm', 'cli', 'bin', 'opencode');
    fs.mkdirSync(path.dirname(cli), { recursive: true });
    fs.mkdirSync(bin);
    const executable = (file: string, body: string) => fs.writeFileSync(file, `#!/bin/sh\n${body}\n`, { mode: 0o755 });
    for (const tool of ['node', 'tmux', 'lsof', 'gh', 'git']) executable(path.join(bin, tool), 'exit 0');
    executable(path.join(bin, 'npm'), 'printf "INSTALL\\n" >> "$INSTALL_LOG"\nexit "${INSTALL_EXIT:-0}"');
    executable(cli, 'printf "%s\\n" "${FIXTURE_VERSION:-2.2.6}"');
    const installLog = path.join(root, 'installs.log');
    const options = { versions, rev: 4, gitName: "Ada O'Neil", gitEmail: 'fixture@example.invalid', cli: 'opencode' as const, browser: false };
    const script = setupScript(options).replaceAll(BOX_HOME, posix(box)).replaceAll('/tmp/cubefarm-cli.log', posix(path.join(root, 'npm.log')));
    const command = `sh -c ${sq(script)}`;
    const marker = setupMarker(versions, 4, 'opencode', false).replace(BOX_HOME, box);
    const env: NodeJS.ProcessEnv = {
      PATH: bin + path.delimiter + process.env.PATH, SystemRoot: process.env.SystemRoot, WINDIR: process.env.WINDIR,
      TEMP: root, TMP: root, HOME: root, BASH_ENV: '/dev/null', ENV: '/dev/null', INSTALL_LOG: posix(installLog),
    };
    await check({ marker, installLog, cli, run: extra => runFixtureProcess(bash, ['--noprofile', '--norc', '-c',
      `set +e\n${command}\ncode=$?\nprintf 'CALLER_STATUS:%s\\n' "$code"\nexit "$code"`], { cwd: root, env: { ...env, ...extra }, timeout: 10000 }) });
  }, () => fs.rmSync(root, { recursive: true, force: true, maxRetries: 5 }));
}

it('keeps first setup and the marker fast path inside the child shell', async () => {
  await fixture(async ({ marker, installLog, run }) => {
    const first = await run();
    expect(first.error).toBeUndefined(); expect(first.status, first.stderr).toBe(0);
    expect(first.stdout.trim()).toBe('CUBEFARM_SETUP_OK\nCALLER_STATUS:0');
    expect(fs.existsSync(marker)).toBe(true);
    const reused = await run();
    expect(reused.error).toBeUndefined(); expect(reused.status, reused.stderr).toBe(0);
    expect(reused.stdout.trim()).toBe('CUBEFARM_SETUP_OK\nCALLER_STATUS:0');
    expect(fs.readFileSync(installLog, 'utf8')).toBe('INSTALL\n');
  });
}, 30000);

it('propagates a real install failure without a success marker or leaked errexit', async () => {
  await fixture(async ({ marker, run }) => {
    const result = await run({ INSTALL_EXIT: '73' });
    expect(result.error).toBeUndefined(); expect(result.status).toBe(4);
    expect(result.stdout.trim()).toBe('CALLER_STATUS:4');
    expect(result.stdout).not.toContain('CUBEFARM_SETUP_OK');
    expect(fs.existsSync(marker)).toBe(false);
  });
}, 30000);

it('does not trust an existing marker when OpenCode verification fails', async () => {
  await fixture(async ({ marker, installLog, run }) => {
    fs.writeFileSync(marker, '');
    const result = await run({ FIXTURE_VERSION: 'wrong-version' });
    expect(result.error).toBeUndefined(); expect(result.status).toBe(4);
    expect(result.stdout.trim()).toBe('CALLER_STATUS:4');
    expect(result.stderr).toContain('OpenCode version mismatch');
    expect(result.stdout).not.toContain('CUBEFARM_SETUP_OK');
    expect(fs.existsSync(installLog)).toBe(false);
  });
}, 30000);
