import { describe, expect, it } from 'vitest';
import { MCP_MAX_DEPTH, MCP_MAX_ELEMENTS, mcpInputWithinBounds } from './mcpInput.ts';

describe('MCP prevalidation work budget', () => {
  it('accepts ordinary tool calls, initialization and maximum-sized issue text', () => {
    for (const body of [
      { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'offline', version: '1' } } },
      { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'create_issue', arguments: { floor: 1, title: 'x'.repeat(120), body: 'x'.repeat(6000) } } },
      { jsonrpc: '2.0', method: 'notifications/initialized' },
    ]) expect(mcpInputWithinBounds(body)).toBe(true);
  });

  it('enforces the exact array-slot boundary', () => {
    expect(mcpInputWithinBounds(Array(MCP_MAX_ELEMENTS).fill(0))).toBe(true);
    expect(mcpInputWithinBounds(Array(MCP_MAX_ELEMENTS + 1).fill(0))).toBe(false);
  });

  it('counts object keys including prototype-like JSON keys', () => {
    const body = Object.fromEntries(Array.from({ length: MCP_MAX_ELEMENTS }, (_, i) => [String(i), null]));
    expect(mcpInputWithinBounds(body)).toBe(true);
    expect(mcpInputWithinBounds({ ...body, ...JSON.parse('{"__proto__":0}') })).toBe(false);
  });

  it('counts nested collections together, not just each individual array', () => {
    expect(mcpInputWithinBounds({ a: Array(5000).fill(0), b: Array(5000).fill(0) })).toBe(false);
  });

  it('covers unknown envelope fields and batches', () => {
    const call = { jsonrpc: '2.0', method: 'tools/list', extra: Array(5000).fill(0) };
    expect(mcpInputWithinBounds(call)).toBe(true);
    expect(mcpInputWithinBounds([call, call])).toBe(false);
  });

  it('bounds depth without overflowing the JavaScript stack', () => {
    let body: unknown = {};
    for (let i = 0; i < MCP_MAX_DEPTH; i++) body = { child: body };
    expect(mcpInputWithinBounds(body)).toBe(true);
    expect(mcpInputWithinBounds({ child: body })).toBe(false);
    for (let i = 0; i < 20_000; i++) body = [body];
    expect(mcpInputWithinBounds(body)).toBe(false);
  });

  it('does not mutate parsed arguments', () => {
    const body = Object.freeze({ params: Object.freeze({ arguments: Object.freeze({ depends_on: Object.freeze([1, 2]) }) }) });
    expect(mcpInputWithinBounds(body)).toBe(true);
  });
});
