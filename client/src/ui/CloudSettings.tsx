// Settings → Cloud agents (docs/cloud.md): where new agents work, the Upstash account their Boxes run in, and what
// they sign in with. Keys and tokens are write-only: the browser only sees whether each is there and where it's from.
// Without a key, each cloud agent's coding agent signs in in their own terminal (the 🔑 Sign in on their card).
import { useId, useState } from 'react';
import { T, useT } from '../i18n';
import { api } from '../api';
import { useStore } from '../store';
import { BOX_SIZE_INFO, BOX_SIZES, MAX_BOX_LIMIT } from '../../../shared/cloud';
import type { CloudCredentialView, CloudSettings as Cloud, CloudView } from '../../../shared/types';
import { confirmDialog } from './Confirm';

const DOCS = 'https://github.com/rosariomoscato/droidsembly/blob/main/docs/cloud.md';

/** A command to copy, with a Copy button. */
function Command({ text }: { text: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  return (
    <span className="cloud-cmd">
      <code>{text}</code>
      <button
        type="button"
        className="btn btn-small btn-ghost"
        onClick={() =>
          void navigator.clipboard?.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          })
        }
      >
        {t(copied ? 'Copied' : 'Copy')}
      </button>
    </span>
  );
}

/** A write-only key or token: its hint once saved (Replace, Remove), else a field to paste one. */
function SecretField({ label, saved, hint, placeholder, help, save }: { label: string; saved: boolean; hint: string; placeholder: string; help?: string; save: (value: string) => Promise<unknown> }) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const errorId = useId();
  const store = async (v: string) => {
    setBusy(true);
    setError('');
    try {
      await save(v);
      setValue(''); // never kept or shown again once saved
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };
  if (saved && !editing) {
    return (
      <div className="row wrap">
        <span className="grow small">
          🔑 {t(label)} · <T>saved</T>{hint && <code> …{hint}</code>}
        </span>
        <button className="btn btn-small btn-ghost" onClick={() => setEditing(true)}>
          <T>Replace</T>
        </button>
        <button
          className="btn btn-small btn-ghost"
          disabled={busy}
          onClick={() =>
            void confirmDialog({ tone: 'danger', title: t('Remove the {label}?', { label: t(label) }), body: t('It’s deleted from the office. Cloud agents that need it can’t sign in until you add it again.'), confirm: t('Remove') }).then((ok) => {
              if (ok) void store('');
            })
          }
        >
          <T>Remove</T>
        </button>
      </div>
    );
  }
  return (
    <form
      className="notify-form"
      onSubmit={(e) => {
        e.preventDefault();
        void store(value);
      }}
    >
      {help && <p className="muted small">{t(help)}</p>}
      <label className="field">
        <span>{t(label)}</span>
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={t(placeholder)}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
        />
      </label>
      {error && (
        <div id={errorId} className="term-error small" role="alert">
          {error}
        </div>
      )}
      <div className="row">
        <button className="btn btn-small btn-good" disabled={busy || !value.trim()}>
          {t(busy ? 'Checking…' : 'Save')}
        </button>
        {editing && (
          <button
            type="button"
            className="btn btn-small btn-ghost"
            onClick={() => {
              setEditing(false);
              setValue('');
              setError('');
            }}
          >
            <T>Cancel</T>
          </button>
        )}
      </div>
    </form>
  );
}

/** ✓ or ⚠, and where the credential comes from. */
function Status({ view, what }: { view: CloudCredentialView; what: Partial<Record<NonNullable<CloudCredentialView['source']>, string>> }) {
  const t = useT();
  return view.ready ? <span className="small notify-ok">✓ {t((view.source && what[view.source]) || 'Ready')}</span> : <span className="small term-error">⚠ <T>Not set up yet</T></span>;
}

function Boxes({ cloud }: { cloud: CloudView }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const b = cloud.boxes;
  const test = async () => {
    setBusy(true);
    setNote('');
    try {
      await api.testCloud();
      setNote('✓ Connected');
    } catch (err) {
      setNote(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };
  const removeOrphans = async () => {
    if (busy || !cloud.boxes?.orphans) return;
    const ok = await confirmDialog({ tone: 'danger', title: t('Delete {count} orphaned Boxes?', { count: cloud.boxes.orphans }),
      body: t('Boxes of this office whose agent is gone. They’re deleted for good in your Upstash account.'), confirm: t('Delete') });
    if (!ok) return;
    setBusy(true); setNote('');
    try {
      const result = await api.deleteCloudOrphans();
      setNote(result.unconfirmed
        ? t('{deleted} removals confirmed; {unconfirmed} not confirmed. Check the Upstash console; resources may still be billed.', result)
        : t('✓ {count} Box removals confirmed', { count: result.deleted }));
    } catch (err) { setNote(err instanceof Error ? err.message : String(err)); }
    finally { setBusy(false); }
  };
  return (
    <div className="row wrap">
      <span className="grow small">
        {b ? t('{total} Boxes on your account · this office: {running} running, {paused} paused', { total: b.total, running: b.running, paused: b.paused }) : t('Boxes not counted yet.')}
        {cloud.keyError && <span className="term-error"> {cloud.keyError}</span>}
      </span>
      <button className="btn btn-small" disabled={busy} onClick={() => void test()}>
        {t(busy ? 'Checking…' : 'Test')}
      </button>
      {!!b?.orphans && (
        <button
          className="btn btn-small btn-ghost"
          disabled={busy}
          onClick={() => void removeOrphans()}
        >
          {t('Delete {count} orphans', { count: b.orphans })}
        </button>
      )}
      {note && (
        <span className={`small ${note.startsWith('✓') ? 'notify-ok' : 'term-error'}`} role="status">
          {note === '✓ Connected' ? t('✓ Connected') : note}
        </span>
      )}
    </div>
  );
}

export function CloudSettings() {
  const t = useT();
  const settings = useStore((s) => s.settings.cloud);
  const cloud = useStore((s) => s.cloud);
  const demo = useStore((s) => s.demo);
  const [error, setError] = useState('');
  const [pauseBusy, setPauseBusy] = useState(false);
  const save = (patch: Partial<Cloud>) => {
    setError('');
    void api.updateSettings({ cloud: { ...settings, ...patch } }).catch((err) => setError(err instanceof Error ? err.message : String(err)));
  };
  const setWorkPaused = async (paused: boolean) => {
    if (!paused && !await confirmDialog({ title: t('Resume new cloud work?'), body: t('Queued cloud issues, QA and fixes may start and consume provider quota and Box resources.'), confirm: t('Resume') })) return;
    setPauseBusy(true); setError('');
    try { await api.updateSettings({ cloud: { ...settings, pauseNewWork: paused } }); }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { setPauseBusy(false); }
  };
  return (
    <div className="card notify-settings">
      <h3><T>☁️ Cloud agents</T></h3>
      <p className="muted small">
        <T>Run agents in</T> <a href="https://upstash.com/docs/box/overall/quickstart">Upstash Boxes</a> <T>instead of on this computer. A cloud agent keeps working on its task when you close the office or shut your laptop, and the office catches up when it’s back. Agents on this computer stay the default.</T>
      </p>

      <h4 className="notify-h"><T>First cloud task: four checks</T></h4>
      <ol className="cloud-steps small">
        <li><T>Save and test the Upstash key, then confirm GitHub access to the intended repositories.</T></li>
        <li><T>Choose a cloud agent, coding agent and model in Setup before signing in.</T></li>
        <li><T>Use Sign in on the agent card and finish the official provider login in that Box terminal. Never copy a PC login file.</T></li>
        <li><T>Check model access and provider quota, then assign one task. A ready Box or saved account is not proof of available AI quota.</T></li>
      </ol>

      <h4 className="notify-h"><T>Upstash account</T></h4>
      <div className="notify-hook">
        <SecretField
          label="Upstash Box API key"
          saved={cloud.keySet}
          hint={cloud.keyHint}
          placeholder={demo ? 'Any text works in the demo' : 'Your Box API key'}
          help="Create one in the Upstash console (console.upstash.com → Box → API Keys). It stays on the office’s computer."
          save={(key) => api.setCloudKey(key)}
        />
        {cloud.keySet && <Boxes cloud={cloud} />}
      </div>

      <h4 className="notify-h"><T>Where new agents work</T></h4>
      <div className="notify-hook" role="radiogroup" aria-label={t('Where new agents work')}>
        <label className="toggle block">
          <input type="radio" name="cloud-kind" checked={settings.machineKind === 'local'} onChange={() => save({ machineKind: 'local' })} />
          <span><T>🖥️ This computer</T></span>
        </label>
        <label className="toggle block">
          <input type="radio" name="cloud-kind" checked={settings.machineKind === 'box'} disabled={!cloud.keySet} onChange={() => save({ machineKind: 'box' })} />
          <span><T>☁️ An Upstash Box each</T>{!cloud.keySet && t(' (save your API key first)')}</span>
        </label>
        <p className="muted small"><T>New hires work here; the lobby lets you pick for each one. Move an agent from their settings when they have no task.</T></p>
        <div className="row wrap">
          <label className="field grow">
            <span><T>Box size</T></span>
            <select value={settings.boxSize} onChange={(e) => save({ boxSize: e.target.value as Cloud['boxSize'] })}>
              {BOX_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s} · {BOX_SIZE_INFO[s].spec} · ${BOX_SIZE_INFO[s].usdPerCpuHour.toFixed(2)} {t('per active CPU hour')}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span><T>Your plan’s Box limit</T></span>
            <input
              type="number"
              min={1}
              max={MAX_BOX_LIMIT}
              value={settings.boxLimit}
              onChange={(e) => {
                const n = Math.round(Number(e.target.value));
                if (n >= 1) save({ boxLimit: n });
              }}
            />
          </label>
        </div>
        {error && (
          <div className="term-error small" role="alert">
            {error}
          </div>
        )}
      </div>

      <h4 className="notify-h"><T>Cloud work and spending awareness</T></h4>
      <div className="notify-hook">
        <label className="toggle block">
          <input type="checkbox" checked={settings.pauseNewWork === true} disabled={pauseBusy} onChange={(e) => void setWorkPaused(e.target.checked)} />
          <span><T>Pause new cloud work</T></span>
        </label>
        {settings.pauseNewWork && <p className="small" role="status"><T>New cloud work is paused. Local work and the CEO are unaffected.</T></p>}
        <p className="muted small"><T>This blocks new cloud assignments and new AI launches, not sessions already running, manual sign-in or Box storage charges. Stop or remove resources explicitly when you are finished.</T></p>
        <p className="muted small"><T>Reference CPU rates are not an invoice or a spending cap. Actual Box CPU time, storage and AI charges are not reported here; check provider dashboards. Unknown usage is not zero.</T></p>
      </div>

      <h4 className="notify-h"><T>How cloud agents sign in</T></h4>
      <div className="notify-hook">
        <b>OpenCode V2</b>
        <p className="muted small"><T>OpenCode signs in to its selected provider in each Box. Use Sign in in the agent terminal, then browse models in that agent’s Setup. Local OpenCode accounts and the Claude/Codex keys below are not copied or reused.</T></p>
        <p className="muted small"><T>In the agent’s Setup, open OpenCode connections to choose a provider, authentication method and saved account. Account changes apply to that Box, not to this computer or other Boxes.</T></p>
      </div>
      <p className="muted small">
        <T>GitHub is set up once for every Box. Coding agents sign in with your own subscription in each cloud agent’s terminal, once per cloud machine, unless you give them a key here.</T>
      </p>
      <div className="notify-hook">
        <div className="row wrap">
          <b className="grow">GitHub</b>
          <Status view={cloud.github} what={{ gh: 'Your gh login', token: 'A token you saved' }} />
        </div>
        <p className="muted small"><T>Your gh login is used unless you save a fine-grained token for your floors’ repos (Contents, Pull requests and Issues: read and write), which is safer.</T></p>
        <SecretField label="GitHub token" saved={cloud.github.source === 'token'} hint={cloud.github.hint} placeholder="github_pat_…" save={(v) => api.setCloudToken('github', v)} />
      </div>
      <div className="notify-hook">
        <div className="row wrap">
          <b className="grow">Claude Code</b>
          <Status view={cloud.claude} what={{ login: 'Your subscription, per agent', subscription: 'Your Claude subscription (CUBEFARM_CLAUDE_TOKEN)', apiKey: 'An Anthropic API key' }} />
        </div>
        {cloud.claude.source === 'login' && (
          <p className="muted small">
            <T>With your Claude subscription (Pro or Max), each cloud agent signs in once, in their own terminal. When one needs it, their desk shows a 🔑 note and their card a 🔑 Sign in: open the link in their terminal, approve it and paste the code back there. Their cloud machine keeps the sign-in; if it ever expires, the same steps sign them in again.</T>
          </p>
        )}
        {cloud.claude.source !== 'subscription' && (
          <>
            <p className="muted small"><T>Or pay per token with an API key, which every cloud agent then uses instead:</T></p>
            <SecretField label="Anthropic API key" saved={cloud.claude.source === 'apiKey'} hint={cloud.claude.hint} placeholder="sk-ant-…" save={(v) => api.setCloudToken('anthropic', v)} />
            <details className="small">
              <summary><T>Or one subscription token for every cloud agent</T></summary>
              <ol className="cloud-steps">
                <li>
                  <T>In a terminal:</T> <Command text="claude setup-token" /> <T>and approve it in your browser. It prints a token that lasts a year.</T>
                </li>
                <li>
                  <T>Keep it in your environment as</T> <code>CUBEFARM_CLAUDE_TOKEN</code>. Windows: <Command text={'setx CUBEFARM_CLAUDE_TOKEN "<token>"'} /> <T>macOS or Linux: add</T>{' '}
                  <Command text={'export CUBEFARM_CLAUDE_TOKEN="<token>"'} /> <T>to your shell profile.</T>
                </li>
                <li><T>Restart the office.</T></li>
              </ol>
              <p className="muted"><T>The office never writes it down: Anthropic’s terms keep apps like this one from storing Claude tokens.</T></p>
            </details>
          </>
        )}
      </div>
      <div className="notify-hook">
        <div className="row wrap">
          <b className="grow">Codex</b>
          <Status view={cloud.codex} what={{ login: 'Your ChatGPT plan, per agent', apiKey: 'An OpenAI API key' }} />
        </div>
        <p className="muted small">
          <T>With your ChatGPT plan, each cloud agent signs in once in their own terminal: open the link it shows and enter its one-time code. Or an OpenAI API key works in every Box:</T>
        </p>
        <SecretField label="OpenAI API key" saved={cloud.codex.source === 'apiKey'} hint={cloud.codex.hint} placeholder="sk-…" save={(v) => api.setCloudToken('openai', v)} />
      </div>
      {demo && cloud.keySet && (
        <div className="row wrap">
          <span className="grow muted small"><T>Try what happens when a cloud agent’s sign-in runs out: every Box is signed out, and its agent asks to be signed in again.</T></span>
          <button className="btn btn-small btn-ghost" onClick={() => void api.expireSignIns()}>
            <T>🔑 Expire sign-ins (demo)</T>
          </button>
        </div>
      )}
      <p className="muted small">
        <T>Paused Boxes can still incur storage charges. Check current plan limits and prices in Upstash; the office’s Box limit is not a billing cap. Setup and what keeps going while the office is closed:</T>{' '}
        <a href={DOCS}>docs/cloud.md</a>.
      </p>
    </div>
  );
}
