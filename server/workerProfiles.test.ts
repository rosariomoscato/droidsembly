import { describe, expect, it } from 'vitest';
import { genericWorker, isWorkerProfile, type ProfileReport } from '../shared/workerProfiles.ts';
import { deploymentPlan, PROFILE_VERSION, profileApproval, profilePrompt, profileRequest, profileSystem } from './workerProfiles.ts';
import { reconcileStep } from './reconcile.ts';
import { resumesAfterRestart } from './restartRecovery.ts';
import { diagnose } from './watchdog.ts';

const request = profileRequest({ instructions: 'Review this application', baseline: 'Approved plan', url: 'https://example.test/app' });
const run: ProfileReport = {
  id: 'job-1', profile: 'vercel', version: PROFILE_VERSION, phase: 'preflight', commit: 'a'.repeat(40),
  target: 'preview', requiresResources: false, approval: null, request, plan: 'Existing team/app; preview only.', report: '', execution: 'codex',
};

describe('cloud work profiles', () => {
  it('defaults old agents to generic and accepts only known profiles', () => {
    expect(genericWorker({})).toBe(true);
    expect(genericWorker({ profile: 'generic' })).toBe(true);
    expect(genericWorker({ profile: 'review' })).toBe(false);
    expect(isWorkerProfile('vercel')).toBe(true);
    expect(isWorkerProfile('admin')).toBe(false);
  });

  it('validates bounded task context and rejects credential-bearing URLs', () => {
    expect(request.target).toBe('preview');
    for (const raw of [{}, { instructions: 1 }, { instructions: 'x'.repeat(4001) }, { instructions: 'x', target: 'live' }, { instructions: 'x', baseline: [] }]) expect(() => profileRequest(raw)).toThrow();
    for (const url of ['file:///etc/passwd', 'https://user:pass@example.test', 'https://example.test/?token=secret', 'https://example.test/#secret']) expect(() => profileRequest({ instructions: 'x', url })).toThrow();
  });

  it('fails closed on incomplete or unstructured preflight output', () => {
    expect(deploymentPlan('```json\n{"compatible":false,"requiresResources":true,"plan":"Needs code changes."}\n```')).toEqual({ compatible: false, requiresResources: true, plan: 'Needs code changes.' });
    for (const text of ['Looks good', 'null', '{"compatible":true,"plan":"Deploy"}', '{"compatible":"yes","requiresResources":false,"plan":"Deploy"}', '{"compatible":true,"requiresResources":false,"plan":""}']) expect(() => deploymentPlan(text)).toThrow();
  });

  it('binds approval to the plan, revision, target, tool selection and request', () => {
    const hash = profileApproval(run);
    for (const patch of [{ plan: 'Another project' }, { commit: 'b'.repeat(40) }, { id: 'job-2' }, { target: 'production' as const }, { requiresResources: true }, { execution: 'opencode' }, { request: { ...request, baseline: 'Changed scope' } }]) expect(profileApproval({ ...run, ...patch })).not.toBe(hash);
  });

  it('separates review, preflight and approved execution rules', () => {
    const review = profileSystem({ ...run, profile: 'review', phase: 'review' }, 'demo/app');
    for (const lens of ['features', 'drift', 'security', 'SEO/GEO']) expect(review).toContain(lens);
    expect(review).toContain('Do not auto-fix or file issues');
    const preflight = profileSystem(run, 'demo/app');
    expect(preflight).toContain('VERCEL PREFLIGHT ONLY');
    expect(preflight).toContain('No installs, builds');
    const deploy = profileSystem({ ...run, phase: 'deploy' }, 'demo/app');
    expect(deploy).toContain('PREVIEW ONLY');
    expect(deploy).toContain('Do not create projects');
    expect(deploy).toContain('never predict the URL');
    expect(deploy).toContain(run.plan);
    expect(profileSystem({ ...run, phase: 'deploy', target: 'production', requiresResources: true }, 'demo/app')).toContain('deploy and verify a preview first');
    expect(profilePrompt(run)).toContain(request.baseline);
  });

  it('does not schedule fresh sessions or watchdog nudges for manual profile work', () => {
    const agent = { id: 'worker', name: 'Worker', repoId: 'repo', role: 'agent', status: 'working', task: 'profile' as const, sessionId: 'old-session', branch: 'swarm/profile-1', issueNumber: null, issueTitle: 'Vercel deployment', prNumber: null, startedAt: 0, activeAt: 0, work: 'unknown' as const };
    expect(resumesAfterRestart(agent, false, false)).toBe(false);
    expect(reconcileStep({ ...agent, deskExists: true, cliAlive: false, resumable: false })).toBe('keep');
    expect(reconcileStep({ ...agent, deskExists: true, cliAlive: true, resumable: false })).toBe('reattach');
    expect(diagnose([agent], [], [], 24 * 60 * 60_000)).toEqual([]);
  });
});
