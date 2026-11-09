import { BOX_BIN, BOX_CLI_BIN, BOX_CF, BOX_HOME, sq } from './boxScripts.ts';
import { READINESS_STATES, READINESS_CHECKS, type OpenCodeReadiness } from '../shared/opencodeReadiness.ts';

/** A Box owns these folders. Never import the manager's config, database or credentials. */
export const OPENCODE_BOX_ENV = {
  XDG_CONFIG_HOME: `${BOX_CF}/opencode/config`,
  XDG_DATA_HOME: `${BOX_CF}/opencode/data`,
  XDG_CACHE_HOME: `${BOX_CF}/opencode/cache`,
  XDG_STATE_HOME: `${BOX_CF}/opencode/state`,
};

/** Metadata only: no credential endpoints, auth exports, DB reads or model generation. */
export const OPENCODE_BOX_QUERY_SOURCE = String.raw`
const { spawnSync } = require('child_process');
const fs = require('fs');
const [cli, mode, directory, requested = ''] = process.argv.slice(2);
const cwd = fs.existsSync(directory) ? directory : '/workspace/home';
let check = 'version';
function query(endpoint, stage) {
  if (stage) check = stage;
  const r = spawnSync(cli, ['api', '--standalone', 'get', endpoint + '?location[directory]=' + encodeURIComponent(cwd)], { cwd, encoding: 'utf8', timeout: 10000, maxBuffer: 8 * 1024 * 1024 });
  if (r.status !== 0) throw new Error('OpenCode metadata unavailable');
  return JSON.parse(r.stdout).data;
}
function lookup(endpoint, stage, id) {
  // v2.2.6 list handlers await plugin activation; single-object get handlers deliberately do not.
  // Every CLI invocation owns a fresh --standalone server, so warming a previous process cannot fix this race.
  const list = query(endpoint, stage);
  if (!Array.isArray(list) || list.some(item => !item || typeof item !== 'object' || typeof item.id !== 'string')) throw new Error('Invalid metadata list');
  const matches = list.filter(item => item.id === id);
  if (matches.length > 1) throw new Error('Ambiguous metadata ID');
  return matches[0];
}
try {
  const version = spawnSync(cli, ['--version'], { encoding: 'utf8', timeout: 15000 });
  if (version.status !== 0 || !/^(?:opencode\s+)?v?2\.\d+\.\d+(?:[-+][\w.-]+)?\s*$/i.test(version.stdout)) throw new Error('Unsupported OpenCode version');
   if (mode === 'connections') {
     const list = query('/api/integration');
     if (!Array.isArray(list)) throw new Error('Invalid integrations');
     // Allowlist before data crosses the Box boundary; never return forms, commands or status URLs.
     process.stdout.write(JSON.stringify({ data: list.map(i => ({ id: i.id, name: i.name,
       methods: (i.methods || []).map(m => ({ id: m.id, type: m.type, label: m.label })),
       connections: (i.connections || []).map(c => ({ id: c.id, label: c.label, method: c.method, type: c.type, name: c.name, ...(c.status ? { status: true } : {}) })),
     })) }));
   } else {
    const models = query('/api/model', 'models');
  if (!Array.isArray(models)) throw new Error('Invalid model inventory');
   const selected = requested || !models.length ? null : query('/api/model/default', 'default-model');
  if (mode === 'models') {
    const clean = models.filter(m => m && m.enabled !== false && (!m.type || m.type === 'chat')).map(m => ({
      id: m.id, providerID: m.providerID, name: m.name,
      capabilities: { tools: m.capabilities?.tools === true },
      variants: Array.isArray(m.variants) ? m.variants.map(v => ({ id: v.id })) : [],
    }));
    process.stdout.write(JSON.stringify({ list: { data: clean }, selected: { data: selected && { id: selected.id, providerID: selected.providerID } } }));
   } else if (mode === 'readiness') {
     const evaluate = () => {
       check = 'models';
       const [ref, variant] = requested.split('#');
       const model = ref ? models.find(m => m && m.providerID + '/' + m.id === ref) : selected;
       if (!model) return 'model-not-listed';
       if (model.enabled === false) return 'model-disabled';
       if (model.type && model.type !== 'chat') return 'model-non-chat';
       if (model.capabilities?.tools !== true) return 'model-no-tools';
       if (variant && (!Array.isArray(model.variants) || !model.variants.some(v => v && v.id === variant))) return 'variant-unavailable';
       const provider = lookup('/api/provider', 'provider', model.providerID);
       if (!provider) return 'provider-not-listed';
       if (provider.activation === 'disabled') return 'provider-disabled';
       if (!provider.integrationID) return 'provider-no-integration';
       if (typeof provider.integrationID !== 'string') throw new Error('Invalid integration reference');
       const integration = lookup('/api/integration', 'integration', provider.integrationID);
       if (!integration) return 'integration-not-listed';
       if (!Array.isArray(integration.connections) || integration.connections.some(c => !c || typeof c !== 'object')) throw new Error('Invalid connection metadata');
       const connections = integration.connections;
       if (!connections.length) return 'no-connection';
       // This detailed mode is for the OAuth-only smoke gate, not the legacy any-provider status check.
       const oauth = connections.filter(c => c.type === 'credential' && c.method === 'oauth');
       if (!oauth.length) return 'oauth-unavailable';
       if (oauth.some(c => !c.status)) return 'ready';
       if (oauth.every(c => c.status && c.status.status === 'needs_auth')) return 'connection-needs-auth';
       return 'connection-status-unknown';
     };
     process.stdout.write(JSON.stringify({ state: evaluate() }));
   } else {
    const ref = requested.replace(/#[^#]*$/, '');
    const model = ref ? models.find(m => m.providerID + '/' + m.id === ref) : selected;
    let ready = false;
    if (model && model.enabled !== false && model.capabilities?.tools === true) {
       const provider = lookup('/api/provider', 'provider', model.providerID);
       if (!provider) throw new Error('Provider not listed');
      if (!provider.integrationID) ready = true;
      else {
         const integration = lookup('/api/integration', 'integration', provider.integrationID);
         if (!integration) throw new Error('Integration not listed');
        ready = Array.isArray(integration.connections) && integration.connections.some(c => !c.status);
      }
    }
    process.stdout.write(ready ? 'CUBEFARM_SIGNED_IN' : 'CUBEFARM_SIGNED_OUT');
  }
   }
 } catch {
  // An infrastructure/configuration error is NOT an expired login. No raw API output can leak.
   process.stdout.write(mode === 'readiness' ? JSON.stringify({ state: 'query-failed', check }) : 'CUBEFARM_OPENCODE_QUERY_FAILED');
  process.exitCode = 2;
}
`;

export const openCodeBoxQuery = (mode: 'status' | 'models' | 'connections' | 'readiness', directory = BOX_HOME, model = '') =>
  `node ${sq(`${BOX_BIN}/opencode-query.cjs`)} ${sq(`${BOX_CLI_BIN}/opencode`)} ${sq(mode)} ${sq(directory)} ${sq(model)}`;

/** Untrusted remote output: accept only exact fixed shapes and a coherent exit code, never raw extra fields. */
export function parseOpenCodeReadiness(code: number, output: string): OpenCodeReadiness {
  const invalid:OpenCodeReadiness={state:'query-failed',check:'output'};
  try {
    if(output.length>512)return invalid;
    const value=JSON.parse(output);
    if(!value||typeof value!=='object'||Array.isArray(value))return invalid;
    if(value.state==='query-failed'&&code!==0&&Object.keys(value).length===2&&READINESS_CHECKS.includes(value.check))return {state:'query-failed',check:value.check};
    if(code===0&&Object.keys(value).length===1&&READINESS_STATES.includes(value.state))return {state:value.state};
  }catch { /* No raw stderr, malformed JSON or extra field may escape. */ }
  return invalid;
}
