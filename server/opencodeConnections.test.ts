import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openCodeConnections } from './opencodeConnections.ts';
import { startOpenCodeAuth } from './cliRunner.ts';
import { AgentTerminal } from './terminal.ts';

const { run, version, spawn } = vi.hoisted(() => ({ run: vi.fn(), version: vi.fn(), spawn: vi.fn() }));
vi.mock('./exec.ts', async original => ({ ...await original<typeof import('./exec.ts')>(), run }));
vi.mock('./clis.ts', async original => ({ ...await original<typeof import('./clis.ts')>(), commandFor: () => ({ file: 'fake-opencode', args: ['wrapper'] }), checkOpenCodeVersion: version }));
vi.mock('./ptyClient.ts', async original => ({ ...await original<typeof import('./ptyClient.ts')>(), spawnPty: spawn }));
beforeEach(() => { vi.useFakeTimers(); run.mockReset(); version.mockReset().mockResolvedValue(null); spawn.mockReset(); });
afterEach(() => { vi.useRealTimers(); });

describe('local OpenCode connection adapter, fake CLI only', () => {
  it('only reads integration metadata in the requested location', async () => {
    run.mockResolvedValue(JSON.stringify({ data: [{ id: 'openai', name: 'OpenAI', methods: [{ type: 'key' }], connections: [] }] }));
    expect(await openCodeConnections('C:/fake/location')).toHaveLength(1);
    expect(run).toHaveBeenCalledExactlyOnceWith('fake-opencode', ['wrapper', 'api', 'get', '/api/integration?location[directory]=C%3A%2Ffake%2Flocation'], { timeoutMs: 30_000 });
    expect(spawn).not.toHaveBeenCalled();
  });
  it('does not return raw provider errors or credentials', async () => {
    run.mockRejectedValue(new Error('secret-provider-output'));
    await expect(openCodeConnections('/fake')).rejects.toThrow('Could not read OpenCode connections. No credentials were changed.');
  });
  it('rejects unsupported CLI versions before querying metadata or authenticating', async () => {
    version.mockResolvedValue('Unsupported version');
    await expect(openCodeConnections('/fake')).rejects.toThrow('Unsupported version');
    expect(run).not.toHaveBeenCalled();
    const term = new AgentTerminal();
    const exited = vi.fn();
    const handle = startOpenCodeAuth({ args: ['auth', 'login', 'openai', '--method', 'key'], cwd: '/fake', agentId: 'test', term }, exited);
    await vi.advanceTimersByTimeAsync(0);
    expect(spawn).not.toHaveBeenCalled();
    expect(exited).toHaveBeenCalledWith(-1);
    handle.stop(); term.dispose();
  });
  it.each([['auth', 'login', 'openai', '--method', 'provider-device-code'], ['auth', 'switch', 'openai', 'cred-work']])('runs official auth arguments only: %j', async (...args: string[]) => {
    const exits: ((code: number) => void)[] = [];
    const kill = vi.fn(() => exits.forEach(cb => cb(-1)));
    spawn.mockReturnValue({ write: vi.fn(), resize: vi.fn(), onData: vi.fn(), onExit: (cb: (code: number) => void) => exits.push(cb), setMeta: vi.fn(), kill });
    const term = new AgentTerminal();
    const exited = vi.fn();
    const handle = startOpenCodeAuth({ args, cwd: '/fake/project', agentId: 'test', term }, exited);
    await vi.advanceTimersByTimeAsync(0);
    expect(spawn.mock.calls[0].slice(0, 2)).toEqual(['fake-opencode', ['wrapper', ...args]]);
    expect(term.live).toBe(true);
    expect(run).not.toHaveBeenCalled();
    exits.forEach(cb => cb(0));
    expect(exited).toHaveBeenCalledExactlyOnceWith(0);
    expect(term.live).toBe(false);
    handle.stop(); term.dispose();
  });
  it('cancels before version resolution without ever spawning', async () => {
    let resolve!: (value: null) => void;
    version.mockReturnValue(new Promise<null>(r => { resolve = r; }));
    const term = new AgentTerminal();
    const exited = vi.fn();
    const handle = startOpenCodeAuth({ args: ['auth', 'login'], cwd: '/fake', agentId: 'test', term }, exited);
    handle.stop(); resolve(null);
    await vi.advanceTimersByTimeAsync(0);
    expect(spawn).not.toHaveBeenCalled(); expect(exited).not.toHaveBeenCalled();
    term.dispose();
  });
});
