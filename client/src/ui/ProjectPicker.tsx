import { useEffect, useMemo, useState } from 'react';
import { T, useT } from '../i18n';
import { api, type FloorOptions } from '../api';
import { useStore } from '../store';
import type { GhRepoSummary, ProjectFolderView, RepoView } from '../../../shared/types';
import { confirmDialog } from './Confirm';

// Add a project to the office: one of your own folders, a GitHub repo, or something brand new.
// Used by the setup wizard and by the Floors tab of the manager's console.

type Mode = 'folder' | 'github' | 'new';

async function attempt<T>(fn: () => Promise<T>): Promise<T | undefined> {
  try {
    return await fn();
  } catch {
    return undefined; // api() already toasted the error
  }
}

const sep = (p: string) => (p.includes('\\') ? '\\' : '/');

function FolderMode({ floor, onDone }: { floor: FloorOptions; onDone: (r: RepoView) => void }) {
  const t = useT();
  const projectsDir = useStore((s) => s.settings.projectsDir);
  const [dir, setDir] = useState(projectsDir);
  const [root, setRoot] = useState('');
  const [folders, setFolders] = useState<ProjectFolderView[] | null>(null);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = (d?: string) => {
    setFolders(null);
    void attempt(() => api.folders(d)).then((res) => {
      setFolders(res?.folders ?? []);
      if (res) {
        setRoot(res.root);
        setDir(res.root);
      }
    });
  };
  useEffect(() => load(), []);

  const shown = useMemo(() => (folders ?? []).filter((f) => f.name.toLowerCase().includes(q.toLowerCase())), [folders, q]);
  const run = async (f: ProjectFolderView, fn: () => Promise<RepoView>) => {
    setBusy(f.path);
    const repo = await attempt(fn);
    setBusy(null);
    if (repo) onDone(repo);
    else load(root);
  };
  const publish = async (f: ProjectFolderView) => {
    const ok = await confirmDialog({
      icon: '🐙',
      title: t('Put {name} on GitHub?', { name: f.name }),
      body: (
        <>
          <T>This creates a</T> <b><T>private</T></b> <T>GitHub repo called</T> <code>{f.name}</code> <T>and pushes what’s already committed. Nothing uncommitted leaves your computer.</T>
          {!f.git && t(' An empty folder gets a starter README first.')}
        </>
      ),
      confirm: t('Create private repo'),
    });
    if (ok) void run(f, () => api.publishFolder({ path: f.path, visibility: 'private', ...floor }));
  };

  return (
    <div className="picker-mode">
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          load(dir.trim() || undefined);
        }}
      >
        <input value={dir} onChange={(e) => setDir(e.target.value)} placeholder="C:\Projects" title={t('Your projects folder')} aria-label={t('Your projects folder')} />
        <button className="btn btn-small"><T>Look here</T></button>
      </form>
      {root && root !== projectsDir && (
        <div className="row small">
          <span className="muted grow">{t('New projects are created in {path}.', { path: projectsDir })}</span>
          <button className="btn btn-small btn-ghost" onClick={() => void attempt(() => api.updateSettings({ projectsDir: root }))}>
            {t('Use {path} instead', { path: root })}
          </button>
        </div>
      )}
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Filter folders…')} />
      <div className="repo-list folder-list">
        {folders === null && <div className="muted small">{t('Looking through {path}…', { path: dir || t('your projects folder') })}</div>}
        {folders && shown.length === 0 && <div className="muted small">{t(q ? 'No matching folders here.' : 'No folders here.')}</div>}
        {shown.map((f) => (
          <div key={f.path} className="repo-row">
            <div style={{ minWidth: 0 }}>
              <b>📁 {f.name}</b>{' '}
              {f.floor != null ? (
                <span className="chip chip-good">{t('Floor {floor}', { floor: f.floor })}</span>
              ) : f.github ? (
                <span className="chip">🐙 {f.github}</span>
              ) : (
                <span className="chip chip-warn">{t(f.git ? 'not on GitHub' : 'no git yet')}</span>
              )}
            </div>
            {f.floor != null ? (
              <span className="muted small"><T>in the office</T></span>
            ) : f.github ? (
              <button className="btn btn-small btn-good" disabled={!!busy} onClick={() => run(f, () => api.connectFolder(f.path, floor))}>
                {t(busy === f.path ? 'Moving in…' : 'Add floor')}
              </button>
            ) : (
              <button className="btn btn-small" disabled={!!busy} onClick={() => void publish(f)}>
                {t(busy === f.path ? 'Publishing…' : 'Publish to GitHub')}
              </button>
            )}
          </div>
        ))}
      </div>
      <p className="muted small">
        <T>The office never touches your work in progress: after a merge it only fast-forwards your folder when it’s on the default branch with no local changes (and runs npm install if dependencies changed). Each agent works in its own git worktree of it, kept outside your project (so your dev server and linters never see them).</T>
      </p>
    </div>
  );
}

function GithubMode({ floor, onDone }: { floor: FloorOptions; onDone: (r: RepoView) => void }) {
  const t = useT();
  const repos = useStore((s) => s.repos);
  const projectsDir = useStore((s) => s.settings.projectsDir);
  const [list, setList] = useState<GhRepoSummary[] | null>(null);
  const [owner, setOwner] = useState('');
  const [q, setQ] = useState('');
  const [manual, setManual] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const load = (o?: string) => {
    setList(null);
    void attempt(() => api.githubRepos(o)).then((r) => setList(r ?? []));
  };
  useEffect(() => load(), []);
  const connected = new Set(repos.map((r) => r.id.toLowerCase()));
  const shown = (list ?? []).filter((r) => !connected.has(r.nameWithOwner.toLowerCase()) && r.nameWithOwner.toLowerCase().includes(q.toLowerCase())).slice(0, 60);
  const connect = async (name: string) => {
    setBusy(name);
    const repo = await attempt(() => api.connectRepo(name, floor));
    setBusy(null);
    if (repo) onDone(repo);
  };
  return (
    <div className="picker-mode">
      <div className="row">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('Filter your repos…')} />
        <input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder={t('Org (optional)')} style={{ maxWidth: 160 }} />
        <button className="btn btn-small" onClick={() => load(owner.trim() || undefined)}>
          <T>List</T>
        </button>
      </div>
      <div className="repo-list folder-list">
        {list === null && <div className="muted small"><T>Asking GitHub for your repos…</T></div>}
        {list && shown.length === 0 && <div className="muted small"><T>No matching repos.</T></div>}
        {shown.map((r) => (
          <div key={r.nameWithOwner} className="repo-row">
            <div style={{ minWidth: 0 }}>
              <b>{r.nameWithOwner}</b> <span className="chip">{t(r.visibility.toLowerCase())}</span>
              {r.description && <div className="muted small">{r.description}</div>}
            </div>
            <button className="btn btn-small btn-good" disabled={!!busy} onClick={() => connect(r.nameWithOwner)}>
              {t(busy === r.nameWithOwner ? 'Moving in…' : 'Add floor')}
            </button>
          </div>
        ))}
      </div>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          if (manual.trim()) void connect(manual.trim());
        }}
      >
        <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder={t('…or type owner/name')} />
        <button className="btn btn-small" disabled={!manual.trim() || !!busy}>
          <T>Add floor</T>
        </button>
      </form>
      <p className="muted small">
        {t('If it’s already in {path}, that folder is used. Otherwise it’s cloned to {destination}.', { path: projectsDir || t('your projects folder'), destination: `${projectsDir}${sep(projectsDir)}<name>` })}
      </p>
    </div>
  );
}

function NewMode({ floor, onDone }: { floor: FloorOptions; onDone: (r: RepoView) => void }) {
  const t = useT();
  const projectsDir = useStore((s) => s.settings.projectsDir);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'public'>('private');
  const [busy, setBusy] = useState(false);
  const slug = name.trim().replace(/[^A-Za-z0-9._-]+/g, '-');
  return (
    <form
      className="picker-mode"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!slug) return;
        setBusy(true);
        const repo = await attempt(() => api.createRepo({ name: slug, description, visibility, ...floor }));
        setBusy(false);
        if (repo) onDone(repo);
      }}
    >
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('Project name, e.g. island-bakery')} autoFocus />
      <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('One-line description (optional)')} />
      <div className="row">
        <label className="toggle">
          <input type="radio" checked={visibility === 'private'} onChange={() => setVisibility('private')} /> <T>Private</T>
        </label>
        <label className="toggle">
          <input type="radio" checked={visibility === 'public'} onChange={() => setVisibility('public')} /> <T>Public</T>
        </label>
        <span className="spacer" />
        <button className="btn btn-good" disabled={busy || !slug}>
          {t(busy ? 'Creating…' : 'Create project')}
        </button>
      </div>
      <p className="muted small">
        <T>Creates</T> <code>{slug ? `${projectsDir}${sep(projectsDir)}${slug}` : `${projectsDir}${sep(projectsDir)}…`}</code> {t('with a README and pushes it to a new {visibility} GitHub repo.', { visibility: t(visibility) })}
        {' '}{floor.onboardCeo !== false && t('The CEO starts a project interview in Chat, even without a brief. Read and approve the complete plan before any plan issues or workers start.')}
      </p>
    </form>
  );
}

export function ProjectPicker({ onConnected, initial = 'folder' }: { onConnected?: (repo: RepoView) => void; initial?: Mode }) {
  const t = useT();
  const [mode, setMode] = useState<Mode>(initial);
  const [mission, setMission] = useState('');
  const [autoAssign, setAutoAssign] = useState(true);
  const [onboardCeo, setOnboardCeo] = useState(true);
  const [autoMerge, setAutoMerge] = useState(true);
  const floor: FloorOptions = { mission: onboardCeo ? mission : '', autoAssign, onboardCeo, autoMerge };
  const done = (repo: RepoView) => {
    setMission('');
    onConnected?.(repo);
  };
  const modes: [Mode, string][] = [
    ['folder', '📁 A folder on this computer'],
    ['github', '🐙 A GitHub repo'],
    ['new', '✨ Something new'],
  ];
  return (
    <div className="picker">
      <div className="picker-tabs">
        {modes.map(([k, label]) => (
          <button key={k} className={`picker-tab ${mode === k ? 'picker-tab-on' : ''}`} onClick={() => setMode(k)}>
            {t(label)}
          </button>
        ))}
      </div>
      <textarea
        value={mission}
        disabled={!onboardCeo}
        onChange={(e) => setMission(e.target.value)}
        rows={2}
        placeholder={t(mode === 'new' ? 'What should the team build? e.g. A cozy 3D browser game where you run a tiny island bakery.' : 'Brief for the CEO (optional): what should the team work on next?')}
      />
      <label className="toggle small">
        <input type="checkbox" checked={autoAssign} onChange={(e) => setAutoAssign(e.target.checked)} />
        <T>⚡ Start work automatically: free agents pick up issues as soon as they're filed (you can switch this off per floor)</T>
      </label>
      <label className="toggle small">
        <input type="checkbox" checked={onboardCeo} onChange={(e) => setOnboardCeo(e.target.checked)} />
        <T>Let the CEO study this repository and plan from the brief (turn off to skip onboarding and its AI request)</T>
      </label>
      <label className="toggle small">
        <input type="checkbox" checked={autoMerge} onChange={(e) => setAutoMerge(e.target.checked)} />
        <T>Merge automatically after QA and GitHub checks pass</T>
      </label>
      {mode === 'folder' && <FolderMode floor={floor} onDone={done} />}
      {mode === 'github' && <GithubMode floor={floor} onDone={done} />}
      {mode === 'new' && <NewMode floor={floor} onDone={done} />}
    </div>
  );
}
