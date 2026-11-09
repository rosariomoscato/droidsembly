import { describe, expect, it } from 'vitest';
import { connectionArgs, sanitizeConnections } from './opencodeConnections.ts';

const raw = { data: [{ id: 'openai', name: 'OpenAI', metadata: { secret: 'hidden' }, methods: [
  { id: 'provider-device-code', type: 'oauth', label: 'Subscription device login', form: { secret: 'hidden' } },
  { type: 'key', label: 'API key' }, { type: 'env', names: ['SECRET_API_KEY'] },
  { id: 'native', type: 'external', label: 'Native profile' }, { id: 'helper', type: 'command', label: 'Provider helper', command: ['secret-command'] },
], connections: [
  { id: 'cred-work', type: 'credential', label: 'Work', method: 'oauth', token: 'hidden', active: true },
  { id: 'cred-api', type: 'credential', label: 'API account', method: 'key', status: { status: 'needs_auth', message: 'hidden', url: 'hidden' } },
  { type: 'env', name: 'OPENAI_API_KEY', key: 'hidden' },
] }] };

describe('OpenCode connection metadata and choices', () => {
  it('projects explicit public fields, not credentials, commands, forms or a fabricated active account', () => {
    const integrations = sanitizeConnections(raw);
    expect(integrations[0].methods.map(m => m.type)).toEqual(['oauth', 'key', 'env', 'external', 'command']);
    expect(integrations[0].connections).toEqual([
      { id: 'cred-work', label: 'Work', method: 'oauth', environment: false, needsAuth: false },
      { id: 'cred-api', label: 'API account', method: 'key', environment: false, needsAuth: true },
      { id: 'OPENAI_API_KEY', label: 'OPENAI_API_KEY', method: 'env', environment: true, needsAuth: false },
    ]);
    expect(JSON.stringify(integrations)).not.toMatch(/hidden|secret-command|active|form|token/);
  });
  it('uses discovered provider-specific method IDs and explicit saved account IDs', () => {
    const integrations = sanitizeConnections(raw);
    expect(connectionArgs(integrations, { action: 'login', integration: 'openai', method: 'provider-device-code' })).toEqual(['auth', 'login', 'openai', '--method', 'provider-device-code']);
    expect(connectionArgs(integrations, { action: 'login', integration: 'openai', method: 'key' })).toEqual(['auth', 'login', 'openai', '--method', 'key']);
    expect(connectionArgs(integrations, { action: 'switch', integration: 'openai', account: 'cred-work' })).toEqual(['auth', 'switch', 'openai', 'cred-work']);
  });
  it.each([
    null, {}, { action: 'login', integration: 'unknown', method: 'key' },
    { action: 'login', integration: 'openai', method: 'invented-oauth' },
    { action: 'login', integration: 'openai', method: 'env' },
    { action: 'switch', integration: 'openai', account: 'OPENAI_API_KEY' },
    { action: 'switch', integration: 'openai', account: 'different-host-account' },
    { action: 'login', integration: 'openai', method: 'key', key: 'must-not-be-accepted' },
    { action: 'logout', integration: 'openai', account: 'cred-work' },
  ])('rejects unsupported, ambient, cross-host and secret-bearing actions: %j', input => {
    expect(() => connectionArgs(sanitizeConnections(raw), input)).toThrow();
  });
  it('fails closed for malformed inventories and drops malformed entries', () => {
    expect(() => sanitizeConnections({ data: {} })).toThrow('Invalid');
    expect(sanitizeConnections({ data: [null, {}, { id: 'x', name: 'X', methods: [null, { type: 'unexpected' }], connections: [null, { type: 'credential', id: 'x', label: 'X' }] }] })).toEqual([{ id: 'x', name: 'X', methods: [], connections: [] }]);
  });
  it('does not interpret identifiers as shell commands or allow option injection', () => {
    const integrations = sanitizeConnections({ data: [{ id: '--evil', name: 'Bad', methods: [{ type: 'key' }], connections: [] }] });
    expect(() => connectionArgs(integrations, { action: 'login', integration: '--evil', method: 'key' })).toThrow();
  });
});
