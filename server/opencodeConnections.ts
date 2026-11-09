import { sanitizeConnections } from '../shared/opencodeConnections.ts';
import { checkOpenCodeVersion, commandFor } from './clis.ts';
import { run } from './exec.ts';

export async function openCodeConnections(directory: string) {
  const cmd = commandFor('opencode');
  if (!cmd) throw new Error('OpenCode is not installed on this computer.');
  const problem = await checkOpenCodeVersion(cmd);
  if (problem) throw new Error(problem);
  try {
    const text = await run(cmd.file, [...cmd.args, 'api', 'get', `/api/integration?location[directory]=${encodeURIComponent(directory)}`], { timeoutMs: 30_000 });
    return sanitizeConnections(JSON.parse(text));
  } catch { throw new Error('Could not read OpenCode connections. No credentials were changed.'); }
}
