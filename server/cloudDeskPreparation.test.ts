import { describe, expect, it, vi } from 'vitest';
import { CloudError } from './box.ts';
import { Swarm } from './swarm.ts';

// Real preparation/error handling with a failed fake machine, no constructor, disk, cloud or AI.
function preparation(error: Error) {
  const swarm = Object.create(Swarm.prototype) as any;
  const agent = { id: 'synthetic-agent', name: 'Fixture', status: 'preparing', task: 'qa' };
  const repo = { id: 'test/repo', fullName: 'test/repo', defaultBranch: 'main' };
  const rec = { prNumber: 7, status: 'testing', qaAgentId: agent.id, sessionFailures: 0 };
  const prepareDesk = vi.fn(async () => { throw error; });
  swarm.state = { qa: [rec] };
  swarm.repoRt = new Map([[repo.id, { cloneStatus: 'ready' }]]);
  swarm.agentRt = new Map([[agent.id, { terminal: null }]]);
  swarm.deskAlerts = new Map();
  swarm.releaseDesk = vi.fn(async () => {});
  swarm.machinesFor = () => ({ prepareDesk });
  swarm.machineOf = () => 'synthetic-machine';
  swarm.appendLog = vi.fn(); swarm.postMessage = vi.fn(); swarm.emitAgent = vi.fn(); swarm.save = vi.fn();
  swarm.clearTask = () => { agent.task = ''; };
  swarm.setQa = (target: object, patch: object) => Object.assign(target, patch);
  swarm.jobDeskFailed = vi.fn(); swarm.installDeps = vi.fn();
  return { swarm, agent, repo, rec, prepareDesk };
}

describe('QA desk preparation failure classification', () => {
  it('leaves an unverified cloud command outcome out of the PR preparation strike budget', async () => {
    const { swarm, agent, repo, rec, prepareDesk } = preparation(new CloudError('No verified exit status', 'other'));
    expect(await swarm.prepare(agent, repo, { pr: 7 }, 'qa/pr-7-fixture', { task: 'qa', rec })).toBeNull();
    expect(agent.status).toBe('error');
    expect(rec).toMatchObject({ status: 'queued', qaAgentId: null, sessionFailures: 0 });
    expect(swarm.jobDeskFailed).not.toHaveBeenCalled();
    expect(swarm.installDeps).not.toHaveBeenCalled();
    expect(prepareDesk).toHaveBeenCalledOnce();
  });

  it('still routes a verified ordinary shell failure through normal desk preparation handling', async () => {
    const { swarm, agent, repo, rec, prepareDesk } = preparation(new Error('Desk command exit 128'));
    expect(await swarm.prepare(agent, repo, { pr: 7 }, 'qa/pr-7-fixture', { task: 'qa', rec })).toBeNull();
    expect(swarm.jobDeskFailed).toHaveBeenCalledExactlyOnceWith(agent, repo, { task: 'qa', rec }, 'Desk command exit 128');
    expect(prepareDesk).toHaveBeenCalledOnce();
  });
});
