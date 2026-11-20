import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CEO_ID } from '../shared/types.ts';
import type { SessionCallbacks, SessionOptions } from './agentRunner.ts';
import { createDemoBackend } from './demo.ts';
import { Swarm } from './swarm.ts';
import { openCodeVersionProblem } from './clis.ts';
import { fixtureWork } from '../scripts/fixtureWork.ts';

const { home } = vi.hoisted(() => ({ home: `${process.env.SWARM_HOME}/ceo-runtime-${process.pid}` }));
vi.mock('./config.ts', async (original) => ({
  ...await original<typeof import('./config.ts')>(),
  HOME_DIR: home, STATE_FILE: `${home}/state.json`, WORKSPACE_ROOT: `${home}/workspaces`,
}));

const fixtures: { swarm: Swarm; work: ReturnType<typeof fixtureWork> }[] = [];
afterEach(async () => {
  try {
    // connectRepo returns before its clone/sweep and onboarding children settle.
    // Own every office, including the ones explicitly restarted within a test.
    for (const { swarm, work } of fixtures.splice(0)) {
      await work.drain();
      await swarm.shutdown();
      await work.drain();
    }
    // A failed drain/shutdown leaves the fixture intact as diagnostic evidence.
    await fs.rm(home, { recursive: true, force: true, maxRetries: 5 });
  } finally {
    vi.restoreAllMocks();
  }
});

async function office(openCodeInstalled = true, problem?: string) {
  const sessions: { opts: SessionOptions; cb: SessionCallbacks }[] = [];
  const send = vi.fn();
  const backend = createDemoBackend();
  const detect = backend.detectClis;
  backend.detectClis = async () => (await detect()).map((cli) => cli.id === 'opencode' ? { ...cli, installed: openCodeInstalled, ...(problem ? { problem } : {}) } : cli);
  backend.listMyRepos = async () => [];
  backend.startSession = (opts, cb) => {
    sessions.push({ opts, cb });
    return { send, stop: () => undefined };
  };
  const swarm = new Swarm(backend);
  const work = fixtureWork();
  fixtures.push({ swarm, work });
  const runtime = swarm as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>;
  // A timed-out test may still be inside init: teardown must not delete its home
  // or restore its journal spy until initialization and its children have settled.
  for (const method of ['cloneRepo', 'syncRepo', 'sweepFloor', 'syncFolder', 'advanceMerges', 'lookUpIssueAges', 'runCeoJob', 'journalSample']) {
    const original = runtime[method].bind(swarm);
    vi.spyOn(runtime, method).mockImplementation((...args) => work.track(original(...args)));
  }
  vi.spyOn(swarm.journal, 'hasPastDays').mockResolvedValue(true);
  await work.track(swarm.init());
  return { swarm, sessions, send, backend };
}

describe('the CEO coding agent', () => {
  it('ignores a scheduler callback queued before shutdown without starting CEO work', () => {
    const tickUsage = vi.fn(), startCeoWork = vi.fn();
    const stopped = Object.assign(Object.create(Swarm.prototype), { stopping: true, tickUsage, startCeoWork });
    stopped.schedule();
    expect(tickUsage).not.toHaveBeenCalled();
    expect(startCeoWork).not.toHaveBeenCalled();
  });

  it('keeps a pending initialization inside the fixture drain barrier', async () => {
    const init = Swarm.prototype.init;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    vi.spyOn(Swarm.prototype, 'init').mockImplementation(async function (this: Swarm) {
      await gate;
      await init.call(this);
    });
    const opening = office();
    let drained = false;
    const draining = fixtures.at(-1)!.work.drain().then(() => { drained = true; });
    try {
      await Promise.resolve();
      expect(drained).toBe(false);
    } finally {
      release();
      await opening;
      await draining;
    }
    expect(drained).toBe(true);
  });

  it('proposes OpenCode with no model for a new office and CEO, and keeps an empty CEO choice after restart', async () => {
    const first = await office();
    expect(first.swarm.snapshot().settings).toMatchObject({ defaultCli: 'opencode', defaultModel: '' });
    expect(first.swarm.snapshot().agents.find((a) => a.id === CEO_ID)).toMatchObject({ cli: 'opencode', model: '' });
    first.swarm.updateAgent(CEO_ID, { cli: '' });
    await first.swarm.shutdown();
    const second = await office();
    expect(second.swarm.snapshot().agents.find((a) => a.id === CEO_ID)).toMatchObject({ cli: '', model: '' });
    await second.swarm.messageCeo('Hello');
    await vi.waitFor(() => expect(second.sessions).toHaveLength(1));
    expect(second.sessions[0].opts).toMatchObject({ cli: 'opencode', model: '' });
  });

  it.each(['missing', 'empty'] as const)('preserves legacy implicit Claude defaults (%s) without rewriting sessions', async (kind) => {
    const first = await office();
    await first.swarm.shutdown();
    const saved = JSON.parse(await fs.readFile(`${home}/state.json`, 'utf8'));
    delete saved.agentDefaultsVersion;
    if (kind === 'missing') delete saved.settings.defaultCli;
    else saved.settings.defaultCli = '';
    delete saved.settings.defaultModel;
    const ceo = saved.agents.find((a: { id: string }) => a.id === CEO_ID);
    if (kind === 'missing') delete ceo.cli;
    else ceo.cli = '';
    ceo.model = 'claude-opus-5-5';
    ceo.sessionId = 'legacy-session';
    delete ceo.sessionCli;
    await fs.writeFile(`${home}/state.json`, JSON.stringify(saved));
    const second = await office();
    expect(second.swarm.snapshot().settings).toMatchObject({ defaultCli: 'claude', defaultModel: 'claude-opus-5-5' });
    expect(second.swarm.snapshot().agents.find((a) => a.id === CEO_ID)).toMatchObject({ cli: 'claude', model: 'claude-opus-5-5' });
    await second.swarm.shutdown();
    const migrated = JSON.parse(await fs.readFile(`${home}/state.json`, 'utf8'));
    expect(migrated.agentDefaultsVersion).toBe(1);
    expect(migrated.agents.find((a: { id: string }) => a.id === CEO_ID)).toMatchObject({ sessionId: 'legacy-session', sessionCli: 'claude' });
  });

  it('preserves explicit legacy tool and model choices independently for office and CEO', async () => {
    const first = await office();
    first.swarm.updateSettings({ defaultCli: 'codex', defaultModel: 'gpt-worker' });
    first.swarm.updateAgent(CEO_ID, { cli: 'opencode', model: 'provider/ceo-model#variant' });
    await first.swarm.shutdown();
    const saved = JSON.parse(await fs.readFile(`${home}/state.json`, 'utf8'));
    delete saved.agentDefaultsVersion;
    await fs.writeFile(`${home}/state.json`, JSON.stringify(saved));
    const second = await office();
    expect(second.swarm.snapshot().settings).toMatchObject({ defaultCli: 'codex', defaultModel: 'gpt-worker' });
    expect(second.swarm.snapshot().agents.find((a) => a.id === CEO_ID)).toMatchObject({ cli: 'opencode', model: 'provider/ceo-model#variant' });
  });

  it('creates a legacy missing CEO on Claude without changing an explicit OpenCode office default', async () => {
    const first = await office();
    await first.swarm.shutdown();
    const saved = JSON.parse(await fs.readFile(`${home}/state.json`, 'utf8'));
    delete saved.agentDefaultsVersion;
    saved.agents = saved.agents.filter((a: { id: string }) => a.id !== CEO_ID);
    await fs.writeFile(`${home}/state.json`, JSON.stringify(saved));
    const second = await office();
    expect(second.swarm.snapshot().settings).toMatchObject({ defaultCli: 'opencode', defaultModel: '' });
    expect(second.swarm.snapshot().agents.find((a) => a.id === CEO_ID)).toMatchObject({ cli: 'claude', model: 'claude-opus-5-5' });
  });

  it('restores Italian after restart and migrates older offices without a language', async () => {
    const first = await office();
    first.swarm.updateSettings({ language: 'it' });
    await first.swarm.shutdown();
    const second = await office();
    expect(second.swarm.snapshot().settings.language).toBe('it');
    await second.swarm.shutdown();
    const saved = JSON.parse(await fs.readFile(`${home}/state.json`, 'utf8'));
    delete saved.settings.language;
    await fs.writeFile(`${home}/state.json`, JSON.stringify(saved));
    const third = await office();
    expect(third.swarm.snapshot().settings.language).toBe('en');
  });
  it('saves the language, rejects invalid changes and updates an active CEO without changing stored user text', async () => {
    const { swarm, sessions, send } = await office();
    expect(swarm.snapshot().settings.language).toBe('en');
    swarm.updateSettings({ language: 'it' });
    swarm.updateSettings({ language: 'de' as 'it' });
    expect(swarm.snapshot().settings.language).toBe('it');
    await swarm.messageCeo('Ciao');
    await vi.waitFor(() => expect(sessions).toHaveLength(1));
    expect(sessions[0].opts.systemAppend).toContain('Reply to the manager in Italian');
    expect(sessions[0].opts.systemAppend).toContain('GitHub issue titles/bodies');
    swarm.updateSettings({ language: 'en' });
    await swarm.messageCeo('Hello again');
    expect(send).toHaveBeenLastCalledWith(expect.stringContaining('Office language: English'));
    expect(swarm.snapshot().messages.filter((m) => m.from === 'manager').map((m) => m.text)).toEqual(['Ciao', 'Hello again']);
    await swarm.shutdown();
    const saved = JSON.parse(await fs.readFile(`${home}/state.json`, 'utf8'));
    expect(saved.settings.language).toBe('en');
  });
  it('loads the model inventory in the CEO or repository context and rejects unknown agents', async () => {
    const { swarm } = await office();
    const ceoModels = await swarm.openCodeModels(CEO_ID);
    expect(ceoModels.directory).toContain('ceo');
    expect(ceoModels.models.length).toBeGreaterThan(0);
    const repo = await swarm.connectRepo('demo-co/pixel-todo');
    const agent = swarm.snapshot().agents.find((a) => a.repoId === repo.id)!;
    expect((await swarm.openCodeModels(agent.id)).directory).toBe((await swarm.openCodeModels(undefined, repo.id)).directory);
    expect(() => swarm.openCodeModels('missing')).toThrow();
  });
  it('creates the CEO location before reading models without starting a session', async () => {
    const { swarm, sessions, backend } = await office();
    expect(await fs.stat(`${home}/ceo`).catch(() => null)).toBeNull();
    const read = vi.spyOn(backend, 'openCodeModels').mockImplementation(async (directory) => {
      expect((await fs.stat(directory)).isDirectory()).toBe(true);
      return { directory, models: [], defaultModel: null };
    });
    await swarm.openCodeModels(CEO_ID, undefined, true);
    await swarm.openCodeModels(CEO_ID);
    expect(read).toHaveBeenCalledWith(path.join(home, 'ceo'), true);
    expect(read).toHaveBeenCalledTimes(2);
    expect(sessions).toHaveLength(0);
    expect(swarm.snapshot().repos).toHaveLength(0);
  });
  it('rejects V1 for the CEO, an explicit team hire and a hire inheriting the office default', async () => {
    const { swarm } = await office(true, openCodeVersionProblem('1.18.29')!);
    expect(() => swarm.updateAgent(CEO_ID, { cli: 'opencode' })).toThrow(/requires OpenCode 2\.x/);
    swarm.updateSettings({ defaultCli: 'claude' });
    const repo = await swarm.connectRepo('demo-co/pixel-todo');
    const count = swarm.snapshot().agents.length;
    expect(() => swarm.hireAgent(repo.id, { cli: 'opencode' })).toThrow(/requires OpenCode 2\.x/);
    swarm.updateSettings({ defaultCli: 'opencode' });
    expect(() => swarm.hireAgent(repo.id, {})).toThrow(/requires OpenCode 2\.x/);
    expect(swarm.snapshot().agents).toHaveLength(count);
  });
  it('refuses OpenCode when it is not installed, leaving the CEO on Claude', async () => {
    const { swarm } = await office(false);
    expect(swarm.snapshot().agents.find((a) => a.id === CEO_ID)?.cli).toBe('opencode');
    swarm.updateAgent(CEO_ID, { cli: 'claude' });
    expect(() => swarm.updateAgent(CEO_ID, { cli: 'opencode' })).toThrow(/isn't installed/);
    expect(swarm.snapshot().agents.find((a) => a.id === CEO_ID)?.cli).toBe('claude');
  });
  it('starts OpenCode with office tools, its own model and a resumable OpenCode chat', async () => {
    const { swarm, sessions } = await office();
    swarm.updateAgent(CEO_ID, { cli: 'opencode', model: 'openai/test-model#high' });
    swarm.messageCeo('Describe the company');
    await vi.waitFor(() => expect(sessions).toHaveLength(1));
    expect(sessions[0].opts).toMatchObject({ role: 'ceo', cli: 'opencode', model: 'openai/test-model#high' });
    expect(sessions[0].opts.office).toBeDefined();
    expect(sessions[0].opts.systemAppend).toContain('office_company_status');
    sessions[0].cb.sessionId('ses_ceo');
    sessions[0].cb.finished({ ok: true, text: 'Ready', errors: [], costUsd: 0, turns: 1 });
    swarm.messageCeo('Continue');
    await vi.waitFor(() => expect(sessions).toHaveLength(2));
    expect(sessions[1].opts).toMatchObject({ cli: 'opencode', resumeSessionId: 'ses_ceo' });
  });

  it('defaults the CEO to OpenCode without inheriting the worker model', async () => {
    const { swarm, sessions } = await office();
    swarm.updateSettings({ defaultCli: 'opencode', defaultModel: 'openai/worker-model' });
    swarm.updateAgent(CEO_ID, { cli: '' });
    swarm.messageCeo('Hello');
    await vi.waitFor(() => expect(sessions).toHaveLength(1));
    expect(sessions[0].opts).toMatchObject({ cli: 'opencode', model: '' });
    expect(() => swarm.updateAgent(CEO_ID, { cli: 'codex' })).toThrow(/CEO can run Claude Code or OpenCode/);
  });

  it('does not resume Claude or pass its model after switching a busy CEO to OpenCode', async () => {
    const { swarm, sessions } = await office();
    swarm.updateAgent(CEO_ID, { cli: 'claude', model: 'claude-opus-5-5' });
    swarm.messageCeo('Hello');
    await vi.waitFor(() => expect(sessions).toHaveLength(1));
    swarm.updateAgent(CEO_ID, { cli: 'opencode' });
    // The old session can still report its id after the manager changes the next task's setup.
    sessions[0].cb.sessionId('old-claude-session');
    sessions[0].cb.finished({ ok: true, text: 'Ready', errors: [], costUsd: 0, turns: 1 });
    swarm.messageCeo('Use OpenCode now');
    await vi.waitFor(() => expect(sessions).toHaveLength(2));
    expect(sessions[1].opts).toMatchObject({ cli: 'opencode', model: '' });
    expect(sessions[1].opts.resumeSessionId).toBeUndefined();
  });

  it('retains Claude-only behavior in the SDK runtime without reusing an OpenCode session', async () => {
    const { swarm, sessions } = await office();
    swarm.updateAgent(CEO_ID, { cli: 'opencode' });
    swarm.messageCeo('Hello');
    await vi.waitFor(() => expect(sessions).toHaveLength(1));
    sessions[0].cb.sessionId('ses_old');
    sessions[0].cb.finished({ ok: true, text: 'Ready', errors: [], costUsd: 0, turns: 1 });
    swarm.updateSettings({ runtime: 'sdk' });
    swarm.messageCeo('Hello through the SDK');
    await vi.waitFor(() => expect(sessions).toHaveLength(2));
    expect(sessions[1].opts.cli).toBeUndefined();
    expect(sessions[1].opts.resumeSessionId).toBeUndefined();
    expect(sessions[1].opts.model).toBe('claude-opus-5-5');
  });
});
