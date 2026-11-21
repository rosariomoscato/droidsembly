import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WebSocket } from 'ws';
import { createDemoBackend } from './demo.ts';
import { Swarm } from './swarm.ts';

// This file runs beside other demo offices. Their per-module write queues must not share one secrets file.
const { home } = vi.hoisted(() => ({ home: `${process.env.SWARM_HOME}/cloud-signin` }));
vi.mock('./config.ts', async (original) => ({
  ...await original<typeof import('./config.ts')>(),
  HOME_DIR: home, STATE_FILE: `${home}/state.json`, WORKSPACE_ROOT: `${home}/workspaces`,
}));

// A cloud agent's coding agent signs in with its own login in their Box (docs/cloud.md). In a demo office the fake
// Upstash account's new Boxes are signed out, the fake sign-in in the agent's terminal signs them in, and
// expireSignIns() signs every Box out again, as a login Anthropic or OpenAI turned away would.

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
  for (const m of ['log', 'warn', 'info'] as const) vi.spyOn(console, m).mockImplementation(() => undefined);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function office() {
  const swarm = new Swarm(createDemoBackend());
  const connecting = swarm.connectRepo('demo-co/pixel-todo');
  await vi.advanceTimersByTimeAsync(2_000);
  const repo = await connecting;
  await swarm.setCloudKey('demo-key');
  const agent = (id: string) => swarm.snapshot().agents.find((a) => a.id === id)!;
  return { swarm, repo, agent };
}

/** Someone watching an agent's terminal (as /ws/term does): what they saw, and keys they type. */
function viewer() {
  const seen: string[] = [];
  const on: Record<string, (raw: unknown) => void> = {};
  const ws = { OPEN: 1, readyState: 1, bufferedAmount: 0, send: (m: string) => seen.push(m), close: () => undefined, on: (ev: string, fn: (raw: unknown) => void) => void (on[ev] = fn) };
  return { ws: ws as unknown as WebSocket, seen, type: (data: string) => on.message?.(JSON.stringify({ t: 'input', data })) };
}

describe('signing cloud agents in', () => {
  it.each([
    ['opencode', 'OpenCode'],
    ['codex', 'Codex'],
    ['claude', 'Claude Code'],
  ] as const)('notifies when a %s cloud worker needs sign-in', async (cli, label) => {
    const { swarm, repo, agent } = await office();
    const notify = vi.spyOn(swarm.notifier, 'notify');
    const worker = swarm.hireAgent(repo.id, { name: 'Cloud worker', host: 'box', cli, strict: true });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(agent(worker.id).needsSignIn).toBe(true);
    const alerts = notify.mock.calls.filter(([event]) => event === 'needsSignIn');
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toEqual([
      'needsSignIn', 'Cloud worker needs sign-in',
      `${label} needs sign-in in their cloud machine. Open Droidsembly and tap Sign in on their card to complete the official login.`,
      `Cloud worker: ${label} needs sign-in`,
    ]);
  });

  it.each(['', 'opencode'] as const)('signs an OpenCode worker in in its Box (choice: "%s"), lists remote models and holds an expired task for another login', async (cli) => {
    const { swarm, repo, agent } = await office();
    const notify = vi.spyOn(swarm.notifier, 'notify');
    const signInAlerts = () => notify.mock.calls.filter(([event]) => event === 'needsSignIn');
    expect(swarm.snapshot().settings).toMatchObject({ defaultCli: 'opencode', defaultModel: '' });
    const ada = swarm.hireAgent(repo.id, { name: 'OpenCode', host: 'box', cli, strict: true });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(agent(ada.id)).toMatchObject({ host: 'box', cli, needsSignIn: true });
    expect(signInAlerts()).toEqual([[
      'needsSignIn', 'OpenCode needs sign-in',
      'OpenCode needs sign-in in their cloud machine. Open Droidsembly and tap Sign in on their card to complete the official login.',
      'OpenCode: OpenCode needs sign-in',
    ]]);
    const models = await swarm.openCodeModels(ada.id);
    expect(models.directory).toContain('/workspace/home/work/');
    expect(models.models[0].id).toBe('demo/cloud-model');
    const issue = swarm.snapshot().repos.find(r => r.id === repo.id)!.issues[0];
    swarm.assign(ada.id, issue.number);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(agent(ada.id)).toMatchObject({ status: 'preparing', needsSignIn: true });
    swarm.signIn(ada.id);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(signInAlerts()).toHaveLength(1); // retries and waiting for login do not notify again
    const v = viewer();
    swarm.attachTerminal(ada.id, v.ws);
    v.type('done\r');
    await vi.advanceTimersByTimeAsync(5_000);
    expect(agent(ada.id)).toMatchObject({ host: 'box', status: 'working', needsSignIn: false });
    swarm.expireSignIns();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(agent(ada.id)).toMatchObject({ host: 'box', status: 'preparing', needsSignIn: true, issueNumber: issue.number });
    expect(signInAlerts()).toHaveLength(2);
    expect(signInAlerts()[1][2]).toContain('sign-in expired or was revoked');
    v.type('again\r');
    await vi.advanceTimersByTimeAsync(5_000);
    expect(agent(ada.id)).toMatchObject({ host: 'box', status: 'working', needsSignIn: false, issueNumber: issue.number });
    expect(signInAlerts()).toHaveLength(2);
  });
  it('asks to sign an explicit Claude cloud hire in, keeps work from them meanwhile, and signs them in in their terminal', async () => {
    const { swarm, repo, agent } = await office();
    const ada = swarm.hireAgent(repo.id, { name: 'Ada', host: 'box', cli: 'claude', strict: true });
    await vi.advanceTimersByTimeAsync(10_000); // their Box is created and set up, then asked
    expect(agent(ada.id).needsSignIn).toBe(true);
    expect(agent(ada.id).terminal).toBe(true);

    // The floor hands out work, but not to someone waiting to be signed in.
    swarm.updateRepo(repo.id, { autoAssign: true });
    await vi.advanceTimersByTimeAsync(5_000);
    expect(agent(ada.id).status).toBe('idle');
    expect(swarm.snapshot().agents.some((a) => a.repoId === repo.id && a.id !== ada.id && a.status !== 'idle')).toBe(true);

    const v = viewer();
    swarm.attachTerminal(ada.id, v.ws);
    await vi.advanceTimersByTimeAsync(100);
    expect(v.seen.join('')).toContain('Paste code here if prompted');
    v.type('\x1b[200~demo-code\x1b[201~\r');
    await vi.advanceTimersByTimeAsync(1_000);
    expect(agent(ada.id).needsSignIn).toBe(false);
    expect(v.seen.join('')).not.toContain('demo-code'); // never echoed, so never in the terminal's copy
  });

  it("holds a task until they're signed in, and again when their sign-in expires mid-task", async () => {
    const { swarm, repo, agent } = await office();
    const ada = swarm.hireAgent(repo.id, { name: 'Ada', host: 'box', strict: true });
    await vi.advanceTimersByTimeAsync(10_000);
    const issue = swarm.snapshot().repos.find((r) => r.id === repo.id)!.issues[0];
    swarm.assign(ada.id, issue.number);
    await vi.advanceTimersByTimeAsync(10_000); // the desk is set up in their Box, then the session would start
    expect(agent(ada.id)).toMatchObject({ status: 'preparing', needsSignIn: true, issueNumber: issue.number });

    const v = viewer();
    swarm.attachTerminal(ada.id, v.ws);
    await vi.advanceTimersByTimeAsync(100);
    v.type('code\r');
    await vi.advanceTimersByTimeAsync(5_000);
    expect(agent(ada.id)).toMatchObject({ status: 'working', needsSignIn: false, issueNumber: issue.number });

    swarm.expireSignIns();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(agent(ada.id)).toMatchObject({ status: 'preparing', needsSignIn: true, issueNumber: issue.number });

    v.type('code again\r');
    await vi.advanceTimersByTimeAsync(5_000);
    expect(agent(ada.id)).toMatchObject({ status: 'working', needsSignIn: false, issueNumber: issue.number });
  });

  it('needs no sign-in for an explicit Claude agent once the office has an Anthropic key', async () => {
    const { swarm, repo, agent } = await office();
    const ada = swarm.hireAgent(repo.id, { name: 'Ada', host: 'box', cli: 'claude', strict: true });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(agent(ada.id).needsSignIn).toBe(true);
    await swarm.setCloudToken('anthropic', 'sk-ant-api03-demo-key');
    await vi.advanceTimersByTimeAsync(1_000);
    expect(agent(ada.id).needsSignIn).toBe(false);
    await swarm.setCloudToken('anthropic', '');
  });

  it('only starts a sign-in for a cloud agent who needs one', async () => {
    const { swarm, repo } = await office();
    const lin = swarm.hireAgent(repo.id, { name: 'Lin', host: 'local', strict: true });
    expect(() => swarm.signIn(lin.id)).toThrow(/this computer/);
    expect(() => swarm.expireSignIns()).not.toThrow();
  });
});
