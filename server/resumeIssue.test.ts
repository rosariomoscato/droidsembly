import { describe, expect, it, vi } from 'vitest';
import { Swarm } from './swarm.ts';

function fixture() {
  const agent = { id: 'ada', name: 'Ada', repoId: 'repo', role: 'agent', task: 'issue', status: 'stopped', issueNumber: 3,
    branch: 'swarm/issue-3-original-name', issueTitle: 'Synthetic issue', sessionId: null as string | null,
    prNumber: null as number | null, prUrl: null as string | null, needsSignIn: false, host: 'local', machine: undefined as string | undefined };
  const repo = { id: 'repo', fullName: 'synthetic/repo', defaultBranch: 'main' };
  const issue = { number: 3, title: 'Synthetic issue', url: 'https://example.test/3', labels: [], body: 'Synthetic task' };
  const runtime = { session: null as object | null, terminal: { live: false } };
  const beginTask = vi.fn((a: typeof agent, patch: object) => Object.assign(a, { status: 'preparing' }, patch));
  const methods = {
    state: { agents: [agent], repos: [repo], held: [] }, agentRt: new Map([['ada', runtime]]),
    repoRt: new Map([['repo', { issues: [issue], cloneStatus: 'ready' }]]), dropping: new Map<string, string>(), issuePreparations: new Set<string>(), deskAlerts: new Map(),
    agent: (_id: string) => agent, repo: (_id: string) => repo,
    ensureUsage: vi.fn(), ensureSlot: vi.fn(), isHeld: () => false, emitAgent: vi.fn(),
    agentView: (a: typeof agent) => ({ ...a }),
    cloudWorkPaused: () => false, beginTask,
    backend: { issueState: vi.fn(async () => 'OPEN' as string), prepareDesk: vi.fn(async () => 'legacy-desk') },
    releaseDesk: vi.fn(async () => undefined), agentSlug: () => 'legacy-ada',
    machinesFor: vi.fn(() => ({ prepareDesk: vi.fn(async () => 'machine-desk') })), machineOf: vi.fn(() => agent.machine ?? 'new-machine'),
    installDeps: vi.fn(async () => 'installed'),
    floorState: () => ({ fetchedAt: 0, openIssues: [3], pulls: [], closedIssues: new Map(), closedPulls: new Map() }),
    abandoned: vi.fn(() => null), clearTask: vi.fn(), learnIssueClosed: vi.fn(), appendLog: vi.fn(),
    prepare: vi.fn(async () => ({ cwd: 'synthetic-desk', deps: 'installed' })), buildSystemAppend: () => 'synthetic instructions', startAgentSession: vi.fn(),
  };
  const swarm = Object.assign(Object.create(Swarm.prototype), methods) as typeof methods & {
    canResumeIssue(a: typeof agent): boolean;
    resumeIssue(id: string, repoId: string, issue: number): Promise<unknown>;
    runTask(a: typeof agent, r: typeof repo, i: typeof issue, note?: string, branch?: string): Promise<void>;
  };
  return { swarm, agent, repo, issue, runtime };
}
describe('manual recovery of an issue interrupted before its session', () => {
  it('uses the saved branch and preserving preparation, never a rename-derived fresh branch', async () => {
    const f = fixture();
    await f.swarm.resumeIssue('ada', 'repo', 3);
    // Only synthetic callbacks; no machine, git, dependency install or provider.
    await vi.waitFor(() => expect(f.swarm.startAgentSession).toHaveBeenCalledOnce());
    expect(f.swarm.prepare).toHaveBeenCalledExactlyOnceWith(f.agent, f.repo, { preserve: true }, 'swarm/issue-3-original-name');
    expect(f.agent.branch).toBe('swarm/issue-3-original-name');
    expect(f.swarm.ensureUsage).toHaveBeenCalledWith(f.agent, 'issue');
    expect(f.swarm.ensureSlot).toHaveBeenCalledOnce();
  });
  it.each([
    { status: 'working' }, { status: 'preparing' }, { status: 'idle' }, { status: 'done' }, { task: 'fix' }, { task: 'qa' },
    { task: 'analysis' }, { role: 'ceo' }, { sessionId: 'already-started' }, { branch: null }, { prNumber: 9 }, { prUrl: 'https://example.test/pr/9' }, { needsSignIn: true },
  ])('rejects an incompatible task without preparing anything %j', async patch => {
    const f = fixture(); Object.assign(f.agent, patch);
    expect(f.swarm.canResumeIssue(f.agent)).toBe(false);
    await expect(f.swarm.resumeIssue('ada', 'repo', 3)).rejects.toMatchObject({ status: 409 });
    expect(f.swarm.prepare).not.toHaveBeenCalled();
  });
  it.each(['session', 'live-terminal', 'pending-setup', 'closing-task'] as const)('refuses recovery while %s is held', async held => {
    const f = fixture();
    if (held === 'session') f.runtime.session = {};
    if (held === 'live-terminal') f.runtime.terminal.live = true;
    if (held === 'pending-setup') f.swarm.issuePreparations.add('ada');
    if (held === 'closing-task') f.swarm.dropping.set('ada', 'closed');
    await expect(f.swarm.resumeIssue('ada', 'repo', 3)).rejects.toMatchObject({ status: 409 });
    expect(f.swarm.prepare).not.toHaveBeenCalled();
  });
  it.each([['other-repo', 3], ['repo', 4]] as const)('rejects stale UI target %s/%i', async (repo, number) => {
    const f = fixture(); await expect(f.swarm.resumeIssue('ada', repo, number)).rejects.toMatchObject({ status: 409 });
    expect(f.swarm.beginTask).not.toHaveBeenCalled();
  });
  it('refuses a cached-closed issue', async () => {
    const f = fixture(); f.swarm.repoRt.get('repo')!.issues = [];
    await expect(f.swarm.resumeIssue('ada', 'repo', 3)).rejects.toMatchObject({ status: 404 });
    expect(f.swarm.prepare).not.toHaveBeenCalled();
  });
  it('does not start a session if GitHub reports the issue closed after confirmation', async () => {
    const f = fixture(); f.swarm.backend.issueState.mockResolvedValue('CLOSED');
    await f.swarm.resumeIssue('ada', 'repo', 3);
    await vi.waitFor(() => expect(f.swarm.clearTask).toHaveBeenCalledOnce());
    expect(f.swarm.prepare).not.toHaveBeenCalled(); expect(f.swarm.startAgentSession).not.toHaveBeenCalled();
  });
  it.each(['ensureUsage', 'ensureSlot'] as const)('preserves refusal from %s', async gate => {
    const f = fixture(), error = new Error('synthetic usage/capacity refusal');
    f.swarm[gate].mockImplementation(() => { throw error; });
    await expect(f.swarm.resumeIssue('ada', 'repo', 3)).rejects.toBe(error);
    expect(f.swarm.beginTask).not.toHaveBeenCalled();
  });
  it('refuses another busy holder and duplicate requests', async () => {
    const f = fixture(); f.swarm.state.agents.push({ ...f.agent, id: 'other', status: 'working' });
    await expect(f.swarm.resumeIssue('ada', 'repo', 3)).rejects.toMatchObject({ status: 409 });
    f.swarm.state.agents.pop();
    await f.swarm.resumeIssue('ada', 'repo', 3);
    await expect(f.swarm.resumeIssue('ada', 'repo', 3)).rejects.toMatchObject({ status: 409 });
    await vi.waitFor(() => expect(f.swarm.startAgentSession).toHaveBeenCalledOnce());
  });
  it('waits for the stopped preparation to settle before enabling recovery', async () => {
    const f = fixture(); let complete!: (state: string) => void;
    f.swarm.backend.issueState.mockImplementation(() => new Promise(resolve => { complete = resolve; }));
    const pending = f.swarm.runTask(f.agent, f.repo, f.issue);
    f.agent.status = 'stopped';
    expect(f.swarm.canResumeIssue(f.agent)).toBe(false);
    await expect(f.swarm.resumeIssue('ada', 'repo', 3)).rejects.toMatchObject({ status: 409 });
    complete('OPEN'); await pending;
    expect(f.swarm.prepare).not.toHaveBeenCalled(); expect(f.swarm.startAgentSession).not.toHaveBeenCalled();
    expect(f.swarm.canResumeIssue(f.agent)).toBe(true); expect(f.swarm.emitAgent).toHaveBeenCalledWith(f.agent);
  });
  it('keeps a pre-machine legacy desk in its original clone when resuming', async () => {
    const f = fixture(); f.agent.status = 'preparing';
    const prepare = (Swarm.prototype as unknown as { prepare(a: typeof f.agent, repo: typeof f.repo, base: { preserve: boolean }, branch: string): Promise<{ cwd: string }> }).prepare;
    expect(await prepare.call(f.swarm, f.agent, f.repo, { preserve: true }, f.agent.branch)).toMatchObject({ cwd: 'legacy-desk' });
    expect(f.swarm.backend.prepareDesk).toHaveBeenCalledWith(f.repo.fullName, { defaultBranch: 'main', preserve: true }, 'legacy-ada', f.agent.branch, expect.any(Function));
    expect(f.swarm.machineOf).not.toHaveBeenCalled(); expect(f.swarm.machinesFor).not.toHaveBeenCalled();
    expect(f.agent.machine).toBeUndefined();
  });
  it('keeps a modern desk on the same existing machine', async () => {
    const f = fixture(); f.agent.status = 'preparing'; f.agent.machine = 'saved-machine';
    const provider = { prepareDesk: vi.fn(async () => 'saved-machine-desk') }; f.swarm.machinesFor.mockReturnValue(provider);
    const prepare = (Swarm.prototype as unknown as { prepare(a: typeof f.agent, repo: typeof f.repo, base: { preserve: boolean }, branch: string): Promise<{ cwd: string }> }).prepare;
    expect(await prepare.call(f.swarm, f.agent, f.repo, { preserve: true }, f.agent.branch)).toMatchObject({ cwd: 'saved-machine-desk' });
    expect(provider.prepareDesk).toHaveBeenCalledWith('saved-machine', f.repo.fullName, { defaultBranch: 'main', pr: undefined, preserve: true }, f.agent.branch, expect.any(Function));
    expect(f.swarm.backend.prepareDesk).not.toHaveBeenCalled();
  });
});
