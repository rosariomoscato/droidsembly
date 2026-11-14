import { spawn } from 'node:child_process';

export interface FixtureProcessResult {
  stdout: string;
  stderr: string;
  status: number | null;
  signal: NodeJS.Signals | null;
  error?: Error;
}

/** Test-only: terminate an owned process tree before its root disappears on timeout. */
export function runFixtureProcess(file: string, args: string[], opts: { cwd: string; env: NodeJS.ProcessEnv; timeout: number }): Promise<FixtureProcessResult> {
  return new Promise((resolve) => {
    const child = spawn(file, args, { cwd: opts.cwd, env: opts.env, windowsHide: true,
      detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', error: Error | undefined;
    let stopping = false;
    let cleanup: Promise<void> = Promise.resolve();
    const stop = (reason: Error) => {
      if (stopping || !child.pid) return;
      stopping = true;
      error = reason;
      if (process.platform === 'win32') {
        // child.pid belongs to this still-owned spawn. Kill descendants before
        // killing Bash; taskkill cannot find a tree after Bash has disappeared.
        cleanup = new Promise<void>((done, reject) => {
          const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
          killer.once('error', reject);
          killer.once('close', (code) => code === 0 ? done() : reject(new Error(`Owned fixture tree termination failed (${code})`)));
        });
      } else {
        try { process.kill(-child.pid, 'SIGKILL'); }
        catch (err) { cleanup = Promise.reject(err); }
      }
      // Observe immediately, including if termination fails before close.
      cleanup.catch((secondary) => { error = new AggregateError([reason, secondary], 'Fixture command and tree cleanup failed', { cause: reason }); });
    };
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (text: string) => { stdout += text; if (Buffer.byteLength(stdout) + Buffer.byteLength(stderr) > 1024 * 1024) stop(Object.assign(new Error('Fixture output exceeded 1 MiB'), { code: 'ENOBUFS' })); });
    child.stderr.on('data', (text: string) => { stderr += text; if (Buffer.byteLength(stdout) + Buffer.byteLength(stderr) > 1024 * 1024) stop(Object.assign(new Error('Fixture output exceeded 1 MiB'), { code: 'ENOBUFS' })); });
    const timer = setTimeout(() => stop(Object.assign(new Error(`Fixture command timed out after ${opts.timeout} ms`), { code: 'ETIMEDOUT' })), opts.timeout);
    child.once('error', (err) => { error = err; });
    child.once('close', async (status, signal) => {
      clearTimeout(timer);
      await cleanup.catch(() => undefined); // error contains both failures, never success
      resolve({ stdout, stderr, status, signal, ...(error ? { error } : {}) });
    });
  });
}
