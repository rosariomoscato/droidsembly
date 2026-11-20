// The same project planning thread is used by the phone, console and pocket chat.
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { appPlanText } from '../../../shared/appStarter';
import type { RepoView } from '../../../shared/types';
import { api } from '../api';
import { useT } from '../i18n';
import { Markdown } from './Markdown';
import { MessageBox } from './MessageBox';
import './appStarter.css';

export function AppStarterChat({ repo, navigation }: { repo: RepoView; navigation: ReactNode }) {
  const t = useT();
  const d = repo.appStarter!;
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmedRevision, setConfirmed] = useState(0);
  const [localRevision, setLocal] = useState(0);
  const [reviewedRevision, setReviewed] = useState(0);
  const confirmed = confirmedRevision === d.revision;
  const local = localRevision === d.revision;
  const reviewed = reviewedRevision === d.revision;
  const form = useRef<HTMLFormElement>(null);
  const log = useRef<HTMLDivElement>(null);
  const document = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = log.current;
    if (!el) return;
    if (d.status === 'interview') el.scrollTop = el.scrollHeight;
    else if (d.status === 'awaiting-approval' && document.current) {
      el.scrollTop += document.current.getBoundingClientRect().top - el.getBoundingClientRect().top;
    }
  }, [d.messages.length, d.status, d.revision]);
  const ref = { draftId: d.id, revision: d.revision };
  const editable = d.status === 'interview' || d.status === 'awaiting-approval';
  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try { await fn(); }
    catch { /* API errors already become visible toasts. Keep the input for correction. */ }
    finally { setBusy(false); }
  };
  const send = () => act(async () => {
    await api.answerAppInterview(repo.id, { ...ref, messageId: crypto.randomUUID(), text });
    setText('');
  });
  return <div className="phone-chat">
    {navigation}
    <div ref={log} className="chat-log app-starter-log" tabIndex={0} aria-label={t('Project interview and complete plan')}>
      <h3>{repo.fullName} · {t('Revision')} {d.revision}</h3>
      <p role="status">{t(d.status)} · {t('No plan issues or workers start before explicit approval and confirmed publication.')}</p>
      <p className="muted small">{t('Do not paste passwords, connection strings or real data. Describe requirements using examples.')}</p>
      {d.messages.map((m) => <div key={m.id} className={`bubble ${m.from === 'manager' ? 'bubble-me' : 'bubble-them'}`}>
        <b>{m.from === 'manager' ? t('You') : 'CEO'}</b><Markdown text={m.text} />
      </div>)}
      {d.decisions && <section><h4>{t('Decisions so far')}</h4><Markdown text={d.decisions} /></section>}
      {d.plan && <section ref={document} aria-label={t('Complete proposed plan')}>
        <h3>{t('Complete proposed plan')}</h3>
        <Markdown text={appPlanText(d.plan)} />
        <p className="small">{t('Plan fingerprint')}: <code className="app-plan-hash">{d.hash ?? '—'}</code></p>
      </section>}
      {d.problem && <p role="alert">{d.problem}</p>}
      {d.ledger.length > 0 && <section><h4>{t('Publication ledger')}</h4><ul>
        {d.ledger.map((l) => <li key={l.taskId}>{l.taskId}: {t(l.state)} {l.number ? <a href={`${repo.url}/issues/${l.number}`} target="_blank" rel="noreferrer">#{l.number}</a> : ''}</li>)}
      </ul></section>}
      {d.status === 'awaiting-approval' && d.hash && <>
        <p>{t('Approval applies only to this project, revision and exact tasks. A chat “yes” does not publish.')}</p>
        <label className="toggle"><input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked ? d.revision : 0)} />{t('I have read the complete plan and its tasks above.')}</label>
        <label className="toggle"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked ? d.revision : 0)} />{t('I confirm the worker, test/preview and deployment environments; tests and migrations are isolated from production.')}</label>
        {d.plan?.environments.dataAccess === 'local-only' && <label className="toggle"><input type="checkbox" checked={local} onChange={(e) => setLocal(e.target.checked ? d.revision : 0)} />{t('I confirm local workers for non-transferable data and will keep this computer on.')}</label>}
        <p className="small">{repo.autoAssign
          ? t('Auto-assign is on: confirmed publication may start AI work and use the team’s approved Box resources. No paid account, database or deploy is authorized.')
          : t('Auto-assign is off: publication does not turn it on. No paid account, database or deploy is authorized.')}</p>
        <div className="row app-plan-actions">
          <button className="btn" disabled={busy} onClick={() => act(async () => {
            await api.appPlanAction(repo.id, { ...ref, action: 'edit' });
            form.current?.querySelector('textarea')?.focus();
          })}>{t('Modify plan')}</button>
          <button className="btn btn-good" disabled={busy || !reviewed || !confirmed || (d.plan?.environments.dataAccess === 'local-only' && !local)}
            onClick={() => act(() => api.approveAppPlan(repo.id, { ...ref, hash: d.hash!, confirmEnvironments: confirmed, confirmLocal: local }))}>{t('Approve plan and create issues')}</button>
        </div>
      </>}
      {!['ready', 'cancelled'].includes(d.status) && <div className="row app-plan-actions">
        {d.status === 'paused'
          ? <button className="btn" disabled={busy} onClick={() => act(() => api.appPlanAction(repo.id, { ...ref, action: 'resume' }))}>{t('Resume / reconcile')}</button>
          : <button className="btn btn-ghost" disabled={busy} onClick={() => act(() => api.appPlanAction(repo.id, { ...ref, action: 'pause' }))}>{t('Pause planning')}</button>}
        <button className="btn btn-ghost" disabled={busy} onClick={() => act(() => api.appPlanAction(repo.id, { ...ref, action: 'cancel' }))}>{t('Cancel planning')}</button>
      </div>}
    </div>
    {editable && <form ref={form} className="chat-input" onSubmit={(e) => { e.preventDefault(); if (!busy && text.trim()) void send(); }}>
      <MessageBox value={text} onChange={setText} maxLength={4000} placeholder={t('Answer or request a plan change…')} aria-label={t('Project interview answer')} />
      <button className="btn btn-good" disabled={busy || !text.trim()}>{t('Send')}</button>
    </form>}
  </div>;
}
