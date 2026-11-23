import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { git } from './exec.ts';
import { resumeDesk } from './resumeDesk.ts';

const roots: string[] = [];
async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'resume-desk-')); roots.push(root);
  const main = path.join(root, 'main'), origin = path.join(root, 'origin.git'), desk = path.join(root, 'desk');
  await fs.mkdir(main);
  const g = (args: string[], cwd = main) => git(args, { cwd });
  await g(['init', '-q', '--initial-branch=main']);
  // Keep configuration local, without three extra Git launches on Windows.
  const hooks = path.join(root, 'no-hooks').replaceAll('\\', '\\\\').replaceAll('"', '\\"');
  await fs.appendFile(path.join(main, '.git', 'config'),
    `\n[user]\n\tname = Synthetic Resume Test\n\temail = resume@example.test\n[core]\n\thooksPath = "${hooks}"\n[branch "main"]\n\tremote = origin\n\tmerge = refs/heads/main\n`);
  await fs.writeFile(path.join(main, 'tracked.txt'), 'original\n');
  await fs.writeFile(path.join(main, '.gitignore'), 'ignored.cache\n');
  await g(['add', '.']); await g(['commit', '-q', '-m', 'synthetic baseline']);
  // Seed the same real local remote without push's pack/receive subprocesses.
  await g(['clone', '-q', '--bare', main, origin]); await g(['remote', 'add', 'origin', origin]);
  await g(['fetch', '-q', 'origin']);
  const branch = 'swarm/issue-3-original';
  return { root, main, origin, desk, g, branch };
}
async function snapshot(desk: string) {
  const g = (args: string[]) => git(args, { cwd: desk });
  // Nothing mutates the fixture during a snapshot; independent reads can overlap.
  // Settle every child before propagating an error so teardown cannot race a reader.
  const results = await Promise.allSettled([
    g(['rev-parse', 'HEAD']),
    g(['status', '--porcelain=v1', '--untracked-files=all']),
    g(['diff', '--binary']),
    g(['diff', '--cached', '--binary']),
    g(['for-each-ref', '--format=%(refname) %(objectname)', 'refs/heads/']),
  ]);
  const [head, status, unstaged, staged, refs] = results.map(result => {
    if (result.status === 'rejected') throw result.reason;
    return result.value;
  });
  return { head, status, unstaged, staged, refs };
}
afterEach(async () => { for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true, maxRetries: 5 }); });
describe('non-destructive interrupted desk preparation', () => {
  it('preserves commits,index,dirty,untracked and ignored files on the saved branch', { timeout: 15_000 }, async () => {
    const f = await fixture(); await f.g(['worktree', 'add', '-b', f.branch, f.desk]);
    await fs.writeFile(path.join(f.desk, 'tracked.txt'), 'staged change\n'); await f.g(['add', 'tracked.txt'], f.desk);
    await fs.writeFile(path.join(f.desk, 'tracked.txt'), 'newer unstaged change\n');
    await fs.writeFile(path.join(f.desk, 'untracked.txt'), 'keep untracked'); await fs.writeFile(path.join(f.desk, 'ignored.cache'), 'keep ignored');
    const before = await snapshot(f.desk);
    expect(await resumeDesk(f.main, f.desk, f.branch, 'origin/main')).toBe(f.desk);
    expect(await snapshot(f.desk)).toEqual(before);
    expect(await fs.readFile(path.join(f.desk, 'untracked.txt'), 'utf8')).toBe('keep untracked');
    expect(await fs.readFile(path.join(f.desk, 'ignored.cache'), 'utf8')).toBe('keep ignored');
  });
  it('refuses the wrong branch without changing it', { timeout: 15_000 }, async () => {
    const f = await fixture(); await f.g(['worktree', 'add', '-b', 'other-work', f.desk]);
    await fs.writeFile(path.join(f.desk, 'tracked.txt'), 'keep dirty'); const before = await snapshot(f.desk);
    await expect(resumeDesk(f.main, f.desk, f.branch, 'origin/main')).rejects.toThrow('not on the interrupted branch');
    expect(await snapshot(f.desk)).toEqual(before);
  });
  it('refuses detached work rather than guessing or resetting', { timeout: 15_000 }, async () => {
    const f = await fixture(); await f.g(['worktree', 'add', '--detach', f.desk]); const before = await snapshot(f.desk);
    await expect(resumeDesk(f.main, f.desk, f.branch, 'origin/main')).rejects.toThrow('not on the interrupted branch');
    expect(await snapshot(f.desk)).toEqual(before);
  });
  it('retains a non-worktree folder and refuses reconstruction', { timeout: 15_000 }, async () => {
    const f = await fixture(); await fs.mkdir(f.desk); await fs.writeFile(path.join(f.desk, 'keep.txt'), 'private work');
    await expect(resumeDesk(f.main, f.desk, f.branch, 'origin/main')).rejects.toThrow('not a worktree');
    expect(await fs.readFile(path.join(f.desk, 'keep.txt'), 'utf8')).toBe('private work');
  });
  it('reuses an existing local branch with its unpushed commit when the desk is missing', { timeout: 15_000 }, async () => {
    const f = await fixture(); await f.g(['checkout', '-b', f.branch]);
    await fs.writeFile(path.join(f.main, 'unpublished.txt'), 'unpublished commit'); await f.g(['add', '.']); await f.g(['commit', '-q', '-m', 'unpushed']);
    const head = await f.g(['rev-parse', 'HEAD']); await f.g(['checkout', 'main']);
    await resumeDesk(f.main, f.desk, f.branch, 'origin/main');
    expect(await f.g(['rev-parse', 'HEAD'], f.desk)).toBe(head);
    expect(await fs.readFile(path.join(f.desk, 'unpublished.txt'), 'utf8')).toBe('unpublished commit');
  });
  it('creates an absent branch without replacing existing branches', { timeout: 15_000 }, async () => {
    const f = await fixture(), head = await f.g(['rev-parse', 'HEAD']);
    await resumeDesk(f.main, f.desk, f.branch, 'origin/main');
    expect(await f.g(['symbolic-ref', '--short', 'HEAD'], f.desk)).toBe(f.branch);
    expect(await f.g(['rev-parse', 'HEAD'], f.desk)).toBe(head);
  });
  it('refuses a branch already held at another desk instead of forcing it', { timeout: 15_000 }, async () => {
    const f = await fixture(), other = path.join(f.root, 'other');
    await f.g(['worktree', 'add', '-b', f.branch, other]); await fs.writeFile(path.join(other, 'keep.txt'), 'keep holder');
    const before = await snapshot(other);
    await expect(resumeDesk(f.main, f.desk, f.branch, 'origin/main')).rejects.toThrow();
    expect(await snapshot(other)).toEqual(before); expect(await fs.readFile(path.join(other, 'keep.txt'), 'utf8')).toBe('keep holder');
  });
});
