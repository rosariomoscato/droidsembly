/** Fixed codes only: never serialize exception messages, stderr, paths, arguments or credentials. */
export type GateStage = 'plan-check' | 'resource-approval' | 'credentials-check' | 'run-home' | 'live-imports' | 'http-listen'
  | 'office-state' | 'office-controller' | 'office-init' | 'ceo-configure' | 'repository-metadata' | 'repository-policy'
  | 'repository-connect' | 'machines-ready' | 'actors-bind' | 'local-account-confirmation' | 'authentication'
  | 'ai-approval' | 'execution-verification' | 'cleanup' | 'office-shutdown' | 'launcher' | 'ceo-directory'
  | 'auth-local-confirmation' | 'auth-local-directory' | 'auth-local-connections' | 'auth-local-oauth'
  | 'auth-remote-connections' | 'auth-device-method' | 'auth-device-login' | 'auth-remote-ready'
  | 'auth-local-models' | 'auth-remote-models' | 'auth-local-version' | 'auth-remote-version' | 'auth-readiness'
  | 'ceo-dispatch' | 'issue-created' | 'issue-sync' | 'worker-assign' | 'sessions-finished' | 'pr-lookup'
  | 'pr-details-before' | 'pr-details-after' | 'worktree-before' | 'acceptance-write' | 'worker-tests'
  | 'independent-tests' | 'worktree-after' | 'delivery-check'
  | 'before-worker-files' | 'before-worker-start' | 'after-worker' | 'worktree-after-acceptance' | 'worktree-after-worker-tests' | 'auth-worker-idle';
export type GateErrorCategory = 'approval-mismatch' | 'credentials-invalid' | 'repository-name-mismatch' | 'repository-not-private'
  | 'repository-main-required' | 'metadata-invalid' | 'command-not-found' | 'access-denied' | 'already-exists'
  | 'aborted' | 'invalid-json' | 'command-failed' | 'unknown'
  | 'github-auth-required' | 'github-unauthorized' | 'github-forbidden' | 'github-repository-unavailable'
  | 'github-rate-limited' | 'github-network-failed' | 'github-server-failed' | 'github-cli-unsupported'
  | 'local-account-confirmation-required' | 'local-oauth-unavailable' | 'device-method-unavailable'
  | 'device-login-timeout' | 'run-aborted' | 'remote-provider-not-ready' | 'remote-version-query-failed' | 'auth-readiness-invalid'
  | 'remote-model-not-listed' | 'remote-model-disabled' | 'remote-model-non-chat' | 'remote-model-no-tools' | 'remote-variant-unavailable'
  | 'remote-provider-not-listed' | 'remote-provider-disabled' | 'remote-provider-no-integration' | 'remote-integration-not-listed' | 'remote-no-connection' | 'remote-connection-needs-auth'
  | 'remote-connection-status-unknown' | 'remote-oauth-unavailable'
  | `remote-query-${'box'|'transport'|'output'|'version'|'models'|'default-model'|'provider'|'integration'}-failed`
  | 'pr-missing' | 'pr-invalid' | 'pr-not-open' | 'pr-cross-repository' | 'pr-branch-mismatch' | 'pr-issue-mismatch' | 'pr-head-mismatch'
  | 'worktree-query-failed' | 'worktree-dirty' | 'worktree-branch-mismatch' | 'worktree-head-changed'
  | 'worker-tests-query-failed' | 'worker-tests-failed' | 'independent-tests-query-failed' | 'independent-tests-failed' | 'independent-tests-incomplete'
  | 'ceo-finished-without-issue' | 'git-index-query-failed' | 'git-index-not-ready' | 'git-index-identity-mismatch' | 'auth-worker-not-idle';

export class GateDiagnosticError extends Error {
  constructor(readonly category: GateErrorCategory) { super(category); }
}
export function gateErrorCategory(error: unknown): GateErrorCategory {
  if (error instanceof GateDiagnosticError) return error.category;
  if (error instanceof SyntaxError) return 'invalid-json';
  if (error instanceof Error && error.name === 'AbortError') return 'aborted';
  const code = error && typeof error === 'object' && 'code' in error ? error.code : null;
  if (code === 'ENOENT') return 'command-not-found';
  if (code === 'EACCES' || code === 'EPERM') return 'access-denied';
  if (code === 'EEXIST') return 'already-exists';
  if (typeof code === 'number' && Number.isInteger(code) && code !== 0) return 'command-failed';
  return 'unknown';
}
export interface GateDiagnosticEntry {
  stage: GateStage;
  status: 'started' | 'passed' | 'failed';
  category?: GateErrorCategory;
}
export class GateDiagnostics {
  private entries: GateDiagnosticEntry[] = [];
  private firstFailure: GateDiagnosticEntry | null = null;
  constructor(private changed: (snapshot: ReturnType<GateDiagnostics['snapshot']>) => void = () => {}) {}
  snapshot() {
    return { entries: this.entries.map(e => ({ ...e })), firstFailure: this.firstFailure ? { ...this.firstFailure } : null };
  }
  private record(entry: GateDiagnosticEntry) {
    this.entries.push(entry);
    if (entry.status === 'failed' && !this.firstFailure) this.firstFailure = entry;
    this.changed(this.snapshot());
  }
  failure(stage: GateStage, error: unknown) { this.record({ stage, status: 'failed', category: gateErrorCategory(error) }); }
  async step<T>(stage: GateStage, work: () => T | Promise<T>): Promise<T> {
    this.record({ stage, status: 'started' });
    try {
      const result = await work();
      this.record({ stage, status: 'passed' });
      return result;
    } catch (error) { this.failure(stage, error); throw error; }
  }
}

export function confirmGateApproval(answer: string, kind: 'RISORSE' | 'AI', runId: string, model = '') {
  const expected = `APPROVO ${kind} ${runId}${kind === 'AI' ? ` ${model}` : ''}`;
  if (answer.trim() !== expected) throw new GateDiagnosticError('approval-mismatch');
}
