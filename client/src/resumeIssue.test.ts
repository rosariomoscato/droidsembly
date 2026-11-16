import { describe, expect, it, vi } from 'vitest';
import type { AgentView } from '../../shared/types';
import { canResumeIssue, resumeIssueAction } from './resumeIssue';

const target = { agentId: 'ada', repoId: 'repo', issueNumber: 3 };
const agent = (patch: Partial<AgentView> = {}) => ({ id: 'ada', name: 'Ada', repoId: 'repo', role: 'agent', task: 'issue', status: 'stopped', issueNumber: 3, branch: 'swarm/issue-3-ada', prNumber: null, prUrl: null, canResumeIssue: true, ...patch }) as AgentView;
function fixture() {
  let current = agent();
  const actions = { current: () => current, confirm: vi.fn(async () => true), request: vi.fn(async () => undefined), busy: vi.fn(), stale: vi.fn() };
  return { actions, lock: { current: false }, set: (next: AgentView) => { current = next; } };
}
describe('resume interrupted issue action', () => {
  it.each(['stopped', 'error'] as const)('accepts the server capability for a %s issue', status => {
    expect(canResumeIssue(agent({ status }), target)).toBe(true);
  });
  it.each([
    { canResumeIssue: false }, { canResumeIssue: undefined }, { role: 'ceo' }, { task: 'qa' }, { task: 'fix' }, { task: 'analysis' },
    { status: 'idle' }, { status: 'done' }, { status: 'preparing' }, { status: 'working' }, { repoId: 'other' }, { issueNumber: 4 },
    { id: 'other' }, { branch: null }, { prNumber: 5 }, { prUrl: 'https://example.test/pr/5' },
  ] as Partial<AgentView>[])('rejects an ineligible or stale agent %j', patch => expect(canResumeIssue(agent(patch), target)).toBe(false));
  it('asks first and sends the same agent/repository/issue only after confirmation', async () => {
    const f = fixture();
    expect(await resumeIssueAction(target, f.lock, f.actions)).toBe(true);
    expect(f.actions.confirm).toHaveBeenCalledOnce();
    expect(f.actions.request).toHaveBeenCalledExactlyOnceWith(target);
    expect(f.actions.busy.mock.calls).toEqual([[true], [false]]);
    expect(f.lock.current).toBe(false);
  });
  it('does nothing when cancelled', async () => {
    const f = fixture(); f.actions.confirm.mockResolvedValue(false);
    expect(await resumeIssueAction(target, f.lock, f.actions)).toBe(false);
    expect(f.actions.request).not.toHaveBeenCalled();
  });
  it('revalidates current state after the dialog', async () => {
    const f = fixture();
    f.actions.confirm.mockImplementation(async () => { f.set(agent({ status: 'working' })); return true; });
    expect(await resumeIssueAction(target, f.lock, f.actions)).toBe(false);
    expect(f.actions.request).not.toHaveBeenCalled(); expect(f.actions.stale).toHaveBeenCalledOnce();
  });
  it('refuses stale state before even opening the dialog', async () => {
    const f = fixture(); f.set(agent({ issueNumber: 9 }));
    await resumeIssueAction(target, f.lock, f.actions);
    expect(f.actions.confirm).not.toHaveBeenCalled(); expect(f.actions.request).not.toHaveBeenCalled();
  });
  it('suppresses double clicks while confirmation is pending', async () => {
    const f = fixture(); let answer!: (value: boolean) => void;
    f.actions.confirm.mockImplementation(() => new Promise(resolve => { answer = resolve; }));
    const first = resumeIssueAction(target, f.lock, f.actions);
    expect(await resumeIssueAction(target, f.lock, f.actions)).toBe(false);
    answer(true); await first;
    expect(f.actions.confirm).toHaveBeenCalledOnce(); expect(f.actions.request).toHaveBeenCalledOnce();
  });
  it('propagates a server refusal and releases the UI lock without fallback', async () => {
    const f = fixture(), failure = new Error('409 task changed');
    f.actions.request.mockRejectedValue(failure);
    await expect(resumeIssueAction(target, f.lock, f.actions)).rejects.toBe(failure);
    expect(f.lock.current).toBe(false); expect(f.actions.request).toHaveBeenCalledOnce();
  });
});
