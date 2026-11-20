// A finished CLI still owns its QA task while evidence and the GitHub report are being published.
import fs from 'node:fs/promises';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDemoBackend } from './demo.ts';
import { Swarm } from './swarm.ts';
import { ORPHAN_GRACE_MS } from './watchdog.ts';
import type { PullInfo } from '../shared/types.ts';
import type { SessionResult } from './agentRunner.ts';

const { home } = vi.hoisted(() => ({ home: `${process.env.SWARM_HOME}/qa-finalization-${process.pid}` }));
vi.mock('./config.ts', async (original) => ({
  ...await original<typeof import('./config.ts')>(),
  HOME_DIR: home, STATE_FILE: `${home}/state.json`, WORKSPACE_ROOT: `${home}/workspaces`,
}));

let swarm: Swarm | undefined;
let release: (() => void) | undefined;
let finishing: Promise<void> | undefined;
beforeEach(() => vi.useFakeTimers());
afterEach(async () => {
  release?.();
  await finishing;
  vi.clearAllTimers();
  vi.useRealTimers();
  await swarm?.shutdown();
  swarm = undefined;
  release = undefined;
  finishing = undefined;
  vi.restoreAllMocks();
  await fs.rm(home, { recursive: true, force: true, maxRetries: 5 });
});

async function office(verdict: 'pass' | 'fail', commentFails = false) {
  const backend = createDemoBackend();
  backend.allowWork = () => false;
  swarm = new Swarm(backend);
  // No checkouts, background sync or debounced disk writes are needed to exercise result publication.
  swarm['cloneRepo'] = async () => {};
  vi.spyOn(swarm, 'syncRepo').mockResolvedValue();
  vi.spyOn(swarm as unknown as { save(): void }, 'save').mockImplementation(() => {});
  const connected = await swarm.connectRepo('demo-co/pixel-todo', { onboardCeo: false, autoAssign: false, autoMerge: false });
  const repo = swarm['state'].repos.find(r => r.id === connected.id)!;
  const agent = swarm['state'].agents.find(a => a.repoId === repo.id)!;
  const pull: PullInfo = {
    number: 4, title: 'Task foundation', url: `${repo.url}/pull/4`, headRefName: 'swarm/issue-1-ada',
    headSha: 'a'.repeat(40), state: 'OPEN', isDraft: false, mergeable: 'MERGEABLE', mergeState: 'CLEAN',
    reviewDecision: null, closesIssues: [1], createdAt: new Date().toISOString(), mergedAt: null,
    additions: 1, deletions: 0, checks: 'none', failedChecks: [], pendingChecks: [],
  };
  Object.assign(swarm['repoRt'].get(repo.id)!, { pulls: [pull], lastSync: Date.now(), cloneStatus: 'ready' });
  backend.prDetails = async () => ({ ...pull, body: '', isCrossRepository: false, checkNames: [], failedChecks: [] });
  swarm['queueQa'](repo, pull.number, agent, 1);
  const qa = swarm['state'].qa[0];
  Object.assign(qa, { status: 'testing', qaAgentId: agent.id, testedSha: pull.headSha });
  Object.assign(agent, { status: 'working', task: 'qa', prNumber: pull.number, issueNumber: 1, startedAt: Date.now() });
  let posted!: () => void;
  const posting = new Promise<void>(resolve => { posted = resolve; });
  const publication = new Promise<string>((resolve, reject) => {
    release = () => commentFails ? reject(new Error('Comment unavailable')) : resolve(`${pull.url}#qa-report`);
  });
  const comment = vi.spyOn(backend, 'commentPull').mockImplementation(() => { posted(); return publication; });
  const duplicate = vi.spyOn(swarm as unknown as { runQa(): Promise<void> }, 'runQa').mockImplementation(async () => {
    agent.status = 'preparing';
  });
  const result: SessionResult = {
    ok: true, text: '', errors: [], costUsd: 0, turns: 1,
    structured: { verdict, summary: 'Reviewed the foundation.', checks: [], commands: [], screenshots: [], fixInstructions: 'Fix the finding.' },
  };
  finishing = swarm['onFinished'](agent, repo, result);
  await posting;
  return { office: swarm, backend, repo, agent, qa, pull, comment, duplicate };
}

describe('QA result publication', () => {
  it.each(['pass', 'fail'] as const)('does not requeue or reassign a %s report while its comment is still posting', async verdict => {
    const o = await office(verdict);
    vi.setSystemTime(Date.now() + ORPHAN_GRACE_MS + 60_000);
    o.office['watchdogTick']();
    const started = o.office['startPipelineWork'](o.repo);
    expect(o.qa.status).toBe('testing');
    expect(o.agent.status).toBe('working');
    expect(o.office['isFree'](o.agent)).toBe(false);
    expect(started).toBe(false);
    expect(o.duplicate).not.toHaveBeenCalled();
    release!();
    await finishing;
    expect(o.qa.status).toBe(verdict === 'pass' ? 'passed' : 'failed');
    expect(o.agent.status).toBe('done');
    expect(o.qa.commentUrl).toBe(`${o.pull.url}#qa-report`);
    expect(o.comment).toHaveBeenCalledOnce();
    if (verdict === 'pass') {
      o.office['watchdogTick']();
      expect(o.office['startPipelineWork'](o.repo)).toBe(false);
      expect(o.qa.status).toBe('passed');
      expect(o.duplicate).not.toHaveBeenCalled();
    }
  });
  it('releases the task if posting the comment fails, without retrying successful QA', async () => {
    const o = await office('pass', true);
    expect(o.agent.status).toBe('working');
    release!();
    await finishing;
    expect(o.agent.status).toBe('done');
    expect(o.qa.status).toBe('passed');
    expect(o.qa.commentUrl).toBeNull();
    o.office['watchdogTick']();
    expect(o.office['startPipelineWork'](o.repo)).toBe(false);
    expect(o.duplicate).not.toHaveBeenCalled();
  });
  it('does not overwrite a manager stop received while the report was posting', async () => {
    const o = await office('pass');
    o.office.stopAgent(o.agent.id);
    expect(o.agent.status).toBe('stopped');
    release!();
    await finishing;
    expect(o.agent.status).toBe('stopped');
    expect(o.qa.status).toBe('passed');
    expect(o.qa.commentUrl).toBe(`${o.pull.url}#qa-report`);
  });
});
