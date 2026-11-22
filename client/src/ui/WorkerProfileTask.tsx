// Explicit profile jobs and immutable deployment approval, shared by 3D and Pocket terminal panels.
import { useEffect, useState } from 'react';
import type { AgentView } from '../../../shared/types';
import type { ProfileReport, ProfileRequest } from '../../../shared/workerProfiles';
import { WORKER_PROFILES } from '../../../shared/workerProfiles';
import { api } from '../api';
import { T, useT } from '../i18n';
import { confirmDialog } from './Confirm';
import { Markdown } from './Markdown';

const EMPTY: ProfileRequest = { instructions: '', baseline: '', url: '', target: 'preview' };
const PHASES = {
  review: 'Review running', preflight: 'Preflight running', 'awaiting-approval': 'Awaiting deployment approval',
  deploy: 'Deployment running', complete: 'Report ready', blocked: 'Blocked', stopped: 'Stopped', error: 'Failed',
};
type ProfileAgent = Omit<AgentView, 'log'>;

function DeploymentConsent({ agent, report, disabled, run }: { agent: ProfileAgent; report: ProfileReport; disabled: boolean; run(fn: () => Promise<unknown>): Promise<void> }) {
  const t = useT();
  const [production, setProduction] = useState(false);
  const [resources, setResources] = useState(false);
  const approve = async () => {
    if (!report.approval) return;
    const ok = await confirmDialog({
      title: t('Approve this deployment plan?'),
      body: t('This starts AI work and the external actions described in the displayed plan. Approval applies only to this plan, commit and target. Review costs and manual steps before continuing.'),
      confirm: t('Approve and deploy'),
    });
    if (ok) await run(() => api.approveProfile(agent.id, { id: report.id, approval: report.approval!, productionConfirmed: production, resourcesConfirmed: resources }));
  };
  return <div className="card">
    <p><b><T>Commit</T>:</b> <code>{report.commit}</code> · <b><T>Target</T>:</b> {report.target}</p>
    {report.target === 'production' && <label className="toggle block"><input type="checkbox" checked={production} onChange={e => setProduction(e.target.checked)} /><T>I explicitly approve production for this plan.</T></label>}
    {report.requiresResources && <label className="toggle block"><input type="checkbox" checked={resources} onChange={e => setResources(e.target.checked)} /><T>I approve the itemized resources and potential provider charges in this plan.</T></label>}
    <button className="btn btn-good" disabled={disabled || (report.target === 'production' && !production) || (report.requiresResources && !resources)} onClick={() => void approve()}><T>Approve and deploy</T></button>
  </div>;
}

export function WorkerProfileTask({ agent }: { agent: ProfileAgent }) {
  const t = useT();
  const [draft, setDraft] = useState<ProfileRequest>(EMPTY);
  const [report, setReport] = useState<ProfileReport | null>(null);
  const [busy, setBusy] = useState(false);
  const job = agent.profileRun;
  const working = agent.status === 'working' || agent.status === 'preparing';
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try { await fn(); } catch { /* API errors are already shown as toasts. */ } finally { setBusy(false); }
  };
  useEffect(() => {
    let active = true;
    setReport(null);
    if (job) void api.profileReport(agent.id).then(value => { if (active) setReport(value); }).catch(() => undefined);
    return () => { active = false; };
  }, [agent.id, job?.id, job?.phase, job?.approval]);
  const current = report?.id === job?.id ? report : null;
  const start = async () => {
    const ok = await confirmDialog({
      title: t(agent.profile === 'review' ? 'Start application review?' : 'Start Vercel preflight?'),
      body: t('This wakes the Box and starts AI work, which may consume quota. It prepares a worktree from the remote default branch, without installing dependencies or running project scripts. Preflight does not authorize deployment. Starting again replaces the current report.'),
      confirm: t('Start profile task'),
    });
    if (ok) await run(() => api.startProfile(agent.id, draft));
  };
  const set = (patch: Partial<ProfileRequest>) => setDraft(value => ({ ...value, ...patch }));
  return <section className="card">
    <h3>{t(WORKER_PROFILES.find(p => p.id === agent.profile)?.label ?? 'Work profile')}</h3>
    <p className="muted small"><T>Manual work only. Profile rules are agent instructions, not a sandbox. No snapshot or credentials are copied. Never paste secrets into these fields.</T></p>
    {job && <p role="status">{t(PHASES[job.phase])} · v{job.version} {job.commit && <>· <code>{job.commit.slice(0, 12)}</code></>}</p>}
    {current && (current.plan || current.report) && <div className="card" style={{ maxHeight: 420, overflow: 'auto' }}><Markdown text={current.phase === 'awaiting-approval' || current.phase === 'blocked' || current.phase === 'stopped' ? current.plan || current.report : current.report || current.plan} /></div>}
    {current?.phase === 'awaiting-approval' && current.approval === job?.approval && <DeploymentConsent key={`${current.id}:${current.approval}`} agent={agent} report={current} disabled={busy || working} run={run} />}
    {!working && <form onSubmit={e => { e.preventDefault(); void start(); }}>
      <label className="field"><span><T>Application task and scope</T></span><textarea aria-label={t('Application task and scope')} value={draft.instructions} maxLength={4000} rows={3} onChange={e => set({ instructions: e.target.value })} /></label>
      <label className="field"><span><T>Approved requirements / drift baseline (optional)</T></span><textarea aria-label={t('Approved requirements / drift baseline (optional)')} value={draft.baseline} maxLength={8000} rows={3} onChange={e => set({ baseline: e.target.value })} /></label>
      <label className="field"><span><T>Application URL (optional, no secrets)</T></span><input aria-label={t('Application URL (optional, no secrets)')} type="url" value={draft.url} maxLength={500} onChange={e => set({ url: e.target.value })} /></label>
      {agent.profile === 'vercel' && <label className="field"><span><T>Deployment target</T></span><select aria-label={t('Deployment target')} value={draft.target} onChange={e => set({ target: e.target.value as ProfileRequest['target'] })}><option value="preview">{t('Preview (default)')}</option><option value="production">{t('Production (requires explicit approval)')}</option></select></label>}
      <button className="btn" disabled={busy || !draft.instructions.trim()}><T>Start profile task</T></button>
    </form>}
  </section>;
}
