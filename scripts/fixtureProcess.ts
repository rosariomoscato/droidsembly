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
    let stdout = '', stderr = '', primary: Error | undefined;
    const secondary: Error[] = [];
    let stopping = false, settled = false, releasing = false, exited = false, closed = false;
    let status: number | null = null, signal: NodeJS.Signals | null = null;
    let killer: ReturnType<typeof spawn> | undefined;
    let killerClosed = false, terminationPending = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let terminationTimer: ReturnType<typeof setTimeout> | undefined;
    let drainTimer: ReturnType<typeof setTimeout> | undefined;
    const hasExited = () => exited || child.exitCode !== null || child.signalCode !== null;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer); clearTimeout(terminationTimer); clearTimeout(drainTimer);
      const error = secondary.length && primary
        ? new AggregateError([primary, ...secondary], 'Fixture command and tree cleanup failed', { cause: primary })
        : primary;
      resolve({ stdout, stderr, status: status ?? child.exitCode, signal: signal ?? child.signalCode, ...(error ? { error } : {}) });
    };
    const failClosed = (reason: Error) => {
      if (settled) return;
      secondary.push(reason);
      if (releasing) return;
      releasing = true;
      // Use only ChildProcess handles for a best-effort fallback. Never launch
      // another PID-based termination after a root has exited. Descendant state
      // remains explicitly unverified even if the direct handle kill succeeds.
      for (const owned of [!hasExited() && child.pid ? child : undefined, !killerClosed ? killer : undefined]) {
        if (!owned?.pid) continue;
        try {
          if (!owned.kill('SIGKILL')) secondary.push(new Error('Owned process-handle termination was not verified'));
        } catch (err) { secondary.push(err as Error); }
        owned.unref();
      }
      child.stdout.destroy(); child.stderr.destroy(); child.unref();
      finish();
    };
    const drain = () => {
      clearTimeout(terminationTimer);
      terminationPending = false;
      if (settled) return;
      if (closed) { finish(); return; }
      drainTimer = setTimeout(() => failClosed(new Error('Fixture stream drain exceeded 1000 ms; descendant shutdown remains unverified')), 1000);
    };
    const stop = (reason: Error) => {
      if (stopping || settled) return;
      stopping = true;
      primary = reason;
      clearTimeout(timer);
      if (hasExited() || !child.pid) {
        failClosed(new Error('Fixture root exited; descendant shutdown remains unverified'));
        return;
      }
      // Keep the caller's command deadline unchanged. External tree termination
      // gets its own five-second bound; pipe drain gets one second only AFTER
      // termination succeeds. Do not abort a valid killer at the drain deadline.
      terminationPending = true;
      terminationTimer = setTimeout(() => failClosed(new Error('Fixture termination exceeded 5000 ms; descendant shutdown remains unverified')), 5000);
      if (process.platform === 'win32') {
        // This check prevents known-exited-root requests, not all OS-level races
        // between the check and taskkill. It is not Windows Job ownership.
        try {
          killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
          killer.once('error', (err) => failClosed(err));
          killer.once('close', (code) => {
            if (settled) return;
            killerClosed = true;
            if (code !== 0) failClosed(new Error(`Owned fixture tree termination failed (${code})`));
            else drain();
          });
        } catch (err) { failClosed(err as Error); }
      } else {
        try { process.kill(-child.pid, 'SIGKILL'); drain(); }
        catch (err) { failClosed(err as Error); }
      }
    };
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (text: string) => { stdout += text; if (Buffer.byteLength(stdout) + Buffer.byteLength(stderr) > 1024 * 1024) stop(Object.assign(new Error('Fixture output exceeded 1 MiB'), { code: 'ENOBUFS' })); });
    child.stderr.on('data', (text: string) => { stderr += text; if (Buffer.byteLength(stdout) + Buffer.byteLength(stderr) > 1024 * 1024) stop(Object.assign(new Error('Fixture output exceeded 1 MiB'), { code: 'ENOBUFS' })); });
    timer = setTimeout(() => stop(Object.assign(new Error(`Fixture command timed out after ${opts.timeout} ms`), { code: 'ETIMEDOUT' })), opts.timeout);
    child.once('error', (err) => {
      if (settled) return;
      if (!primary) primary = err;
      else secondary.push(err);
      if (releasing) return;
      if (!child.pid) {
        child.stdout.destroy(); child.stderr.destroy(); finish();
      } else failClosed(new Error('Fixture process errored; descendant shutdown remains unverified'));
    });
    child.once('exit', (code, exitSignal) => {
      exited = true; status = code; signal = exitSignal;
    });
    child.once('close', (code, closeSignal) => {
      closed = true; status = code; signal = closeSignal;
      if (releasing || settled) return;
      clearTimeout(timer);
      if (!terminationPending) finish();
    });
  });
}
