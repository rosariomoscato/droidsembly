import http from 'node:http';
import type { AddressInfo } from 'node:net';
import express from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createOfficeTools } from './ceo.ts';
import { handleOfficeMcp } from './mcpHttp.ts';
import { MCP_BODY_LIMIT, MCP_MAX_ELEMENTS } from './mcpInput.ts';

const servers: http.Server[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => {
    server.closeAllConnections();
    server.close(() => resolve());
  })));
});

async function fixture() {
  const profile = vi.fn(() => 'saved');
  const office = createOfficeTools({
    companyStatus: () => '{"offline":true}', agentDetail: () => '{}', setFloorProfile: profile,
    scaleTeam: () => '', configureAgent: () => '', fileIssue: async () => '', setDependencies: async () => '',
    closeIssue: async () => '', retryQa: async () => '', sendBack: async () => '', rerunChecks: async () => '',
    closePull: async () => '', escalate: async () => '',
  });
  const serve = vi.fn(() => office.serve());
  const app = express();
  // Fixture token map only. The actual session registry and office startup are not used.
  app.post('/mcp/:token', express.json({ limit: MCP_BODY_LIMIT }), (req, res, next) => {
    void handleOfficeMcp(req.params.token === 'valid' ? { serve } : undefined, req, res).catch(next);
  });
  app.use((error: { status?: number }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(error.status ?? 500).end();
  });
  const server = http.createServer(app);
  servers.push(server);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  return {
    serve, profile,
    post: (body: unknown, token = 'valid') => fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/mcp/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', 'MCP-Protocol-Version': '2025-03-26' },
      body: JSON.stringify(body),
    }),
  };
}

const call = (args: unknown) => ({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'set_floor_profile', arguments: args } });

describe('real office MCP HTTP handler with offline tools', () => {
  it('preserves missing-session precedence without constructing an MCP server', async () => {
    const f = await fixture();
    const res = await f.post(call({ preview_env: Array(MCP_MAX_ELEMENTS + 1).fill(0) }), 'ended');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ jsonrpc: '2.0', error: { code: -32001, message: 'This session has ended.' }, id: null });
    expect(f.serve).not.toHaveBeenCalled();
    expect(f.profile).not.toHaveBeenCalled();
  });

  it('rejects collection excess before constructing or executing tools, then still lists tools', async () => {
    const f = await fixture();
    const res = await f.post(call({ floor: 1, preview_env: Object.fromEntries(Array.from({ length: MCP_MAX_ELEMENTS }, (_, i) => [`K${i}`, 'v'])) }));
    expect(res.status).toBe(413);
    expect((await res.json()).error.code).toBe(-32600);
    expect(f.serve).not.toHaveBeenCalled();
    expect(f.profile).not.toHaveBeenCalled();
    const next = await f.post({ jsonrpc: '2.0', id: 3, method: 'tools/list' });
    expect(next.status).toBe(200);
    expect((await next.json()).result.tools.map((t: { name: string }) => t.name)).toContain('set_floor_profile');
    expect(f.serve).toHaveBeenCalledTimes(1);
  });

  it('preserves ordinary tool execution and fresh stateless servers per request', async () => {
    const f = await fixture();
    for (let i = 0; i < 2; i++) {
      const res = await f.post(call({ floor: 1, preview_env: { VITE_API: 'http://localhost:{port}' } }));
      expect(res.status).toBe(200);
      expect((await res.json()).result.isError).not.toBe(true);
    }
    expect(f.serve).toHaveBeenCalledTimes(2);
    expect(f.profile).toHaveBeenCalledTimes(2);
    expect(f.profile).toHaveBeenLastCalledWith({ floor: 1, preview_env: { VITE_API: 'http://localhost:{port}' } });
  });

  it('keeps SDK schema rejection before the business handler for bounded invalid input', async () => {
    const f = await fixture();
    const res = await f.post(call({ floor: 'not a number' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Boolean(body.error || body.result?.isError)).toBe(true);
    expect(f.serve).toHaveBeenCalledTimes(1);
    expect(f.profile).not.toHaveBeenCalled();
  });
});
