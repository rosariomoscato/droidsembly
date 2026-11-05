import fs from 'node:fs/promises';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDemoBackend } from './demo.ts';
import { Swarm } from './swarm.ts';

const { home } = vi.hoisted(() => ({ home: `${process.env.SWARM_HOME}/state-shutdown-${process.pid}` }));
vi.mock('./config.ts', async (original) => ({
  ...await original<typeof import('./config.ts')>(),
  HOME_DIR: home, STATE_FILE: `${home}/state.json`, WORKSPACE_ROOT: `${home}/workspaces`,
}));

let swarm: Swarm | undefined;
afterEach(async () => {
  // Even on the old implementation, do not leave a delayed writer behind when
  // removing the fixture. The private writer is used only for fault-test cleanup.
  if (swarm) {
    await (swarm as unknown as { writeState(): Promise<void> }).writeState();
    swarm = undefined;
  }
  vi.restoreAllMocks();
  await fs.rm(home, { recursive: true, force: true });
});

describe('state persistence at shutdown', () => {
  it('persists changes made during CLI release and leaves no delayed save after shutdown', async () => {
    const backend = createDemoBackend();
    swarm = new Swarm(backend);
    const current = swarm;
    const release = vi.spyOn(backend, 'releaseClis').mockImplementation(async () => {
      current.updateSettings({ language: 'it' });
    });
    await current.shutdown();
    expect(release).toHaveBeenCalledTimes(1);
    const saved = JSON.parse(await fs.readFile(`${home}/state.json`, 'utf8'));
    expect(saved.settings.language).toBe('it');
    expect((current as unknown as { saveTimer: unknown }).saveTimer).toBeNull();
  });

  it('does not arm a new state write when a callback arrives after shutdown', async () => {
    swarm = new Swarm(createDemoBackend());
    await swarm.shutdown();
    const before = await fs.readFile(`${home}/state.json`, 'utf8');
    // A stale callback can still mutate its old in-memory object, but must not
    // race a replacement office's state file after shutdown has returned.
    swarm.updateSettings({ language: 'it' });
    expect((swarm as unknown as { saveTimer: unknown }).saveTimer).toBeNull();
    expect(await fs.readFile(`${home}/state.json`, 'utf8')).toBe(before);
  });

  it('shares one shutdown across repeated calls and retains the first restart choice', async () => {
    const backend = createDemoBackend();
    swarm = new Swarm(backend);
    let unblock!: () => void;
    const gate = new Promise<void>((resolve) => { unblock = resolve; });
    const release = vi.spyOn(backend, 'releaseClis').mockImplementation(() => gate);
    const first = swarm.shutdown(true);
    const second = swarm.shutdown(false);
    try {
      expect(second).toBe(first);
    } finally {
      unblock();
      await Promise.all([first, second]);
    }
    expect(release).toHaveBeenCalledExactlyOnceWith(true);
    expect(swarm.shutdown()).toBe(first);
  });

  it('persists cleanup-time changes even when resource release rejects, without hiding the failure', async () => {
    const backend = createDemoBackend();
    swarm = new Swarm(backend);
    const current = swarm;
    vi.spyOn(backend, 'releaseClis').mockImplementation(async () => {
      current.updateSettings({ language: 'it' });
      throw new Error('synthetic release failure');
    });
    await expect(current.shutdown()).rejects.toThrow('synthetic release failure');
    expect(JSON.parse(await fs.readFile(`${home}/state.json`, 'utf8')).settings.language).toBe('it');
    expect((current as unknown as { saveTimer: unknown }).saveTimer).toBeNull();
  });
});
