import fs from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDemoBackend } from './demo.ts';
import { Swarm } from './swarm.ts';
import { fixtureOffice } from '../scripts/fixtureOffice.ts';
import { presentPlan } from './appStarter.ts';
import { demoAppTurn } from './demoAppStarter.ts';
import type { AppPlan, AppStarter } from '../shared/appStarter.ts';
import type { SessionCallbacks, SessionOptions } from './agentRunner.ts';

const { home } = vi.hoisted(() => ({ home: `${process.env.SWARM_HOME}/app-starter-${process.pid}` }));
vi.mock('./config.ts', async (original) => ({
  ...await original<typeof import('./config.ts')>(),
  HOME_DIR: home, STATE_FILE: `${home}/state.json`, WORKSPACE_ROOT: `${home}/workspaces`,
}));

let owner: ReturnType<typeof fixtureOffice> | undefined;
beforeEach(() => vi.useFakeTimers());
afterEach(async () => {
  // Consume existing parser callbacks and settle owned work before leaving fake time.
  // shutdown's terminal.save creates a NEW flush callback: it needs real timers.
  await vi.advanceTimersByTimeAsync(0);
  await owner?.drain();
  vi.clearAllTimers();
  vi.useRealTimers();
  await owner?.close();
  owner = undefined;
  vi.restoreAllMocks();
  await fs.rm(home, { recursive: true, force: true, maxRetries: 5 });
});

async function office() {
  const backend = createDemoBackend();
  backend.ensureClone = async () => {};
  backend.allowWork = () => false;
  const sessions: { opts: SessionOptions; cb: SessionCallbacks }[] = [];
  backend.startSession = vi.fn((opts, cb) => {
    sessions.push({ opts, cb });
    return { send: vi.fn(), stop: vi.fn() };
  });
  const swarm = new Swarm(backend);
  owner = fixtureOffice(() => swarm.shutdown());
  const runtime = swarm as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>;
  const fixture = owner;
  for (const method of ['cloneRepo', 'syncRepo', 'sweepFloor', 'syncFolder', 'advanceMerges', 'lookUpIssueAges', 'runCeoJob', 'journalSample'] as const) {
    const original = runtime[method].bind(swarm);
    vi.spyOn(runtime, method).mockImplementation((...args) => fixture.background(original(...args)));
  }
  const refresh = swarm['previews'].refreshDefault.bind(swarm['previews']);
  vi.spyOn(swarm['previews'], 'refreshDefault').mockImplementation((...args) => owner!.background(refresh(...args)));
  swarm['ensureCeo']([]);
  const repo = await owner.track(swarm.createRepo(`starter-${crypto.randomUUID().slice(0, 8)}`, { visibility: 'private', autoAssign: true, onboardCeo: true }));
  await owner.drain();
  const persisted = swarm['state'].repos.find((r) => r.id === repo.id)!;
  const ref = () => ({ draftId: persisted.appStarter!.id, revision: persisted.appStarter!.revision });
  return { backend, swarm, repo: persisted, ref, sessions };
}

function proposal(): AppPlan {
  const d: AppStarter = { id: 'demo', revision: 1, status: 'interview', decisions: '', ledger: [], messages: [] };
  for (const text of ['Readers', 'Books with owner', 'local', 'Disposable local fixtures', 'Private host', 'sample', 'No existing data', 'Track books; no sharing', 'Paper style'])
    d.messages.push({ id: crypto.randomUUID(), from: 'ceo', text: 'question' }, { id: crypto.randomUUID(), from: 'manager', text });
  return demoAppTurn(d, false).plan!;
}

describe('new app application gates', () => {
  it.each([
    ['sdk', 'claude'],
    ['terminal', 'claude'],
    ['terminal', 'opencode'],
  ] as const)('loads project-only instructions in supported CEO runtime %s / %s without provider changes', async (runtime, cli) => {
    const { swarm, repo, sessions } = await office();
    swarm.updateSettings({ runtime });
    swarm.updateAgent('ceo', { cli });
    const ceo = swarm['state'].agents.find((a) => a.id === 'ceo')!;
    const job = swarm['state'].ceo.queue.find((j) => j.repoId === repo.id)!;
    await swarm['runCeoJob'](ceo, job);
    const session = sessions[0];
    expect(session.opts.systemAppend).toContain('# CEO app-starter — planning only');
    expect(session.opts.systemAppend).toContain(repo.id);
    expect(session.opts.cli ?? 'claude').toBe(cli);
    expect(session.opts.resumeSessionId).toBeUndefined();
    expect(await session.opts.office!.call('update_app_plan', { decisions: 'Known requirements', question: 'Who is the first user?' })).not.toContain('Refused');
    expect(repo.appStarter!.messages.at(-1)?.text).toBe('Who is the first user?');
    session.cb.finished({ ok: true, text: '', costUsd: 0, turns: 1, errors: [] });
  });

  it('holds issue APIs, CEO tools, onboarding, planning, hires, preview and automatic scheduling even with all automation on', async () => {
    const { swarm, backend, repo } = await office();
    const ensureBox = vi.spyOn(swarm['boxMachines'], 'ensure');
    await swarm['cloud'].setKey('demo-only-key');
    swarm.updateSettings({ scaling: 'auto', cloud: { machineKind: 'box', boxSize: 'small', boxLimit: 10 } });
    const create = vi.spyOn(backend, 'createIssue');
    const start = vi.mocked(backend.startSession);
    swarm['ceoAsked'] = true; // A generic chat request is deliberately NOT an approval.
    expect(repo.autoAssign).toBe(true);
    expect(repo.autoMerge).toBe(true);
    await expect(swarm.createIssue(repo.id, 'bypass', 'yes')).rejects.toThrow('held');
    await expect(swarm['fileIssue']({ floor: repo.floor, title: 'bypass', body: 'yes' })).rejects.toThrow('held');
    expect(() => swarm.hireAgent(repo.id, { host: 'box' })).toThrow('held');
    expect(() => swarm['scaleTeam']({ floor: repo.floor, size: 3, reason: 'go' })).toThrow('held');
    expect(() => swarm.planFloor(repo.id, 'Do it')).toThrow('held');
    expect(() => swarm.onboardFloor(repo.id)).toThrow('held');
    await expect(swarm.startPreview(repo.id)).rejects.toThrow('held');
    expect(swarm['startIssueWork'](repo)).toBe(false);
    expect(swarm['startPipelineWork'](repo)).toBe(false);
    expect(swarm['state'].agents.filter((a) => a.repoId === repo.id)).toEqual([]);
    expect(ensureBox).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    expect(start).not.toHaveBeenCalled();
    expect(swarm['state'].ceo.queue.map((j) => j.kind)).toEqual(['app-starter']);
  });

  it('preserves legacy existing-project and opt-out creation behavior', async () => {
    const { swarm, backend } = await office();
    const existing = await swarm.connectRepo('demo-co/weather-api', { mission: 'API', autoAssign: false });
    const plain = await swarm.createRepo(`plain-${crypto.randomUUID().slice(0, 8)}`, { visibility: 'private', onboardCeo: false });
    expect(existing.appStarter).toBeUndefined();
    expect(plain.appStarter).toBeUndefined();
    expect(swarm['state'].agents.filter((a) => a.repoId === existing.id || a.repoId === plain.id)).toHaveLength(2);
    const create = vi.spyOn(backend, 'createIssue');
    await swarm.createIssue(plain.id, 'Ordinary', 'Legacy issue');
    expect(create).toHaveBeenCalledOnce();
    expect(swarm['state'].ceo.queue.filter((j) => j.repoId === existing.id).map((j) => j.kind)).toEqual(['onboard', 'plan']);
  });

  it('isolates interleaved projects and global chat, rejects stale turns, deduplicates answers', async () => {
    const { swarm, repo, ref, sessions } = await office();
    const second = await swarm.createRepo(`other-${crypto.randomUUID().slice(0, 8)}`, { visibility: 'private' });
    const jobA = swarm['state'].ceo.queue.find((j) => j.repoId === repo.id)!;
    const ceo = swarm['state'].agents.find((a) => a.id === 'ceo')!;
    await swarm['runCeoJob'](ceo, jobA);
    const a = sessions[0];
    const send = vi.spyOn(swarm['agentRt'].get('ceo')!.session!, 'send');
    await swarm.messageCeo('Global: yes, create issues');
    expect(send).not.toHaveBeenCalled();
    const oldA = ref();
    const b = second.appStarter!;
    await swarm.answerAppInterview(second.id, { draftId: b.id, revision: b.revision }, 'message-b-001', 'B only');
    await swarm.answerAppInterview(repo.id, oldA, 'message-a-001', 'A only');
    await swarm.answerAppInterview(repo.id, oldA, 'message-a-001', 'A only'); // Idempotent transport replay.
    expect(repo.appStarter!.messages.filter((m) => m.text === 'A only')).toHaveLength(1);
    expect(repo.appStarter!.messages.some((m) => m.text === 'B only')).toBe(false);
    const late = await a.opts.office!.call('update_app_plan', { decisions: 'old A', question: 'late question' });
    expect(late).toContain('Refused');
    expect(repo.appStarter!.decisions).toBe('');
    expect(swarm['state'].ceo.queue.filter((j) => j.kind === 'app-starter')).toHaveLength(2);
    const jobB = swarm['state'].ceo.queue.find((j) => j.repoId === second.id)!;
    a.cb.finished({ ok: true, text: '', costUsd: 0, turns: 1, errors: [] });
    await swarm['runCeoJob'](ceo, jobB);
    expect(sessions[1].opts.systemAppend).not.toContain('A only');
    expect(sessions[1].opts.systemAppend).toContain('B only');
    expect(sessions[1].opts.resumeSessionId).toBeUndefined();
    const saved = await sessions[1].opts.office!.call('update_app_plan', { decisions: 'B decisions', question: 'One B question?' });
    expect(saved).not.toContain('Refused');
    expect(repo.appStarter!.decisions).toBe('');
    expect(swarm['state'].messages.some((m) => m.text === 'One B question?')).toBe(false);
    sessions[1].cb.finished({ ok: true, text: '', costUsd: 0, turns: 1, errors: [] });
  });

  it('invalidates approval immediately during editing, rejects foreign/stale/duplicate approvals and chat bypass', async () => {
    const { swarm, repo, ref, backend } = await office();
    const d = repo.appStarter!, create = vi.spyOn(backend, 'createIssue');
    presentPlan(d, proposal(), 'Agreed');
    const old = ref(), hash = d.hash!;
    await swarm.appPlanAction(repo.id, ref(), 'edit');
    await expect(swarm.approveAppPlan(repo.id, old, hash, true, true)).rejects.toThrow('stale');
    await expect(swarm.approveAppPlan(repo.id, ref(), hash, true, true)).rejects.toThrow('exact');
    await swarm.answerAppInterview(repo.id, ref(), 'ordinary-yes-001', 'yes');
    expect(create).not.toHaveBeenCalled();
    expect(d.approved).toBeUndefined();
    presentPlan(d, proposal(), 'Reviewed again');
    const valid = ref(), current = d.hash!;
    await expect(swarm.approveAppPlan(repo.id, { ...valid, draftId: 'foreign' }, current, true, true)).rejects.toThrow('stale');
    swarm.updateRepo(repo.id, { autoAssign: false, autoMerge: false });
    await swarm.approveAppPlan(repo.id, valid, current, true, true);
    await expect(swarm.approveAppPlan(repo.id, valid, current, true, true)).rejects.toThrow('exact');
    expect(create).toHaveBeenCalledTimes(2);
    expect(repo.autoAssign).toBe(false);
    expect(repo.autoMerge).toBe(false);
    expect(d.status).toBe('ready');
    expect(swarm['state'].agents.filter((a) => a.repoId === repo.id)).toHaveLength(1);
  });

  it('serializes double approval, freezes the batch and pauses subsequent creates during an in-flight request', async () => {
    const { swarm, repo, ref, backend } = await office();
    const d = repo.appStarter!;
    presentPlan(d, proposal(), 'Ready');
    let release!: () => void, entered!: () => void;
    const barrier = new Promise<void>((resolve) => { release = resolve; });
    const started = new Promise<void>((resolve) => { entered = resolve; });
    const create = backend.createIssue;
    backend.createIssue = vi.fn(async (...args: Parameters<typeof create>) => { entered(); await barrier; return create(...args); });
    const approval = owner!.track(swarm.approveAppPlan(repo.id, ref(), d.hash!, true, true));
    await started;
    try {
      await expect(swarm.approveAppPlan(repo.id, ref(), d.hash!, true, true)).rejects.toThrow('progress');
      await expect(swarm.answerAppInterview(repo.id, ref(), 'concurrent-edit', 'change tasks')).rejects.toThrow('edited');
      await swarm.appPlanAction(repo.id, ref(), 'pause');
      await expect(swarm.appPlanAction(repo.id, ref(), 'resume')).rejects.toThrow('in-flight');
    } finally { release(); }
    await approval;
    expect(d.status).toBe('paused');
    expect(backend.createIssue).toHaveBeenCalledTimes(1);
    expect(d.ledger.filter((l) => l.state === 'confirmed')).toHaveLength(1);
    expect(swarm['state'].agents.filter((a) => a.repoId === repo.id)).toHaveLength(0);
    await swarm.appPlanAction(repo.id, ref(), 'resume');
    expect(d.status).toBe('ready');
    expect(backend.createIssue).toHaveBeenCalledTimes(2);
  });

  it('persists answers and partial publication across actual office reload without automatic publishing', async () => {
    const { swarm, repo, ref, backend } = await office();
    await swarm.answerAppInterview(repo.id, ref(), 'persist-answer-001', 'Keep this project answer');
    presentPlan(repo.appStarter!, proposal(), 'Persistent decisions');
    const create = backend.createIssue;
    backend.createIssue = vi.fn(async (...args: Parameters<typeof create>) => { const n = await create(...args); throw new Error(`Lost response ${n}`); });
    await swarm.approveAppPlan(repo.id, ref(), repo.appStarter!.hash!, true, true);
    expect(repo.appStarter!.status).toBe('paused');
    const saved = JSON.parse(await fs.readFile(`${home}/state.json`, 'utf8'));
    expect(saved.repos[0].appStarter.ledger[0].state).toBe('unknown');
    await owner!.close();
    const freshBackend = createDemoBackend();
    freshBackend.allowWork = () => false;
    freshBackend.ensureClone = async () => {};
    const resumedCreates = vi.spyOn(freshBackend, 'createIssue');
    const restarted = new Swarm(freshBackend);
    owner = fixtureOffice(() => restarted.shutdown());
    const runtime = restarted as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>;
    const fixture = owner;
    // Own asynchronous children from init too; timer callbacks cannot run while fake time is frozen.
    for (const method of ['cloneRepo', 'syncRepo', 'sweepFloor', 'syncFolder', 'advanceMerges', 'lookUpIssueAges', 'journalSample'] as const) {
      const original = runtime[method].bind(restarted);
      vi.spyOn(runtime, method).mockImplementation((...args) => fixture.background(original(...args)));
    }
    await owner.track(restarted.init());
    await owner.drain();
    const restored = restarted['state'].repos.find((r) => r.id === repo.id)!;
    expect(restored.appStarter!.messages.some((m) => m.text === 'Keep this project answer')).toBe(true);
    expect(restored.appStarter!.status).toBe('paused');
    expect(backend.createIssue).toHaveBeenCalledTimes(1);
    expect(restarted['state'].agents.filter((a) => a.repoId === repo.id)).toHaveLength(0);
    await restarted.appPlanAction(repo.id, { draftId: restored.appStarter!.id, revision: restored.appStarter!.revision }, 'resume');
    expect(restored.appStarter!.status).toBe('ready');
    expect(resumedCreates).toHaveBeenCalledTimes(1); // Only the still-pending second task.
    expect(await freshBackend.findPlanIssues(repo.fullName, 'droidsembly-plan:')).toHaveLength(2);
  });

  it('enforces the agreed host on hire, move, manual assignment, QA/fix, resume and automatic work', async () => {
    const { swarm, repo, ref } = await office();
    presentPlan(repo.appStarter!, proposal(), 'Local workers confirmed');
    await swarm.approveAppPlan(repo.id, ref(), repo.appStarter!.hash!, true, true);
    const a = swarm['state'].agents.find((a) => a.repoId === repo.id)!;
    expect(() => swarm.hireAgent(repo.id, { host: 'box' })).toThrow('incompatible');
    expect(() => swarm.updateAgent(a.id, { host: 'box' })).toThrow('incompatible');
    // Future host mismatch holds work without silently migrating this existing worker.
    a.host = 'box';
    expect(swarm['available'](repo)).toEqual([]);
    await expect(swarm.assign(a.id, 1)).rejects.toThrow('incompatible');
    expect(swarm['mayStart']('qa', a)).toBe(false);
    expect(swarm['mayStart']('fix', a)).toBe(false);
    a.task = 'issue'; a.status = 'stopped'; a.branch = 'swarm/kept'; a.issueNumber = 1;
    await expect(swarm.resumeIssue(a.id, repo.id, 1)).rejects.toThrow('incompatible');
    expect(a.host).toBe('box');
    expect(a.branch).toBe('swarm/kept');
  });

  it('keeps SQLite/sample Box plans on Box, never falls back to local when resources are unavailable', async () => {
    const { swarm, repo, ref } = await office();
    const p = proposal();
    p.environments.workerHost = 'box';
    presentPlan(repo.appStarter!, p, 'Box workers with synthetic SQLite seed data');
    await swarm.approveAppPlan(repo.id, ref(), repo.appStarter!.hash!, true, false);
    expect(repo.appStarter!.status).toBe('ready');
    expect(repo.appStarter!.problem).toContain('compatible resources');
    expect(swarm['state'].agents.filter((a) => a.repoId === repo.id)).toEqual([]);
    expect(() => swarm.hireAgent(repo.id, { host: 'local' })).toThrow('incompatible');
    await swarm['cloud'].setKey('demo-only-key');
    // The routing contract is tested without provisioning even a simulated machine.
    const prepare = vi.spyOn(swarm as unknown as { bringUpBox(a: unknown): void }, 'bringUpBox').mockImplementation(() => {});
    const hired = swarm.hireAgent(repo.id, {});
    expect(hired.host).toBe('box');
    expect(prepare).toHaveBeenCalledOnce();
  });
});
