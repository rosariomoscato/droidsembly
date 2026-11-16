import type { AgentView } from '../../shared/types';

export interface ResumeIssueTarget { agentId: string; repoId: string; issueNumber: number }
export type ResumeIssueAgent = Omit<AgentView, 'log'>;
export function canResumeIssue(agent: ResumeIssueAgent | undefined, target: ResumeIssueTarget): agent is ResumeIssueAgent {
  return !!agent && agent.id === target.agentId && agent.repoId === target.repoId && agent.issueNumber === target.issueNumber
    && agent.role !== 'ceo' && agent.task === 'issue' && (agent.status === 'stopped' || agent.status === 'error')
    && agent.canResumeIssue === true && !!agent.branch && !agent.prNumber && !agent.prUrl;
}

/** Re-read live state after confirmation; never fall back to reset or assignment. */
export async function resumeIssueAction(target: ResumeIssueTarget, lock: { current: boolean }, actions: {
  current(): ResumeIssueAgent | undefined;
  confirm(agent: ResumeIssueAgent): Promise<boolean>;
  request(target: ResumeIssueTarget): Promise<unknown>;
  busy(value: boolean): void;
  stale(): void;
}): Promise<boolean> {
  if (lock.current) return false;
  lock.current = true;
  actions.busy(true);
  try {
    const before = actions.current();
    if (!canResumeIssue(before, target)) { actions.stale(); return false; }
    if (!await actions.confirm(before)) return false;
    if (!canResumeIssue(actions.current(), target)) { actions.stale(); return false; }
    await actions.request(target);
    return true;
  } finally {
    lock.current = false;
    actions.busy(false);
  }
}
