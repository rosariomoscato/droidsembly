import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { scanClientSources } from './clientSourcePolicy.ts';

const roots: string[] = [];
afterEach(() => {
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
});
