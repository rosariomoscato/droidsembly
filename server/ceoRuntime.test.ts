import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CEO_ID } from '../shared/types.ts';
import type { SessionCallbacks, SessionOptions } from './agentRunner.ts';
import { createDemoBackend } from './demo.ts';
import { Swarm } from './swarm.ts';
import { openCodeVersionProblem } from './clis.ts';

const { home } = vi.hoisted(() => ({ home: `${process.env.SWARM_HOME}/ceo-runtime-${process.pid}` }));
vi.mock('./config.ts', async (original) => ({
  ...await original<typeof import('./config.ts')>(),
  HOME_DIR: home, STATE_FILE: `${home}/state.json`, WORKSPACE_ROOT: `${home}/workspaces`,
}));

let swarm: Swarm | undefined;
afterEach(async () => {
  await swarm?.shutdown();
  swarm = undefined;
  await fs.rm(home, { recursive: true, force: true, maxRetries: 5 });
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
  swarm = new Swarm(backend);
  vi.spyOn(swarm.journal, 'hasPastDays').mockResolvedValue(true);
  await swarm.init();
  return { swarm, sessions, send, backend };
}

describe('the CEO coding agent', () => {
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
    const { swarm, sessions, send, backend } = await office();
    // Diagnostic only: preserve every return value, rejection, timer and assertion.
    // No prompts, user text, filesystem paths or provider settings enter this trace.
    const started = performance.now();
    const phases: { phase: string; ms: number; allowed?: boolean }[] = [];
    let dropped = 0;
    const mark = (phase: string, allowed?: boolean) => {
      if (phases.length >= 64) { dropped++; return; }
      phases.push({ phase, ms: Math.round((performance.now() - started) * 10) / 10, ...(allowed === undefined ? {} : { allowed }) });
    };
    const methods = ['schedule', 'startCeoWork', 'mayStart', 'slotsFull', 'runCeoJob', 'limited'] as const;
    const observed = swarm as unknown as Record<typeof methods[number], (...args: unknown[]) => unknown>;
    const spies = methods.map((method) => {
      const original = observed[method];
      return vi.spyOn(observed, method).mockImplementation((...args) => {
        mark(`${method}:enter`);
        const result = original.apply(swarm, args);
        mark(`${method}:return`, typeof result === 'boolean' ? result : undefined);
        return result;
      });
    });
    const startSession = backend.startSession;
    const sessionSpy = vi.spyOn(backend, 'startSession').mockImplementation((opts, cb) => {
      mark('startSession');
      return startSession(opts, cb);
    });
    let startupObserved = false;
    try {
      expect(swarm.snapshot().settings.language).toBe('en');
      swarm.updateSettings({ language: 'it' });
      swarm.updateSettings({ language: 'de' as 'it' });
      expect(swarm.snapshot().settings.language).toBe('it');
      await swarm.messageCeo('Ciao');
      mark('messageCeo:queued');
      await vi.waitFor(() => expect(sessions).toHaveLength(1));
      startupObserved = true;
      expect(sessions[0].opts.systemAppend).toContain('Reply to the manager in Italian');
      expect(sessions[0].opts.systemAppend).toContain('GitHub issue titles/bodies');
      swarm.updateSettings({ language: 'en' });
      await swarm.messageCeo('Hello again');
      expect(send).toHaveBeenLastCalledWith(expect.stringContaining('Office language: English'));
      expect(swarm.snapshot().messages.filter((m) => m.from === 'manager').map((m) => m.text)).toEqual(['Ciao', 'Hello again']);
      await swarm.shutdown();
      const saved = JSON.parse(await fs.readFile(`${home}/state.json`, 'utf8'));
      expect(saved.settings.language).toBe('en');
    } finally {
      sessionSpy.mockRestore();
      for (const spy of spies) spy.mockRestore();
      const state = swarm.snapshot();
      console.info('[ceo-startup-trace]', JSON.stringify({
        startupObserved, phases, dropped, sessions: sessions.length,
        ceoStatus: state.agents.find((agent) => agent.id === CEO_ID)?.status,
        queuedKinds: state.ceo.queue.map((job) => job.kind),
        jobKind: state.ceo.job?.kind ?? null,
      }));
    }
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
    const repo = await swarm.connectRepo('demo-co/pixel-todo');
    const count = swarm.snapshot().agents.length;
    expect(() => swarm.hireAgent(repo.id, { cli: 'opencode' })).toThrow(/requires OpenCode 2\.x/);
    swarm.updateSettings({ defaultCli: 'opencode' });
    expect(() => swarm.hireAgent(repo.id, {})).toThrow(/requires OpenCode 2\.x/);
    expect(swarm.snapshot().agents).toHaveLength(count);
  });
  it('refuses OpenCode when it is not installed, leaving the CEO on Claude', async () => {
    const { swarm } = await office(false);
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

  it('keeps Claude as the CEO default even when workers default to OpenCode', async () => {
    const { swarm, sessions } = await office();
    swarm.updateSettings({ defaultCli: 'opencode', defaultModel: 'openai/worker-model' });
    swarm.updateAgent(CEO_ID, { cli: '' });
    swarm.messageCeo('Hello');
    await vi.waitFor(() => expect(sessions).toHaveLength(1));
    expect(sessions[0].opts).toMatchObject({ cli: 'claude', model: 'claude-opus-5-5' });
    expect(() => swarm.updateAgent(CEO_ID, { cli: 'codex' })).toThrow(/CEO can run Claude Code or OpenCode/);
  });

  it('does not resume Claude or pass its model after switching a busy CEO to OpenCode', async () => {
    const { swarm, sessions } = await office();
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
