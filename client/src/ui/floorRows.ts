// The floor as a list (FloorList.tsx), for anyone who can't use the 3D view: one row per person with their status in
// words and its shape, the coding agent they run, and what they're doing. Pure, so the wording is tested.

import type { AgentCli, AgentStatus, CliView, SwarmSettings } from '../../../shared/types';
import type { Agent } from '../store';
import { KIND_ICON, STATUS_KIND, type StatusKind } from './statusLook';
import { translate } from '../../../shared/i18n';
import { DEFAULT_CEO_CLI } from '../../../shared/agentDefaults';

export interface FloorRow {
  id: string;
  name: string;
  /** "CEO", or the coding agent they run ("Claude Code", "Codex"…). */
  agent: string;
  status: string;
  kind: StatusKind;
  icon: string;
  doing: string;
  /** A cloud agent waiting to be signed in: the coding agent to sign in (signInFor), else null. */
  signIn: string | null;
}

const STATUS_WORDS: Record<AgentStatus, string> = {
  idle: 'Idle',
  preparing: 'Setting up',
  working: 'Working',
  done: 'Finished',
  error: 'Needs help',
  stopped: 'Stopped',
};

/** The coding agents' names until the office has listed them (CliView.label). */
const CLI_NAMES: Record<AgentCli, string> = { claude: 'Claude Code', codex: 'Codex', opencode: 'OpenCode' };

type Runtime = Pick<SwarmSettings, 'runtime' | 'defaultCli'> & Partial<Pick<SwarmSettings, 'language'>>;

/** The coding agent someone runs: their own pick in Real terminals; the Agent SDK is Claude Code for everyone. */
export const workerCli = (a: Pick<Agent, 'cli' | 'role'>, settings: Runtime): AgentCli =>
  settings.runtime !== 'terminal' ? 'claude' : a.cli || (a.role === 'ceo' ? DEFAULT_CEO_CLI : settings.defaultCli);

/** What someone is, in a word or two: the CEO, or the coding agent they run. */
export function agentLabel(a: Pick<Agent, 'cli' | 'role'>, settings: Runtime, clis: CliView[]): string {
  if (a.role === 'ceo') return 'CEO';
  const id = workerCli(a, settings);
  return clis.find((c) => c.id === id)?.label ?? CLI_NAMES[id];
}

/**
 * A cloud agent waiting for the manager to sign their coding agent in (docs/cloud.md): its name ("Claude Code"),
 * else null. A cloud agent's coding agent always runs in a terminal, whatever the office's runtime.
 */
export function signInFor(a: Pick<Agent, 'cli' | 'role' | 'host' | 'needsSignIn'>, settings: Pick<SwarmSettings, 'defaultCli'>): string | null {
  return a.role !== 'ceo' && a.host === 'box' && a.needsSignIn ? CLI_NAMES[a.cli || settings.defaultCli] : null;
}

/** What someone is on, in words. */
export function doingText(a: Pick<Agent, 'role' | 'status' | 'task' | 'issueNumber' | 'issueTitle' | 'prNumber'>, language?: SwarmSettings['language']): string {
  const t = (text: string, values?: Record<string, string | number>) => translate(language, text, values);
  if (a.role === 'ceo') return a.status === 'working' ? (a.issueTitle ?? t('Working')) : t('Free for a chat');
  if (a.status === 'idle') return t('Nothing assigned');
  if (a.task === 'analysis') return t('Read-only analysis');
  const title = a.issueTitle ? `: ${a.issueTitle}` : '';
  if (a.task === 'qa') return a.prNumber ? t('Testing PR #{number}', { number: a.prNumber }) + title : t('Testing');
  if (a.task === 'fix' && a.prNumber) return t('Fixing PR #{number}', { number: a.prNumber }) + title;
  if (a.issueNumber) return t('Issue #{number}', { number: a.issueNumber }) + title;
  return a.issueTitle ?? t('Working');
}

/** One row per person, in the order given (agentsOnRepo: by desk). */
export function floorRows(agents: Agent[], settings: Runtime, clis: CliView[]): FloorRow[] {
  return agents.map((a) => {
    const signIn = signInFor(a, settings);
    const kind = signIn ? 'attention' : STATUS_KIND[a.status];
    return {
      id: a.id,
      name: a.name,
      agent: agentLabel(a, settings, clis),
      status: translate(settings.language, signIn ? 'Needs you to sign in' : STATUS_WORDS[a.status]),
      kind,
      icon: KIND_ICON[kind],
      doing: signIn ? `${translate(settings.language, 'Waiting for {provider} to be signed in', { provider: signIn })}${a.status === 'idle' ? '' : ` · ${doingText(a, settings.language)}`}` : doingText(a, settings.language),
      signIn,
    };
  });
}
