import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { scanClientSources, type SourceScanObservation } from './clientSourcePolicy.ts';

const roots: string[] = [];
afterEach(() => {
  vi.restoreAllMocks();
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});
function fixture() {
  const parent = path.join(os.tmpdir(), 'opencode');
  fs.mkdirSync(parent, { recursive: true });
  const root = fs.mkdtempSync(path.join(parent, 'client-source-policy-'));
  roots.push(root);
  return root;
}
function write(root: string, name: string, text: string) {
  const file = path.join(root, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

describe('client source-policy scan coverage', () => {
  it('reports timings without changing coverage/results or exposing file contents', async () => {
    const root = fixture();
    write(root, '.hidden.ts', 'safe marker content');
    write(root, 'nested/check.js', 'push.json');
    write(root, 'ignored.mjs', 'secrets.json');
    const observations: SourceScanObservation[] = [];
    const plain = await scanClientSources(root);
    const traced = await scanClientSources(root, (event) => observations.push(event));
    expect(traced).toEqual(plain);
    expect(traced.violations).toEqual([path.join('nested', 'check.js')]);
    expect(observations.map((event) => event.phase)).toEqual(['enumeration', 'selection', 'file', 'file']);
    expect(observations.filter((event) => event.phase === 'file').map((event) => event.file)).toEqual(plain.files);
    for (const event of observations) expect(event.ms).toBeGreaterThanOrEqual(0);
    expect(JSON.stringify(observations)).not.toContain('safe marker content');
    expect(JSON.stringify(observations)).not.toContain('push.json');
  });

  it('enumerates exactly the legacy extension set, including hidden and untracked fixture files', async () => {
    const root = fixture();
    for (const name of ['a.ts', 'b.tsx', 'c.js', 'd.html', 'e.json', 'f.webmanifest', '.hidden.js', 'nested/untracked.ts', 'ignored.png', 'ignored.mjs', 'ignored.TS']) write(root, name, 'safe');
    const legacy = (fs.readdirSync(root, { recursive: true }) as string[]).filter(file => /\.(tsx?|js|html|json|webmanifest)$/.test(file)).sort();
    const result = await scanClientSources(root);
    expect(result.files).toEqual(legacy);
    expect(result.violations).toEqual([]);
  });

  it.each(['secrets.json', 'push.json', "from '../server/private.ts'", "from '../../../server/private.ts'"])('detects the unchanged forbidden expression: %s', async text => {
    const root = fixture();
    write(root, 'nested/source.ts', text);
    expect((await scanClientSources(root)).violations).toEqual([path.join('nested', 'source.ts')]);
  });

  it('checks every file across all batches and retains all violating paths', async () => {
    const root = fixture();
    for (let i = 0; i < 25; i++) write(root, `source-${String(i).padStart(2, '0')}.ts`, [0, 8, 16, 24].includes(i) ? 'secrets.json' : 'safe');
    const result = await scanClientSources(root);
    expect(result.files).toHaveLength(25);
    expect(result.violations).toEqual(['source-00.ts', 'source-08.ts', 'source-16.ts', 'source-24.ts']);
  });

  it('reads fresh contents on every invocation, without caching an earlier safe result', async () => {
    const root = fixture();
    write(root, 'source.ts', 'safe');
    expect((await scanClientSources(root)).violations).toEqual([]);
    write(root, 'source.ts', 'push.json');
    expect((await scanClientSources(root)).violations).toEqual(['source.ts']);
  });

  it('fails closed for missing roots and read errors', async () => {
    const root = fixture();
    await expect(scanClientSources(path.join(root, 'absent'))).rejects.toThrow();
    fs.mkdirSync(path.join(root, 'directory.json'));
    await expect(scanClientSources(root)).rejects.toThrow();
  });

  it('fails closed rather than skipping linked source trees', async () => {
    const root = fixture();
    const target = path.join(root, 'target');
    fs.mkdirSync(target);
    fs.symlinkSync(target, path.join(root, 'linked'), 'junction');
    await expect(scanClientSources(root)).rejects.toThrow(/symbolic links/);
  });

  it('reads at most eight files before yielding, without dropping any file', async () => {
    const root = fixture();
    for (let i = 0; i < 19; i++) write(root, `f${String(i).padStart(2, '0')}.ts`, i === 18 ? 'push.json' : 'safe');
    const read = vi.spyOn(fs, 'readFileSync');
    const pending = scanClientSources(root);
    expect(read).toHaveBeenCalledTimes(8);
    // Registered after the first yield: this runs before the third batch.
    await new Promise((resolve) => setImmediate(resolve));
    expect(read).toHaveBeenCalledTimes(16);
    const result = await pending;
    expect(result.files).toHaveLength(19);
    expect(result.violations).toEqual(['f18.ts']);
    expect(read).toHaveBeenCalledTimes(19);
  });

  it('leaves no reads or observer callbacks running after a read failure', async () => {
    const root = fixture();
    for (let i = 0; i < 10; i++) write(root, `${i}.ts`, 'safe');
    const failure = new Error('synthetic read failure');
    const original = fs.readFileSync.bind(fs);
    const read = vi.spyOn(fs, 'readFileSync').mockImplementationOnce(original).mockImplementationOnce(() => { throw failure; });
    const observe = vi.fn();
    const pending = scanClientSources(root, observe);
    await expect(pending).rejects.toBe(failure);
    expect(read).toHaveBeenCalledTimes(2);
    expect(observe.mock.calls.map(([event]) => event.phase)).toEqual(['enumeration', 'selection', 'file']);
    await new Promise((resolve) => setImmediate(resolve));
    expect(read).toHaveBeenCalledTimes(2);
    expect(observe).toHaveBeenCalledTimes(3);
  });
});
