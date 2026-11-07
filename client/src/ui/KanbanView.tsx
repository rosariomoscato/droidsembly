import { useMemo, useState } from 'react';
import { api } from '../api';
import { agentsOnRepo, kanbanFor, useStore, type Agent, type KanbanCard } from '../store';
import { confirmDialog } from './Confirm';
import { Panel } from './Panel';
import { T, useT } from '../i18n';

/** Who has the card; "QA" while they're testing it. */
function AgentChip({ agent, card }: { agent?: Agent; card: KanbanCard }) {
  if (!agent) return null;
  return (
    <span className="agent-chip">
      <span className="dot" style={{ background: agent.color }} />
      {agent.name}
      {agent.task === 'qa' && card.prNumber != null && agent.prNumber === card.prNumber && <span className="chip">QA</span>}
    </span>
  );
}

export function IssueForm({ repoId, agents, onDone }: { repoId: string; agents: Agent[]; onDone?: () => void }) {
  const t = useT();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [assignTo, setAssignTo] = useState('');
  const [busy, setBusy] = useState(false);
  const free = agents.filter((a) => a.role !== 'ceo' && a.status !== 'working' && a.status !== 'preparing');
  return (
    <form
      className="issue-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        setBusy(true);
        try {
          await api.createIssue(repoId, title, body, assignTo || undefined);
          setTitle('');
          setBody('');
          setAssignTo('');
          onDone?.();
        } catch {
          // toasted
        } finally {
          setBusy(false);
        }
      }}
    >
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('Issue title, e.g. Add a dark mode toggle')} aria-label={t('Issue title')} autoFocus />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder={t('Describe what you want. Acceptance criteria help the agent who builds it and the one who tests it a lot.')} aria-label={t('Issue description')} rows={5} />
      <div className="row">
        <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)} aria-label={t('Who works on it')}>
          <option value="">{t('Leave in backlog (auto-assign picks it up if enabled)')}</option>
          {free.map((a) => (
            <option key={a.id} value={a.id}>
              {t('Give it to {name} right away', { name: a.name })}
            </option>
          ))}
        </select>
        <button className="btn btn-good" disabled={busy || !title.trim()}>
          {t(busy ? 'Filing…' : 'File issue on GitHub')}
        </button>
      </div>
    </form>
  );
}

/** The board's frame: a panel over the office, or (in pocket mode) a plain section of the page. */
function Frame({ embedded, ...props }: Parameters<typeof Panel>[0] & { embedded?: boolean }) {
  if (!embedded) return <Panel {...props} />;
  return (
    <section className={`kanban-embedded ${props.className ?? ''}`} style={{ ['--accent' as string]: props.accent }}>
      <h2 className="kanban-embedded-title">{props.title}</h2>
      {props.children}
    </section>
  );
}

function QaLink({ card }: { card: KanbanCard }) {
  if (!card.qa?.commentUrl) return null;
  return (
    <a className="small" href={card.qa.commentUrl} target="_blank" rel="noreferrer" title={card.qa.summary ?? ''}>
      <T>QA report ↗</T>
    </a>
  );
}

export function KanbanView({ repoId, embedded }: { repoId: string; embedded?: boolean }) {
  const t = useT();
  const repo = useStore((s) => s.repos.find((r) => r.id === repoId));
  const allAgents = useStore((s) => s.agents);
  const qaRecords = useStore((s) => s.qa);
  const usageState = useStore((s) => s.usage.state);
  const language = useStore((s) => s.settings.language);
  const openOverlay = useStore((s) => s.openOverlay);
  const agents = useMemo(() => agentsOnRepo(allAgents, repoId), [allAgents, repoId]);
  const cols = useMemo(() => (repo ? kanbanFor(repo, agents, qaRecords, { state: usageState }, language) : null), [repo, agents, qaRecords, usageState, language]);
  const [showForm, setShowForm] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  if (!repo || !cols) {
    return (
      <Frame title="Kanban" embedded={embedded}>
        <p className="muted"><T>This floor no longer exists.</T></p>
      </Frame>
    );
  }

  const act = async (key: string, fn: () => Promise<unknown>) => {
    setPending(key);
    try {
      await fn();
    } catch {
      // toasted
    } finally {
      setPending(null);
    }
  };
  const workers = agents.filter((a) => a.role !== 'ceo');
  const free = workers.filter((a) => a.status === 'idle' || a.status === 'done' || a.status === 'stopped' || a.status === 'error');
  const merge = async (c: KanbanCard) => {
    const passed = c.qa?.status === 'passed';
    const ok = await confirmDialog(
      passed
        ? { icon: '🎉', title: t('Merge PR #{number}?', { number: c.number }), body: t('“{title}” passed QA. It will be squash-merged into {branch}.', { title: c.title, branch: repo.defaultBranch }), confirm: t('Squash & merge'), cancel: t('Cancel') }
        : {
            tone: 'warn',
            title: t('Merge PR #{number} without QA?', { number: c.number }),
            body: t('“{title}” has not passed QA yet. Merge it into {branch} anyway?', { title: c.title, branch: repo.defaultBranch }),
            confirm: t('Merge anyway'),
            cancel: t('Cancel'),
          },
    );
    if (ok) void act(c.key, () => api.mergePull(repo.id, c.number));
  };
  const sendBack = async (c: KanbanCard) => {
    let note = '';
    const requested = c.qa?.status === 'passed';
    const ok = await confirmDialog({
      icon: '🔧',
      title: requested ? t('Request changes on PR #{number}?', { number: c.number }) : t('Send PR #{number} back for a fix?', { number: c.number }),
      body: (
        <>
          <p>{requested ? t('QA passed. Describe the additional changes you want. The previous report is preserved and the changes must pass a new QA round. This starts agent work and may consume AI quota.') : t('Its author, or any free agent, fixes it with QA’s findings, then it’s tested once more.')}</p>
          <input
            maxLength={1000}
            placeholder={t(requested ? 'Required: describe the requested changes' : 'Optional note, e.g. merge main and keep both e2e tests')}
            aria-label={t(requested ? 'Required: describe the requested changes' : 'Note for whoever fixes it')}
            aria-required={requested}
            ref={(el) => void (el && setTimeout(() => el.focus(), 0))}
            onChange={(e) => (note = e.target.value)}
          />
        </>
      ),
      confirm: t(requested ? 'Request changes' : 'Send back'),
    });
    if (ok) void act(c.key, () => api.sendBack(repo.id, c.number, note.trim() || undefined));
  };
  const closePr = async (c: KanbanCard) => {
    const ok = await confirmDialog({
      tone: 'danger',
      title: t('Close PR #{number}?', { number: c.number }),
      body: t('“{title}” will be closed without merging, and any QA or fix work on it stops. Its issue stays open and waits for you to assign it again. The branch stays on GitHub.', { title: c.title }),
      confirm: t('Close PR'),
    });
    if (ok) void act(c.key, () => api.closePull(repo.id, c.number));
  };
  const closeButton = (c: KanbanCard) => (
    <button className="btn btn-small btn-ghost" disabled={pending === c.key} onClick={() => void closePr(c)}>
      <T>Close</T>
    </button>
  );
  const previewButton = (c: KanbanCard) => (
    <button className="btn btn-small" title={t('Run PR #{number} beside {branch} and open it in the app viewer', { number: c.number, branch: repo.defaultBranch })} onClick={() => openOverlay({ kind: 'app', repoId: repo.id, pr: c.number })}>
      <T>Preview</T>
    </button>
  );
  const terminalButton = (c: KanbanCard) =>
    c.agent && (
      <button className="btn btn-small" onClick={() => openOverlay({ kind: 'terminal', agentId: c.agent!.id })}>
        <T>Terminal</T>
      </button>
    );

  const column = (title: string, cls: string, cards: KanbanCard[], render: (c: KanbanCard) => React.ReactNode, empty: string) => (
    <div className={`kcol ${cls}`}>
      <div className="kcol-head">
        {t(title)} <span className="count">{cards.length}</span>
      </div>
      <div className="kcol-body">
        {cards.length === 0 && <div className="muted small kempty">{t(empty)}</div>}
        {cards.map((c) => (
          <div key={c.key} className={`kcard ${c.tone ? `kcard-${c.tone}` : ''}`}>
            <div className="kcard-title">
              {c.url ? (
                <a href={c.url} target="_blank" rel="noreferrer">
                  {c.prNumber ? 'PR ' : ''}#{c.number}
                </a>
              ) : (
                <b>#{c.number}</b>
              )}{' '}
              {c.title}
            </div>
            {render(c)}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Frame
      embedded={embedded}
      wide
      className="cyan-panel"
      accent="#65d8ef"
      title={
        <span style={{ borderLeft: `4px solid ${repo.color}`, paddingLeft: 8 }}>
          📋 {repo.fullName}{' '}
          <a className="small" href={repo.url} target="_blank" rel="noreferrer">
            GitHub ↗
          </a>
        </span>
      }
    >
      <div className="kanban-toolbar">
        <button className="btn btn-good" onClick={() => setShowForm((v) => !v)}>
          {t(showForm ? 'Cancel' : '+ New issue')}
        </button>
        <label className="toggle">
          <input type="checkbox" checked={repo.autoAssign} onChange={(e) => void api.updateRepo(repo.id, { autoAssign: e.target.checked }).catch(() => undefined)} />
          <T>⚡ Auto-assign work to free agents</T>
        </label>
        <label className="toggle" title={t('Merge a PR as soon as QA has signed off on its latest commit and GitHub’s checks are green')}>
          <input type="checkbox" checked={repo.autoMerge} onChange={(e) => void api.updateRepo(repo.id, { autoMerge: e.target.checked }).catch(() => undefined)} />
          <T>🔀 Auto-merge when QA and checks pass</T>
        </label>
        <span className="spacer" />
        <button className="btn" onClick={() => openOverlay({ kind: 'app', repoId: repo.id })} title={t('Open this floor’s running app')}>
          <T>🖥️ View app</T>
        </button>
        <span className="muted small">{repo.lastSync ? t('Synced {time}', { time: new Date(repo.lastSync).toLocaleTimeString() }) : t('Syncing…')}</span>
        <button className="btn" disabled={pending === 'sync'} onClick={() => act('sync', () => api.syncRepo(repo.id))}>
          <T>⟳ Sync</T>
        </button>
      </div>
      {repo.syncError && <div className="term-error">⚠️ {repo.syncError}</div>}
      {showForm && <IssueForm repoId={repo.id} agents={workers} onDone={() => setShowForm(false)} />}

      <div className="kanban kanban-5">
        {column(
          '📋 Backlog',
          'kcol-backlog',
          cols.backlog,
          (c) => (
            <div className="kcard-foot">
              {c.note && <span className="muted small">{c.note}</span>}
              <select
                value=""
                disabled={pending === c.key || free.length === 0}
                onChange={(e) => e.target.value && act(c.key, () => api.assign(e.target.value, c.number))}
                aria-label={t('Assign issue #{number}', { number: c.number })}
              >
                <option value="">{t(free.length ? 'Assign to…' : 'Everyone is busy')}</option>
                {free.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          ),
          'No open issues. File one above!',
        )}
        {column(
          '🔨 In progress',
          'kcol-progress',
          cols.progress,
          (c) => (
            <div className="kcard-foot">
              <AgentChip agent={c.agent} card={c} />
              <span className="muted small">{c.note}</span>
              <span className="spacer" />
              {terminalButton(c)}
            </div>
          ),
          'Nobody is coding right now.',
        )}
        {column(
          '🔍 In QA',
          'kcol-qa',
          cols.qa,
          (c) => {
            const st = c.qa?.status;
            return (
              <div className="kcard-foot kcard-foot-wrap">
                <AgentChip agent={c.agent} card={c} />
                <span className="muted small">{c.note}</span>
                <span className="spacer" />
                <QaLink card={c} />
                {previewButton(c)}
                {(st === 'testing' || st === 'fixing') && terminalButton(c)}
                {(!st || st === 'needs-human') && (
                  <button className="btn btn-small btn-good" disabled={pending === c.key} onClick={() => act(c.key, () => api.sendToQa(repo.id, c.number))}>
                    {t(st === 'needs-human' ? 'Retry QA' : 'Send to QA')}
                  </button>
                )}
                {(st === 'needs-human' || st === 'failed') && (
                  <button className="btn btn-small" disabled={pending === c.key} title={t('Hand it to its author, or any free agent, with QA’s findings and your note, without another QA round first')} onClick={() => sendBack(c)}>
                    <T>Send back for a fix</T>
                  </button>
                )}
                {st === 'needs-human' && (
                  <button className="btn btn-small btn-ghost" disabled={pending === c.key} onClick={() => merge(c)}>
                    <T>Merge anyway</T>
                  </button>
                )}
                {closeButton(c)}
              </div>
            );
          },
          'Nothing waiting for testing.',
        )}
        {column(
          '✅ Ready to merge',
          'kcol-review',
          cols.ready,
          (c) => {
            const pr = repo.pulls.find((p) => p.number === c.prNumber);
            return (
              <div className="kcard-foot kcard-foot-wrap">
                <AgentChip agent={c.agent} card={c} />
                <span className="muted small">
                  {c.note}
                  {pr ? ` · +${pr.additions} −${pr.deletions}` : ''}
                </span>
                <span className="spacer" />
                <QaLink card={c} />
                {previewButton(c)}
                <button className="btn btn-small btn-good" disabled={pending === c.key || pr?.isDraft} onClick={() => merge(c)}>
                  <T>Merge</T>
                </button>
                <button className="btn btn-small" disabled={pending === c.key} onClick={() => sendBack(c)}>
                  {t('Request changes')}
                </button>
                {closeButton(c)}
              </div>
            );
          },
          'No tested pull requests yet.',
        )}
        {column(
          '🎉 Merged',
          'kcol-merged',
          cols.merged,
          (c) => (
            <div className="kcard-foot">
              <AgentChip agent={c.agent} card={c} />
            </div>
          ),
          'Nothing merged yet.',
        )}
      </div>
    </Frame>
  );
}
