import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const registry = 'https://registry.npmjs.org';
export const publicationBudgetMs = 300_000;

function endpoint(name, suffix = '') {
  assert.equal(name, 'droidsembly', 'Only this public package may be verified');
  return `${registry}/${encodeURIComponent(name)}${suffix}`;
}

async function request(url, fetcher, budgetMs = 10_000) {
  const response = await fetcher(url, {
    headers: { 'Cache-Control': 'no-cache' },
    redirect: 'error',
    signal: AbortSignal.timeout(Math.max(1, Math.min(10_000, budgetMs))),
  });
  assert.ok(response.ok || response.status === 404, `Registry HTTP ${response.status}`);
  return response;
}

export function integrity(bytes) {
  return 'sha512-' + createHash('sha512').update(bytes).digest('base64');
}

export async function capturePublication(expected, fetcher = fetch) {
  const version = await request(endpoint(expected.name, '/' + encodeURIComponent(expected.version)), fetcher);
  assert.equal(version.status, 404, 'Version already exists: do not republish or rerun Release');
  const tags = await request(`${registry}/-/package/${encodeURIComponent(expected.name)}/dist-tags`, fetcher);
  assert.equal(tags.status, 200, 'Cannot snapshot current channels');
  const previousChannels = await tags.json();
  assert.equal(typeof previousChannels.latest, 'string');
  return { ...expected, previousChannels };
}

export async function inspectPublication(expected, fetcher = fetch, budgetMs = 30_000) {
  const started = performance.now();
  const remaining = () => Math.max(1, budgetMs - (performance.now() - started));
  const versionResponse = await request(endpoint(expected.name, '/' + encodeURIComponent(expected.version)), fetcher, remaining());
  if (versionResponse.status === 404) return { available: false, reason: 'version-not-visible' };
  const version = await versionResponse.json();
  assert.equal(version.name, expected.name);
  assert.equal(version.version, expected.version);
  assert.equal(version.gitHead, expected.gitHead, 'Published source commit differs');
  assert.equal(version.dist?.integrity, expected.integrity, 'Published integrity differs from exact packed artifact');
  const tarball = new URL(version.dist.tarball);
  assert.equal(tarball.origin, registry, 'Refuse non-registry artifact URLs');
  assert.equal(tarball.pathname, `/droidsembly/-/droidsembly-${expected.version}.tgz`);
  assert.equal(tarball.search, '');
  assert.equal(tarball.hash, '');
  assert.equal(tarball.username + tarball.password, '');
  const tagsResponse = await request(`${registry}/-/package/${encodeURIComponent(expected.name)}/dist-tags`, fetcher, remaining());
  assert.equal(tagsResponse.status, 200);
  const channels = await tagsResponse.json();
  if (expected.channel !== 'latest') assert.equal(channels.latest, expected.previousChannels.latest, 'latest changed during prerelease publication');
  if (channels[expected.channel] !== expected.version) return { available: false, reason: 'channel-not-visible', channels };
  // Use the canonical URL, never cache-busting query parameters, to test what npm installs.
  const response = await request(tarball.href, fetcher, remaining());
  if (response.status === 404) return { available: false, reason: 'tarball-not-visible', channels };
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      assert.ok(size <= expected.size, 'Public tarball exceeds exact artifact size');
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  const bytes = Buffer.concat(chunks);
  assert.equal(bytes.length, expected.size, 'Public tarball size differs');
  assert.equal(integrity(bytes), expected.integrity, 'Public tarball bytes differ');
  return { available: true, channels, bytes, sha256: createHash('sha256').update(bytes).digest('hex') };
}

export async function waitForPublication(expected, {
  fetcher = fetch,
  now = () => performance.now(),
  sleep = ms => new Promise(resolve => setTimeout(resolve, ms)),
  observe = () => {},
} = {}) {
  const deadline = now() + publicationBudgetMs;
  for (let attempt = 1; ; attempt++) {
    const left = deadline - now();
    if (left <= 0) throw new Error('Publication accepted but public availability not confirmed within five minutes. Do not republish or rerun Release; inspect registry state read-only.');
    const result = await inspectPublication(expected, fetcher, left);
    observe({ attempt, available: result.available, reason: result.reason, channels: result.channels });
    assert.ok(now() <= deadline, 'Availability observation exceeded its five-minute budget');
    if (result.available) return result;
    await sleep(Math.min(30_000, Math.max(0, deadline - now())));
  }
}
