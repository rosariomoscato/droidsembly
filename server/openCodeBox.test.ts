import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { OPENCODE_BOX_ENV, OPENCODE_BOX_QUERY_SOURCE, openCodeBoxQuery, parseOpenCodeReadiness } from './openCodeBox.ts';
import { READINESS_STATES, readinessCategory } from '../shared/opencodeReadiness.ts';

const model = { providerID: 'openai', id: 'test-model', name: 'Test', capabilities: { tools: true }, variants: [{ id: 'medium' }], headers: { authorization: 'secret' } };
function inspect({ mode = 'status', requested = 'openai/test-model#medium', models = [model], integration = { id:'openai',connections: [{ type: 'credential', method: 'oauth' }] }, provider = {id:'openai',integrationID:'openai'}, providers, integrations, fail = false, failAt = '', malformedAt = '', coldStart = false, version = '2.2.6' }: { mode?:string;requested?:string;models?:readonly unknown[];integration?:unknown;provider?:unknown;providers?:unknown;integrations?:unknown;fail?:boolean;failAt?:string;malformedAt?:string;coldStart?:boolean;version?:string } = {}) {
  const calls: string[][] = [];
  let output = '';
  const process = { argv: ['node', 'query.cjs', '/pinned/opencode', mode, '/remote/work', requested], stdout: { write: (s: string) => { output += s; } }, exitCode: 0 };
  vm.runInNewContext(OPENCODE_BOX_QUERY_SOURCE, { process, require: (name: string) => {
    if (name === 'fs') return { existsSync: () => true };
    if (name !== 'child_process') throw new Error('unexpected dependency');
    return { spawnSync: (cli: string, args: string[]) => {
      expect(cli).toBe('/pinned/opencode');
      calls.push(args);
      if (args[0] === '--version') return { status: 0, stdout: version };
      expect(args.slice(0, 3)).toEqual(['api', '--standalone', 'get']);
      const endpoint = args[3].split('?')[0];
      // v2.2.6 source: single reads are nonblocking; each --standalone command owns a fresh private server.
      // provider.list and integration.list wait for activation; provider.get/integration.get may answer 404 while cold.
      if(coldStart&&(endpoint==='/api/provider/openai'||endpoint==='/api/integration/openai'))return {status:1,stdout:'{"_tag":"ProviderNotFoundError"}',stderr:'HTTP 404'};
      if (fail || endpoint===failAt) return { status: 1, stdout: 'secret', stderr: 'secret' };
      if(endpoint===malformedAt)return {status:0,stdout:'private malformed output secret'};
      const listed=(item:unknown)=>item&&typeof item==='object'&&!Array.isArray(item)?{id:'openai',...item}:item;
       const data = endpoint === '/api/integration' ? (mode==='connections'?[{ id: 'openai', name: 'OpenAI', methods: [{ id: 'device', type: 'oauth', label: 'Device', command: ['secret'], form: { secret: 'hidden' } }], connections: [{ id: 'cred-test', type: 'credential', label: 'Test', method: 'oauth', token: 'hidden', status: { status: 'needs_auth', message: 'hidden', url: 'hidden' } }] }]:integrations!==undefined?integrations:[listed(integration)]) : endpoint === '/api/model' ? models : endpoint === '/api/model/default' ? models[0] : endpoint === '/api/provider' ? (providers!==undefined?providers:[listed(provider)]) : endpoint === '/api/provider/openai' ? provider : endpoint === '/api/integration/openai' ? integration : undefined;
      if (data===undefined) throw new Error('Unexpected metadata endpoint');
      return { status: 0, stdout: JSON.stringify({ data }) };
    } };
  } });
  return { output, code: process.exitCode, calls };
}

describe('OpenCode Box metadata (no AI, credentials or real CLI)', () => {
  it.each(['readiness','status'])('survives a cold standalone server without retries or warmup calls (%s)',mode=>{
    const r=inspect({mode,coldStart:true});
    expect(r.code).toBe(0);
    expect(r.output).toBe(mode==='readiness'?'{"state":"ready"}':'CUBEFARM_SIGNED_IN');
    expect(r.calls.map(c=>c[3]?.split('?')[0]).filter(Boolean)).toEqual(['/api/model','/api/provider','/api/integration']);
    expect(r.calls).toHaveLength(4); // version + one synchronized read per catalog, no retries/warmups
  });
  it.each([
    [{providers:[]},'provider-not-listed'],
    [{providers:[{id:'other',integrationID:'other'}]},'provider-not-listed'],
    [{integrations:[]},'integration-not-listed'],
    [{provider:{integrationID:'chosen'},integrations:[{id:'openai',connections:[{type:'credential',method:'oauth'}]}]},'integration-not-listed'],
  ] as const)('does not replace a missing exact provider or integration with another catalog entry (%#)',(options,state)=>{
    const r=inspect({mode:'readiness',coldStart:true,...options});expect(r.code).toBe(0);expect(JSON.parse(r.output)).toEqual({state});
  });
  it('selects the model provider and its exact integration, not an unrelated healthy OAuth connection',()=>{
    const r=inspect({mode:'readiness',coldStart:true,
      providers:[{id:'other',integrationID:'other'},{id:'openai',integrationID:'chosen',headers:{authorization:'secret'}}],
      integrations:[{id:'other',connections:[{type:'credential',method:'oauth'}]},{id:'chosen',connections:[{type:'credential',method:'oauth',status:{status:'needs_auth',message:'secret',url:'hidden'}}]}],
    });
    expect(r.code).toBe(0);expect(JSON.parse(r.output)).toEqual({state:'connection-needs-auth'});
    expect(r.output).not.toMatch(/secret|hidden|other|chosen|authorization/);
  });
  it.each([
    [{providers:{private:'secret'}},'provider'],
    [{providers:[null]},'provider'],
    [{providers:[{id:'openai'},{id:'openai'}]},'provider'],
    [{integrations:[{id:'openai',connections:[]},{id:'openai',connections:[]}]},'integration'],
    [{integrations:[{private:'secret'}]},'integration'],
  ] as const)('rejects invalid/ambiguous lists rather than silently choosing an account (%#)',(options,check)=>{
    const r=inspect({mode:'readiness',coldStart:true,...options});
    expect(r.code).toBe(2);expect(JSON.parse(r.output)).toEqual({state:'query-failed',check});expect(r.output).not.toMatch(/secret|private/);
  });
  it.each([
    [{},'ready'],
    [{models:[]},'model-not-listed'],
    [{models:[{...model,enabled:false}]},'model-disabled'],
    [{models:[{...model,type:'embedding'}]},'model-non-chat'],
    [{models:[{...model,capabilities:{tools:false}}]},'model-no-tools'],
    [{requested:'openai/test-model#not-listed'},'variant-unavailable'],
    [{provider:{integrationID:'openai',activation:'disabled'}},'provider-disabled'],
    [{provider:{}},'provider-no-integration'],
    [{integration:{connections:[]}},'no-connection'],
    [{integration:{connections:[{type:'credential',method:'oauth',status:{status:'needs_auth',message:'secret',url:'hidden'}}]}},'connection-needs-auth'],
    [{integration:{connections:[{type:'credential',method:'oauth',status:{status:'unrecognized',message:'secret'}}]}},'connection-status-unknown'],
    [{integration:{connections:[{type:'credential',method:'key',token:'secret'}]}},'oauth-unavailable'],
  ] as const)('runs the actual helper source and emits only the fixed readiness state (%#)',(options,state)=>{
    const r=inspect({mode:'readiness',...options});
    expect(r.code).toBe(0);expect(JSON.parse(r.output)).toEqual({state});
    expect(parseOpenCodeReadiness(r.code,r.output)).toEqual({state});
    expect(r.output).not.toMatch(/secret|hidden|token|label|url|account/);
    expect(r.calls.join(' ')).not.toMatch(/credential|auth export|generate|prompt/);
  });
  it.each([
    ['/api/model','models'],['/api/model/default','default-model'],['/api/provider','provider'],['/api/integration','integration'],
  ])('identifies the failed API probe without raw output or retry (%s)',(endpoint,check)=>{
    for(const malformed of [false,true]) {
      const r=inspect({mode:'readiness',requested:endpoint==='/api/model/default'?'':'openai/test-model#medium',...(malformed?{malformedAt:endpoint}:{failAt:endpoint})});
      expect(r.code).toBe(2);expect(JSON.parse(r.output)).toEqual({state:'query-failed',check});
      expect(r.output).not.toMatch(/secret|private|malformed/);
      expect(r.calls.filter(c=>c[3]?.split('?')[0]===endpoint)).toHaveLength(1);
    }
  });
  it('reports a version probe failure separately and rejects malformed metadata structures',()=>{
    expect(inspect({mode:'readiness',version:'1.2.3'})).toMatchObject({code:2,output:'{"state":"query-failed","check":"version"}'});
    expect(JSON.parse(inspect({mode:'readiness',provider:null}).output)).toEqual({state:'query-failed',check:'provider'});
    expect(JSON.parse(inspect({mode:'readiness',integration:{connections:'private text'}}).output)).toEqual({state:'query-failed',check:'integration'});
  });
  it('strictly parses only coherent states/codes, dropping all untrusted fields',()=>{
    for(const output of ['private non-JSON',JSON.stringify({state:'ready',token:'secret'}),JSON.stringify({state:'query-failed',check:'secret'}),JSON.stringify({state:'unrecognized'}),'x'.repeat(600)]) {
      expect(parseOpenCodeReadiness(0,output)).toEqual({state:'query-failed',check:'output'});
    }
    expect(parseOpenCodeReadiness(2,'{"state":"ready"}')).toEqual({state:'query-failed',check:'output'});
    expect(parseOpenCodeReadiness(0,'{"state":"query-failed","check":"models"}')).toEqual({state:'query-failed',check:'output'});
    expect(parseOpenCodeReadiness(2,'{"state":"query-failed","check":"models"}')).toEqual({state:'query-failed',check:'models'});
    for(const state of READINESS_STATES.filter(s=>s!=='ready'))expect(readinessCategory({state})).toBe(`remote-${state}`);
    expect(readinessCategory({state:'query-failed',check:'provider'})).toBe('remote-query-provider-failed');
  });
  it('projects connections inside the Box and never queries models or credential endpoints', () => {
    const r = inspect({ mode: 'connections' });
    expect(r.code).toBe(0);
    expect(JSON.parse(r.output)).toEqual({ data: [{ id: 'openai', name: 'OpenAI', methods: [{ id: 'device', type: 'oauth', label: 'Device' }], connections: [{ id: 'cred-test', type: 'credential', label: 'Test', method: 'oauth', status: true }] }] });
    expect(r.calls).toHaveLength(2);
    expect(r.output).not.toMatch(/hidden|secret|token|command|form|url/);
    expect(r.calls[1][3]).toBe('/api/integration?location[directory]=%2Fremote%2Fwork');
  });
  it('checks only the selected provider, not any account on the machine', () => {
    expect(inspect().output).toBe('CUBEFARM_SIGNED_IN');
    expect(inspect({ integration: { connections: [] } }).output).toBe('CUBEFARM_SIGNED_OUT');
    expect(inspect({ requested: 'other/model' }).output).toBe('CUBEFARM_SIGNED_OUT');
  });
  it('uses the remote default when no explicit model was chosen', () => {
    const r = inspect({ requested: '' });
    expect(r.output).toBe('CUBEFARM_SIGNED_IN');
    expect(r.calls.some(c => c[3]?.startsWith('/api/model/default?'))).toBe(true);
  });
  it('holds an empty inventory without generating a task or selecting a local default', () => {
    expect(inspect({ models: [], requested: '' }).output).toBe('CUBEFARM_SIGNED_OUT');
    expect(inspect({ models: [], mode: 'models', requested: '' }).output).toBe('{"list":{"data":[]},"selected":{"data":null}}');
  });
  it('refuses a connection marked needs_auth', () => {
    const integration = { connections: [{ type: 'credential', method: 'oauth', status: { status: 'needs_auth' } }] };
    expect(inspect({ integration }).output).toBe('CUBEFARM_SIGNED_OUT');
  });
  it('distinguishes query failure from signed out and never leaks raw output', () => {
    const r = inspect({ fail: true });
    expect(r).toMatchObject({ output: 'CUBEFARM_OPENCODE_QUERY_FAILED', code: 2 });
    expect(r.output).not.toContain('secret');
  });
  it('refuses V1 metadata queries', () => {
    const r = inspect({ version: '1.2.3' });
    expect(r.code).toBe(2);
    expect(r.calls).toHaveLength(1);
  });
  it('projects only selection metadata, never headers or connection details', () => {
    const r = inspect({ mode: 'models', requested: '' });
    expect(JSON.parse(r.output).list.data[0]).toEqual({ providerID: 'openai', id: 'test-model', name: 'Test', capabilities: { tools: true }, variants: [{ id: 'medium' }] });
    expect(r.output).not.toMatch(/secret|authorization|connections/);
    expect(r.calls.join(' ')).not.toMatch(/credential|auth export|generate|prompt/);
  });
  it('shell-quotes untrusted model and directory, and isolates persistent Box auth', () => {
    expect(openCodeBoxQuery('status', "/a'b", "openai/m'; touch /bad")).toContain("'/a'\"'\"'b'");
    expect(Object.values(OPENCODE_BOX_ENV).every(p => p.startsWith('/workspace/home/.cubefarm/opencode/'))).toBe(true);
  });
});
