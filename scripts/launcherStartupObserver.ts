import fs from 'node:fs';
import path from 'node:path';

export type StartupCheckpoint = 'present' | 'absent' | 'invalid' | 'read-error';
const firstConsole = "[Console]::Error.WriteLine('probe script-enter ms=0')";
const checkpointPath = (home: string, stage: 'before' | 'after') => path.join(home, `startup-${stage}-console.bin`);

// Test-only, independent of the stdout/stderr pipes. These writes perturb the
// cold path and consume the original command budget; absence is inconclusive.
export function instrumentLauncherStartup(script: string, home: string): string {
  if (!script.startsWith(firstConsole + '\n')) throw new Error('Unexpected launcher fixture entry');
  for (const stage of ['before', 'after'] as const) {
    if (fs.existsSync(checkpointPath(home, stage))) throw new Error('Startup checkpoint already exists');
  }
  const write = (stage: 'before' | 'after') => {
    const target = checkpointPath(home, stage).replaceAll("'", "''");
    // Only a fixed safe label may reach the diagnostic artifact. Failure is
    // deliberately fatal, not swallowed as if the original scenario passed.
    return `try { [IO.File]::WriteAllBytes('${target}', [byte[]]@(49)) } catch { [Console]::Error.WriteLine('probe observer-error'); exit 97 }`;
  };
  return `${write('before')}\n${firstConsole}\n${write('after')}${script.slice(firstConsole.length)}`;
}

function readCheckpoint(file: string): StartupCheckpoint {
  try {
    const fd = fs.openSync(file, 'r');
    try {
      const bytes = Buffer.alloc(2);
      const count = fs.readSync(fd, bytes, 0, bytes.length, 0);
      return count === 1 && bytes[0] === 49 ? 'present' : 'invalid';
    } finally {
      fs.closeSync(fd);
    }
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'ENOENT' ? 'absent' : 'read-error';
  }
}

// Calling this with the owned process promise enforces read-after-settlement:
// no polling, no observer subprocess, and no extra command-time allowance.
export async function observeLauncherStartup<T extends { stderr: string | null; error?: Error }>(pending: Promise<T>, home: string) {
  const result = await pending;
  // fixtureProcess aggregates cleanup failures: settlement then is NOT proof of
  // quiescence. Never inspect files that an unverified child may still change.
  const cleanupUnverified = result.error instanceof AggregateError;
  const beforeConsole = cleanupUnverified ? 'read-error' : readCheckpoint(checkpointPath(home, 'before'));
  const afterConsole = cleanupUnverified ? 'read-error' : readCheckpoint(checkpointPath(home, 'after'));
  const observerError = cleanupUnverified || /^probe observer-error\r?$/m.test(result.stderr ?? '')
    || [beforeConsole, afterConsole].some((state) => state === 'invalid' || state === 'read-error')
    || (afterConsole === 'present' && beforeConsole !== 'present');
  // No timestamps: file presence cannot establish ordering against the timer.
  return { result, startup: { observerVersion: 1 as const, beforeConsole, afterConsole, observerError } };
}
