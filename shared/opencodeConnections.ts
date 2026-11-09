/** Public metadata only. The API does not expose which saved account is active. */
export interface OpenCodeIntegration {
  id: string;
  name: string;
  methods: { id: string; type: 'key' | 'oauth' | 'command' | 'external' | 'env'; label: string }[];
  connections: { id: string; label: string; method: string; environment: boolean; needsAuth: boolean }[];
}
export interface OpenCodeConnections {
  integrations: OpenCodeIntegration[];
  scope: 'local' | 'box';
  scopeKey: string;
  configuringAgent: string | null;
}
export type OpenCodeConnectionAction =
  | { action: 'login'; integration: string; method: string }
  | { action: 'switch'; integration: string; account: string };

export function sanitizeConnections(value: unknown): OpenCodeIntegration[] {
  const data = (value as { data?: unknown })?.data;
  if (!Array.isArray(data)) throw new Error('Invalid OpenCode connections');
  const text = (v: unknown): v is string => typeof v === 'string' && !!v && v.length <= 512 && !/[\x00-\x1f\x7f]/.test(v);
  return data.flatMap((i) => {
    if (!i || !text(i.id) || !text(i.name) || !Array.isArray(i.methods) || !Array.isArray(i.connections)) return [];
    return [{ id: i.id, name: i.name,
      methods: i.methods.flatMap((m: Record<string, unknown>) => {
        if (!m || !['key', 'oauth', 'command', 'external', 'env'].includes(String(m.type))) return [];
        const id = m.type === 'key' || m.type === 'env' ? m.type : m.id;
        if (!text(id)) return [];
        return [{ id, type: m.type as OpenCodeIntegration['methods'][number]['type'], label: text(m.label) ? m.label : String(m.type) }];
      }),
      connections: i.connections.flatMap((c: Record<string, unknown>) => {
        if (!c || !['credential', 'env'].includes(String(c.type))) return [];
        const environment = c.type === 'env';
        const id = environment ? c.name : c.id;
        if (!text(id) || (!environment && (!text(c.label) || !['key', 'oauth', 'external'].includes(String(c.method))))) return [];
        return [{ id, label: environment ? id : c.label as string, method: environment ? 'env' : String(c.method), environment, needsAuth: !!c.status }];
      }),
    }];
  });
}

/** Only IDs returned by this host are accepted; no free-form command or secret input. */
export function connectionArgs(integrations: OpenCodeIntegration[], input: unknown): string[] {
  const a = input as Partial<OpenCodeConnectionAction>;
  if (!a || typeof a !== 'object') throw new Error('Invalid connection action');
  if (Object.keys(a).some(k => !['action', 'integration', a.action === 'login' ? 'method' : 'account'].includes(k))) throw new Error('Only provider, method and account IDs are accepted; enter credentials in the official terminal.');
  const i = integrations.find((i) => i.id === a.integration);
  if (!i || i.id.startsWith('-')) throw new Error('Unknown OpenCode provider');
  if (a.action === 'login' && 'method' in a) {
    const m = i.methods.find((m) => m.id === a.method);
    if (!m || m.type === 'env' || m.id.startsWith('-')) throw new Error('Choose a supported interactive authentication method');
    return ['auth', 'login', i.id, '--method', m.id];
  }
  if (a.action === 'switch' && 'account' in a) {
    const c = i.connections.find((c) => c.id === a.account && !c.environment);
    if (!c || c.id.startsWith('-')) throw new Error('Unknown saved OpenCode account');
    return ['auth', 'switch', i.id, c.id];
  }
  throw new Error('Invalid connection action');
}
