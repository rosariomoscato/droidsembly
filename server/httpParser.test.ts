// Exercise Express's installed parser on a disposable loopback server, never the office or its state.
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Transform } from 'node:stream';
import { brotliCompressSync, deflateSync, gzipSync } from 'node:zlib';
import express from 'express';
import { afterEach, describe, expect, it } from 'vitest';

const servers: http.Server[] = [];
const compress = { gzip: gzipSync, deflate: deflateSync, br: brotliCompressSync };

afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => {
    server.closeAllConnections();
    server.close(() => resolve());
  })));
});

async function fixture(limit = '1mb') {
  const app = express();
  const decoders: Transform[] = [];
  app.use((req, _res, next) => {
    const pipe = req.pipe.bind(req);
    req.pipe = ((destination: NodeJS.WritableStream, options?: { end?: boolean }) => {
      decoders.push(destination as Transform);
      return pipe(destination, options);
    }) as typeof req.pipe;
    next();
  });
  app.use(express.json({ limit }));
  app.post('/probe', (req, res) => res.json(req.body));
  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use((error: { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(error.status ?? 500).json({ rejected: true });
  });
  const server = http.createServer(app);
  servers.push(server);
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return { url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, decoders };
}

function post(url: string, body: Buffer, encoding = 'identity') {
  return fetch(url + '/probe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Encoding': encoding },
    body: new Uint8Array(body).buffer,
  });
}

describe('HTTP JSON parser compatibility and decoder lifecycle', () => {
  it.each(['1mb', '4mb', '64mb'])('keeps ordinary JSON working with the office limit %s', async limit => {
    const { url } = await fixture(limit);
    const response = await post(url, Buffer.from(JSON.stringify({ message: 'demo', count: 3 })));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: 'demo', count: 3 });
  });

  it.each(['gzip', 'deflate', 'br'] as const)('parses a valid %s body without changing the JSON', async encoding => {
    const { url } = await fixture();
    const body = { message: 'simulated hook', image: 'not a real screenshot' };
    const response = await post(url, compress[encoding](Buffer.from(JSON.stringify(body))), encoding);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(body);
  });

  it.each(['gzip', 'deflate', 'br'] as const)('handles a late %s decoder error after successful parsing', async encoding => {
    const { url, decoders } = await fixture();
    const response = await post(url, compress[encoding](Buffer.from('{"ok":true}')), encoding);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(decoders).toHaveLength(1);
    // Reproduce the advisory's late-error lifecycle deterministically, without crashing the test worker.
    expect(() => decoders[0].emit('error', new Error('late decompression error'))).not.toThrow();
    expect(decoders[0].destroyed).toBe(true);
    expect((await fetch(url + '/health')).status).toBe(200);
  });

  it('rejects malformed JSON and continues serving requests', async () => {
    const { url } = await fixture();
    expect((await post(url, Buffer.from('{broken'))).status).toBe(400);
    expect((await fetch(url + '/health')).status).toBe(200);
  });

  it('preserves the decompressed size limit and remains healthy after rejection', async () => {
    const { url } = await fixture();
    const body = gzipSync(Buffer.from(JSON.stringify({ text: 'x'.repeat(1024 * 1024) })));
    expect((await post(url, body, 'gzip')).status).toBe(413);
    expect((await fetch(url + '/health')).status).toBe(200);
  });

  it('rejects malformed compressed bytes and continues serving requests', async () => {
    const { url } = await fixture();
    expect((await post(url, Buffer.from('not compressed'), 'gzip')).status).toBe(400);
    expect((await fetch(url + '/health')).status).toBe(200);
  });
});
