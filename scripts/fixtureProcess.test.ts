import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, it, vi } from 'vitest';
import { runFixtureProcess } from './fixtureProcess.ts';
import { withFixtureCleanup } from './fixtureCleanup.ts';

it('preserves stdout, stderr and a verified nonzero exit', async () => {
  const r = await runFixtureProcess(process.execPath, ['-e', 'console.log("fixture out");console.error("fixture err");process.exit(73)'], { cwd: process.cwd(), env: process.env, timeout: 10000 });
  expect(r.error).toBeUndefined();
  expect(r.status).toBe(73);
  expect(r.stdout.trim()).toBe('fixture out');
  expect(r.stderr.trim()).toBe('fixture err');
});

it('retains timeout failure and stops the owned child before its held directory is removed', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cubefarm-owned-tree-'));
  const held = path.join(root, 'held');
  fs.mkdirSync(held);
  await withFixtureCleanup(async () => {
    const childScript = path.join(root, 'child.cjs'), parentScript = path.join(root, 'parent.cjs');
    const marker = path.join(root, 'ready.json');
    fs.writeFileSync(childScript, `require('node:fs').writeFileSync(${JSON.stringify(marker)},JSON.stringify({pid:process.pid}));setTimeout(()=>process.exit(3),20000);`);
    fs.writeFileSync(parentScript, `require('node:child_process').spawn(process.execPath,[${JSON.stringify(childScript)}],{cwd:${JSON.stringify(held)},stdio:'ignore'});setTimeout(()=>process.exit(3),20000);`);
    const r = await runFixtureProcess(process.execPath, [parentScript], { cwd: root, env: process.env, timeout: 10000 });
    expect(r.error).toMatchObject({ code: 'ETIMEDOUT' });
    const child = JSON.parse(fs.readFileSync(marker, 'utf8')) as { pid: number };
    await vi.waitFor(() => {
      try {
        process.kill(child.pid, 0);
        // A killed POSIX child can await init's reap; zombies execute no code
        // and hold no cwd/files. Windows must report the process absent.
        if (process.platform === 'linux') {
          const stat = fs.readFileSync(`/proc/${child.pid}/stat`, 'utf8');
          expect(stat.slice(stat.lastIndexOf(')') + 2).startsWith('Z ')).toBe(true);
        } else throw new Error('Owned child is still present');
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ESRCH' || (error as NodeJS.ErrnoException).code === 'ENOENT') return;
        throw error;
      }
    }, { timeout: 1000, interval: 10 });
    fs.rmdirSync(held); // no retry: a surviving Windows cwd owner would yield EBUSY
  }, () => fs.rmSync(root, { recursive: true }));
}, 30000);

it('preserves primary and cleanup failures across an async boundary', async () => {
  const primary = new Error('primary'), secondary = new Error('cleanup');
  const result = withFixtureCleanup(async () => { throw primary; }, async () => { throw secondary; });
  await expect(result).rejects.toMatchObject({ errors: [primary, secondary], cause: primary });
});
