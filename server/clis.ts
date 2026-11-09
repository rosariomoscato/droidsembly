import fs from 'node:fs';
import { CODEX_USAGE_READER_SOURCE } from './codexUsage.ts';
import { createRequire } from 'node:module';
import path from 'node:path';
import { run } from './exec.ts';
import { localModel, type LocalProvider } from '../shared/models.ts';
import { openCodeModelRef } from '../shared/opencodeModels.ts';
import type { AgentCli, CliView, EffortLevel } from '../shared/types.ts';
import type { BoxVersions } from './boxScripts.ts';

// The coding-agent CLIs an agent can run in its terminal, how to find them on this machine, and how to start one on
// a task. Claude Code is fully wired in: its hooks report every tool call to the office.
// The others start on the same prompt and report only when a turn ends (Codex's notify program, an OpenCode plugin);
// the office shows their task instead of their tool calls.

export interface CliDef {
  id: AgentCli;
  label: string;
  command: string;
  integrated: boolean;
}

export const CLIS: CliDef[] = [
  { id: 'claude', label: 'Claude Code', command: 'claude', integrated: true },
  { id: 'codex', label: 'Codex', command: 'codex', integrated: false },
  { id: 'opencode', label: 'OpenCode', command: 'opencode', integrated: false },
];

export const isCli = (v: unknown): v is AgentCli => CLIS.some((c) => c.id === v);
export const cliLabel = (id: AgentCli) => CLIS.find((c) => c.id === id)?.label ?? id;

// ---------- finding a CLI ----------

const WIN = process.platform === 'win32';

/** The executable for a command name on PATH: on Windows only .exe/.cmd/.bat/.com, never an extensionless sh shim. */
export function resolveCommand(name: string, env: NodeJS.ProcessEnv = process.env): string | null {
  const key = Object.keys(env).find((k) => k.toUpperCase() === 'PATH') ?? 'PATH';
  const dirs = (env[key] ?? '').split(path.delimiter).filter(Boolean);
  const exts = WIN ? (env.PATHEXT ?? '.COM;.EXE;.BAT;.CMD').split(';').filter((e) => /^\.(exe|cmd|bat|com)$/i.test(e)) : [''];
  for (const dir of dirs) {
    for (const ext of exts) {
      const file = path.join(dir, name + ext.toLowerCase());
      try {
        const st = fs.statSync(file);
        if (st.isFile() && (WIN || (st.mode & 0o111) !== 0)) return file;
      } catch {
        // not here
      }
    }
  }
  return null;
}

/**
 * npm installs Windows CLIs as .cmd shims. Running one puts every argument through cmd.exe, which expands %VARS% and
 * trips over quotes in a prompt, so run what the shim runs instead: the package's .exe, or node on its script.
 */
export function unwrapCmdShim(shimPath: string, text: string, env: NodeJS.ProcessEnv = process.env): { file: string; args: string[] } | null {
  const line = text.split(/\r?\n/).find((l) => /%\*\s*$/.test(l));
  if (!line) return null;
  // The Windows desktop app also installs a simple %LOCALAPPDATA%-based executable shim.
  const executable = line.match(/^\s*"([^"]+\.exe)"\s+%\*\s*$/i)?.[1];
  if (executable && !/%dp0%/i.test(executable)) {
    let missing = false;
    const file = executable.replace(/%([^%]+)%/g, (_match, name: string) => {
      const key = Object.keys(env).find((k) => k.toUpperCase() === name.toUpperCase());
      if (!key || env[key] === undefined) missing = true;
      return key ? env[key] ?? '' : '';
    });
    return missing ? null : { file, args: [] };
  }
  const dir = path.dirname(shimPath);
  const targets = [...line.matchAll(/"%dp0%\\([^"]+)"/g)].map((m) => path.join(dir, m[1]));
  const target = targets[targets.length - 1];
  if (!target) return null;
  if (/\.exe$/i.test(target)) return { file: target, args: [] };
  if (!/\.[cm]?js$/i.test(target)) return null;
  const between = line.slice(line.indexOf('"%_prog%"') + '"%_prog%"'.length, line.lastIndexOf(`"%dp0%\\`));
  const nodeFlags = line.includes('"%_prog%"') ? between.trim().split(/\s+/).filter((f) => f.startsWith('--')) : [];
  const localNode = path.join(dir, 'node.exe');
  return { file: fs.existsSync(localNode) ? localNode : process.execPath, args: [...nodeFlags, target] };
}

/**
 * The Claude Code the Agent SDK ships as a per-platform package (the one `cubefarm login` signs in with), so the
 * terminal runtime works without Claude Code installed, on the version the office was tested with. Same lookup as
 * the SDK's own and bin/cubefarm.js.
 */
let bundled: string | null | undefined;

function bundledClaude(): string | null {
  if (bundled !== undefined) return bundled;
  bundled = null;
  let sdk: string;
  try {
    sdk = createRequire(import.meta.url).resolve('@anthropic-ai/claude-agent-sdk');
  } catch {
    return null;
  }
  const { platform, arch } = process;
  // Only Linux needs the report (glibc or musl). On Windows it walks every native handle, and with pseudo-consoles
  // closing on other threads that takes the whole office down.
  const report = platform === 'linux' ? (process.report?.getReport() as { header?: { glibcVersionRuntime?: string } } | undefined) : undefined;
  const musl = platform === 'linux' && !report?.header?.glibcVersionRuntime;
  const targets = platform === 'linux' ? (musl ? [`linux-${arch}-musl`, `linux-${arch}`] : [`linux-${arch}`, `linux-${arch}-musl`]) : [`${platform}-${arch}`];
  for (const target of targets) {
    try {
      bundled = createRequire(sdk).resolve(`@anthropic-ai/claude-agent-sdk-${target}/claude${WIN ? '.exe' : ''}`);
      return bundled;
    } catch {
      // not installed for this target
    }
  }
  return null;
}

/** How to start a CLI: the program and the arguments that come before the office's own. */
export function commandFor(id: AgentCli): { file: string; args: string[] } | null {
  const bundled = id === 'claude' ? bundledClaude() : null;
  if (bundled) return { file: bundled, args: [] };
  const def = CLIS.find((c) => c.id === id);
  const found = def && resolveCommand(def.command);
  if (!found) return null;
  if (WIN && /\.(cmd|bat)$/i.test(found)) {
    try {
      return unwrapCmdShim(found, fs.readFileSync(found, 'utf8')) ?? { file: found, args: [] };
    } catch {
      return { file: found, args: [] };
    }
  }
  return { file: found, args: [] };
}

/** Only V2 implements the session configuration and plugin contract used by this integration. */
export function openCodeVersionProblem(version: string | null): string | null {
  const text = version?.split(/\r?\n/)[0].trim() ?? '';
  const match = text.match(/^(?:opencode\s+)?v?(\d+)\.\d+\.\d+(?:[-+][\w.-]+)?$/i);
  if (!match) return 'Could not verify the OpenCode version. Droidsembly requires OpenCode 2.x. Check opencode --version before trying again.';
  return Number(match[1]) === 2 ? null : `OpenCode ${text} is not supported. Droidsembly requires OpenCode 2.x; install V2 before starting this agent.`;
}

/** Probe the actual executable immediately before spawning a new terminal, not just the startup inventory. */
export async function checkOpenCodeVersion(cmd: { file: string; args: string[] }): Promise<string | null> {
  const version = await run(cmd.file, [...cmd.args, '--version'], { timeoutMs: 20_000 }).catch(() => null);
  return openCodeVersionProblem(version);
}

/** Which CLIs this machine has, with their versions and any compatibility problem. */
export async function detectClis(ids?: readonly AgentCli[]): Promise<CliView[]> {
  return Promise.all(
    CLIS.filter(c => !ids || ids.includes(c.id)).map(async (c) => {
      const cmd = commandFor(c.id);
      const version = cmd ? await run(cmd.file, [...cmd.args, '--version'], { timeoutMs: 20_000 }).catch(() => null) : null;
      const problem = c.id === 'opencode' && cmd ? openCodeVersionProblem(version) : null;
      return { id: c.id, label: c.label, installed: !!cmd, version: version?.split(/\r?\n/)[0].trim().slice(0, 60) || null, integrated: c.integrated, ...(problem ? { problem } : {}) };
    }),
  );
}

// ---------- starting one on a task ----------

export interface LaunchContext {
  openCodePermissions?: import('../shared/opencodePermissions.ts').OpenCodePermissionRule[];
  prompt: string;
  systemAppend: string;
  model: string; // '' = the CLI's own default
  effort: EffortLevel | '';
  resumeId?: string;
  sessionId: string; // the id the office gives a new Claude Code session
  name: string; // shown in Claude Code's prompt box and the terminal title
  role: 'agent' | 'ceo';
  additionalDirectories: string[];
  /** Files the office wrote for this session (settings, MCP config, instructions). */
  files: { settings: string; mcp: string | null; system: string };
  /** Where the CLI's turn-complete signal goes (Codex notify, the OpenCode plugin). */
  notify: { script: string; url: string };
  /** Codex's hook program: forwards each hook to the office (notify.url). */
  codexHook: string;
  plugin: string; // file URL of the OpenCode V2 plugin directory
  /** The CEO's session-scoped office tools (not available to workers). */
  officeUrl?: string;
  /** The Playwright MCP server, when the floor tests in a browser. Claude Code gets it through its MCP config file. */
  browser: { command: string; args: string[] } | null;
  /** The node that runs the office's helper scripts where the CLI runs (default: the office's own). */
  node?: string;
  /** The CLI runs on Linux (a cloud agent's Box), whatever this computer is. */
  posix?: boolean;
}

/** Pinned for cloud agents' Boxes (docs/cloud.md); Claude Code and Playwright's MCP follow the office's own (boxVersions). */
export const BOX_CODEX_VERSION = '0.163.0';
export const BOX_OPENCODE_VERSION = '2.2.6';

/** A field of an installed package's package.json, found from its entry file (its exports may not offer package.json). */
function packageField(pkg: string, field: string): string | null {
  try {
    let dir = path.dirname(createRequire(import.meta.url).resolve(pkg));
    for (let i = 0; i < 6; i++) {
      const file = path.join(dir, 'package.json');
      if (fs.existsSync(file)) {
        const json = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
        if (json.name === pkg) return typeof json[field] === 'string' ? (json[field] as string) : null;
      }
      dir = path.dirname(dir);
    }
  } catch {
    // not installed
  }
  return null;
}

/** The CLI versions a cloud agent's Box runs: Claude Code as the Agent SDK bundles it, Playwright's MCP as the office pins it. */
export function boxVersions(): BoxVersions {
  return {
    claude: packageField('@anthropic-ai/claude-agent-sdk', 'claudeCodeVersion') ?? 'latest',
    playwrightMcp: packageField('@playwright/mcp', 'version') ?? 'latest',
    codex: BOX_CODEX_VERSION,
    opencode: BOX_OPENCODE_VERSION,
  };
}

export interface Launch {
  args: string[];
  env: Record<string, string>;
}

/** A local model server's address: `CUBEFARM_<ID>_URL` (e.g. CUBEFARM_OLLAMA_URL) when set, else its usual one. */
export function localUrl(p: LocalProvider, env: NodeJS.ProcessEnv = process.env): string {
  return env[`CUBEFARM_${p.id.toUpperCase()}_URL`]?.trim() || p.url;
}

/** Codex on a local model: its own --oss for Ollama and LM Studio at their usual address, else a provider of the office's. */
function codexLocal(model: string, toml: (s: string) => string): string[] {
  const local = localModel(model);
  if (!local) return model ? ['-m', model] : [];
  const { provider } = local;
  const url = localUrl(provider);
  if (provider.codexOss && url === provider.url) return ['--oss', '--local-provider', provider.id, '-m', local.model];
  const id = `cubefarm-${provider.id}`;
  return ['-c', `model_providers.${id}={name=${toml(provider.label)},base_url=${toml(url)},wire_api="responses"}`, '-c', `model_provider=${toml(id)}`, '-m', local.model];
}

/** OpenCode's provider entry for a local model, through the server's OpenAI-compatible API. */
function opencodeLocal(local: ReturnType<typeof localModel>): Record<string, unknown> {
  if (!local) return {};
  const { provider } = local;
  return {
    providers: {
      [provider.id]: { package: '@opencode/ai/providers/openai-compatible', name: provider.label, settings: { baseURL: localUrl(provider) }, models: { [local.model]: { name: local.model, capabilities: { tools: true } } } },
    },
  };
}

const EFFORT_CODEX: Record<EffortLevel, string> = { low: 'low', medium: 'medium', high: 'high', xhigh: 'xhigh', max: 'xhigh' };

/** Codex hooks the office listens to: its steps, and Esc interrupting a turn. Turn endings come from notify. */
export const CODEX_HOOK_EVENTS = ['SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse', 'Interrupt', 'Stop'];

/**
 * The command Codex runs for each hook. It never changes (the office's address travels in CUBEFARM_HOOK_URL), so the
 * manager trusts the hooks once in Codex's /hooks and that holds for every session. On Windows, Codex runs it through
 * PowerShell or cmd depending on its version, and a command starting with a quote fails in both: plain `node` (on the
 * PATH the office gave it) and the script in double quotes work in either. Elsewhere it goes through the shell.
 */
export function codexHookCommand(node: string, script: string, win = WIN): string {
  return win ? `node "${script}"` : [node, script].map((s) => `'${s.replaceAll("'", `'"'"'`)}'`).join(' ');
}

/**
 * Claude Code tools whose result arrives in a later turn. An office session ends with its turn, so nothing would wake
 * the agent. Background shells (run_in_background) stay: agents start dev servers with them.
 */
export const CROSS_TURN_TOOLS = ['Monitor', 'ScheduleWakeup', 'CronCreate', 'CronDelete', 'CronList', 'RemoteTrigger'];

export function launchArgs(id: AgentCli, ctx: LaunchContext): Launch {
  switch (id) {
    case 'claude': {
      const disallowed = ['AskUserQuestion', 'EnterPlanMode', 'ExitPlanMode', ...CROSS_TURN_TOOLS, ...(ctx.role === 'ceo' ? ['Bash', 'PowerShell', 'NotebookEdit'] : [])];
      const args = [
        ...(ctx.resumeId ? ['--resume', ctx.resumeId] : ['--session-id', ctx.sessionId]),
        ...(ctx.model ? ['--model', ctx.model] : []),
        ...(ctx.effort ? ['--effort', ctx.effort] : []),
        // The office's PreToolUse hook answers every permission question (allow, or deny with an office rule).
        '--permission-mode',
        'acceptEdits',
        // On top of the manager's own setup (settings, skills, plugins, MCP servers): the office's hooks and servers.
        '--settings',
        ctx.files.settings,
        ...(ctx.files.mcp ? ['--mcp-config', ctx.files.mcp] : []),
        '--append-system-prompt-file',
        ctx.files.system,
        '--name',
        ctx.name,
        ...ctx.additionalDirectories.flatMap((d) => ['--add-dir', d]),
        '--disallowedTools',
        ...disallowed,
        '--',
        ctx.prompt,
      ];
      return { args, env: { DISABLE_AUTOUPDATER: '1' } }; // the office's own copy: agents mustn't each try to update it
    }
    case 'codex': {
      const toml = (s: string) => JSON.stringify(s); // a JSON string is a valid TOML basic string
      const args = [
        '--no-alt-screen',
        '-c',
        `notify=[${[ctx.node ?? process.execPath, ctx.notify.script, ctx.notify.url].map(toml).join(',')}]`,
        '-c',
        `developer_instructions=${toml(ctx.systemAppend)}`,
        ...codexLocal(ctx.model, toml),
        ...(ctx.effort ? ['-c', `model_reasoning_effort=${toml(EFFORT_CODEX[ctx.effort])}`] : []),
        ...(ctx.browser ? ['-c', `mcp_servers.playwright={command=${toml(ctx.browser.command)},args=[${ctx.browser.args.map(toml).join(',')}]}`] : []),
        ...CODEX_HOOK_EVENTS.flatMap((e) => ['-c', `hooks.${e}=[{hooks=[{type="command",command=${toml(codexHookCommand(ctx.node ?? process.execPath, ctx.codexHook, ctx.posix ? false : WIN))},timeout=10}]}]`]),
        // Like the manager's own Codex, but it can't stop to ask: no approvals and no sandbox (its sandbox can't reach
        // the credential store, so git and gh fail in it).
        '--dangerously-bypass-approvals-and-sandbox',
      ];
      return { args: ctx.resumeId ? ['resume', ...args, ctx.resumeId, ctx.prompt] : [...args, '--', ctx.prompt], env: { CUBEFARM_HOOK_URL: ctx.notify.url } };
    }
    case 'opencode': {
      const local = localModel(ctx.model);
      const sessionID = ctx.resumeId || `ses_cubefarm${ctx.sessionId.replaceAll('-', '')}`;
      const model = local ? `${local.provider.id}/${local.model}` : ctx.model;
      const servers = {
        ...(ctx.browser ? { playwright: { type: 'local', command: [ctx.browser.command, ...ctx.browser.args] } } : {}),
        ...(ctx.officeUrl ? { office: { type: 'remote', url: ctx.officeUrl, oauth: false, codemode: false } } : {}),
      };
      const config = {
        $schema: 'https://opencode.ai/config.json',
        plugins: [{ package: ctx.plugin, options: { sessionID, ...(ctx.posix ? { eventsFile: ctx.notify.url } : { notifyUrl: ctx.notify.url }), model: openCodeModelRef(model) } }],
        instructions: [ctx.files.system],
        // A dedicated primary agent also retains a model's explicit #variant (the root model setting doesn't).
        default_agent: 'droidsembly',
        agents: {
          droidsembly: { description: 'The Droidsembly office session', mode: 'primary', ...(model ? { model } : {}), ...(ctx.openCodePermissions ? { permissions: ctx.openCodePermissions } : {}) },
          // OpenCode keeps the agent ID on an existing session. Keep the old profile available on resume,
          // but out of the picker: do not migrate session IDs or rewrite the user's OpenCode history.
          ...(ctx.resumeId ? { cubefarm: { description: 'The Droidsembly office session (legacy)', mode: 'primary', hidden: true, ...(model ? { model } : {}), ...(ctx.openCodePermissions ? { permissions: ctx.openCodePermissions } : {}) } } : {}),
        },
        ...opencodeLocal(local),
        ...(Object.keys(servers).length ? { mcp: { servers } } : {}),
      };
      // No project argument: it starts in its terminal's folder, and a desk path in its command line would make the
      // desk clean-up take it for a leftover.
      const args = [
        '--standalone', // session config and callbacks must not leak into the manager's shared OpenCode service
        '--auto',
        '--session', sessionID,
        '--prompt',
        ctx.prompt,
      ];
      return { args, env: { OPENCODE_CONFIG_CONTENT: JSON.stringify(config) } };
    }
  }
}

// ---------- Codex's saved threads ----------

/** Runs each key's steps one after another; one that fails doesn't hold up the next. */
export function oneAtATime() {
  const tails = new Map<string, Promise<void>>();
  return (key: string, step: () => Promise<unknown>): Promise<void> => {
    const next = (tails.get(key) ?? Promise.resolve()).then(step).then(
      () => undefined,
      () => undefined,
    );
    tails.set(key, next);
    void next.then(() => tails.get(key) === next && tails.delete(key));
    return next;
  };
}

const threadSteps = oneAtATime();

/**
 * Codex saves every terminal session where the manager's own Codex and ChatGPT apps list it with their chats. The
 * office archives its threads there once their CLI is gone (`after`), and unarchives one before resuming it: Codex
 * won't resume an archived thread. A thread's steps run in order; one with nothing to do (already archived) fails.
 */
export function codexThread(action: 'archive' | 'unarchive', id: string, after?: Promise<unknown>): Promise<void> {
  return threadSteps(id, async () => {
    await after;
    const cmd = commandFor('codex');
    if (cmd) await run(cmd.file, [...cmd.args, action, id], { timeoutMs: 30_000 });
  });
}

// ---------- prompts the office answers ----------

const TRUST_PROMPT = /Quick safety check|Do you trust the (files|contents) (in|of) this|trust this folder|allow Codex to work in this folder/i;

/**
 * The key that moves a CLI's folder-trust question toward trusting the office's own worktree: Enter when the
 * selected option says yes, Down when it says no (Claude Code selects "No, exit" first), null when there's no such
 * question on screen.
 */
export function trustKey(screen: string): 'enter' | 'down' | null {
  if (!TRUST_PROMPT.test(screen)) return null;
  const selected = screen.match(/^\s*[❯›]\s*(?:\d+\.\s*)?(.+)$/m)?.[1] ?? '';
  if (/^(yes|trust|continue|proceed)\b/i.test(selected.trim())) return 'enter';
  if (/^(no|exit|quit|cancel)\b/i.test(selected.trim())) return 'down';
  return null;
}

/**
 * Codex asks to review new hooks before it starts. They only show the office Codex's steps, so trusting them is the
 * manager's call (once, in /hooks): the office moves to "Continue without trusting" (Down) and takes it (Enter).
 */
export function hookReviewKey(screen: string): 'enter' | 'down' | null {
  if (!/Hooks need review/i.test(screen)) return null;
  const selected = screen.match(/^\s*[❯›]\s*(?:\d+\.\s*)?(.+)$/m)?.[1] ?? '';
  return /^continue without trusting/i.test(selected.trim()) ? 'enter' : 'down';
}

/**
 * Lines on screen where a CLI says it interrupted a turn (Claude Code: "Interrupted · What should Claude do
 * instead?", Codex: "Conversation interrupted"). Esc fires no hook in Claude Code, so a new one is how the office
 * knows the manager stopped the turn from the terminal.
 */
export function interruptions(screen: string): number {
  return screen.split('\n').filter((l) => /\binterrupted\b/i.test(l)).length;
}

/**
 * A CLI saying its login is gone or was turned away, in its own words: Claude Code's "· Please run /login" family
 * ("Login expired", "OAuth token revoked", "Failed to authenticate"), Codex's "access token could not be refreshed…
 * sign in again" and its sign-in screen. Only read at the end of a session that failed or said nothing.
 */
export function signedOutScreen(screen: string): boolean {
  return /Please run \/login|Sign in again to continue|Login expired|OAuth (?:access )?token (?:has )?(?:expired|been revoked|revoked)|Failed to authenticate|access token could not be refreshed|log out and sign in again|Sign in with ChatGPT|run '?`?codex login/i.test(
    screen,
  );
}

// ---------- helper scripts the CLIs run ----------

/** Claude Code's status line: posts its data (cost, usage limits) to the office and shows the office's line. */
export const STATUSLINE_SOURCE = String.raw`// cubefarm: Claude Code's status line. Forwards the session's status to the office and prints the office's line.
const url = process.argv[2];
let body = '';
process.stdin.on('data', (c) => (body += c));
process.stdin.on('end', async () => {
  try {
    const status = JSON.parse(body);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ hook_event_name: 'StatusLine', session_id: status.session_id, model: status.model && { id: status.model.id }, cost: status.cost, rate_limits: status.rate_limits, context_window: status.context_window && { total_input_tokens: status.context_window.total_input_tokens, total_output_tokens: status.context_window.total_output_tokens } }),
      signal: AbortSignal.timeout(2000),
    });
    const out = await res.json();
    process.stdout.write(String(out.statusLine ?? ''));
  } catch {
    process.stdout.write('Droidsembly');
  }
});
`;

/** Codex's notify program: Codex runs it with a JSON argument when a turn completes. */
export const NOTIFY_SOURCE = String.raw`// cubefarm: Codex's notify program. Tells the office a turn is complete.
const [url, payload] = process.argv.slice(2);
let event = {};
try {
  event = JSON.parse(payload ?? '{}');
} catch {}
if (event.type === 'agent-turn-complete') {
  const input = String((event['input-messages'] ?? [])[0] ?? '').slice(0, 300);
  fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ hook_event_name: 'TurnComplete', session_id: event['thread-id'] ?? null, last_assistant_message: event['last-assistant-message'] ?? '', input }),
    signal: AbortSignal.timeout(3000),
  }).catch(() => {});
}
`;

/** Codex's hook program: passes what Codex tells a hook on to the office and answers nothing, so Codex carries on as usual. */
export const CODEX_HOOK_SOURCE = String.raw`// cubefarm: Codex's hooks. Tells the office what Codex is doing; never changes what it does.
${CODEX_USAGE_READER_SOURCE}
const url = process.env.CUBEFARM_HOOK_URL;
const chunks = [];
process.stdin.on('data', (c) => chunks.push(c));
process.stdin.on('end', async () => {
  try {
    const body = Buffer.concat(chunks);
    const event = JSON.parse(body.toString('utf8'));
    if (url) {
      try {
        const records = usageRecords(event);
        if (records.length) await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ hook_event_name: 'CodexUsage', session_id: event.session_id, records }), signal: AbortSignal.timeout(2000) });
      } catch { /* optional transcript telemetry never blocks the lifecycle hook */ }
      await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body, signal: AbortSignal.timeout(5000) });
    }
  } catch {}
  process.stdout.write('{}');
});
`;

/** OpenCode V2 plugin definition, without imports so the installed CLI can load it without another npm install. */
export const OPENCODE_PLUGIN_SOURCE = String.raw`// cubefarm: forward only this office session's completed turns.
export default {
  id: 'cubefarm.office',
  async setup(ctx) {
    const { sessionID, notifyUrl, eventsFile } = ctx.options;
    if (!sessionID || (!notifyUrl && !eventsFile)) throw new Error('Missing Droidsembly callback configuration');
    const fs = eventsFile ? await import('node:fs') : null;
    const controller = new AbortController();
    let lastIdle;
    let authFailed = false;
    const reportedUsage = new Map();
    const post = async (body) => {
      if (fs) {
        const line = JSON.stringify({ ...body, session_id: sessionID }).replace(/[\u007f-￿]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
        fs.appendFileSync(eventsFile, line + '\n');
        return;
      }
      const response = await fetch(notifyUrl, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...body, session_id: sessionID }),
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(5000)]),
      });
      if (!response.ok) throw new Error('Droidsembly callback failed: ' + response.status);
    };
    await ctx.session.hook('prompt', async (event) => {
      if (event.sessionID !== sessionID) return;
      // A resumed session keeps its previous model over agent configuration. Apply the office's next-task choice.
      let model = ctx.options.model;
      if (!model) {
        const selected = await ctx.model.default();
        if (selected) model = { providerID: selected.providerID, id: selected.id };
      }
      if (model) await ctx.session.switchModel({ sessionID, model });
      await post({ hook_event_name: 'UserPromptSubmit', prompt: event.prompt.text });
    });
    // Active connection metadata only. Never resolve a credential or inspect request headers/bodies.
    const resourceFor = async (model) => {
      const resource = { provider: model?.providerID ?? null, model: model?.id ?? null, account: null, access: 'unknown' };
      try {
        const provider = await ctx.provider.get({ providerID: model.providerID });
        const connection = provider.integrationID && await ctx.integration.connection.active(provider.integrationID);
        if (connection?.type === 'credential') {
          resource.account = connection.id;
          // OAuth is an authentication method, not proof of a subscription billing plan.
          if (connection.method === 'key') resource.access = 'api';
        }
      } catch { /* provider discovered, connection identity unavailable */ }
      return resource;
    };
    const reportResource = async (event, limit = false, resetsAt = null) => {
      if (event.sessionID !== sessionID) return;
      try {
        const resource = await resourceFor(event.model);
        await post({ hook_event_name: limit ? 'AiLimit' : 'AiResource', resource, status: limit ? 429 : undefined, resetsAt });
      } catch { /* telemetry must never change provider execution */ }
    };
    const observe = async (name, callback) => {
      try { await ctx.session.hook(name, callback); } catch { /* older V2: completion still works without this signal */ }
    };
    await observe('model.request', (event) => reportResource(event));
    await observe('http.response', async (event) => {
      if (event.sessionID !== sessionID) return;
      if (event.response.status === 401) authFailed = true;
      else if (event.response.status < 400) authFailed = false;
      if (event.response.status !== 429) return;
      const retry = event.response.headers.get('retry-after');
      const seconds = retry && /^\d+(?:\.\d+)?$/.test(retry) ? Number(retry) : NaN;
      const at = Number.isFinite(seconds) ? Date.now() + seconds * 1000 : retry ? Date.parse(retry) : NaN;
      await reportResource(event, true, Number.isFinite(at) ? at : null);
    });
    await observe('retry', async (event) => {
      if (event.error?.status === 429) await reportResource(event, true);
    });
    const listen = async () => {
      for await (const event of ctx.event.subscribe({ signal: controller.signal })) {
        const props = event.data ?? event.properties ?? event;
        if ((props.sessionID ?? props.info?.id ?? props.session?.id) !== sessionID) continue;
        if (eventsFile && ['session.tool.called', 'session.tool.success', 'session.tool.failed'].includes(event.type)) {
          // Tool names only: do not copy tool arguments, output, credentials or private reasoning into telemetry.
          const messages = await ctx.session.context({ sessionID });
          const tool = messages.flatMap(m => m.type === 'assistant' ? m.content ?? [] : []).find(p => p.type === 'tool' && p.id === props.id);
          if (tool) await post({ hook_event_name: event.type === 'session.tool.called' ? 'PreToolUse' : event.type === 'session.tool.failed' ? 'PostToolUseFailure' : 'PostToolUse', tool_name: tool.name, tool_use_id: props.id, ...(event.type === 'session.tool.failed' ? { error: 'Tool failed (see the remote terminal)' } : {}) });
          continue;
        }
        if (!['session.execution.succeeded', 'session.execution.failed', 'session.execution.interrupted', 'session.idle'].includes(event.type)) continue;
        const [messages, session] = await Promise.all([
          ctx.session.context({ sessionID }), ctx.session.get({ sessionID }),
        ]);
        const idle = messages.at(-1);
        if (idle?.id && idle.id === lastIdle) continue;
        // Report the actual historical model, never the current configured default.
        // Only usage fields cross the callback boundary; message content is excluded.
        for (const m of messages) {
          if (m.type !== 'assistant' || !m.id || !m.time) continue;
          const message = {
            id: m.id, type: m.type, time: { created: m.time.created },
            model: m.model && { providerID: m.model.providerID, id: m.model.id },
            cost: m.cost, tokens: m.tokens && {
              input: m.tokens.input, output: m.tokens.output, reasoning: m.tokens.reasoning,
              cache: m.tokens.cache && { read: m.tokens.cache.read, write: m.tokens.cache.write },
            },
          };
          const fingerprint = JSON.stringify(message);
          if (reportedUsage.get(m.id) === fingerprint) continue;
          await post({ hook_event_name: 'AiUsage', message })
            .then(() => reportedUsage.set(m.id, fingerprint))
            .catch((err) => console.warn('Droidsembly usage observation:', String(err)));
        }
        const outcome = event.type === 'session.execution.failed' ? 'failed'
          : event.type === 'session.execution.interrupted' ? 'interrupted'
          : event.type === 'session.execution.succeeded' ? 'succeeded'
          : idle?.type === 'idle' ? idle.outcome : session.outcome;
        if (outcome === 'interrupted') {
          await post({ hook_event_name: 'Interrupt' });
        } else if (outcome === 'failed') {
          await post({ hook_event_name: 'TurnError', error: JSON.stringify(props.error ?? idle?.error ?? 'OpenCode session failed'), ...(eventsFile && authFailed ? { signed_out: true } : {}) });
        } else {
          const user = messages.findLastIndex((m) => m.type === 'user');
          const reply = messages.slice(user + 1).findLast((m) => m.type === 'assistant');
          const text = (reply?.content ?? []).filter((p) => p.type === 'text').map((p) => p.text).join('\n').trim();
          if (!text) await post({ hook_event_name: 'TurnError', error: 'OpenCode finished without a final reply' });
          else await post({ hook_event_name: 'TurnComplete', last_assistant_message: text });
        }
        lastIdle = idle?.id;
      }
    };
    void listen().catch((err) => {
      if (!controller.signal.aborted) {
        console.error('Droidsembly OpenCode integration:', err);
        void post({ hook_event_name: 'TurnError', error: String(err) }).catch(console.error);
      }
    });
    return () => controller.abort();
  },
};
`;
