import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Swarm } from './swarm.ts';
import * as workspace from './workspace.ts';
import { git } from './exec.ts';

const { home } = vi.hoisted(() => ({ home: `${process.env.SWARM_HOME}/resume-review-${process.pid}` }));
vi.mock('./config.ts', async (original) => ({ ...await original<typeof import('./config.ts')>(), HOME_DIR: home, STATE_FILE: `${home}/state.json`, WORKSPACE_ROOT: `${home}/workspaces` }));
afterEach(async () => { await fs.rm(home, { recursive: true, force: true, maxRetries: 5 }); });

function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function fixture(host = 'box') {
  const a: any = { id: 'a123-synthetic', name: 'Ada', repoId: 'repo', role: 'agent', task: 'issue', status: 'stopped', issueNumber: 3,
    branch: 'swarm/issue-3-ada', issueTitle: 'Synthetic issue', sessionId: null, prNumber: null, prUrl: null, needsSignIn: false,
    host, ...(host === 'box' ? { machine: 'synthetic-machine' } : {}) };
  const repo = { id: 'repo', fullName: 'synthetic/repo', defaultBranch: 'main' };
  const issue = { number: 3, title: 'Synthetic issue', url: 'https://example.test/3', labels: [], body: 'Synthetic task' };
  const rt: any = { session: null, terminal: { live: false } };
  const swarm: any = Object.assign(Object.create(Swarm.prototype), {
    state: { agents: [a], repos: [repo], held: [], settings: { defaultEffort: '' } },
    agentRt: new Map([[a.id, rt]]), repoRt: new Map([[repo.id, { issues: [issue], cloneStatus: 'ready' }]]),
    dropping: new Map(), issuePreparations: new Set(), deskAlerts: new Map(), quotaWaiting: new Map(), signIns: new Map(), activity: new Map(),
    ensureUsage: vi.fn(), ensureSlot: vi.fn(), isHeld: () => false, emitAgent: vi.fn(), save: vi.fn(), appendLog: vi.fn(), postMessage: vi.fn(),
    agentView: (agent: any) => ({ ...agent }), cloudWorkPaused: () => false,
    beginTask: (Swarm.prototype as any).beginTask,
    pauseIdleBox: vi.fn(),
    backend: { issueState: async () => 'OPEN', startSession: vi.fn(() => ({ send: vi.fn(), stop: vi.fn() })) },
    floorState: () => ({ fetchedAt: 0, openIssues: [3], pulls: [], closedIssues: new Map(), closedPulls: new Map() }),
    buildSystemAppend: () => 'synthetic instructions', prepare: vi.fn(async () => ({ cwd: 'synthetic-box-desk', deps: 'installed' })),
    sessionRuntime: () => ({ cli: 'claude', terminal: rt.terminal }),
    boxMachines: { linkRepos: vi.fn(async () => []) }, linkedRepos: () => [],
    quotaGate: () => ({ allows: () => true }), gateKey: () => 'synthetic', resourceFor: () => 'synthetic', modelFor: () => 'synthetic', machineEnv: () => undefined,
    onFinished: vi.fn(), holdForSignIn: vi.fn(),
  });
  return { swarm, a, repo, issue, rt };
}
describe('review P1: cancellable asynchronous Box startup (synthetic provider only)', () => {
  it('holds preparation until the old target settles, then allows exactly one resumed session', async () => {
    const f = fixture(), old = deferred<object>(), next = deferred<object>();
    f.swarm.boxTarget = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise);
    const first = f.swarm.runTask(f.a, f.repo, f.issue);
    await vi.waitFor(() => expect(f.swarm.boxTarget).toHaveBeenCalledOnce());
    f.swarm.stopAgent(f.a.id);
    expect(f.a.status).toBe('stopped'); expect(f.swarm.issuePreparations.has(f.a.id)).toBe(true);
    expect(f.swarm.canResumeIssue(f.a)).toBe(false);
    await expect(f.swarm.resumeIssue(f.a.id, f.repo.id, 3)).rejects.toMatchObject({ status: 409 });
    old.resolve({ attempt: 'old' }); await first;
    expect(f.swarm.backend.startSession).not.toHaveBeenCalled(); expect(f.swarm.boxMachines.linkRepos).not.toHaveBeenCalled();
    expect(f.swarm.canResumeIssue(f.a)).toBe(true);
    await f.swarm.resumeIssue(f.a.id, f.repo.id, 3);
    await vi.waitFor(() => expect(f.swarm.boxTarget).toHaveBeenCalledTimes(2));
    next.resolve({ attempt: 'new' });
    await vi.waitFor(() => expect(f.swarm.backend.startSession).toHaveBeenCalledOnce());
    expect(f.swarm.backend.startSession.mock.calls[0][0].box).toEqual({ attempt: 'new' });
    expect(f.a.status).toBe('working'); expect(f.rt.session).toBe(f.swarm.backend.startSession.mock.results[0].value);
  });
  it('cancels Stop during linked-repository preparation, not just boxTarget', async () => {
    const f = fixture(), links = deferred<string[]>();
    f.swarm.boxTarget = vi.fn(async () => ({})); f.swarm.boxMachines.linkRepos.mockReturnValue(links.promise);
    const first = f.swarm.runTask(f.a, f.repo, f.issue);
    await vi.waitFor(() => expect(f.swarm.boxMachines.linkRepos).toHaveBeenCalledOnce());
    f.swarm.stopAgent(f.a.id); expect(f.swarm.canResumeIssue(f.a)).toBe(false);
    links.resolve([]); await first;
    expect(f.swarm.backend.startSession).not.toHaveBeenCalled(); expect(f.swarm.canResumeIssue(f.a)).toBe(true);
  });
  it.each(['replaced', 'removed', 'shutdown', 'closure'] as const)('ignores a resolved target after task %s', async change => {
    const f = fixture(), target = deferred<object>(); f.swarm.boxTarget = vi.fn(() => target.promise);
    const first = f.swarm.runTask(f.a, f.repo, f.issue);
    await vi.waitFor(() => expect(f.swarm.boxTarget).toHaveBeenCalledOnce());
    if (change === 'replaced') f.swarm.beginTask(f.a, { task: 'analysis', issueNumber: null }, '', '');
    if (change === 'removed') { f.swarm.state.agents = []; f.swarm.agentRt.delete(f.a.id); }
    if (change === 'shutdown') f.swarm.stopping = true;
    if (change === 'closure') f.swarm.stopForClosure(f.a, 'issue closed');
    target.resolve({}); await first;
    expect(f.swarm.backend.startSession).not.toHaveBeenCalled(); expect(f.swarm.boxMachines.linkRepos).not.toHaveBeenCalled();
    expect(f.swarm.onFinished).not.toHaveBeenCalled();
  });
  it('ignores rejection from a cancelled startup without finishing a replacement task', async () => {
    const f = fixture(), target = deferred<object>(); f.swarm.boxTarget = vi.fn(() => target.promise);
    const first = f.swarm.runTask(f.a, f.repo, f.issue);
    await vi.waitFor(() => expect(f.swarm.boxTarget).toHaveBeenCalledOnce());
    f.swarm.stopAgent(f.a.id); target.reject(new Error('synthetic late failure')); await first;
    expect(f.swarm.onFinished).not.toHaveBeenCalled(); expect(f.swarm.holdForSignIn).not.toHaveBeenCalled();
    expect(f.a.status).toBe('stopped'); expect(f.swarm.canResumeIssue(f.a)).toBe(true);
  });
  it('invalidates an already queued quota callback even when Stop sees a stopped agent', async () => {
    const f = fixture(); f.swarm.boxTarget = vi.fn(async () => ({})); f.swarm.quotaGate = () => ({ allows: () => false });
    await f.swarm.runTask(f.a, f.repo, f.issue);
    const waiting = f.swarm.quotaWaiting.get(f.a.id); expect(waiting).toBeTypeOf('function');
    f.swarm.stopAgent(f.a.id); f.swarm.quotaGate = () => ({ allows: () => true }); waiting();
    expect(f.swarm.backend.startSession).not.toHaveBeenCalled();
  });
});

async function legacyFixture() {
  const f = fixture('local'), main = workspace.mainDir(f.repo.fullName), origin = path.join(home, 'origin.git');
  await fs.mkdir(main, { recursive: true });
  const g = (args: string[], cwd = main) => git(args, { cwd });
  await g(['init', '-q', '--initial-branch=main']); await g(['config', 'user.name', 'Synthetic Review Regression']); await g(['config', 'user.email', 'review@example.test']);
  await g(['config', 'core.hooksPath', path.join(home, 'no-hooks')]);
  await fs.writeFile(path.join(main, 'tracked.txt'), 'baseline\n'); await fs.writeFile(path.join(main, '.gitignore'), 'ignored.cache\n');
  await g(['add', '.']); await g(['-c', 'commit.gpgsign=false', 'commit', '-q', '-m', 'synthetic baseline']);
  await g(['init', '-q', '--bare', '--initial-branch=main', origin]); await g(['remote', 'add', 'origin', origin]); await g(['push', '-q', 'origin', 'main']);
  const originalSlug = f.swarm.agentSlug(f.a), desk = workspace.deskDir(f.repo.fullName, originalSlug);
  const snapshot = async () => ({ head: await g(['rev-parse', 'HEAD'], desk), status: await g(['status', '--porcelain=v1', '--untracked-files=all'], desk),
    staged: await g(['diff', '--cached', '--binary'], desk), unstaged: await g(['diff', '--binary'], desk),
    files: await Promise.all(['tracked.txt', 'private.txt', 'ignored.cache'].map(file => fs.readFile(path.join(desk, file), 'utf8'))) });
  return { ...f, main, desk, g, originalSlug, snapshot };
}
describe('review P2: renamed legacy worktree recovery (real throwaway Git only)', () => {
  it('finds the original desk by saved branch/stable suffix and retains it after another rename', { timeout: 15_000 }, async () => {
    const f = await legacyFixture(); await f.g(['worktree', 'add', '-b', f.a.branch, f.desk]);
    await fs.writeFile(path.join(f.desk, 'tracked.txt'), 'staged\n'); await f.g(['add', 'tracked.txt'], f.desk);
    await fs.writeFile(path.join(f.desk, 'tracked.txt'), 'unstaged\n'); await fs.writeFile(path.join(f.desk, 'private.txt'), 'private'); await fs.writeFile(path.join(f.desk, 'ignored.cache'), 'ignored');
    const before = await f.snapshot(); f.swarm.updateAgent(f.a.id, { name: 'Beatrice' });
    f.swarm.releaseDesk = vi.fn(async () => undefined); f.swarm.installDeps = vi.fn(async () => 'none');
    f.swarm.backend.prepareDesk = workspace.prepareDesk;
    f.swarm.backend.deskDir = workspace.deskDir;
    f.a.status = 'preparing';
    const prepare = (Swarm.prototype as any).prepare;
    const prepared = await prepare.call(f.swarm, f.a, f.repo, { preserve: true }, f.a.branch);
    expect(prepared).toMatchObject({ deps: 'none' });
    // Windows runners may expose TEMP through its short 8.3 alias while Git
    // reports the long path. Compare filesystem identity, not alias spelling.
    expect(await fs.realpath(prepared.cwd)).toBe(await fs.realpath(f.desk));
    expect(f.a.legacyDeskSlug).toBe(f.originalSlug); expect(f.a.machine).toBeUndefined();
    f.swarm.updateAgent(f.a.id, { name: 'Clara' });
    expect(f.swarm.agentSlug(f.a)).toBe(f.originalSlug); expect(f.swarm.deskOf(f.a, f.repo)).toBe(f.desk);
    expect(await f.snapshot()).toEqual(before);
    expect(await fs.readdir(path.dirname(f.desk))).toEqual([f.originalSlug]);
    expect(f.swarm.installDeps).toHaveBeenCalledWith(f.a, prepared.cwd, f.repo);
  });
  it.each(['other-agent', 'outside-desks'] as const)('refuses a saved branch held by %s instead of adopting its folder', { timeout: 15_000 }, async holder => {
    const f = await legacyFixture();
    const other = holder === 'other-agent' ? workspace.deskDir(f.repo.fullName, 'other-b456') : path.join(home, 'outside', f.originalSlug);
    await fs.mkdir(path.dirname(other), { recursive: true }); await fs.mkdir(path.dirname(f.desk), { recursive: true });
    await f.g(['worktree', 'add', '-b', f.a.branch, other]); await fs.writeFile(path.join(other, 'private.txt'), 'keep holder');
    await expect(workspace.prepareDesk(f.repo.fullName, { defaultBranch: 'main', preserve: true }, 'beatrice-a123', f.a.branch)).rejects.toThrow();
    expect(await fs.readFile(path.join(other, 'private.txt'), 'utf8')).toBe('keep holder');
    expect(await f.g(['symbolic-ref', '--short', 'HEAD'], other)).toBe(f.a.branch);
  });
});
