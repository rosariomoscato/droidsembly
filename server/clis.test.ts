import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { boxVersions, CODEX_HOOK_EVENTS, codexHookCommand, CROSS_TURN_TOOLS, hookReviewKey, interruptions, launchArgs, localUrl, oneAtATime, openCodeVersionProblem, signedOutScreen, trustKey, unwrapCmdShim, type LaunchContext } from './clis.ts';
import { LOCAL_PROVIDERS } from '../shared/models.ts';
import { describeOfficeTool, describeTool, newScreenshots, screenshotFile, summariseResult } from './agentRunner.ts';

const dir = path.join(os.tmpdir(), 'npm-global');

describe('OpenCode version compatibility', () => {
  it.each(['2.2.1', 'v2.2.1', 'opencode v2.2.1', 'opencode 2.3.0-beta.1', '2.2.1+build.123'])('accepts V2: %s', (version) => {
    expect(openCodeVersionProblem(version)).toBeNull();
  });
  it.each(['1.18.29', 'opencode v1.9.0', '3.0.0'])('rejects unsupported versions: %s', (version) => {
    expect(openCodeVersionProblem(version)).toMatch(/not supported.*requires OpenCode 2\.x/);
  });
  it.each([null, '', 'unknown', '2.2', 'warning: could not run', '2.2.1oops'])('rejects an unverifiable version: %s', (version) => {
    expect(openCodeVersionProblem(version)).toMatch(/Could not verify.*requires OpenCode 2\.x/);
  });
});

describe('unwrapCmdShim', () => {
  it('unwraps the OpenCode desktop executable shim without invoking cmd.exe', () => {
    const shim = '@echo off\n"%LOCALAPPDATA%\\Programs\\@opencode-aidesktop\\resources\\opencode-cli.exe" %*';
    expect(unwrapCmdShim('opencode.cmd', shim, { LocalAppData: 'C:\\Users\\A B\\AppData\\Local' })).toEqual({
      file: 'C:\\Users\\A B\\AppData\\Local\\Programs\\@opencode-aidesktop\\resources\\opencode-cli.exe', args: [],
    });
    expect(unwrapCmdShim('opencode.cmd', shim, {})).toBeNull();
  });
  it('runs node on the script a node shim points at, keeping its node flags', () => {
    const shim = [
      '@ECHO off',
      'IF EXIST "%dp0%\\node.exe" (',
      '  SET "_prog=%dp0%\\node.exe"',
      ')',
      'endLocal & goto #_undefined_# 2>NUL || title %COMSPEC% & "%_prog%" --no-warnings=DEP0040 "%dp0%\\node_modules\\@acme\\cli\\bin\\cli.js" %*',
    ].join('\r\n');
    expect(unwrapCmdShim(path.join(dir, 'cli.cmd'), shim)).toEqual({ file: process.execPath, args: ['--no-warnings=DEP0040', path.join(dir, 'node_modules\\@acme\\cli\\bin\\cli.js')] });
  });

  it('runs the executable an exe shim points at', () => {
    const shim = '@ECHO off\r\nCALL :find_dp0\r\n"%dp0%\\node_modules\\opencode-ai\\bin\\opencode.exe"   %*\r\n';
    expect(unwrapCmdShim(path.join(dir, 'opencode.cmd'), shim)).toEqual({ file: path.join(dir, 'node_modules\\opencode-ai\\bin\\opencode.exe'), args: [] });
  });

  it('gives up on shims it does not recognise', () => {
    expect(unwrapCmdShim(path.join(dir, 'x.cmd'), '@echo off\r\necho hi\r\n')).toBeNull();
  });
});

describe('trustKey', () => {
  it("moves Claude Code's trust question off its default \"No, exit\", then confirms \"Yes\"", () => {
    const question = (selected: 'no' | 'yes') =>
      [
        'Accessing workspace:',
        'C:\\Users\\me\\.cubefarm\\workspaces\\me__app\\desks\\ada-01df',
        'Quick safety check: Is this a project you created or one you trust?',
        "Claude Code'll be able to read, edit, and execute files here.",
        selected === 'no' ? '❯ No, exit' : '  No, exit',
        selected === 'yes' ? '❯ Yes, I trust this folder' : '  Yes, I trust this folder',
        'Enter to confirm · Esc to cancel',
      ].join('\n');
    expect(trustKey(question('no'))).toBe('down');
    expect(trustKey(question('yes'))).toBe('enter');
  });

  it("confirms Codex's trust question, whose first option is yes", () => {
    const screen = ['> You are in C:\\desk', '  Do you trust the contents of this directory?', '› 1. Yes, continue', '  2. No, quit'].join('\n');
    expect(trustKey(screen)).toBe('enter');
  });

  it('leaves every other screen alone', () => {
    expect(trustKey('❯ Try "refactor <filepath>"')).toBeNull();
  });
});

describe('hookReviewKey', () => {
  const review = (selected: 1 | 3) =>
    ['  Hooks need review', '  5 hooks are new or changed.', `${selected === 1 ? '›' : ' '} 1. Review hooks`, '  2. Trust all and continue', `${selected === 3 ? '›' : ' '} 3. Continue without trusting (hooks won't run)`].join('\n');

  it("goes on without the office's hooks, leaving trust to the manager", () => {
    expect(hookReviewKey(review(1))).toBe('down');
    expect(hookReviewKey(review(3))).toBe('enter');
    expect(hookReviewKey('› Ask Codex to do anything')).toBeNull();
  });
});

describe('interruptions', () => {
  it('counts the lines where a CLI says it interrupted a turn', () => {
    expect(interruptions(['● Bash(sleep 4)', '  ⎿  Interrupted · What should Claude do instead?', '❯ '].join('\n'))).toBe(1);
    expect(interruptions('■ Conversation interrupted - tell the model what to do differently.\n› ')).toBe(1);
    expect(interruptions('● done\n❯ ')).toBe(0);
  });
});

describe('signedOutScreen', () => {
  it("spots a CLI saying its login is gone, in each CLI's own words", () => {
    expect(signedOutScreen('⎿  API Error: 401 · Login expired · Please run /login')).toBe(true);
    expect(signedOutScreen('Not logged in · Please run /login')).toBe(true);
    expect(signedOutScreen('OAuth token revoked · Please run /login')).toBe(true);
    expect(signedOutScreen('Failed to authenticate: OAuth session expired and could not be refreshed')).toBe(true);
    expect(signedOutScreen('■ Your access token could not be refreshed because your refresh token has expired. Please log out and sign in again.')).toBe(true);
    expect(signedOutScreen("Not signed in. Please run 'codex login' to sign in with ChatGPT")).toBe(true);
  });

  it('leaves ordinary failures alone', () => {
    expect(signedOutScreen('● The tests fail: expected 401 from /api/login, got 200\n❯ ')).toBe(false);
    expect(signedOutScreen('Claude Code exited with code 1 before finishing.')).toBe(false);
  });
});

describe('launchArgs', () => {
  const ctx = (patch: Partial<LaunchContext> = {}): LaunchContext => ({
    prompt: '--looks like a flag',
    systemAppend: 'You are Ada.',
    model: '',
    effort: 'medium',
    sessionId: '11111111-1111-1111-1111-111111111111',
    name: 'Ada · #1',
    role: 'agent',
    additionalDirectories: [],
    files: { settings: 'settings.json', mcp: null, system: 'instructions.md' },
    notify: { script: 'notify.cjs', url: 'http://127.0.0.1:1/api/hooks/t' },
    codexHook: 'codex-hook.cjs',
    plugin: 'file:///cubefarm-plugin',
    browser: null,
    ...patch,
  });
  it('starts Claude Code on a chosen session id, with the prompt after --', () => {
    const { args } = launchArgs('claude', ctx());
    expect(args.slice(0, 2)).toEqual(['--session-id', '11111111-1111-1111-1111-111111111111']);
    expect(args.slice(-2)).toEqual(['--', '--looks like a flag']);
    // the manager's own setup loads: no limiting its setting sources or MCP servers
    expect(args).not.toContain('--setting-sources');
    expect(args).not.toContain('--strict-mcp-config');
    expect(args).not.toContain('--mcp-config');
  });

  it("resumes Claude Code sessions and keeps the CEO's hands off the shell", () => {
    const { args } = launchArgs('claude', ctx({ resumeId: 'abc', role: 'ceo', files: { settings: 's', mcp: 'mcp.json', system: 'i' } }));
    expect(args.slice(0, 2)).toEqual(['--resume', 'abc']);
    expect(args).toContain('--mcp-config');
    expect(args.slice(args.indexOf('--disallowedTools'), args.indexOf('--'))).toEqual(['--disallowedTools', 'AskUserQuestion', 'EnterPlanMode', 'ExitPlanMode', ...CROSS_TURN_TOOLS, 'Bash', 'PowerShell', 'NotebookEdit']);
  });

  it('keeps tools that wait across turns away from Claude Code, but not background shells', () => {
    const { args } = launchArgs('claude', ctx());
    expect(CROSS_TURN_TOOLS).toEqual(['Monitor', 'ScheduleWakeup', 'CronCreate', 'CronDelete', 'CronList', 'RemoteTrigger']);
    expect(args.slice(args.indexOf('--disallowedTools'), args.indexOf('--'))).toEqual(['--disallowedTools', 'AskUserQuestion', 'EnterPlanMode', 'ExitPlanMode', ...CROSS_TURN_TOOLS]);
    for (const cli of ['codex', 'opencode'] as const) expect(launchArgs(cli, ctx()).args.some((a) => a.includes('Monitor') || a.includes('ScheduleWakeup'))).toBe(false);
  });

  it("runs Codex without its sandbox or approvals, and resumes Codex's thread", () => {
    const fresh = launchArgs('codex', ctx()).args;
    expect(fresh).toContain('--dangerously-bypass-approvals-and-sandbox');
    expect(fresh).not.toContain('--sandbox');
    expect(fresh.slice(-2)).toEqual(['--', '--looks like a flag']);
    const resumed = launchArgs('codex', ctx({ resumeId: 'thread-1' })).args;
    expect(resumed[0]).toBe('resume');
    expect(resumed.slice(-2)).toEqual(['thread-1', '--looks like a flag']);
    expect(resumed).toContain('--dangerously-bypass-approvals-and-sandbox');
  });

  it("gives Codex the office's hooks, with the office's address in its environment", () => {
    const { args, env } = launchArgs('codex', ctx());
    const hooks = args.filter((a) => a.startsWith('hooks.'));
    expect(hooks.map((h) => h.slice(6, h.indexOf('=')))).toEqual(CODEX_HOOK_EVENTS);
    expect(hooks[0]).toContain('type="command"');
    expect(env.CUBEFARM_HOOK_URL).toBe('http://127.0.0.1:1/api/hooks/t');
  });

  it('runs the hook program with a command that never starts with a quote on Windows', () => {
    expect(codexHookCommand('C:\\Program Files\\nodejs\\node.exe', 'C:\\Users\\A B\\.cubefarm\\bin\\codex-hook.cjs', true)).toBe('node "C:\\Users\\A B\\.cubefarm\\bin\\codex-hook.cjs"');
    expect(codexHookCommand('/usr/bin/node', "/home/o'neil/.cubefarm/bin/codex-hook.cjs", false)).toBe(`'/usr/bin/node' '/home/o'"'"'neil/.cubefarm/bin/codex-hook.cjs'`);
  });

  it('runs OpenCode V2 with private session config, auto approval and a session-scoped plugin', () => {
    const launch = launchArgs('opencode', ctx());
    expect(launch.args).toContain('--standalone');
    expect(launch.args).toContain('--auto');
    expect(launch.args).not.toContain('--model');
    expect(launch.args.slice(-2)).toEqual(['--prompt', '--looks like a flag']);
    const config = JSON.parse(launch.env.OPENCODE_CONFIG_CONTENT);
    expect(config.plugins).toEqual([{ package: 'file:///cubefarm-plugin', options: { sessionID: 'ses_cubefarm11111111111111111111111111111111', notifyUrl: ctx().notify.url, model: null } }]);
    expect(config.default_agent).toBe('droidsembly');
    expect(config.agents).toEqual({ droidsembly: { description: 'The Droidsembly office session', mode: 'primary' } });
    for (const deprecated of ['plugin', 'permission', 'provider', 'autoupdate']) expect(config).not.toHaveProperty(deprecated);
  });

  it("gives only the CEO the office MCP endpoint, and preserves OpenCode's session on resume", () => {
    const launch = launchArgs('opencode', ctx({ role: 'ceo', resumeId: 'ses_existing', officeUrl: 'http://127.0.0.1:4417/api/mcp/token', model: 'openai/test-model#high' }));
    const config = JSON.parse(launch.env.OPENCODE_CONFIG_CONTENT);
    expect(config.mcp.servers.office).toEqual({ type: 'remote', url: 'http://127.0.0.1:4417/api/mcp/token', oauth: false, codemode: false });
    expect(config.default_agent).toBe('droidsembly');
    expect(config.agents.droidsembly.model).toBe('openai/test-model#high');
    expect(config.agents.cubefarm).toEqual({ description: 'The Droidsembly office session (legacy)', mode: 'primary', hidden: true, model: 'openai/test-model#high' });
    expect(config.plugins[0].options.model).toEqual({ providerID: 'openai', id: 'test-model', variant: 'high' });
    expect(launch.args.slice(launch.args.indexOf('--session'), launch.args.indexOf('--session') + 2)).toEqual(['--session', 'ses_existing']);
    expect(config.plugins[0].options.sessionID).toBe('ses_existing');
    expect(JSON.parse(launchArgs('opencode', ctx()).env.OPENCODE_CONFIG_CONTENT).mcp).toBeUndefined();
  });
  it('serializes the native V2 gate permissions on both fresh and legacy agent profiles, not deprecated V1 fields',()=>{
    const permissions=[{action:'*',resource:'*',effect:'deny' as const},{action:'read',resource:'*',effect:'allow' as const},{action:'subagent',resource:'*',effect:'deny' as const}];
    const config=JSON.parse(launchArgs('opencode',ctx({openCodePermissions:permissions,resumeId:'ses_legacy'})).env.OPENCODE_CONFIG_CONTENT);
    expect(config.agents.droidsembly.permissions).toEqual(permissions);
    expect(config.agents.cubefarm.permissions).toEqual(permissions);
    expect(config).not.toHaveProperty('permission');
  });

  it('connects the existing browser through native OpenCode V2 MCP configuration', () => {
    const config = JSON.parse(launchArgs('opencode', ctx({ browser: { command: 'node', args: ['browser.js'] } })).env.OPENCODE_CONFIG_CONTENT);
    expect(config.mcp.servers.playwright).toEqual({ type: 'local', command: ['node', 'browser.js'] });
  });

  it.each(['agent', 'ceo'] as const)('keeps a historical OpenCode session ID and model variant intact for a %s', (role) => {
    const resumeId = 'ses_cubefarm11111111111111111111111111111111';
    const launch = launchArgs('opencode', ctx({ role, resumeId, model: 'openai/test-model#medium' }));
    const config = JSON.parse(launch.env.OPENCODE_CONFIG_CONTENT);
    expect(launch.args[launch.args.indexOf('--session') + 1]).toBe(resumeId);
    expect(config.plugins[0].options.sessionID).toBe(resumeId);
    expect(config.default_agent).toBe('droidsembly');
    expect(config.agents.droidsembly.model).toBe('openai/test-model#medium');
    expect(config.agents.cubefarm).toMatchObject({ mode: 'primary', hidden: true, model: 'openai/test-model#medium' });
  });

  it('runs Codex on a local model through its own --oss, or a provider of the office\'s', () => {
    const args = (model: string) => launchArgs('codex', ctx({ model })).args;
    expect(args('gpt-5.5').join(' ')).toContain('-m gpt-5.5');
    expect(args('gpt-5.5')).not.toContain('--oss');
    expect(args('ollama/gpt-oss:20b').join(' ')).toContain('--oss --local-provider ollama -m gpt-oss:20b');
    const llama = args('llamacpp/default');
    expect(llama).not.toContain('--oss');
    expect(llama).toContain('model_providers.cubefarm-llamacpp={name="llama.cpp",base_url="http://127.0.0.1:8080/v1",wire_api="responses"}');
    expect(llama).toContain('model_provider="cubefarm-llamacpp"');
    expect(llama.slice(llama.indexOf('-m'), llama.indexOf('-m') + 2)).toEqual(['-m', 'default']);
  });

  it('gives OpenCode the local server a model runs on', () => {
    const launch = launchArgs('opencode', ctx({ model: 'llama.cpp/qwen/coder' }));
    expect(JSON.parse(launch.env.OPENCODE_CONFIG_CONTENT).agents.droidsembly.model).toBe('llamacpp/qwen/coder');
    expect(JSON.parse(launch.env.OPENCODE_CONFIG_CONTENT).providers).toEqual({
      llamacpp: { package: '@opencode/ai/providers/openai-compatible', name: 'llama.cpp', settings: { baseURL: 'http://127.0.0.1:8080/v1' }, models: { 'qwen/coder': { name: 'qwen/coder', capabilities: { tools: true } } } },
    });
    expect(JSON.parse(launchArgs('opencode', ctx({ model: 'anthropic/claude-opus-5-5' })).env.OPENCODE_CONFIG_CONTENT).providers).toBeUndefined();
  });
});

describe('localUrl', () => {
  it('takes a local server\'s address from the environment when set', () => {
    const ollama = LOCAL_PROVIDERS[0];
    expect(localUrl(ollama, {})).toBe('http://127.0.0.1:11434/v1');
    expect(localUrl(ollama, { CUBEFARM_OLLAMA_URL: ' http://gpu-box:11434/v1 ' })).toBe('http://gpu-box:11434/v1');
  });
});

describe('oneAtATime', () => {
  it("runs a thread's archive and unarchive in order, other threads alongside, past a step that fails", async () => {
    const steps = oneAtATime();
    const done: string[] = [];
    let release!: () => void;
    const exited = new Promise<void>((r) => (release = r));
    const archive = steps('a', async () => {
      await exited;
      done.push('archive a');
      throw new Error('already archived');
    });
    const unarchive = steps('a', async () => void done.push('unarchive a'));
    await steps('b', async () => void done.push('archive b'));
    expect(done).toEqual(['archive b']);
    release();
    await expect(archive).resolves.toBeUndefined();
    await unarchive;
    expect(done).toEqual(['archive b', 'archive a', 'unarchive a']);
  });
});

describe('screenshotFile', () => {
  it("reads a Playwright screenshot that was saved to a file instead of returned inline", () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-shot-'));
    fs.mkdirSync(path.join(cwd, '.playwright-mcp'));
    fs.writeFileSync(path.join(cwd, '.playwright-mcp', 'pr16-375.png'), 'png-bytes');
    const shot = screenshotFile(cwd, '### Result\n- [Screenshot of viewport](.playwright-mcp/pr16-375.png)');
    expect(shot?.mime).toBe('image/png');
    expect(shot?.data.toString()).toBe('png-bytes');
    expect(screenshotFile(cwd, '### Result\n- no link here')).toBeNull();
    fs.rmSync(cwd, { recursive: true, force: true });
  });
});

describe("Codex's file edits in the log", () => {
  it('names the files an apply_patch touches, and says when it worked', () => {
    const patch = '*** Begin Patch\n*** Add File: notes.txt\n+hi\n*** Update File: src/app.ts\n@@\n-a\n+b\n*** End Patch';
    expect(describeTool(dir, 'apply_patch', { command: patch })).toBe('Edit add notes.txt, src/app.ts');
    expect(summariseResult(dir, 'apply_patch', 'Exit code: 0\nOutput:\nSuccess. Updated the following files:\nA notes.txt')).toEqual([{ kind: 'result', text: '  ⎿ Updated' }]);
    expect(summariseResult(dir, 'apply_patch', 'error: patch did not apply')[0].text).toContain('patch did not apply');
  });
});

describe("the CEO's office tools in the log", () => {
  it('says what each one asks for', () => {
    expect(describeOfficeTool('scale_team', { floor: 2, size: 5, reason: 'Six issues ready, two agents free' })).toBe('📈 scale_team floor 2 → 5: Six issues ready, two agents free');
    expect(describeOfficeTool('configure_agent', { agent_id: 'ada', cli: 'codex', model: '' })).toBe('⚙️ configure_agent ada: codex');
    expect(describeOfficeTool('set_dependencies', { floor: 1, number: 7, depends_on: [3, 4] })).toBe('🔗 set_dependencies #7 → floor 1 · depends on #3, #4');
    expect(describeOfficeTool('set_dependencies', { floor: 1, number: 7, depends_on: [] })).toBe('🔗 set_dependencies #7 → floor 1 · depends on nothing');
    expect(describeOfficeTool('file_issue', { floor: 1, title: 'Dark mode', body: 'x' })).toBe('📝 file_issue "Dark mode" → floor 1');
  });
});

describe('newScreenshots', () => {
  it("picks up the images a browser saved, oldest first, once they're written and only once", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-browser-'));
    const later = Date.now() + 5000;
    for (const f of ['page-2026-09-29T10-00-02-000Z.jpeg', 'page-2026-09-29T10-00-01-000Z.png', 'page-2026-09-29T10-00-00-000Z.yml']) fs.writeFileSync(path.join(dir, f), 'x');
    const seen = new Set<string>();
    expect(newScreenshots(dir, seen)).toEqual([]); // just written: may still be in progress
    const found = newScreenshots(dir, seen, later);
    expect(found.map((s) => [s.name, s.mime])).toEqual([
      ['page-2026-09-29T10-00-01-000Z.png', 'image/png'],
      ['page-2026-09-29T10-00-02-000Z.jpeg', 'image/jpeg'],
    ]);
    seen.add(found[0].name);
    expect(newScreenshots(dir, seen, later).map((s) => s.name)).toEqual(['page-2026-09-29T10-00-02-000Z.jpeg']);
    expect(newScreenshots(path.join(dir, 'missing'), seen, later)).toEqual([]);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe('boxVersions', () => {
  it("pins cloud agents' Claude Code and Playwright MCP to the office's own versions", () => {
    const v = boxVersions();
    expect(v.claude).toMatch(/^\d+\.\d+\.\d+/);
    expect(v.playwrightMcp).toMatch(/^\d+\.\d+\.\d+/);
    expect(v.codex).toMatch(/^\d+\.\d+\.\d+/);
    expect(v.opencode).toBe('2.2.6');
  });
});
