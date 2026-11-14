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
    const prepare = (pr: number | undefined, branch: string) => {
      const script = prepareDeskScript('test/ordinary', { defaultBranch: 'main', ...(pr ? { pr } : {}) }, branch).replaceAll(BOX_HOME, posix(box));
      return spawnSync(bash, ['-c', script], { cwd: root, env, encoding: 'utf8', timeout: 10000 });
    };
    const development = prepare(undefined, 'swarm/issue-7-ada');
    expect(development.error).toBeUndefined(); expect(development.status, development.stderr).toBe(0);
    const desk = path.join(box, 'work', 'test__ordinary');
    const gitFile = fs.readFileSync(path.join(desk, '.git'), 'utf8');
    fs.writeFileSync(path.join(desk, 'worker.txt'), 'Synthetic delivered change\n');
    git(desk, 'add', 'worker.txt'); git(desk, 'commit', '-qm', 'Deliver fixture');
    const head = git(desk, 'rev-parse', 'HEAD');
    git(desk, 'push', '-q', 'origin', 'HEAD:refs/heads/swarm/issue-7-ada', 'HEAD:refs/pull/7/head');
    const qa = prepare(7, 'qa/pr-7-ada');
    expect(qa.error).toBeUndefined(); expect(qa.status, qa.stderr).toBe(0);
    expect(qa.stdout.trim()).toBe(posix(desk)); expect(qa.stderr).not.toContain('rebuilt');
    expect(fs.readFileSync(path.join(desk, '.git'), 'utf8')).toBe(gitFile);
    expect(git(desk, 'rev-parse', 'HEAD')).toBe(head);
    expect(git(desk, 'branch', '--show-current')).toBe('qa/pr-7-ada');
    expect(git(desk, 'status', '--porcelain')).toBe('');
  } finally { fs.rmSync(root, { recursive: true, force: true, maxRetries: 5 }); }
}, 30000);
