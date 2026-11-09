import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CEO_ID } from '../shared/types.ts';
import { createDemoBackend } from './demo.ts';
import { Swarm } from './swarm.ts';
import { BoxMachines } from './boxMachines.ts';
import type { OpenCodeIntegration } from '../shared/opencodeConnections.ts';

const { home } = vi.hoisted(() => ({ home: `${process.env.SWARM_HOME}/connection-settings-${process.pid}` }));
vi.mock('./config.ts', async original => ({ ...await original<typeof import('./config.ts')>(), HOME_DIR: home, STATE_FILE: `${home}/state.json`, WORKSPACE_ROOT: `${home}/workspaces` }));
const inventory: OpenCodeIntegration[] = [{ id: 'openai', name: 'OpenAI', methods: [{ id: 'device', type: 'oauth', label: 'Device' }, { id: 'key', type: 'key', label: 'API' }], connections: [{ id: 'saved-local', label: 'Local', method: 'oauth', needsAuth: false, environment: false }] }];
let swarm: Swarm | undefined;
afterEach(async () => {
  // Keep real timers: xterm's write queue and terminal persistence are part of these integration tests.
  await swarm?.shutdown(); swarm = undefined;
  vi.useRealTimers(); vi.restoreAllMocks();
  await fs.rm(home, { recursive: true, force: true, maxRetries: 5 });
});
async function office() {
  const backend = createDemoBackend();
  backend.listMyRepos = async () => [];
  const read = backend.openCodeConnections = vi.fn(async () => inventory);
  let ended: ((code: number) => void) | undefined;
  const stop = vi.fn();
  const auth = backend.openCodeAuth = vi.fn((_opts, cb) => { ended = cb; return { stop }; });
  const session = vi.spyOn(backend, 'startSession');
  swarm = new Swarm(backend);
  vi.spyOn(swarm.journal, 'hasPastDays').mockResolvedValue(true);
  await swarm.init();
  swarm.updateAgent(CEO_ID, { cli: 'opencode' });
  return { swarm, backend, read, auth, stop, session, end: (code: number) => ended?.(code) };
}

describe('OpenCode connection settings, simulated hosts only', () => {
  it('creates only the CEO location and reads local metadata without starting any AI session', async () => {
    const { swarm, read, auth, session } = await office();
    const catalog = await swarm.openCodeConnections(CEO_ID);
    expect(catalog).toEqual({ integrations: inventory, scope: 'local', scopeKey: 'local', configuringAgent: null });
    expect(read).toHaveBeenCalledExactlyOnceWith(path.join(home, 'ceo'));
    expect((await fs.stat(path.join(home, 'ceo'))).isDirectory()).toBe(true);
    expect(auth).not.toHaveBeenCalled(); expect(session).not.toHaveBeenCalled();
  });
  it('runs login with discovered method, blocks work, then exits without releasing an AI task', async () => {
    const { swarm, auth, session, end } = await office();
    await swarm.configureOpenCode(CEO_ID, { action: 'login', integration: 'openai', method: 'device' }, 'local');
    expect(auth.mock.calls[0][0]).toMatchObject({ args: ['auth', 'login', 'openai', '--method', 'device'], agentId: CEO_ID, cwd: path.join(home, 'ceo') });
    expect((await swarm.openCodeConnections(CEO_ID)).configuringAgent).toBe(CEO_ID);
    await expect(swarm.configureOpenCode(CEO_ID, { action: 'switch', integration: 'openai', account: 'saved-local' }, 'local')).rejects.toThrow('Stop all work');
    expect(() => swarm.updateAgent(CEO_ID, { cli: 'claude' })).toThrow('Finish or stop');
    end(0);
    expect((await swarm.openCodeConnections(CEO_ID)).configuringAgent).toBeNull();
    expect(session).not.toHaveBeenCalled();
  });
  it('activates actual saved account IDs rather than persisting a misleading preference', async () => {
    const { swarm, auth, session, end } = await office();
    await swarm.configureOpenCode(CEO_ID, { action: 'switch', integration: 'openai', account: 'saved-local' }, 'local');
    expect(auth.mock.calls[0][0].args).toEqual(['auth', 'switch', 'openai', 'saved-local']);
    end(0);
    expect(JSON.stringify(swarm.snapshot())).not.toContain('saved-local');
    expect(session).not.toHaveBeenCalled();
  });
  it('does not authenticate unknown methods or secret-bearing requests, and leaves the operation unlocked', async () => {
    const { swarm, auth } = await office();
    await expect(swarm.configureOpenCode(CEO_ID, { action: 'login', integration: 'openai', method: 'invented' }, 'local')).rejects.toThrow('supported');
    await expect(swarm.configureOpenCode(CEO_ID, { action: 'login', integration: 'openai', method: 'key', key: 'secret' }, 'local')).rejects.toThrow('Only provider');
    expect(auth).not.toHaveBeenCalled();
    expect((await swarm.openCodeConnections(CEO_ID)).configuringAgent).toBeNull();
  });
  it('rejects a stale host selection before starting authentication', async () => {
    const { swarm, auth } = await office();
    await expect(swarm.configureOpenCode(CEO_ID, { action: 'login', integration: 'openai', method: 'device' }, 'box:old-machine')).rejects.toThrow('host changed');
    expect(auth).not.toHaveBeenCalled();
  });
  it('can stop a pending official login and ignores its late exit after another operation starts', async () => {
    const { swarm, stop, end, auth } = await office();
    const action = { action: 'login', integration: 'openai', method: 'device' } as const;
    await swarm.configureOpenCode(CEO_ID, action, 'local');
    const firstEnd = auth.mock.calls[0][1];
    swarm.cancelOpenCodeConfiguration(CEO_ID);
    expect(stop).toHaveBeenCalledOnce();
    await swarm.configureOpenCode(CEO_ID, action, 'local');
    firstEnd(0);
    expect((await swarm.openCodeConnections(CEO_ID)).configuringAgent).toBe(CEO_ID);
    end(1);
    expect((await swarm.openCodeConnections(CEO_ID)).configuringAgent).toBeNull();
  });
  it('reads Box metadata without falling back to the local provider list or creating a Box', async () => {
    const { swarm, read, auth, session } = await office();
    const repo = await swarm.connectRepo('demo-co/pixel-todo', { onboardCeo: false, autoAssign: false, autoMerge: false });
    await swarm.setCloudKey('demo-key');
    const worker = swarm.hireAgent(repo.id, { name: 'Remote', host: 'box', cli: 'opencode', strict: true });
    const remote = vi.spyOn(BoxMachines.prototype, 'openCodeConnections').mockResolvedValue([{ ...inventory[0], connections: [{ ...inventory[0].connections[0], id: 'saved-remote' }] }]);
    const ensure = vi.spyOn(BoxMachines.prototype, 'ensure');
    ensure.mockClear();
    read.mockClear();
    expect(await swarm.openCodeConnections(worker.id)).toMatchObject({ scope: 'box', integrations: [{ connections: [{ id: 'saved-remote' }] }] });
    expect(remote).toHaveBeenCalledOnce();
    expect(read).not.toHaveBeenCalled(); expect(ensure).not.toHaveBeenCalled();
    expect(auth).not.toHaveBeenCalled(); expect(session).not.toHaveBeenCalled();
    const scope = (await swarm.openCodeConnections(worker.id)).scopeKey;
    await expect(swarm.configureOpenCode(worker.id, { action: 'switch', integration: 'openai', account: 'saved-local' }, scope)).rejects.toThrow('Unknown saved');
  });
  it('applies a Box account through official remote auth, then updates sign-in metadata without resuming a task', async () => {
    const { swarm, backend, read, auth, session } = await office();
    const repo = await swarm.connectRepo('demo-co/pixel-todo', { onboardCeo: false, autoAssign: false, autoMerge: false });
    await swarm.setCloudKey('demo-key');
    const remote = vi.spyOn(backend.cloud, 'signIn').mockImplementation(() => ({ stop: vi.fn() }));
    const worker = swarm.hireAgent(repo.id, { host: 'box', cli: 'opencode', strict: true });
    vi.spyOn(BoxMachines.prototype, 'openCodeConnections').mockResolvedValue(inventory);
    vi.spyOn(BoxMachines.prototype, 'boxId').mockResolvedValue('existing-fake-box');
    const ready = vi.spyOn(BoxMachines.prototype, 'openCodeConnectionReady').mockResolvedValue(true);
    const ensure = vi.spyOn(BoxMachines.prototype, 'ensure');
    const scope = (await swarm.openCodeConnections(worker.id)).scopeKey;
    ensure.mockClear(); read.mockClear();
    await swarm.configureOpenCode(worker.id, { action: 'login', integration: 'openai', method: 'device' }, scope);
    const call = remote.mock.calls.at(-1)!;
    expect(call[0]).toMatchObject({ boxId: 'existing-fake-box', cli: 'opencode', authArgs: ['auth', 'login', 'openai', '--method', 'device'] });
    await call[1](0);
    expect(ready).toHaveBeenCalledOnce();
    expect(swarm.snapshot().agents.find(a => a.id === worker.id)?.needsSignIn).toBe(false);
    expect((await swarm.openCodeConnections(worker.id)).configuringAgent).toBeNull();
    expect(ensure).not.toHaveBeenCalled(); expect(read).not.toHaveBeenCalled();
    expect(auth).not.toHaveBeenCalled(); expect(session).not.toHaveBeenCalled();
  });
});
