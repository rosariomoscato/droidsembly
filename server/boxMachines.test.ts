import { describe, expect, it } from 'vitest';
import { BoxMachines } from './boxMachines.ts';
import { boxLabels } from './cloud.ts';
import type { BoxApi, BoxInfo } from './box.ts';
import type { AgentCli, CloudMachineState } from '../shared/types.ts';

interface Call {
  op: string;
  id?: string;
  script?: string;
  env?: Record<string, string>;
}

/** A fake Upstash account that records what the office asks of it. `answer` decides each command's output. */
function fakeAccount(boxes: BoxInfo[] = [], answer: (script: string) => { code: number; output: string } = () => ({ code: 0, output: '' })) {
  const calls: Call[] = [];
  const files = new Map<string, string>();
  let seq = 0;
  const api: BoxApi = {
    list: async () => boxes.map((b) => ({ ...b })),
    create: async (o) => {
      calls.push({ op: 'create' });
      const b: BoxInfo = { id: `box-${++seq}`, name: o.name, labels: o.labels, status: 'running' };
      boxes.push(b);
      return { ...b };
    },
    get: async (id) => {
      const b = boxes.find((x) => x.id === id);
      return b ? { ...b } : null;
    },
    resume: async (id) => {
      calls.push({ op: 'resume', id });
      boxes.find((x) => x.id === id)!.status = 'running';
    },
    pause: async (id) => {
      calls.push({ op: 'pause', id });
      boxes.find((x) => x.id === id)!.status = 'paused';
    },
    remove: async (id) => {
      calls.push({ op: 'remove', id });
      boxes.splice(
        boxes.findIndex((x) => x.id === id),
        1,
      );
    },
    run: async (id, script, o) => {
      calls.push({ op: 'run', id, script, env: o?.env });
      if (script.includes('CUBEFARM_SETUP_OK')) return { code: 0, output: 'CUBEFARM_SETUP_OK' };
      return answer(script);
    },
    read: async (_id, file) => files.get(file) ?? null,
    write: async (_id, file, content) => {
      files.set(file, content);
    },
    files: async () => [],
    session: async () => {
      throw new Error('no terminals here');
    },
    browser: async () => true,
  };
  return { api, calls, files, boxes };
}

function machines(api: BoxApi, states: [string, CloudMachineState][] = [], profile?: {cli:()=>AgentCli;browser:()=>boolean}) {
  const m: BoxMachines = new BoxMachines({
    api: () => api,
    office: () => 'k3f9qa',
    size: () => 'small',
    cli: profile?.cli,
    browser: profile?.browser,
    versions: { claude: '2.1.283', playwrightMcp: '0.0.83', codex: '0.163.0', opencode: '2.2.6' },
    git: async () => ({ name: 'Ada', email: 'ada@example.com' }),
    githubEnv: async () => ({ GH_TOKEN: 'gho_token' }),
    state: (machine) => states.push([machine, m.stateOf(machine)]),
    secrets: () => ['gho_token'],
    log: () => undefined,
  });
  return m;
}

describe('BoxMachines', () => {
  it('does not collapse a failed post-login metadata query into signed-out',async()=>{
    const {api}=fakeAccount([],()=>({code:2,output:'CUBEFARM_OPENCODE_QUERY_FAILED'}));
    const m=machines(api);await m.ensure('a1b2c3d4');
    await expect(m.openCodeConnectionReady('a1b2c3d4','/remote/work','openai/test#medium')).rejects.toThrow('remote-query');
  });
  it('reads detailed readiness only from an existing Box and passes no provider or GitHub credentials',async()=>{
    const {api,calls}=fakeAccount([],()=>({code:0,output:'{"state":"ready"}'}));const m=machines(api);
    expect(await m.openCodeReadiness('a1b2c3d4','/remote/work','openai/test#medium')).toEqual({state:'query-failed',check:'box'});
    expect(calls).toEqual([]);
    await m.ensure('a1b2c3d4');calls.length=0;
    expect(await m.openCodeReadiness('a1b2c3d4','/remote/work','openai/test#medium')).toEqual({state:'ready'});
    expect(calls).toHaveLength(1);expect(calls[0].script).toContain("'readiness' '/remote/work' 'openai/test#medium'");
    expect(calls[0].env).toMatchObject({XDG_DATA_HOME:'/workspace/home/.cubefarm/opencode/data'});
    expect(calls[0].env).not.toHaveProperty('GH_TOKEN');expect(calls[0].env).not.toHaveProperty('OPENAI_API_KEY');
  });
  it.each([
    [{code:2,output:'{"state":"query-failed","check":"models"}'},{state:'query-failed',check:'models'}],
    [{code:0,output:'{"state":"no-connection"}'},{state:'no-connection'}],
    [{code:0,output:'{"state":"connection-needs-auth"}'},{state:'connection-needs-auth'}],
    [{code:0,output:'{"state":"model-not-listed"}'},{state:'model-not-listed'}],
    [{code:0,output:'{"state":"ready","token":"secret"}'},{state:'query-failed',check:'output'}],
  ])('does not confuse failure, missing login, model state or hostile output (%#)',async(result,expected)=>{
    const {api}=fakeAccount([],()=>result);const m=machines(api);await m.ensure('a1b2c3d4');
    expect(await m.openCodeReadiness('a1b2c3d4','/remote/work','openai/test#medium')).toEqual(expected);
    api.run=async()=>{throw new Error('raw transport secret');};
    expect(await m.openCodeReadiness('a1b2c3d4','/remote/work','openai/test#medium')).toEqual({state:'query-failed',check:'transport'});
  });
  it('performs the real selected-CLI setup and reruns a changed profile without another creation', async () => {
    let cli:AgentCli='opencode';let browser=false;
    const {api,calls}=fakeAccount();const m=machines(api,[],{cli:()=>cli,browser:()=>browser});
    await Promise.all([m.ensure('a1b2c3d4'),m.ensure('a1b2c3d4')]);
    const setups=()=>calls.filter(c=>c.script?.includes('CUBEFARM_SETUP_OK'));
    expect(calls.filter(c=>c.op==='create')).toHaveLength(1);expect(setups()).toHaveLength(1);
    expect(setups()[0].script).not.toMatch(/@anthropic-ai|@openai\/codex|@playwright\/mcp/);
    cli='codex';await m.ensure('a1b2c3d4');
    expect(setups()).toHaveLength(2);expect(setups()[1].script).toContain('@openai/codex');
    expect(setups()[1].script).not.toContain('@opencode/cli');
    browser=true;await m.ensure('a1b2c3d4');expect(setups()[2].script).toContain('@playwright/mcp');
    expect(calls.filter(c=>c.op==='create')).toHaveLength(1);
  });
  it('never reports a failed setup as ready or writes helper files after that failure', async () => {
    const {api,files}=fakeAccount();api.run=async()=>({code:4,output:'installation failed'});
    const states:[string,CloudMachineState][]=[];
    const m=machines(api,states,{cli:()=> 'opencode',browser:()=>false});
    await expect(m.ensure('a1b2c3d4')).rejects.toThrow('set up');
    expect(files.size).toBe(0);expect(states.at(-1)).toEqual(['a1b2c3d4','error']);
  });
  it('never creates a Box while reading connections, and reads only the remote inventory', async () => {
    const { api, calls } = fakeAccount([], () => ({ code: 0, output: JSON.stringify({ data: [{ id: 'remote', name: 'Remote', methods: [{ type: 'key' }], connections: [] }] }) }));
    const m = machines(api);
    await expect(m.openCodeConnections('a1b2c3d4', '/remote/work')).rejects.toThrow('not ready');
    expect(await m.openCodeConnectionReady('a1b2c3d4', '/remote/work', 'openai/fake')).toBe(false);
    expect(calls).toEqual([]);
    await m.ensure('a1b2c3d4'); // explicit fake setup, not performed by connection reads
    calls.length = 0;
    expect(await m.openCodeConnections('a1b2c3d4', '/remote/work')).toMatchObject([{ id: 'remote' }]);
    expect(calls).toHaveLength(1);
    expect(calls[0].script).toContain("'connections' '/remote/work'");
    expect(calls[0].env).toEqual(expect.objectContaining({ XDG_DATA_HOME: '/workspace/home/.cubefarm/opencode/data' }));
    expect(JSON.stringify(calls)).not.toMatch(/gho_token|OPENAI_API_KEY/);
  });
  it('checks OpenCode in its Box-owned folders for the selected remote model, with no provider/GitHub credentials', async () => {
    const { api, calls } = fakeAccount([], () => ({ code: 0, output: 'CUBEFARM_SIGNED_IN' }));
    const m = machines(api);
    expect(await m.signedIn('a1b2c3d4', 'opencode', '/remote/work', 'openai/test#medium')).toBe(true);
    const check = calls.find(c => c.script?.includes('opencode-query.cjs'))!;
    expect(check.script).toContain("'status' '/remote/work' 'openai/test#medium'");
    expect(check.env?.XDG_DATA_HOME).toBe('/workspace/home/.cubefarm/opencode/data');
    expect(check.env).not.toHaveProperty('GH_TOKEN');
    expect(check.env).not.toHaveProperty('OPENAI_API_KEY');
  });

  it('does not provision a Box for model browsing, or mistake a failed query for a successful connection', async () => {
    const { api, calls } = fakeAccount([], () => ({ code: 2, output: 'CUBEFARM_OPENCODE_QUERY_FAILED' }));
    const m = machines(api);
    await expect(m.openCodeModels('a1b2c3d4', '/remote/work')).rejects.toThrow(/not ready/);
    expect(calls).toEqual([]);
    await expect(m.signedIn('a1b2c3d4', 'opencode')).rejects.toThrow(/provider and model setup/);
  });
  it('creates and sets up a Box the first time, then reuses it', async () => {
    const { api, calls, files } = fakeAccount();
    const states: [string, CloudMachineState][] = [];
    const m = machines(api, states);
    const id = await m.ensure('a1b2c3d4');
    expect(states.map(([, s]) => s)).toEqual(['creating', 'setting-up', 'ready']);
    expect(id).toBe('box-1');
    expect(calls.filter((c) => c.op === 'create')).toHaveLength(1);
    expect([...files.keys()]).toEqual(expect.arrayContaining(['/workspace/home/.cubefarm/bin/hook.cjs', '/workspace/home/.cubefarm/bin/launch.cjs', '/workspace/home/.cubefarm/tmux.conf']));
    expect(await m.ensure('a1b2c3d4')).toBe('box-1');
    expect(calls.filter((c) => c.op === 'create')).toHaveLength(1);
    expect(m.stateOf('a1b2c3d4')).toBe('ready');
  });

  it("finds a machine's Box on the account after a restart, and wakes it when paused", async () => {
    const { api, calls } = fakeAccount([{ id: 'old', name: 'cubefarm-k3f9qa-a1b2c3d4', labels: boxLabels('k3f9qa', 'a1b2c3d4'), status: 'paused' }]);
    const m = machines(api);
    expect(await m.ensure('a1b2c3d4')).toBe('old');
    expect(calls.map((c) => c.op)).toContain('resume');
    expect(calls.some((c) => c.op === 'create')).toBe(false);
  });

  it("prepares the desk with GitHub's token in that command's environment only", async () => {
    const { api, calls } = fakeAccount();
    const m = machines(api);
    expect(await m.prepareDesk('a1b2c3d4', 'acme/web', { defaultBranch: 'main' }, 'swarm/issue-1-ada')).toBe('/workspace/home/work/acme__web');
    const prep = calls.find((c) => c.script?.includes('git worktree add'))!;
    expect(prep.env).toEqual({ GH_TOKEN: 'gho_token' });
    const setup = calls.find((c) => c.script?.includes('CUBEFARM_SETUP_OK'))!;
    expect(setup.env).toBeUndefined();
  });

  it("says why a desk couldn't be set up, with secrets scrubbed", async () => {
    const { api } = fakeAccount([], (s) => (s.includes('git worktree add') ? { code: 128, output: 'fatal: could not read from https://x:gho_token@github.com' } : { code: 0, output: '' }));
    await expect(machines(api).prepareDesk('a1b2c3d4', 'acme/web', { defaultBranch: 'main' }, 'b')).rejects.toThrow(/Couldn't set up the desk.*x:•••@github/);
  });

  it('installs dependencies only when the lockfile changed, with no credentials', async () => {
    let installs = 0;
    const { api, calls } = fakeAccount([], (s) => {
      if (!s.includes('DEPS_')) return { code: 0, output: '' };
      if (!s.includes('npm ci')) return { code: 0, output: installs ? 'DEPS_SKIPPED' : 'DEPS_STALE' };
      installs++;
      return { code: 0, output: 'DEPS_INSTALLED' };
    });
    const m = machines(api);
    const log: string[] = [];
    const cb = { log: (l: string[]) => log.push(...l), installing: () => log.push('(installing)') };
    expect(await m.installDeps('a1b2c3d4', 'acme/web', cb)).toBe('installed');
    expect(await m.installDeps('a1b2c3d4', 'acme/web', cb)).toBe('skipped');
    expect(log).toContain('(installing)');
    expect(calls.filter((c) => c.script?.includes('DEPS_')).every((c) => !c.env)).toBe(true);
  });

  it("leaves a paused Box asleep for housekeeping", async () => {
    const { api, calls } = fakeAccount([{ id: 'p', name: 'cubefarm-k3f9qa-a1b2c3d4', labels: boxLabels('k3f9qa', 'a1b2c3d4'), status: 'paused' }]);
    const m = machines(api);
    await m.release('a1b2c3d4', 'acme/web', 4100);
    expect(await m.sweep('a1b2c3d4', 'acme/web', [])).toBe(0);
    expect(await m.trimDesk()).toBeNull();
    expect(calls.filter((c) => c.op === 'run' || c.op === 'resume')).toEqual([]);
  });

  it("lists this office's machines only", async () => {
    const { api } = fakeAccount([
      { id: '1', name: 'a', labels: boxLabels('k3f9qa', 'a1b2c3d4'), status: 'running' },
      { id: '2', name: 'b', labels: boxLabels('zzzzzz', 'e5f6a7b8'), status: 'running' },
      { id: '3', name: 'c', labels: boxLabels('k3f9qa', 'c9d0e1f2'), status: 'deleted' },
    ]);
    expect(await machines(api).list()).toEqual(['a1b2c3d4']);
  });

  it("saves unpushed work from every worktree before deleting the Box", async () => {
    const { api, calls, files, boxes } = fakeAccount([{ id: 'x', name: 'cubefarm-k3f9qa-a1b2c3d4', labels: boxLabels('k3f9qa', 'a1b2c3d4'), status: 'running' }], (s) => {
      if (s.includes("ls -1 '/workspace/home/work'")) return { code: 0, output: 'acme/web\nnot a repo\n' };
      if (s.includes('format-patch')) {
        files.set('/workspace/home/.cubefarm/leftovers.patch', Buffer.from('From abc\n+work\n').toString('base64'));
        return { code: 0, output: 'SAVED' };
      }
      return { code: 0, output: '' };
    });
    const r = await machines(api).remove('a1b2c3d4');
    expect(r.removed).toBe(true);
    expect(r.patches).toHaveLength(1);
    expect(r.patches[0]).toMatch(/acme__web[\\/]machine-a1b2c3d4-\d{8}\.patch$/);
    expect(calls.at(-1)).toEqual({ op: 'remove', id: 'x' });
    expect(boxes).toEqual([]);
  });

  it("keeps the Box when its work couldn't be saved", async () => {
    const { api, boxes } = fakeAccount([{ id: 'x', name: 'n', labels: boxLabels('k3f9qa', 'a1b2c3d4'), status: 'running' }], (s) => {
      if (s.includes("ls -1 '/workspace/home/work'")) throw new Error('Upstash is down');
      return { code: 0, output: '' };
    });
    expect(await machines(api).remove('a1b2c3d4')).toEqual({ removed: false, patches: [] });
    expect(boxes).toHaveLength(1);
  });
});
