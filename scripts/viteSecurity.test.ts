import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer, type ViteDevServer } from 'vite';
import { afterEach, describe, expect, it } from 'vitest';

const servers: ViteDevServer[] = [];
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => server.close()));
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

async function fixture() {
  const parent = path.join(os.tmpdir(), 'opencode');
  fs.mkdirSync(parent, { recursive: true });
  const root = fs.mkdtempSync(path.join(parent, 'droidsembly-vite-security-'));
  roots.push(root);
  fs.writeFileSync(path.join(root, 'package.json'), '{"type":"module"}');
  fs.writeFileSync(path.join(root, 'index.html'), '<script type="module">globalThis.__INERT_FIXTURE = true</script>');
  fs.writeFileSync(path.join(root, '.env'), 'UVWX=synthetic-not-a-secret');
  const server = await createServer({
    root, configFile: false, envFile: false, logLevel: 'silent', appType: 'custom',
    server: { middlewareMode: true, hmr: false, watch: null, fs: { strict: true, allow: [root] } },
    optimizeDeps: { noDiscovery: true },
  });
  servers.push(server);
  return server;
}

describe('offline Vite security boundaries', () => {
  it('does not generate a cross-origin inline-module proxy URL from an unchanged request path', async () => {
    const server = await fixture();
    // Text transformation only: never load the generated module or contact fixture.invalid.
    const html = await server.transformIndexHtml('//fixture.invalid/payload.js?/../../package.json', '<script type="module">globalThis.__INERT_FIXTURE = true</script>');
    expect(html).not.toMatch(/src=["']\/\/fixture\.invalid\//);
    expect(html).toContain('type="module"');
  });

  it('does not disclose denied file bytes through the Wasm error path', async () => {
    const server = await fixture();
    let message: string | undefined;
    try {
      await server.transformRequest('/.env?vite-wasm-instance');
    } catch (error) {
      message = String(error);
    }
    expect(message).toBeDefined();
    // UTF-8 bytes for the synthetic marker UVWX, not a real secret file.
    expect(message).not.toContain('55 56 57 58');
    expect(message).not.toContain('UVWX');
  });

  it('retains same-origin HTML module transformation', async () => {
    const server = await fixture();
    const html = await server.transformIndexHtml('/index.html', '<script type="module">globalThis.__INERT_FIXTURE = true</script>');
    expect(html).toContain('type="module"');
    expect(html).toContain('/@vite/client');
    expect(html).not.toContain('fixture.invalid');
  });
});
