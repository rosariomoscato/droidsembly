// Recovery of an existing local branch must not depend on fetching its remote.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { git } from './exec.ts';
import { resumeDesk } from './resumeDesk.ts';

vi.mock('./exec.ts', () => ({ git: vi.fn() }));
const roots: string[] = [];
const branch = 'swarm/issue-3-original';
async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'resume-offline-'));
  roots.push(root);
  return { main: path.join(root, 'main'), desk: path.join(root, 'desk') };
}
afterEach(async () => {
  vi.resetAllMocks();
  for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true, maxRetries: 5 });
});

it('reuses an existing local branch without requiring a reachable remote', async () => {
  const { main, desk } = await fixture();
  vi.mocked(git).mockImplementation(async args => {
    if (args[0] === 'fetch') throw new Error('synthetic remote unavailable');
    return '';
  });
  await expect(resumeDesk(main, desk, branch, 'origin/main')).resolves.toBe(desk);
  expect(git).not.toHaveBeenCalledWith(['fetch', 'origin', '--prune'], expect.anything());
  expect(git).toHaveBeenCalledWith(['worktree', 'add', desk, branch], { cwd: main });
  expect(vi.mocked(git).mock.calls.map(([args]) => args)).toEqual([
    ['check-ref-format', '--branch', branch],
    ['show-ref', '--verify', '--quiet', `refs/heads/${branch}`],
    ['worktree', 'add', desk, branch],
  ]);
});

it.each([true, false])('fetches an absent local branch before selecting its start ref (remote exists: %s)', async (remoteExists) => {
  const { main, desk } = await fixture();
  let fetched = false;
  vi.mocked(git).mockImplementation(async args => {
    if (args[0] === 'fetch') fetched = true;
    if (args[0] === 'show-ref') {
      if (args[3] === `refs/heads/${branch}`) throw new Error('synthetic local ref absent');
      expect(fetched).toBe(true);
      if (!remoteExists) throw new Error('synthetic remote ref absent');
    }
    return '';
  });
  await expect(resumeDesk(main, desk, branch, 'origin/main')).resolves.toBe(desk);
  expect(git).toHaveBeenCalledWith(['fetch', 'origin', '--prune'], { cwd: main });
  expect(git).toHaveBeenCalledWith(
    ['worktree', 'add', '-b', branch, desk, remoteExists ? `origin/${branch}` : 'origin/main'],
    { cwd: main },
  );
});

it('propagates a fetch failure rather than guessing when no local branch exists', async () => {
  const { main, desk } = await fixture();
  const failure = new Error('synthetic fetch failure');
  vi.mocked(git).mockImplementation(async args => {
    if (args[0] === 'show-ref') throw new Error('synthetic local ref absent');
    if (args[0] === 'fetch') throw failure;
    return '';
  });
  await expect(resumeDesk(main, desk, branch, 'origin/main')).rejects.toBe(failure);
  expect(vi.mocked(git).mock.calls.some(([args]) => args[0] === 'worktree')).toBe(false);
  await expect(fs.stat(desk)).rejects.toMatchObject({ code: 'ENOENT' });
});
