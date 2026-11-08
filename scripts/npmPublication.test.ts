import fs from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { capturePublication, inspectPublication, integrity, publicationBudgetMs, waitForPublication } from './npmPublication.mjs';

const bytes = Buffer.from('exact synthetic release artifact, not a real package');
const expected = { name: 'droidsembly', version: '0.4.0-beta.4', channel: 'next', gitHead: 'a'.repeat(40), integrity: integrity(bytes), size: bytes.length, previousChannels: { latest: '0.4.0-beta.1', next: '0.4.0-beta.3' } };
const channels = { latest: expected.previousChannels.latest, next: expected.version };
const tarball = `https://registry.npmjs.org/droidsembly/-/droidsembly-${expected.version}.tgz`;
const version = { name: expected.name, version: expected.version, gitHead: expected.gitHead, dist: { integrity: expected.integrity, tarball } };
const json = (value: unknown) => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/json' } });
function fixture(overrides: { version?: unknown; channels?: unknown; tarballStatus?: number; artifact?: Buffer } = {}) {
  return vi.fn<typeof fetch>(async input => {
    const url = String(input);
    if (url.endsWith('/dist-tags')) return json(overrides.channels ?? channels);
    if (url === tarball) return new Response(new Uint8Array(overrides.artifact ?? bytes), { status: overrides.tarballStatus ?? 200 });
    if (url.endsWith('/' + expected.version)) return json(overrides.version ?? version);
    throw new Error('Unexpected network endpoint: ' + url);
  });
}

describe('read-only npm publication availability', () => {
  it('captures channels only when the target version is absent', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response('', { status: 404 })).mockResolvedValueOnce(json(expected.previousChannels));
    expect(await capturePublication(expected, fetcher)).toEqual(expected);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('refuses an already published version before any publish operation', async () => {
    const fetcher = fixture();
    await expect(capturePublication(expected, fetcher)).rejects.toThrow('Version already exists');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('verifies canonical bytes, exact integrity, source commit and channels without auth or query bypass', async () => {
    const fetcher = fixture();
    const result = await inspectPublication(expected, fetcher);
    expect(result.available).toBe(true);
    expect(result.bytes).toEqual(bytes);
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(fetcher).toHaveBeenCalledTimes(3);
    for (const [url, options] of fetcher.mock.calls) {
      expect(String(url)).not.toContain('?');
      expect(options?.headers).toEqual({ 'Cache-Control': 'no-cache' });
      expect(options?.redirect).toBe('error');
      expect(options?.method).toBeUndefined();
      expect(options?.signal).toBeInstanceOf(AbortSignal);
    }
  });

  it('keeps a missing version pending instead of declaring publish success', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status: 404 }));
    expect(await inspectPublication(expected, fetcher)).toEqual({ available: false, reason: 'version-not-visible' });
  });

  it('keeps visible metadata with an old channel pending without downloading', async () => {
    const fetcher = fixture({ channels: expected.previousChannels });
    expect(await inspectPublication(expected, fetcher)).toMatchObject({ available: false, reason: 'channel-not-visible' });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('keeps visible metadata and channel with a canonical tarball 404 pending', async () => {
    expect(await inspectPublication(expected, fixture({ tarballStatus: 404 }))).toMatchObject({ available: false, reason: 'tarball-not-visible' });
  });

  it('rejects wrong package identity, version, source commit or integrity immediately', async () => {
    for (const bad of [{ ...version, name: 'another' }, { ...version, version: '0.4.0-beta.3' }, { ...version, gitHead: 'b'.repeat(40) }, { ...version, dist: { ...version.dist, integrity: 'sha512-wrong' } }]) {
      const fetcher = fixture({ version: bad });
      await expect(inspectPublication(expected, fetcher)).rejects.toThrow();
      expect(fetcher).toHaveBeenCalledTimes(1);
    }
  });

  it('rejects external, redirected-looking, noncanonical and query-string artifact URLs', async () => {
    for (const url of ['http://registry.npmjs.org/a.tgz', 'https://example.invalid/a.tgz', tarball + '?cache=bypass', tarball + '#fragment', tarball.replace('droidsembly-0.4', 'another-0.4'), tarball.replace('https://', 'https://user@')]) {
      const fetcher = fixture({ version: { ...version, dist: { ...version.dist, tarball: url } } });
      await expect(inspectPublication(expected, fetcher)).rejects.toThrow();
      expect(fetcher).toHaveBeenCalledTimes(1);
    }
  });

  it('fails closed if latest changes during prerelease publication', async () => {
    await expect(inspectPublication(expected, fixture({ channels: { ...channels, latest: expected.version } }))).rejects.toThrow('latest changed');
  });

  it('allows the intentional latest change for a stable release', async () => {
    expect((await inspectPublication({ ...expected, channel: 'latest' }, fixture({ channels: { ...channels, latest: expected.version } }))).available).toBe(true);
  });

  it('rejects altered, truncated and oversized public bytes', async () => {
    for (const artifact of [Buffer.alloc(bytes.length), bytes.subarray(0, -1), Buffer.concat([bytes, Buffer.from('extra')])]) {
      await expect(inspectPublication(expected, fixture({ artifact }))).rejects.toThrow();
    }
  });

  it('does not interpret authorization, rate-limit or server errors as processing delay', async () => {
    for (const status of [401, 403, 429, 500]) {
      await expect(inspectPublication(expected, vi.fn<typeof fetch>().mockResolvedValue(new Response('', { status })))).rejects.toThrow(`HTTP ${status}`);
    }
  });

  it('observes only read requests and succeeds after concrete availability changes', async () => {
    let clock = 0;
    const fetcher = fixture();
    fetcher.mockResolvedValueOnce(new Response('', { status: 404 }));
    const observe = vi.fn();
    const sleep = vi.fn(async (ms: number) => { clock += ms; });
    const result = await waitForPublication(expected, { fetcher, now: () => clock, sleep, observe });
    expect(result.available).toBe(true);
    expect(sleep).toHaveBeenCalledExactlyOnceWith(30_000);
    expect(observe.mock.calls.map(([x]) => x.available)).toEqual([false, true]);
  });

  it('stops after the fixed five-minute budget with explicit partial-publication guidance', async () => {
    let clock = 0;
    const fetcher = vi.fn<typeof fetch>(async () => new Response('', { status: 404 }));
    await expect(waitForPublication(expected, { fetcher, now: () => clock, sleep: async ms => { clock += ms; } })).rejects.toThrow('Do not republish or rerun Release');
    expect(clock).toBe(publicationBudgetMs);
    expect(publicationBudgetMs).toBe(300_000);
    expect(fetcher).toHaveBeenCalledTimes(10);
  });

  it('never retries an integrity failure as if it were processing delay', async () => {
    const fetcher = fixture({ artifact: Buffer.alloc(bytes.length) });
    const sleep = vi.fn();
    await expect(waitForPublication(expected, { fetcher, sleep })).rejects.toThrow('Public tarball bytes differ');
    expect(sleep).not.toHaveBeenCalled();
  });

  it('refuses to probe another package', async () => {
    const fetcher = fixture();
    await expect(inspectPublication({ ...expected, name: 'another' }, fetcher)).rejects.toThrow('Only this public package');
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe('Release public availability ordering', () => {
  it('captures before a single publish and gates GitHub release on downloaded public smoke', () => {
    const workflow = fs.readFileSync('.github/workflows/release.yml', 'utf8');
    const capture = workflow.indexOf('node scripts/verify-npm-publication.mjs capture');
    const localSmoke = workflow.indexOf('node scripts/smoke-package.mjs "${{ steps.artifact.outputs.tarball }}"');
    const publish = workflow.indexOf('run: npm publish --ignore-scripts');
    const verify = workflow.indexOf('node scripts/verify-npm-publication.mjs verify');
    const publicSmoke = workflow.indexOf('node scripts/smoke-package.mjs "$RELEASE_EVIDENCE/public.tgz"');
    const release = workflow.indexOf('- name: Create fork release');
    expect(capture).toBeGreaterThan(0);
    expect(localSmoke).toBeGreaterThan(capture);
    expect(publish).toBeGreaterThan(localSmoke);
    expect(verify).toBeGreaterThan(publish);
    expect(publicSmoke).toBeGreaterThan(verify);
    expect(release).toBeGreaterThan(publicSmoke);
    expect(workflow.match(/run: npm publish\b/g)).toHaveLength(1);
    expect(workflow).not.toContain('continue-on-error:');
    expect(workflow).toContain('if: always()');
    expect(workflow).toContain('uses: actions/upload-artifact@v4');
    expect(workflow.match(/timeout-minutes: 20/g)).toHaveLength(2);
  });
});
