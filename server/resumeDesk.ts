import fs from 'node:fs/promises';
import path from 'node:path';
import { git } from './exec.ts';

/** Explicit recovery only. Never reset, clean, rebuild or move an existing desk.
 * Refuse an unexpected checkout rather than guessing where its work belongs.
 */
export async function resumeDesk(main: string, desk: string, branch: string, defaultRef: string): Promise<string> {
  const g = (cwd: string, args: string[]) => git(args, { cwd });
  await g(main, ['check-ref-format', '--branch', branch]);
  const entries: string[] = await fs.readdir(desk).catch((error: NodeJS.ErrnoException): string[] => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  if (entries.includes('.git')) {
    const real = async (p: string) => fs.realpath(p);
    const root = await g(desk, ['rev-parse', '--show-toplevel']);
    const common = await g(desk, ['rev-parse', '--path-format=absolute', '--git-common-dir']);
    const expected = await g(main, ['rev-parse', '--path-format=absolute', '--git-common-dir']);
    if (await real(root) !== await real(desk) || await real(common) !== await real(expected)) throw new Error('The existing desk belongs to another checkout; its files were left untouched.');
    const current = await g(desk, ['symbolic-ref', '--short', '-q', 'HEAD']).catch(() => '');
    if (current !== branch) throw new Error('The existing desk is not on the interrupted branch; its files were left untouched.');
    return desk;
  }
  if (entries.length) throw new Error('The desk folder contains files but is not a worktree; its files were left untouched.');
  // Preparation may have been stopped before the worktree was created. Reuse an
  // existing branch (including unpushed commits), or create it without -B/force.
  await g(main, ['fetch', 'origin', '--prune']);
  const exists = (ref: string) => g(main, ['show-ref', '--verify', '--quiet', ref]).then(() => true, () => false);
  await fs.mkdir(path.dirname(desk), { recursive: true });
  if (await exists(`refs/heads/${branch}`)) await g(main, ['worktree', 'add', desk, branch]);
  else {
    const ref = await exists(`refs/remotes/origin/${branch}`) ? `origin/${branch}` : defaultRef;
    await g(main, ['worktree', 'add', '-b', branch, desk, ref]);
  }
  return desk;
}
