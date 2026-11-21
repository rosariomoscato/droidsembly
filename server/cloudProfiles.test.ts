import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WebSocket } from 'ws';
import { createDemoBackend } from './demo.ts';
import { Swarm } from './swarm.ts';

const { home } = vi.hoisted(() => ({ home: `${process.env.SWARM_HOME}/cloud-profiles` }));
vi.mock('./config.ts', async original => ({
  ...await original<typeof import('./config.ts')>(),
  HOME_DIR: home, STATE_FILE: `${home}/state.json`, WORKSPACE_ROOT: `${home}/workspaces`,
}));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
  for (const m of ['log', 'warn', 'info'] as const) vi.spyOn(console, m).mockImplementation(() => undefined);
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

async function office(profile: 'review' | 'vercel' = 'review', cli: 'claude' | 'codex' | 'opencode' = 'opencode') {
  const backend = createDemoBackend();
  const swarm = new Swarm(backend);
  const connecting = swarm.connectRepo('demo-co/pixel-todo', { onboardCeo: false, autoAssign: false, autoMerge: false });
  await vi.advanceTimersByTimeAsync(2000);
  const repo = await connecting;
  await swarm.setCloudKey('demo-key');
  const worker = swarm.hireAgent(repo.id, { name: 'Profile worker', host: 'box', profile, cli, strict: true });
  await vi.advanceTimersByTimeAsync(10_000);
  const handlers: Record<string, (raw: unknown) => void> = {};
  const ws = { OPEN: 1, readyState: 1, bufferedAmount: 0, send: () => undefined, close: () => undefined, on: (event: string, fn: (raw: unknown) => void) => { handlers[event] = fn; } };
  swarm.attachTerminal(worker.id, ws as unknown as WebSocket);
  handlers.message?.(JSON.stringify({ t: 'input', data: 'demo-code\r' }));
  await vi.advanceTimersByTimeAsync(5000);
  const agent = () => swarm.snapshot().agents.find(a => a.id === worker.id)!;
  expect(agent().needsSignIn).toBe(false);
  return { backend, swarm, repo, worker, agent };
}

describe('manual cloud profiles', () => {
  it.each(['claude', 'codex', 'opencode'] as const)('runs a review using %s, without dependency installs or the issue/PR workflow', async cli => {
    const { swarm, backend, worker, agent } = await office('review', cli);
    const sessions = vi.spyOn(backend, 'startSession');
    const install = vi.spyOn(swarm['boxMachines'], 'installDeps');
    const pr = vi.spyOn(backend, 'prForBranch');
    swarm.startProfile(worker.id, { instructions: 'Review the synthetic app', baseline: 'PRIVATE_BASELINE_FOR_REPORT_ONLY' });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(agent()).toMatchObject({ profile: 'review', status: 'done', task: 'profile', profileRun: { phase: 'complete' } });
    expect(sessions).toHaveBeenCalledTimes(1);
    expect(sessions.mock.calls[0][0]).toMatchObject({ task: 'profile', keepAlive: false, cli });
    expect(install).not.toHaveBeenCalled();
    expect(pr).not.toHaveBeenCalled();
    expect(JSON.stringify(swarm.snapshot())).not.toContain('PRIVATE_BASELINE_FOR_REPORT_ONLY');
    expect(swarm.profileReport(worker.id)?.report).toContain('Demo application review');
    expect(swarm.profileReport(worker.id)?.commit).toBe('a'.repeat(40));
    await expect(swarm.message(worker.id, 'Deploy now')).rejects.toThrow('profile task controls');
  });

  it('reserves specialized workers and allows changing profile without replacing their machine', async () => {
    const { swarm, repo, worker, agent } = await office();
    const machine = swarm['state'].agents.find(a => a.id === worker.id)!.machine;
    expect(swarm['available'](swarm['repo'](repo.id)).some(a => a.id === worker.id)).toBe(false);
    await expect(swarm.assign(worker.id, 1)).rejects.toThrow('reserved');
    await expect(swarm.sendToQa(repo.id, 1, worker.id)).rejects.toThrow('reserved');
    expect(() => swarm.hireAgent(repo.id, { host: 'local', profile: 'vercel' })).toThrow('require an Upstash Box');
    expect(() => swarm.updateAgent(worker.id, { profile: 'unknown' })).toThrow('valid worker profile');
    swarm.updateAgent(worker.id, { profile: 'vercel' });
    expect(agent().profile).toBe('vercel');
    expect(swarm['state'].agents.find(a => a.id === worker.id)!.machine).toBe(machine);
    swarm.updateAgent(worker.id, { profile: 'generic' });
    expect(agent()).toMatchObject({ profile: 'generic', profileRun: null });
    expect(swarm['available'](swarm['repo'](repo.id)).some(a => a.id === worker.id)).toBe(true);
  });

  it('does not deploy before approval and refuses stale or repeated approvals', async () => {
    const { swarm, backend, worker, agent } = await office('vercel');
    const sessions = vi.spyOn(backend, 'startSession');
    swarm.startProfile(worker.id, { instructions: 'Deploy demo-team/demo-app', target: 'preview' });
    await vi.advanceTimersByTimeAsync(10_000);
    const plan = swarm.profileReport(worker.id)!;
    expect(plan.phase).toBe('awaiting-approval');
    expect(sessions).toHaveBeenCalledTimes(1);
    expect(() => swarm.approveProfile(worker.id, { id: 'old', approval: plan.approval })).toThrow('no longer');
    expect(() => swarm.updateAgent(worker.id, { model: 'another/model' })).toThrow('Clear the profile task');
    const body = { id: plan.id, approval: plan.approval };
    swarm.approveProfile(worker.id, body);
    expect(() => swarm.approveProfile(worker.id, body)).toThrow();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(agent()).toMatchObject({ status: 'done', profileRun: { phase: 'complete', approval: null } });
    expect(sessions).toHaveBeenCalledTimes(2);
    expect(sessions.mock.calls[1][0].systemAppend).toContain('PREVIEW ONLY');
    expect(swarm.profileReport(worker.id)?.report).toContain('No real Vercel deployment');
  });

  it('requires separate production and resource-cost consent and rejects a changed checkout', async () => {
    const { swarm, worker } = await office('vercel');
    swarm.startProfile(worker.id, { instructions: 'Deploy demo-team/demo-app', target: 'production' });
    await vi.advanceTimersByTimeAsync(10_000);
    const plan = swarm.profileReport(worker.id)!;
    expect(() => swarm.approveProfile(worker.id, { id: plan.id, approval: plan.approval })).toThrow('production');
    plan.requiresResources = true;
    const { profileApproval } = await import('./workerProfiles.ts');
    plan.approval = profileApproval(plan);
    const body = { id: plan.id, approval: plan.approval, productionConfirmed: true };
    expect(() => swarm.approveProfile(worker.id, body)).toThrow('provider charges');
    vi.spyOn(swarm['boxMachines'], 'profileState').mockResolvedValue({ commit: 'b'.repeat(40), branch: 'other', clean: false });
    swarm.approveProfile(worker.id, { ...body, resourcesConfirmed: true });
    await vi.advanceTimersByTimeAsync(2000);
    expect(swarm.profileReport(worker.id)).toMatchObject({ phase: 'error', approval: null });
    expect(swarm.profileReport(worker.id)?.report).toContain('No deployment started');
  });

  it('stop/clear cancel preparation and cannot trigger automatic deployment', async () => {
    const { swarm, backend, worker } = await office('vercel');
    const sessions = vi.spyOn(backend, 'startSession');
    swarm.startProfile(worker.id, { instructions: 'Plan demo-team/demo-app' });
    swarm.stopAgent(worker.id);
    swarm.resetAgent(worker.id);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(sessions).not.toHaveBeenCalled();
    expect(swarm.profileReport(worker.id)).toMatchObject({ phase: 'stopped', approval: null });
    expect(() => swarm.approveProfile(worker.id, { id: 'anything', approval: 'anything' })).toThrow();
  });

  it('blocks invalid preflight output without inventing an approval', async () => {
    const { swarm, backend, worker } = await office('vercel');
    vi.spyOn(backend, 'startSession').mockImplementation((_opts, cb) => {
      const timer = setTimeout(() => cb.finished({ ok: true, text: 'Looks fine, deploy now!', costUsd: 0, turns: 1, errors: [] }), 50);
      return { send: () => undefined, stop: () => clearTimeout(timer) };
    });
    swarm.startProfile(worker.id, { instructions: 'Plan demo-team/demo-app' });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(swarm.profileReport(worker.id)).toMatchObject({ phase: 'blocked', approval: null });
    expect(() => swarm.approveProfile(worker.id, { id: 'anything', approval: 'anything' })).toThrow();
  });

  it('invalidates consent when inherited coding-agent settings change', async () => {
    const { swarm, worker } = await office('vercel');
    swarm.startProfile(worker.id, { instructions: 'Plan demo-team/demo-app' });
    await vi.advanceTimersByTimeAsync(10_000);
    const plan = swarm.profileReport(worker.id)!;
    swarm.updateSettings({ defaultModel: 'demo/changed-model' });
    expect(() => swarm.approveProfile(worker.id, { id: plan.id, approval: plan.approval })).toThrow('settings changed');
  });

  it('does not claim a ready report when the CLI returned no output', async () => {
    const { swarm, backend, worker } = await office();
    vi.spyOn(backend, 'startSession').mockImplementation((_opts, cb) => {
      const timer = setTimeout(() => cb.finished({ ok: true, text: '', costUsd: 0, turns: 1, errors: [] }), 50);
      return { send: () => undefined, stop: () => clearTimeout(timer) };
    });
    swarm.startProfile(worker.id, { instructions: 'Review the application' });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(swarm.profileReport(worker.id)).toMatchObject({ phase: 'error', approval: null });
    expect(swarm.profileReport(worker.id)?.report).toContain('No report was returned');
  });

  it('never retries a deployment automatically after losing provider authentication', async () => {
    const { swarm, backend, worker } = await office('vercel');
    swarm.startProfile(worker.id, { instructions: 'Plan demo-team/demo-app' });
    await vi.advanceTimersByTimeAsync(10_000);
    const plan = swarm.profileReport(worker.id)!;
    const sessions = vi.spyOn(backend, 'startSession').mockImplementation((_opts, cb) => {
      const timer = setTimeout(() => cb.finished({ ok: false, signedOut: true, text: 'Partial deployment evidence', costUsd: 0, turns: 1, errors: ['Signed out'] }), 50);
      return { send: () => undefined, stop: () => clearTimeout(timer) };
    });
    swarm.approveProfile(worker.id, { id: plan.id, approval: plan.approval });
    await vi.advanceTimersByTimeAsync(60_000);
    expect(sessions).toHaveBeenCalledTimes(1);
    expect(swarm.profileReport(worker.id)).toMatchObject({ phase: 'error', approval: null, report: 'Partial deployment evidence' });
  });

  it('rechecks the checkout after credential/setup waits immediately before launching deployment', async () => {
    const { swarm, backend, worker } = await office('vercel');
    const sessions = vi.spyOn(backend, 'startSession');
    swarm.startProfile(worker.id, { instructions: 'Plan demo-team/demo-app' });
    await vi.advanceTimersByTimeAsync(10_000);
    const plan = swarm.profileReport(worker.id)!;
    const branch = swarm['state'].agents.find(a => a.id === worker.id)!.branch!;
    vi.spyOn(swarm['boxMachines'], 'profileState')
      .mockResolvedValueOnce({ commit: plan.commit, branch, clean: true })
      .mockResolvedValue({ commit: 'b'.repeat(40), branch, clean: true });
    swarm.approveProfile(worker.id, { id: plan.id, approval: plan.approval });
    await vi.advanceTimersByTimeAsync(5000);
    expect(sessions).toHaveBeenCalledTimes(1); // preflight only, no deployment session
    expect(swarm.profileReport(worker.id)).toMatchObject({ phase: 'error', approval: null });
  });

  it('does not fall through to issue handling if a running profile task is stopped and cleared', async () => {
    const { swarm, backend, worker, agent } = await office();
    const pr = vi.spyOn(backend, 'prForBranch');
    swarm.startProfile(worker.id, { instructions: 'Review the application' });
    await vi.advanceTimersByTimeAsync(1000); // prepared and running, before the synthetic report
    expect(agent().status).toBe('working');
    swarm.stopAgent(worker.id);
    swarm.resetAgent(worker.id);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(agent().status).toBe('idle');
    expect(pr).not.toHaveBeenCalled();
    expect(swarm.profileReport(worker.id)).toMatchObject({ phase: 'stopped', approval: null });
    swarm.updateAgent(worker.id, { profile: 'vercel' });
    expect(agent()).toMatchObject({ profile: 'vercel', profileRun: null });
    expect(swarm.profileReport(worker.id)).toBeNull();
    expect(swarm.agentPrompt(worker.id).parts.map(p => p.label)).toEqual(['Vercel preflight', 'After deployment approval']);
  });
});
