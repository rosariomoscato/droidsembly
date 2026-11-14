import { describe, expect, it, vi } from 'vitest';
import type { BoxApi, BoxInfo } from './box.ts';
import { Cloud, boxLabels } from './cloud.ts';

const box = (): BoxInfo => ({ id: 'synthetic-box', name: 'synthetic', labels: boxLabels('abc123', 'deadbeef'), status: 'running' });
async function office(api: Partial<BoxApi>, machines = () => new Set<string>()) {
  const cloud = new Cloud({ secretsFile: 'never-read', credentials: { upstashBoxKey: 'synthetic', cloudGithubToken: 'synthetic' },
    env: {}, boxes: () => api as BoxApi, ghToken: async () => { throw new Error('Ambient credentials forbidden'); },
    office: () => 'abc123', machines, changed: () => {}, log: () => {} });
  await cloud.init();
  return cloud;
}

describe('verified orphan Box removal (fake API, no resources)', () => {
  it('does not call an accepted delete confirmed while the exact resource is still present', async () => {
    const b = box(), remove = vi.fn(async () => {}), get = vi.fn(async () => b);
    const cloud = await office({ list: async () => [b], remove, get });
    expect(await cloud.deleteOrphans()).toEqual({ deleted: 0, unconfirmed: 1 });
    expect(remove).toHaveBeenCalledExactlyOnceWith(b.id);
    expect(get).toHaveBeenCalledExactlyOnceWith(b.id);
  });

  it('requires both exact absence and a successful final inventory, without retry', async () => {
    const b = box(), remove = vi.fn(async () => {}), get = vi.fn(async () => null);
    const cloud = await office({ list: async () => [b], remove, get });
    expect(await cloud.deleteOrphans()).toEqual({ deleted: 0, unconfirmed: 1 });
    expect(remove).toHaveBeenCalledOnce();
  });

  it('counts verified absence only, not an unavailable confirmation API', async () => {
    const b = box(); let present = true;
    const remove = vi.fn(async () => { present = false; });
    const cloud = await office({ list: async () => present ? [b] : [], remove, get: async () => { throw new Error('synthetic transport failure'); } });
    expect(await cloud.deleteOrphans()).toEqual({ deleted: 0, unconfirmed: 1 });
    expect(remove).toHaveBeenCalledOnce();
  });

  it('confirms an exact missing resource and final inventory', async () => {
    const b = box(); let present = true;
    const cloud = await office({ list: async () => present ? [b] : [], remove: async () => { present = false; }, get: async () => null });
    expect(await cloud.deleteOrphans()).toEqual({ deleted: 1, unconfirmed: 0 });
  });

  it('never deletes a Box without the application ownership marker', async () => {
    const b = { ...box(), labels: ['cf:abc123', 'm:deadbeef'] }, remove = vi.fn();
    const cloud = await office({ list: async () => [b], remove });
    expect(await cloud.deleteOrphans()).toEqual({ deleted: 0, unconfirmed: 0 });
    expect(remove).not.toHaveBeenCalled();
  });

  it('rechecks agent ownership after asynchronous inventory before deleting', async () => {
    const b = box(), remove = vi.fn(); let managed = new Set<string>();
    const cloud = await office({ list: async () => { managed = new Set(['deadbeef']); return [b]; }, remove }, () => managed);
    expect(await cloud.deleteOrphans()).toEqual({ deleted: 0, unconfirmed: 0 });
    expect(remove).not.toHaveBeenCalled();
  });
});
