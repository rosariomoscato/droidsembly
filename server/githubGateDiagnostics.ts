import { CommandError } from './exec.ts';
import { GateDiagnosticError, type GateErrorCategory } from '../shared/opencodeGateDiagnostics.ts';

/** Interpret known gh stderr signatures transiently; never return or retain text, URLs, account IDs or tokens. */
export function githubGateCategory(error: unknown): GateErrorCategory | null {
  if (!(error instanceof CommandError)) return null;
  const text=error.stderr.slice(0,65536);
  if (/\bHTTP 401\b/i.test(text)) return 'github-unauthorized';
  if (/\bHTTP 429\b|(?:API|secondary) rate limit (?:exceeded|reached)/i.test(text)) return 'github-rate-limited';
  if (/\bHTTP 403\b|Resource not accessible by (?:personal access token|integration)/i.test(text)) return 'github-forbidden';
  // A private repository can be hidden from a credential: never claim that HTTP404 proves it does not exist.
  if (/\bHTTP 404\b|Could not resolve to a Repository with the name/i.test(text)) return 'github-repository-unavailable';
  if (/\bHTTP 5\d\d\b/i.test(text)) return 'github-server-failed';
  if (/please run:\s*gh auth login|not logged into any GitHub hosts|set the GH_TOKEN environment variable/i.test(text)) return 'github-auth-required';
  if (/error connecting to|no such host|could not resolve host|connection refused|TLS handshake timeout|i\/o timeout|certificate signed by unknown authority/i.test(text)) return 'github-network-failed';
  if (/Unknown JSON field:|unknown flag:|unknown command /i.test(text)) return 'github-cli-unsupported';
  return null; // no guess for an unfamiliar failure, even if it contains credentials
}

/** Only the opt-in smoke backend uses this adapter; ordinary application reads retain their error behavior. */
export async function gateGithubRead<T>(read: () => Promise<T>): Promise<T> {
  try { return await read(); }
  catch (error) {
    const category=githubGateCategory(error);
    if(category)throw new GateDiagnosticError(category);
    throw error;
  }
}
