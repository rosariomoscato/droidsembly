import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import { expect, it } from 'vitest';
import { BOX_HOME, prepareDeskScript } from './boxScripts.ts';

/** Real local Git and bash, no GitHub/cloud/credentials/AI. All script paths are remapped into this fixture. */
it('reuses the development worktree for QA at the exact PR head with real Git', () => {
  const parent = path.join(os.tmpdir(), 'opencode');
  fs.mkdirSync(parent, { recursive: true });
  const root = fs.mkdtempSync(path.join(parent, 'box-qa-git-'));
  const bash = process.platform === 'win32' ? path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Git', 'bin', 'bash.exe') : '/bin/bash';
  const posix = (p: string) => process.platform === 'win32' ? p.replaceAll('\\', '/').replace(/^([A-Za-z]):/, (_, drive: string) => '/' + drive.toLowerCase()) : p;
  const remote = path.join(root, 'remote.git'), author = path.join(root, 'author'), box = path.join(root, 'box home');
  const globalConfig = path.join(root, 'gitconfig');
  const env: NodeJS.ProcessEnv = { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, WINDIR: process.env.WINDIR,
    TEMP: process.env.TEMP, TMP: process.env.TMP, HOME: root, GIT_CONFIG_GLOBAL: globalConfig, GIT_CONFIG_NOSYSTEM: '1', GIT_TERMINAL_PROMPT: '0' };
  const git = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, env, encoding: 'utf8', timeout: 10000, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  try {
    expect(fs.existsSync(bash), 'local bash prerequisite').toBe(true);
    fs.writeFileSync(globalConfig, `[user]\n name = Fixture\n email = fixture@example.invalid\n[protocol "file"]\n allow = always\n[url "${pathToFileURL(remote).href}"]\n insteadOf = https://github.com/test/ordinary.git\n`);
    git(root, 'init', '-q', '--bare', remote);
    git(root, 'init', '-q', '-b', 'main', author);
    fs.writeFileSync(path.join(author, 'README.md'), 'Synthetic local fixture\n');
    git(author, 'add', 'README.md'); git(author, 'commit', '-qm', 'Initial fixture');
    git(author, 'remote', 'add', 'origin', remote); git(author, 'push', '-q', 'origin', 'main');
    git(remote, 'symbolic-ref', 'HEAD', 'refs/heads/main');
    const prepare = (pr: number | undefined, branch: string, continuation = '') => {
      const script = prepareDeskScript('test/ordinary', { defaultBranch: 'main', ...(pr ? { pr } : {}) }, branch).replaceAll(BOX_HOME, posix(box));
      return spawnSync(bash, ['--noprofile', '--norc', '-c', script + continuation], { cwd: root, env, encoding: 'utf8', timeout: 10000 });
    };
    const development = prepare(undefined, 'swarm/issue-7-ada');
    expect(development.error).toBeUndefined(); expect(development.status, development.stderr).toBe(0);
    const desk = path.join(box, 'work', 'test__ordinary');
    const gitFile = fs.readFileSync(path.join(desk, '.git'), 'utf8');
    fs.writeFileSync(path.join(desk, 'worker.txt'), 'Synthetic delivered change\n');
    git(desk, 'add', 'worker.txt'); git(desk, 'commit', '-qm', 'Deliver fixture');
    const head = git(desk, 'rev-parse', 'HEAD');
    git(desk, 'push', '-q', 'origin', 'HEAD:refs/heads/swarm/issue-7-ada', 'HEAD:refs/pull/7/head');
    // The SDK's command shell must regain control even when reuse takes its early exit 0.
    const qa = prepare(7, 'qa/pr-7-ada', '\nprintf "CALLER_CONTINUED\\n"');
    expect(qa.error).toBeUndefined(); expect(qa.status, qa.stderr).toBe(0);
    expect(qa.stdout.trim()).toBe(`${posix(desk)}\nCALLER_CONTINUED`); expect(qa.stderr).not.toContain('rebuilt');
    expect(fs.readFileSync(path.join(desk, '.git'), 'utf8')).toBe(gitFile);
    expect(git(desk, 'rev-parse', 'HEAD')).toBe(head);
    expect(git(desk, 'branch', '--show-current')).toBe('qa/pr-7-ada');
    expect(git(desk, 'status', '--porcelain')).toBe('');
  } finally { fs.rmSync(root, { recursive: true, force: true, maxRetries: 5 }); }
}, 30000);

it('returns a real preparation error to the caller without leaking errexit or emitting a success path', () => {
  const parent = path.join(os.tmpdir(), 'opencode');
  fs.mkdirSync(parent, { recursive: true });
  const root = fs.mkdtempSync(path.join(parent, 'box-desk-exit-'));
  const bash = process.platform === 'win32' ? path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Git', 'bin', 'bash.exe') : '/bin/bash';
  const localRoot = process.platform === 'win32' ? root.replaceAll('\\', '/').replace(/^([A-Za-z]):/, (_, d: string) => '/' + d.toLowerCase()) : root;
  const env: NodeJS.ProcessEnv = { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, WINDIR: process.env.WINDIR,
    TEMP: process.env.TEMP, TMP: process.env.TMP, HOME: root, BASH_ENV: '/dev/null', ENV: '/dev/null' };
  try {
    // Only this fixture's Git function fails; no actual GitHub, process-global mock or live checkout is involved.
    const script = prepareDeskScript('test/failure', { defaultBranch: 'main' }, 'qa/failure').replaceAll(BOX_HOME, localRoot);
    const r = spawnSync(bash, ['--noprofile', '--norc', '-c',
      `set +e\ngit() { return 73; }\n${script}\ncode=$?\nprintf 'CALLER_STATUS:%s\\n' "$code"\nexit "$code"`],
      { cwd: root, env, encoding: 'utf8', timeout: 10000 });
    expect(r.error).toBeUndefined();
    expect(r.status).toBe(73);
    expect(r.stdout.trim()).toBe('CALLER_STATUS:73');
    expect(r.stderr).toBe('');
  } finally { fs.rmSync(root, { recursive: true, force: true, maxRetries: 5 }); }
});
