import http from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { afterEach, describe, expect, it } from 'vitest';
import { MCP_BODY_LIMIT, MCP_MAX_ELEMENTS, mcpInputWithinBounds } from './mcpInput.ts';

const servers: http.Server[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => {
    server.closeAllConnections();
    server.close(() => resolve());
  })));
});

// Isolated HTTP boundary fixture, not the office/router or a provider connection.
async function fixture() {
  const app = express();
  let validations = 0;
  app.post('/mcp', express.json({ limit: MCP_BODY_LIMIT }), (req, res) => {
    if (!mcpInputWithinBounds(req.body)) {
      res.status(413).end();
      return;
    }
    validations++;
    res.json({ accepted: true });
  });
  app.use((error: { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(error.status ?? 500).end();
  });
  const server = http.createServer(app);
  servers.push(server);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  return {
    post: (body: unknown) => fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/mcp`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    }),
    validations: () => validations,
  };
}

describe('MCP parser and collection bounds over loopback HTTP', () => {
  it('rejects a wide input below the byte limit before validation, then recovers', async () => {
    const f = await fixture();
    expect((await f.post({ arguments: Array(MCP_MAX_ELEMENTS + 1).fill(0) })).status).toBe(413);
    expect(f.validations()).toBe(0);
    expect((await f.post({ method: 'tools/list' })).status).toBe(200);
    expect(f.validations()).toBe(1);
  });

  it('rejects oversized strings even though their collection count is small', async () => {
    const f = await fixture();
    expect((await f.post({ arguments: { text: 'x'.repeat(1024 * 1024) } })).status).toBe(413);
    expect(f.validations()).toBe(0);
  });

  it('retains room for maximum issue text including multibyte characters', async () => {
    const f = await fixture();
    expect((await f.post({ method: 'tools/call', params: { name: 'create_issue', arguments: { floor: 1, title: 'x'.repeat(120), body: '界'.repeat(6000) } } })).status).toBe(200);
  });
});
