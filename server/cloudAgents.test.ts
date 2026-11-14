import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { createDemoBackend } from './demo.ts';
import { fixtureWork } from '../scripts/fixtureWork.ts';

// Each file owns its persisted state; import only after selecting its home.
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'cubefarm-cloud-agents-'));
process.env.SWARM_HOME = home;
const { Swarm } = await import('./swarm.ts');
const fixtures: { swarm: InstanceType<typeof Swarm>; work: ReturnType<typeof fixtureWork> }[] = [];
let cleanupFailed = false;
afterEach(async () => {
  // A returned connectRepo is not a completed clone/sweep. Drain children too,
  // while Vitest's console RPC still belongs to this test, then flush/close.
  try {
    for (const { swarm, work } of fixtures.splice(0)) {
      await work.drain();
      await swarm.shutdown();
    }
  } catch (err) {
    cleanupFailed = true;
    throw err;
  } finally {
    vi.restoreAllMocks();
  }
});
afterAll(() => {
  if (!cleanupFailed) fs.rmSync(home, { recursive: true });
});

// Cloud agents (docs/cloud.md) in a demo office: its fake Upstash account takes any key. Agents work on this computer
// unless the manager connects Upstash and asks for the cloud; then they each get a Box.

async function office() {
  const swarm = new Swarm(createDemoBackend());
  const work = fixtureWork();
  fixtures.push({ swarm, work });
  // Observe real startup entry points without changing their result, clock,
  // workload or logging. These private methods deliberately launch children.
  const runtime = swarm as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>;
  for (const method of ['cloneRepo', 'syncRepo', 'sweepFloor', 'syncFolder', 'advanceMerges', 'lookUpIssueAges']) {
    const original = runtime[method].bind(swarm);
    vi.spyOn(runtime, method).mockImplementation((...args) => work.track(original(...args)));
  }
  const repo = await swarm.connectRepo('demo-co/pixel-todo'); // with its first agent
  const agents = () => swarm.snapshot().agents.filter((a) => a.repoId === repo.id);
  return { swarm, repo, agents };
}

describe('where agents work', () => {
  it('starts on this computer, and the cloud needs an Upstash key first', async () => {
    const { swarm, repo, agents } = await office();
    expect(swarm.snapshot().settings.cloud.machineKind).toBe('local');
    expect(agents()[0].host).toBe('local');
    expect(() => swarm.updateSettings({ cloud: { machineKind: 'box', boxSize: 'small', boxLimit: 10 } })).toThrow(/Upstash Box API key/);
    expect(() => swarm.hireAgent(repo.id, { host: 'box', strict: true })).toThrow(/Upstash Box API key/);
  });

  it('hires cloud agents once Upstash is connected, each with a Box of their own', async () => {
    const { swarm, repo, agents } = await office();
    await swarm.setCloudKey('demo-key');
    swarm.updateSettings({ cloud: { machineKind: 'box', boxSize: 'medium', boxLimit: 10 } });
    const ada = swarm.hireAgent(repo.id, { name: 'Ada', strict: true });
    expect(ada.host).toBe('box');
    expect(ada.cloud).toMatch(/none|creating/);
    const local = swarm.hireAgent(repo.id, { name: 'Lin', host: 'local', strict: true });
    expect(local.host).toBe('local');
    expect(agents().filter((a) => a.host === 'box').map((a) => a.name)).toEqual(['Ada']);
    // The key itself never reaches a tab.
    expect(JSON.stringify(swarm.snapshot())).not.toContain('demo-key');
  });

  it("supports OpenCode but refuses explicit cloud hires past the plan's Box limit without a local fallback", async () => {
    const { swarm, repo } = await office();
    await swarm.setCloudKey('demo-key');
    swarm.updateSettings({ cloud: { machineKind: 'box', boxSize: 'small', boxLimit: 1 } });
    expect(swarm.hireAgent(repo.id, { name: 'Ada', host: 'box', cli: 'opencode', strict: true }).host).toBe('box');
    expect(() => swarm.hireAgent(repo.id, { name: 'Bo', strict: true })).toThrow(/Box limit \(1\)/);
    expect(() => swarm.hireAgent(repo.id, { name: 'Bo', host: 'box', cli: 'opencode' })).toThrow(/Box limit \(1\)/);
    // A floor's own first agent isn't refused: they work on this computer instead.
    expect(swarm.hireAgent(repo.id, { name: 'Cy' }).host).toBe('local');
  });

  it('moves an idle agent to the cloud and back, starting their next session fresh', async () => {
    const { swarm, agents } = await office();
    await swarm.setCloudKey('demo-key');
    const first = agents()[0];
    swarm.updateAgent(first.id, { host: 'box' });
    expect(agents()[0].host).toBe('box');
    swarm.updateAgent(first.id, { cli: 'opencode' });
    expect(agents()[0]).toMatchObject({ host: 'box', cli: 'opencode' });
    swarm.updateAgent(first.id, { host: 'local' });
    expect(agents()[0].host).toBe('local');
  });

  it('turns the cloud default off when the key is removed', async () => {
    const { swarm } = await office();
    await swarm.setCloudKey('demo-key');
    swarm.updateSettings({ cloud: { machineKind: 'box', boxSize: 'small', boxLimit: 10 } });
    await swarm.setCloudKey('');
    expect(swarm.snapshot().settings.cloud.machineKind).toBe('local');
    expect(swarm.snapshot().cloud?.keySet).toBe(false);
  });
});
