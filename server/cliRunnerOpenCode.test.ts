import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AgentTerminal } from './terminal.ts';
import { handleHook, setOfficeUrl, startCliSession } from './cliRunner.ts';

const { spawn, checkVersion } = vi.hoisted(() => ({ spawn: vi.fn(), checkVersion: vi.fn<() => Promise<string | null>>() }));
vi.mock('./ptyClient.ts', async (original) => ({
  ...await original<typeof import('./ptyClient.ts')>(),
  terminalsAvailable: true, spawnPty: spawn, keeperHookUrl: () => null,
}));
vi.mock('./clis.ts', async (original) => ({
  ...await original<typeof import('./clis.ts')>(),
  commandFor: () => ({ file: 'fake-opencode', args: [] }),
  checkOpenCodeVersion: checkVersion,
}));

beforeEach(() => {
  spawn.mockReset();
  checkVersion.mockReset().mockResolvedValue(null);
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe('OpenCode failed turns', () => {
  it('keeps the completed reply readable after closing a full-screen CEO terminal', async () => {
    vi.useFakeTimers();
    spawn.mockImplementation(() => {
      const exits: ((code: number) => void)[] = [];
      return { write: () => undefined, resize: () => undefined, onData: () => undefined,
        onExit: (cb: (code: number) => void) => exits.push(cb), setMeta: () => undefined,
        kill: () => exits.forEach((cb) => cb(0)) };
    });
    const term = new AgentTerminal();
    const retained = vi.spyOn(term, 'retainReply');
    const finished = vi.fn();
    startCliSession({
      cwd: process.env.SWARM_HOME!, prompt: 'Hello', systemAppend: '', model: '', effort: 'medium',
      browserTesting: false, additionalDirectories: [], role: 'ceo', cli: 'opencode', terminal: term,
    }, { log: () => undefined, tool: () => undefined, sessionId: () => undefined,
      browserUrl: () => undefined, screenshot: () => undefined, finished });
    await vi.advanceTimersByTimeAsync(0);
    term.write('\x1b[?1049h\x1b[HTransient reply');
    handleHook(spawn.mock.calls[0][3].token, { hook_event_name: 'TurnComplete', last_assistant_message: 'Persistent reply' });
    await vi.advanceTimersByTimeAsync(3000);
    expect(retained).toHaveBeenCalledExactlyOnceWith('Persistent reply');
    expect(term.live).toBe(false);
    expect(finished).toHaveBeenCalledWith(expect.objectContaining({ ok: true, text: 'Persistent reply' }));
    term.dispose();
  });
  it('restarts an idle OpenCode CLI when its model or variant changes, preserving the resume ID', async () => {
    vi.useFakeTimers();
    spawn.mockImplementation(() => {
      const exits: ((code: number) => void)[] = [];
      return { write: () => undefined, resize: () => undefined, onData: () => undefined,
        onExit: (cb: (code: number) => void) => exits.push(cb), setMeta: () => undefined,
        kill: () => exits.forEach((cb) => cb(0)) };
    });
    const term = new AgentTerminal();
    const retained = vi.spyOn(term, 'retainReply');
    const finished = vi.fn();
    const opts = {
      cwd: process.env.SWARM_HOME!, prompt: 'Hello', systemAppend: '', model: 'openai/model#xhigh', effort: 'medium' as const,
      browserTesting: false, additionalDirectories: [], role: 'agent' as const, cli: 'opencode' as const, terminal: term, keepAlive: true,
    };
    const callbacks = { log: () => undefined, tool: () => undefined, sessionId: () => undefined,
      browserUrl: () => undefined, screenshot: () => undefined, finished };
    startCliSession(opts, callbacks);
    await vi.advanceTimersByTimeAsync(0);
    handleHook(spawn.mock.calls[0][3].token, { hook_event_name: 'TurnComplete', session_id: 'ses_existing', last_assistant_message: 'Done' });
    await vi.advanceTimersByTimeAsync(3000);
    expect(finished).toHaveBeenCalledTimes(1);
    expect(retained).not.toHaveBeenCalled(); // an idle CLI is still live and must keep its interactive screen
    const next = startCliSession({ ...opts, model: 'openai/other#medium', resumeSessionId: 'ses_existing' }, callbacks);
    await vi.advanceTimersByTimeAsync(0);
    expect(spawn).toHaveBeenCalledTimes(2);
    const args = spawn.mock.calls[1][1] as string[];
    expect(args[args.indexOf('--session') + 1]).toBe('ses_existing');
    const config = JSON.parse(spawn.mock.calls[1][2].env.OPENCODE_CONFIG_CONTENT);
    expect(config.default_agent).toBe('droidsembly');
    expect(config.agents.droidsembly.model).toBe('openai/other#medium');
    expect(config.agents.cubefarm).toMatchObject({ hidden: true, model: 'openai/other#medium' });
    expect(config.plugins[0].options.model).toEqual({ providerID: 'openai', id: 'other', variant: 'medium' });
    next.stop();
    await vi.advanceTimersByTimeAsync(3000);
    term.dispose();
  });
  it('settles a failed idle turn without waiting forever for TurnComplete or process exit', async () => {
    vi.useFakeTimers();
    const exits: ((code: number) => void)[] = [];
    spawn.mockReturnValue({
      write: () => undefined, resize: () => undefined, onData: () => undefined,
      onExit: (cb: (code: number) => void) => exits.push(cb),
      setMeta: () => undefined, kill: () => exits.forEach((cb) => cb(0)),
    });
    setOfficeUrl('http://127.0.0.1:4417');
    const term = new AgentTerminal();
    const finished = vi.fn();
    startCliSession({
      cwd: process.env.SWARM_HOME!, prompt: 'Hello', systemAppend: 'You are the CEO.',
      model: '', effort: 'medium', browserTesting: false, additionalDirectories: [],
      role: 'ceo', cli: 'opencode', terminal: term,
    }, {
      log: () => undefined, tool: () => undefined, sessionId: () => undefined,
      browserUrl: () => undefined, screenshot: () => undefined, finished,
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(checkVersion).toHaveBeenCalledWith({ file: 'fake-opencode', args: [] });
    const meta = spawn.mock.calls.at(-1)![3];
    handleHook(meta.token, { hook_event_name: 'TurnError', error: 'Provider unavailable' });
    await vi.advanceTimersByTimeAsync(3000);
    expect(finished).toHaveBeenCalledWith(expect.objectContaining({ ok: false, errors: ['OpenCode: Provider unavailable'] }));
    term.dispose();
  });

  it.each(['ceo', 'agent'] as const)('refuses to spawn an incompatible OpenCode process for a %s', async (role) => {
    vi.useFakeTimers();
    checkVersion.mockResolvedValue('OpenCode V1 is not supported. CubeFarm requires OpenCode 2.x.');
    const term = new AgentTerminal();
    const finished = vi.fn();
    startCliSession({
      cwd: process.env.SWARM_HOME!, prompt: 'Hello', systemAppend: '', model: '', effort: 'medium',
      browserTesting: false, additionalDirectories: [], role, cli: 'opencode', terminal: term,
    }, {
      log: () => undefined, tool: () => undefined, sessionId: () => undefined,
      browserUrl: () => undefined, screenshot: () => undefined, finished,
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(spawn).not.toHaveBeenCalled();
    expect(finished).toHaveBeenCalledWith(expect.objectContaining({ ok: false, errors: [expect.stringContaining('requires OpenCode 2.x')] }));
    term.dispose();
  });
});
