import { Fragment, useEffect, useId, useMemo, useState, type CSSProperties } from 'react';
import { api } from '../api';
import { isBusy, useStore, type Agent } from '../store';
import type { AgentCli, AgentPromptView, CliView, CloudMachineState, EffortLevel, MachineHost } from '../../../shared/types';
import { BUILDS, GLASSES, HEADWEAR, OUTFITS, type AgentStyle } from '../../../shared/looks';
import { CLAUDE_MODELS, effectiveModel, modelSuggestions } from '../../../shared/models';
import { PANEL_LABELS, ROBOT_ACCENTS, robotAppearanceFor } from '../world/robotAppearance';
import { LookPreview } from '../world/LookPreview';
import { workerCli } from './floorRows';
import { confirmDialog } from './Confirm';
import { OpenCodeModelPicker, OpenCodeVariantSelect } from './OpenCodeModelPicker';
import { OpenCodeConnections } from './OpenCodeConnections';
import { T, useT } from '../i18n';

// One agent's setup (name, look, coding agent, model, effort), edited in place: the Team tab's row cells and the
// ⚙️ Setup section of their panel share these. Every change is a PATCH; the `agent` event updates all views.

export const EFFORTS: EffortLevel[] = ['low', 'medium', 'high', 'xhigh', 'max'];

export const cliName = (clis: CliView[], id: AgentCli) => clis.find((c) => c.id === id)?.label ?? id;

type Patch = Parameters<typeof api.updateAgent>[1];

async function save(id: string, patch: Patch) {
  try {
    await api.updateAgent(id, patch);
  } catch {
    // api() already toasted the error
  }
}

/** The coding agents to pick from, installed ones first, each saying if it's missing on this machine. */
export function CliOptions({ clis, cloud = false }: { clis: CliView[]; cloud?: boolean }) {
  const t = useT();
  return (
    <>
      {[...clis].sort((a, b) => Number(b.installed) - Number(a.installed)).map((c) => (
        <option key={c.id} value={c.id} disabled={!cloud && (!c.installed || !!c.problem)} title={cloud ? undefined : c.problem}>
          {c.label}
          {t(cloud ? '' : !c.installed ? ' (not installed)' : c.problem ? ' (incompatible version)' : '')}
        </option>
      ))}
    </>
  );
}

interface FieldProps {
  agent: Agent;
  id?: string;
  className?: string;
  style?: CSSProperties;
}

export function NameInput({ agent, id, className = 'inline', style }: FieldProps) {
  const t = useT();
  return (
    <input
      id={id}
      key={`n-${agent.name}`}
      className={className}
      style={style}
      defaultValue={agent.name}
      maxLength={24}
      aria-label={id ? undefined : t('Name')}
      onBlur={(e) => e.target.value.trim() && e.target.value !== agent.name && void save(agent.id, { name: e.target.value })}
    />
  );
}

export function CliSelect({ agent, id, style }: FieldProps) {
  const t = useT();
  const settings = useStore((s) => s.settings);
  const clis = useStore((s) => s.clis);
  const ceo = agent.role === 'ceo';
  return (
    <select id={id} value={agent.cli} title={t('Their coding agent')} aria-label={id ? undefined : t('Coding agent')} style={style} onChange={(e) => void save(agent.id, { cli: e.target.value as AgentCli | '' })}>
      <option value="">{cliName(clis, ceo ? 'claude' : settings.defaultCli)} {t('(default)')}</option>
      <CliOptions clis={ceo ? clis.filter((c) => c.id === 'claude' || c.id === 'opencode') : clis} cloud={!ceo && agent.host === 'box'} />
    </select>
  );
}

/** A cloud agent's Box, in words. */
export const CLOUD_STATE: Record<CloudMachineState, string> = {
  none: 'no Box yet',
  creating: 'creating their Box…',
  'setting-up': 'setting up their Box…',
  ready: 'Box ready',
  paused: 'Box paused (wakes for their next task)',
  disconnected: 'reconnecting to their Box…',
  error: "their Box couldn't be set up",
};

/** Where they work: this computer or an Upstash Box of their own (docs/cloud.md). A move waits until they have no task. */
export function HostSelect({ agent, id, style }: FieldProps) {
  const t = useT();
  const keySet = useStore((s) => s.cloud.keySet);
  const box = agent.host === 'box';
  const busy = !!agent.task || isBusy(agent);
  const move = async (to: MachineHost) => {
    const ok = await confirmDialog({
      title: t(to === 'box' ? 'Move {name} to the cloud?' : 'Move {name} back to this computer?', { name: agent.name }),
      body: t(to === 'box' ? 'Their local machine is removed (work that isn’t on GitHub is saved to leftovers first), and their next session starts fresh in an Upstash Box of their own.' : 'Their cloud machine is removed (work that isn’t on GitHub is saved to leftovers first), and their next session starts fresh.'),
      confirm: t('Move'),
    });
    if (ok) await save(agent.id, { host: to });
  };
  return (
    <select id={id} value={box ? 'box' : 'local'} disabled={busy} style={style} title={t(busy ? 'Move them once their task is done' : 'Where they work')} aria-label={id ? undefined : t('Works on')} onChange={(e) => void move(e.target.value as MachineHost)}>
      <option value="local">{t('🖥️ This computer')}</option>
      <option value="box" disabled={!box && !keySet}>
        ☁️ Upstash Box{t(!box && !keySet ? ' (connect Upstash in Settings first)' : '')}
      </option>
    </select>
  );
}

export function ModelInput({ agent, id, className = 'inline', style }: FieldProps) {
  const t = useT();
  const settings = useStore((s) => s.settings);
  const listId = useId();
  const cli = workerCli(agent, settings);
  return (
    <>
      <input
        id={id}
        key={`m-${agent.model}-${cli}`}
        className={className}
        style={style}
        list={listId}
        defaultValue={agent.model}
        placeholder={(agent.role === 'ceo' ? (cli === 'claude' ? CLAUDE_MODELS[0] : '') : effectiveModel('', cli, settings, CLAUDE_MODELS[0])) || t('agent default')}
        title={t(cli === 'opencode' ? 'OpenCode model: provider/model#variant (empty = OpenCode default)' : agent.role === 'ceo' ? 'The CEO’s model' : 'Their model (empty = the default for their coding agent)')}
        aria-label={id ? undefined : t('Model')}
        onBlur={(e) => e.target.value !== agent.model && void save(agent.id, { model: e.target.value })}
      />
      {cli === 'opencode' && <OpenCodeModelPicker value={agent.model} agent={agent.id} inherited={agent.role !== 'ceo' && settings.defaultCli === 'opencode' ? settings.defaultModel : undefined} onSelect={(model) => void save(agent.id, { model })} />}
      <datalist id={listId}>
        {modelSuggestions(cli).map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>
    </>
  );
}

export function EffortSelect({ agent, id, style }: FieldProps) {
  const t = useT();
  const settings = useStore((s) => s.settings);
  const defaultEffort = settings.defaultEffort;
  const opencode = workerCli(agent, settings) === 'opencode';
  if (opencode) return <OpenCodeVariantSelect value={agent.model} agent={agent.id} id={id} style={style}
    inherited={agent.role !== 'ceo' && settings.defaultCli === 'opencode' ? settings.defaultModel : undefined}
    onSelect={(model) => void save(agent.id, { model })} />;
  return (
    <select id={id} value={agent.effort} title={t(agent.role === 'ceo' ? 'The CEO’s effort' : 'Their effort')} aria-label={id ? undefined : t('Effort')} style={style} onChange={(e) => void save(agent.id, { effort: e.target.value as EffortLevel | '' })}>
      {(agent.role !== 'ceo' || !agent.effort) && <option value="">{t('default ({effort})', { effort: defaultEffort })}</option>}
      {EFFORTS.map((x) => (
        <option key={x} value={x}>
          {x}
        </option>
      ))}
    </select>
  );
}

export function LookSelect({ agent, id }: FieldProps) {
  const t = useT();
  return (
    <select id={id} value={agent.look} title={t('Agent identity')} aria-label={id ? undefined : t('Agent identity')} style={{ width: 'auto' }} onChange={(e) => void save(agent.id, { look: e.target.value as 'feminine' | 'masculine' })}>
      <option value="feminine">{t('She')}</option>
      <option value="masculine">{t('He')}</option>
    </select>
  );
}

const capital = (s: string) => s[0].toUpperCase() + s.slice(1);

function Swatches({ label, colors, value, onPick }: { label: string; colors: readonly string[]; value: string; onPick: (c: string) => void }) {
  const t = useT();
  const all = colors.includes(value) ? colors : [value, ...colors];
  return (
    <div className="field">
      <span>{t(label)}</span>
      <div className="swatches" role="radiogroup" aria-label={t(label)}>
        {all.map((c) => (
          <button key={c} type="button" role="radio" aria-checked={c === value} aria-label={c} title={c} className={`swatch ${c === value ? 'swatch-on' : ''}`} style={{ background: c }} onClick={() => onPick(c)} />
        ))}
      </div>
    </div>
  );
}

function PickSelect<T extends string>({ label, value, options, labels, onPick, disabled, title }: { label: string; value: T; options: readonly T[]; labels?: Record<T, string>; onPick: (v: T) => void; disabled?: boolean; title?: string }) {
  const t = useT();
  const id = useId();
  return (
    <label className="field" htmlFor={id}>
      <span>{t(label)}</span>
      <select id={id} aria-label={t(label)} value={value} disabled={disabled} title={title} onChange={(e) => onPick(e.target.value as T)}>
        {options.map((o) => (
          <option key={o} value={o}>
            {t(labels?.[o] ?? capital(o))}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * How they're drawn: a live 3D preview and the picks, each saved straight onto the agent (agent.style), over the
 * look seeded from their id. Their character in the office follows at once.
 */
export function LookEditor({ agent }: { agent: Agent }) {
  const t = useT();
  const look = useMemo(() => robotAppearanceFor(agent), [agent]);
  const pick = (patch: AgentStyle) => void save(agent.id, { style: { ...agent.style, ...patch } });
  const shuffle = () => {
    const one = <T,>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)];
    pick({ glasses: one(GLASSES), headwear: one(HEADWEAR), outfit: one(OUTFITS), build: one(BUILDS), accent: Math.floor(Math.random() * ROBOT_ACCENTS.length) });
  };
  return (
    <fieldset className="look-editor">
      <legend><T>Look</T></legend>
      <div className="look-body">
        <LookPreview id={agent.id} label={t('{name} as they’ll look', { name: agent.name })} />
        <div className="look-fields">
          <PickSelect label="Glasses" value={look.glasses} options={GLASSES} onPick={(glasses) => pick({ glasses })} />
          <PickSelect
            label="Headwear"
            value={look.headwear}
            options={HEADWEAR}
            onPick={(headwear) => pick({ headwear })}
          />
          {agent.role === 'ceo' ? (
            <div className="field">
              <span><T>Shell module</T></span>
              <span className="muted small"><T>Coordination module</T></span>
            </div>
          ) : (
            <PickSelect label="Shell module" value={look.outfit} options={OUTFITS} labels={PANEL_LABELS} onPick={(outfit) => pick({ outfit })} />
          )}
          <PickSelect label="Build" value={look.build} options={BUILDS} onPick={(build) => pick({ build })} />
          <Swatches label="Accent colour" colors={ROBOT_ACCENTS} value={ROBOT_ACCENTS[look.accent]} onPick={(c) => pick({ accent: ROBOT_ACCENTS.indexOf(c as (typeof ROBOT_ACCENTS)[number]) })} />
        </div>
      </div>
      <div className="row wrap">
        <button type="button" className="btn btn-small" onClick={shuffle}>
          <T>🎲 Shuffle</T>
        </button>
        <button type="button" className="btn btn-small btn-ghost" disabled={!agent.style} onClick={() => void save(agent.id, { style: null })}>
          <T>↺ Back to their seeded look</T>
        </button>
        <span className="muted small"><T>Robot cosmetics only: modules do not change the agent’s job.</T></span>
      </div>
    </fieldset>
  );
}

/**
 * "What they're told": what the office gives them on each kind of task (the CEO: its one prompt), read-only, with
 * <placeholders> for each task's details. Fetched when opened and again whenever something in it changes.
 */
export function PromptPreview({ agent }: { agent: Agent }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState<AgentPromptView | null>(null);
  const [failed, setFailed] = useState(false);
  // The floor's (or, for the CEO, the office's) settings that appear in the prompt: changing one refreshes it.
  const context = useStore((s) => {
    const r = s.repos.find((x) => x.id === agent.repoId);
    const o = s.settings;
    return JSON.stringify(r ? [r.fullName, r.defaultBranch, r.autoMerge, r.browserTesting, r.links, r.mission, r.summary, r.qaBrief] : [o.companyName, o.managerName, o.sessionLimit, o.maxAgents, o.scaling, o.runtime]);
  });
  useEffect(() => {
    if (!open) return;
    let live = true;
    api.agentPrompt(agent.id).then(
      (p) => {
        if (!live) return;
        setPrompt(p);
        setFailed(false);
      },
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [open, agent.id, agent.name, agent.cli, context]);
  return (
    <details className="prompt-preview" onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary><T>What they’re told</T></summary>
      {failed && !prompt && <p className="muted small"><T>Couldn’t load their prompt.</T></p>}
      {!prompt && !failed && <p className="muted small"><T>Loading…</T></p>}
      {prompt && (
        <>
          <p className="muted small">
            {t(prompt.kind === 'ceo'
              ? 'The CEO’s instructions for every job. They’re all the office’s own.'
              : 'The office’s workflow and safety rules for each kind of task, the same for every agent and sent with every session; <placeholders> are filled in per task.')}
          </p>
          {prompt.parts.map((p) => (
            <Fragment key={p.label}>
              <p className="small">
                <b>{p.label}</b> <span className="muted">· {t('{count} characters', { count: p.text.length.toLocaleString() })}</span>
              </p>
              <pre className="prompt-text" tabIndex={0} aria-label={t('{name}’s prompt: {label}', { name: agent.name, label: p.label })}>
                {p.text}
              </pre>
            </Fragment>
          ))}
        </>
      )}
    </details>
  );
}

/** The ⚙️ Setup section of an agent's panel, including the CEO's own coding agent. */
export function AgentSetup({ agent }: { agent: Agent }) {
  const t = useT();
  const terminal = useStore((s) => s.settings.runtime === 'terminal');
  const defaultCli = useStore((s) => s.settings.defaultCli);
  const id = useId();
  const ceo = agent.role === 'ceo';
  return (
    <section className="card agent-setup" aria-label={t('{name}’s setup', { name: agent.name })}>
      <div className="row wrap">
        <h3 className="grow"><T>⚙️ Setup</T></h3>
        {isBusy(agent) && (
          <span className="chip chip-warn" role="status">
            <T>Applies from their next task</T>
          </span>
        )}
      </div>
      <div className="setup-grid">
        {!ceo && (
          <label className="field" htmlFor={`${id}-name`}>
            <span><T>Name</T></span>
            <NameInput agent={agent} id={`${id}-name`} className="" />
          </label>
        )}
        {!ceo && (
          <label className="field" htmlFor={`${id}-look`}>
            <span><T>Agent identity</T></span>
            <LookSelect agent={agent} id={`${id}-look`} />
          </label>
        )}
        {(terminal || agent.host === 'box') && (
          <label className="field" htmlFor={`${id}-cli`}>
            <span><T>Coding agent</T></span>
            <CliSelect agent={agent} id={`${id}-cli`} />
          </label>
        )}
        {!ceo && (
          <label className="field" htmlFor={`${id}-host`}>
            <span>
              <T>Works on</T>{agent.host === 'box' && agent.cloud && <span className="muted"> · {t(CLOUD_STATE[agent.cloud])}</span>}
            </span>
            <HostSelect agent={agent} id={`${id}-host`} />
          </label>
        )}
        <label className="field" htmlFor={`${id}-model`}>
          <span><T>Model</T></span>
          <ModelInput agent={agent} id={`${id}-model`} className="" />
        </label>
        <label className="field" htmlFor={`${id}-effort`}>
          <span><T>Effort</T></span>
          <EffortSelect agent={agent} id={`${id}-effort`} />
        </label>
      </div>
      {(agent.cli || (ceo ? 'claude' : defaultCli)) === 'opencode' && <OpenCodeConnections agent={agent} />}
      <LookEditor agent={agent} />
      <PromptPreview agent={agent} />
      <p className="muted small"><T>Name and model save when you leave them; the rest, and looks, as you pick them. Running sessions aren’t restarted.</T></p>
    </section>
  );
}
