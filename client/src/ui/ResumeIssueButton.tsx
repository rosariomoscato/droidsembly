import { useRef, useState } from 'react';
import { api } from '../api';
import { useT } from '../i18n';
import { canResumeIssue, resumeIssueAction, type ResumeIssueAgent } from '../resumeIssue';
import { useStore } from '../store';
import { confirmDialog } from './Confirm';

export function ResumeIssueButton({ agent, repoId, issueNumber }: { agent: ResumeIssueAgent; repoId: string; issueNumber: number }) {
  const t = useT();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const target = { agentId: agent.id, repoId, issueNumber };
  if (!canResumeIssue(agent, target)) return null;
  const resume = () => resumeIssueAction(target, lock, {
    current: () => useStore.getState().agents[agent.id],
    busy: setBusy,
    stale: () => useStore.getState().pushToast('info', t('The task has changed. Check the agent before resuming.')),
    confirm: current => confirmDialog({
      tone: 'warn', icon: '▶', title: t('Resume issue #{number}?', { number: issueNumber }),
      body: t('Restart preparation for {name} on the same issue and branch, preserving the existing worktree. No reset or duplicate issue. This starts agent work and may consume AI quota.', { name: current.name }),
      confirm: t('Resume task'), cancel: t('Cancel'),
    }),
    request: current => api.resumeIssue(current.agentId, current.repoId, current.issueNumber),
  }).catch(() => undefined); // api() already displays request failures.
  return <button className="btn btn-small btn-good" disabled={busy}
    aria-label={t('Resume issue #{number} with {name}', { number: issueNumber, name: agent.name })}
    onClick={() => void resume()}>{busy ? t('Resuming…') : t('Resume task')}</button>;
}
