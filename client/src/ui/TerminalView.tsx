import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { T, useT } from '../i18n';
import { CareerCard } from './CareerCard';
import { signInInstructions } from './signInText';
import { api } from '../api';
import { isBusy, kanbanFor, agentsOnRepo, useStore } from '../store';
import { AgentSetup } from './AgentSettings';
import { confirmDialog } from './Confirm';
import { LiveTerminal } from './LiveTerminal';
import { AnalysisReply, TerminalDetails } from './AnalysisReply';
import { savedAnalysisReply } from './savedAnalysisReply';
import { effectiveModel } from '../../../shared/models';
import { assignChoices } from '../pocket/pocketData';
import { agentLabel, signInFor, workerCli } from './floorRows';
import { MessageBox } from './MessageBox';
import { MicButton } from './MicButton';
import { closeOverlay, Panel } from './Panel';
import { loadScreenshot } from '../screenshot';
import { toolVerb } from '../world/draw';
import { followAgent } from '../world/camera/rig';
import { genericWorker } from '../../../shared/workerProfiles';
import { WorkerProfileTask } from './WorkerProfileTask';

const STATUS_LABEL: Record<string, string> = {
  idle: 'free',
  preparing: 'setting up',
  working: 'working',
  done: 'done',
  error: 'needs help',
  stopped: 'stopped',
};

export function StatusPill({ status }: { status: string }) {
  const t = useT();
  return <span className={`status status-${status}`}>{t(STATUS_LABEL[status] ?? status)}</span>;
}

function elapsed(from: number | null, to: number | null) {
  if (!from) return '';
  const s = Math.max(0, Math.floor(((to ?? Date.now()) - from) / 1000));
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export function TerminalView({ agentId }: { agentId: string }) {
  const t = useT();
  const agent = useStore((s) => s.agents[agentId]);
  const log = useStore((s) => s.logs[agentId]) ?? [];
  const shotAt = useStore((s) => s.screens[agentId]);
  const repo = useStore((s) => s.repos.find((r) => r.id === s.agents[agentId]?.repoId));
  const allAgents = useStore((s) => s.agents);
  const settings = useStore((s) => s.settings);
  const clis = useStore((s) => s.clis);
  const [text, setText] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [pick, setPick] = useState('');
  const [busy, setBusy] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [showCareer, setShowCareer] = useState(false);
  const [, tick] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  // The browser pane shows the last screenshot that loaded, never a broken image. The loaded <img> itself goes in
  // the pane, so showing it never asks the server again.
  const shotView = useRef<HTMLDivElement>(null);
  const [shot, setShot] = useState<{ agentId: string; img: HTMLImageElement } | null>(null);
  const shotTime = agent?.hasScreenshot ? (shotAt ?? agent.screenshotAt) : null;

  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(
    () =>
      loadScreenshot(agentId, shotTime, (img) => {
        img.alt = t('Latest browser screenshot from the agent');
        setShot({ agentId, img });
      }),
    [agentId, shotTime, t],
  );
  useEffect(() => {
    shotView.current?.replaceChildren(...(shot?.agentId === agentId ? [shot.img] : []));
  }, [shot, agentId, agent?.hasScreenshot]);
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [log.length]);

  const qaRecords = useStore((s) => s.qa);
  const cols = useMemo(() => (repo ? kanbanFor(repo, agentsOnRepo(allAgents, repo.id), qaRecords) : null), [repo, allAgents, qaRecords]);
  // Any free agent takes either: an issue from the backlog, or a pull request waiting for QA.
  const choices = assignChoices(cols);
  const chosen = choices.find((c) => c.key === pick);
  const reply = agent?.task === 'analysis' && agent.status === 'done' ? savedAnalysisReply(log) : null;

  if (!agent || !repo) {
    return (
      <Panel title={t('Terminal')}>
        <p className="muted"><T>That agent has left the building.</T></p>
      </Panel>
    );
  }

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } catch {
      // api() already toasted
    } finally {
      setBusy(false);
    }
  };
  const working = isBusy(agent);
  const cli = workerCli(agent, settings);
  const issueUrl = agent.issueNumber ? `https://github.com/${repo.fullName}/issues/${agent.issueNumber}` : null;
  const canMessage = genericWorker(agent) && agent.task !== 'profile' && (working || (agent.task === 'analysis' && agent.status !== 'idle') || (agent.task !== 'qa' && !!agent.branch && agent.status !== 'idle'));
  const qaRec = agent.prNumber ? qaRecords[`${repo.id}#${agent.prNumber}`] : undefined;
  const signIn = signInFor(agent, settings);
  const send = (t: string) => {
    const body = t.trim();
    if (!body) return;
    setText('');
    void run(() => api.message(agent.id, body));
  };

  return (
    <Panel
      wide
      accent={agent.color}
      title={
        <div className="term-title">
          <span className="avatar" style={{ background: agent.color }}>
            {agent.name[0]}
          </span>
          <span>{agent.name}</span>
          <span className="chip" title={t('Their coding agent')}>
            ⌨️ {agentLabel(agent, settings, clis)}
          </span>
          <StatusPill status={agent.status} />
          {signIn && (
            <span className="chip sign-in-chip" title={t('Waiting for you to sign {provider} in, in their terminal', { provider: signIn })}>
              <T>🔑 needs sign-in</T>
            </span>
          )}
          {working && agent.currentTool && <span className="muted small">{t(toolVerb(agent.currentTool))}…</span>}
          <span className="spacer" />
          <button className="btn btn-small" title={t('Trail {name} with the camera wherever they go (a movement key or Esc gives you the controls back)', { name: agent.name })} onClick={() => followAgent(agent.id)}>
            <T>🎥 Follow</T>
          </button>
          {agent.career && (
            <button className={`btn btn-small setup-toggle ${showCareer ? 'setup-toggle-on' : ''}`} aria-expanded={showCareer} title={t('{name}’s career on the team', { name: agent.name })} onClick={() => setShowCareer((v) => !v)}>
              <T>🏅 Career</T>
            </button>
          )}
          <button
            className={`btn btn-small setup-toggle ${showSetup ? 'setup-toggle-on' : ''}`}
            aria-expanded={showSetup}
            aria-controls="agent-setup"
            title={t('{name}’s name, look, coding agent, model and effort', { name: agent.name })}
            onClick={() => setShowSetup((v) => !v)}
          >
            <T>⚙️ Setup</T>
          </button>
        </div>
      }
    >
      <div className="term-meta">
        {agent.task === 'analysis' ? <span className="chip"><T>🔎 Read-only analysis · no PR expected</T></span> : agent.task === 'qa' && agent.status !== 'idle' ? (
          <a href={agent.prUrl ?? '#'} target="_blank" rel="noreferrer">
            {t('Testing PR #{number}', { number: agent.prNumber ?? '?' })}: {agent.issueTitle}
          </a>
        ) : agent.task === 'fix' && agent.status !== 'idle' ? (
          <a href={agent.prUrl ?? '#'} target="_blank" rel="noreferrer">
            {t('Fixing PR #{number} after QA', { number: agent.prNumber ?? '?' })}: {agent.issueTitle}
          </a>
        ) : agent.issueNumber && agent.status !== 'idle' ? (
          <a href={issueUrl!} target="_blank" rel="noreferrer">
            {t('Issue #{number}', { number: agent.issueNumber })}: {agent.issueTitle}
          </a>
        ) : (
          <span className="muted">{t(agent.task === 'profile' ? agent.issueTitle ?? 'Work profile' : 'Nothing assigned')}</span>
        )}
        {agent.prUrl && agent.task === 'issue' && (
          <a href={agent.prUrl} target="_blank" rel="noreferrer" className="chip chip-good">
            PR #{agent.prNumber}
          </a>
        )}
        {qaRec && agent.status !== 'idle' && (
          <span className={`chip ${qaRec.status === 'passed' ? 'chip-good' : ''}`}>
            QA: {qaRec.status}
            {qaRec.round > 1 ? ` · ${t('round {number}', { number: qaRec.round })}` : ''}
          </span>
        )}
        {qaRec?.commentUrl && (
          <a href={qaRec.commentUrl} target="_blank" rel="noreferrer">
            <T>QA report ↗</T>
          </a>
        )}
        {agent.branch && <code>{agent.branch}</code>}
        <span className="muted">
          {(agent.role === 'ceo' ? agent.model : effectiveModel(agent.model, cli, settings, 'claude-opus-5-5')) || t('default model')} ·{' '}
          {cli === 'opencode' ? t('model variant') : t('{effort} effort', { effort: agent.effort || settings.defaultEffort })}
        </span>
        {agent.startedAt && <span className="muted">⏱ {elapsed(agent.startedAt, working ? null : agent.endedAt)}</span>}
        {agent.turns > 0 && <span className="muted">{t(agent.turns === 1 ? '{count} turn' : '{count} turns', { count: agent.turns })}</span>}
        {agent.costUsd > 0 && <span className="muted" title={t('API-equivalent cost reported by the coding agent; subscription usage is billed by plan')}>≈${agent.costUsd.toFixed(2)}</span>}
      </div>
      {agent.lastError && agent.status !== 'working' && !signIn && <div className="term-error">⚠️ {agent.lastError}</div>}
      {signIn && (
        <div className="sign-in-note" role="status">
          <span className="grow">
            <b>
              {t('🔑 Sign {name}’s {provider} in', { name: agent.name, provider: signIn })}
            </b>
            <br />
            {signInInstructions(signIn, settings.language)}{' '}
            {t(agent.task && isBusy(agent) ? 'Their cloud machine keeps the sign-in, and their task starts once it’s done.' : 'Their cloud machine keeps the sign-in.')}
          </span>
          <button className="btn btn-small" disabled={busy} title={t('Close this sign-in and show a new link')} onClick={() => run(() => api.signIn(agent.id))}>
            <T>↻ Start over</T>
          </button>
        </div>
      )}
      {showCareer && <CareerCard agent={agent} />}
      {showSetup && (
        <div id="agent-setup" className="setup-wrap">
          <AgentSetup agent={agent} />
        </div>
      )}

      {reply && <AnalysisReply reply={reply} />}
      <TerminalDetails collapsed={!!reply}>
      <div className={`term-split ${agent.hasScreenshot ? 'term-split-2' : ''}`}>
        {agent.terminal ? (
          <LiveTerminal agentId={agent.id} idleHint={!genericWorker(agent) || agent.task === 'profile' ? t('Use the profile task controls below; messages do not resume this workflow.') : undefined} />
        ) : (
          <div
            className="term"
            ref={scroller}
            onScroll={(e) => {
              const el = e.currentTarget;
              stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
            }}
          >
            {log.length === 0 && <div className="term-line term-system"><T>(no output yet)</T></div>}
            {log.map((l) => (
              <div key={l.id} className={`term-line term-${l.kind}`}>
                {l.text || ' '}
              </div>
            ))}
            {working && <div className="term-line term-spin">✻ {t(agent.status === 'preparing' ? (agent.currentTool ?? 'Setting up worktree') : toolVerb(agent.currentTool) || 'Thinking')}… ({elapsed(agent.startedAt, null)})</div>}
          </div>
        )}
        {agent.hasScreenshot && (
          <div className="browser">
            <div className="browser-bar">🔒 {agent.browserUrl ?? 'about:blank'}</div>
            <div className="browser-view" ref={shotView} />
            <div className="muted small"><T>Latest Playwright screenshot</T>{agent.screenshotAt ? ` · ${new Date(agent.screenshotAt).toLocaleTimeString()}` : ''}</div>
          </div>
        )}
      </div>
      </TerminalDetails>

      <form
        className="term-input"
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
      >
        <MessageBox
          value={text}
          onChange={setText}
          aria-label={t('Message {name}', { name: agent.name })}
          title={t('Enter sends · Shift+Enter adds a new line')}
          placeholder={
            working
              ? t(agent.terminal ? 'Tell {name} something while they work (typed into their terminal)…' : 'Tell {name} something while they work…', { name: agent.name })
              : canMessage
                ? t('Ask {name} for a follow-up (resumes their session)…', { name: agent.name })
                : t('Give {name} an issue or a PR to test to get them started', { name: agent.name })
          }
          disabled={!canMessage}
          autoFocus={!agent.terminal}
        />
        <MicButton kind="agent" value={text} onChange={setText} onSend={send} disabled={!canMessage} />
        <button className="btn" disabled={busy || !canMessage || !text.trim()}>
          <T>Send</T>
        </button>
      </form>

      {agent.host === 'box' && !genericWorker(agent) && <WorkerProfileTask key={`${agent.id}:${agent.profile}`} agent={agent} />}
      {!working && agent.role !== 'ceo' && agent.host !== 'box' && <details className="card">
        <summary><T>🔎 Start read-only analysis</T></summary>
        <p className="muted small"><T>Reads the repository checkout without an issue, dependency installation or PR workflow. No automatic follow-up or new assignment until Clear desk. These are agent instructions, not a filesystem sandbox.</T></p>
        <form onSubmit={(e) => { e.preventDefault(); if (analysis.trim()) void run(async () => { await api.analyze(agent.id, analysis); setAnalysis(''); }); }}>
          <textarea aria-label={t('Analysis request')} value={analysis} onChange={(e) => setAnalysis(e.target.value)} maxLength={4000} rows={3} placeholder={t('What should this agent read and explain? No code changes, shell commands, commits or PRs.')} />
          <button className="btn" disabled={busy || !analysis.trim() || repo.cloneStatus !== 'ready'}><T>Start analysis</T></button>
        </form>
      </details>}

      <div className="term-actions">
        {working ? (
          <button className="btn btn-bad" disabled={busy} onClick={() => run(() => api.stop(agent.id))}>
            <T>■ Stop</T>
          </button>
        ) : (
          <>
             <select value={pick} disabled={!genericWorker(agent)} onChange={(e) => setPick(e.target.value)} aria-label={t('Work to give them')}>
              <option value="">{t(choices.length ? 'Pick an issue to build or a PR to test…' : 'Nothing to pick up')}</option>
              {(['issue', 'qa'] as const).map((kind) => {
                const group = choices.filter((c) => c.kind === kind);
                return (
                  group.length > 0 && (
                    <optgroup key={kind} label={t(kind === 'qa' ? 'Pull requests to test' : 'Issues to build')}>
                      {group.map((c) => (
                        <option key={c.key} value={c.key}>
                          {kind === 'qa' ? 'PR ' : ''}#{c.number} {c.title}
                        </option>
                      ))}
                    </optgroup>
                  )
                );
              })}
            </select>
            <button
              className="btn btn-good"
              disabled={busy || !chosen || !genericWorker(agent)}
              onClick={() =>
                chosen &&
                run(async () => {
                  if (chosen.kind === 'qa') await api.sendToQa(repo.id, chosen.number, agent.id);
                  else await api.assign(agent.id, chosen.number);
                  setPick('');
                })
              }
            >
              {chosen?.kind === 'qa' ? `🔍 Test PR #${chosen.number}` : '▶ Start issue'}
            </button>
            {agent.status !== 'idle' && (
              <button className="btn" disabled={busy} onClick={() => run(() => api.reset(agent.id))}>
                <T>↺ Clear desk</T>
              </button>
            )}
          </>
        )}
        <span className="spacer" />
        <button
          className="btn btn-ghost"
          disabled={busy}
          onClick={() => {
            void run(async () => {
              const ok = await confirmDialog({
                tone: 'danger',
                icon: '👋',
                title: `Let ${agent.name} go?`,
                body: 'Their worktree is removed. Branches they pushed stay on GitHub.',
                confirm: `Let ${agent.name} go`,
              });
              if (!ok) return;
              await api.fireAgent(agent.id);
              closeOverlay();
            });
          }}
        >
          <T>Let go</T>
        </button>
      </div>
    </Panel>
  );
}
