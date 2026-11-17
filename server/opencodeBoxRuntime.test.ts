import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BoxApi, BoxSessionOptions } from './box.ts';
import type { BoxCliRecord } from './boxCli.ts';
import { AgentTerminal } from './terminal.ts';
import * as initialRunner from './cliRunner.ts';

const localSpawn = vi.hoisted(() => vi.fn(() => { throw new Error('Local fallback forbidden'); }));
vi.mock('./ptyClient.ts', async (original) => ({ ...await original<typeof import('./ptyClient.ts')>(), spawnPty: localSpawn, hooksReady: () => undefined }));

function remote() {
  const files = new Map<string, string>();
  const fileBytes = new Map<string, Buffer>();
  const sessions: BoxSessionOptions[] = [];
  const commands: string[] = [];
  let rec: BoxCliRecord | null = null;
  const api: BoxApi = {
    list: async () => [], create: async () => { throw new Error('Unexpected Box'); }, get: async () => ({ id: 'test-box', name: 'test', labels: [], status: 'running' }),
    pause: async () => undefined, resume: async () => undefined, remove: async () => undefined,
    run: async (_id, s) => {
      commands.push(s);
      if(s.startsWith("node -e '/* DS_BOX_SESSION_FILES */")){
        const request=JSON.parse(s.match(/const request=(\{[^\n]*\});/)![1]);
        const file=request.directory+'/'+request.name,previous=fileBytes.get(file)??Buffer.alloc(0);
        expect(previous.length).toBe(request.offset);
        const content=Buffer.concat([previous,Buffer.from(request.base64,'base64')]);fileBytes.set(file,content);files.set(file,content.toString('utf8'));
        return {code:0,output:'DS_SESSION_FILES=written'};
      }
      return { code: 0, output: 'ALIVE' };
    },
    write: async (_id, file, text) => { files.set(file, text); }, read: async (_id, file) => files.get(file) ?? null, files: async () => [], browser: async () => false,
    session: async (_id, o) => {
      sessions.push(o);
      let close!: (code: number) => void;
      const done = new Promise<number>(r => { close = r; });
      return { write: () => undefined, resize: () => undefined, close: () => close(-1), done };
    },
  };
  return { api, files, sessions, commands, target: { api, boxId: 'test-box', env: { GH_TOKEN: 'fake-scoped-token' }, apiKeyHelper: null, browser: false, record: (r: BoxCliRecord | null) => { rec = r; } }, record: () => rec };
}
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

describe('OpenCode cloud terminal (fake Box, no provider calls)', () => {
  // Load the actual runtime during collection, before simulated session clocks.
  // The former beforeAll inherited Vitest's generic hook timeout; it was not
  // an application startup SLO. Import/collection errors still fail the suite.
  it('never uploads OpenCode worker session files through the SDK and never starts a terminal after a shell write failure',async()=>{
    vi.resetModules();vi.useFakeTimers();const runner=await import('./cliRunner.ts');runner.hooksReady();
    const box=remote(),term=new AgentTerminal(),finished=vi.fn();const write=box.api.write=vi.fn(async()=>{throw new Error('SDK session upload forbidden');});
    box.api.run=async()=>({code:1,output:'PRIVATE REMOTE ERROR'});
    const handle=runner.startCliSession({cwd:'/workspace/home/work/test__repo',prompt:'One task',systemAppend:'Synthetic',cli:'opencode',model:'openai/fake',effort:'medium',role:'agent',terminal:term,browserTesting:false,additionalDirectories:[],box:box.target},{log:()=>{},tool:()=>{},sessionId:()=>{},browserUrl:()=>{},screenshot:()=>{},finished});
    try{await vi.advanceTimersByTimeAsync(3000);expect(finished).toHaveBeenCalledOnce();expect(finished.mock.calls[0][0]).toMatchObject({ok:false});expect(JSON.stringify(finished.mock.calls)).not.toContain('PRIVATE');expect(write).not.toHaveBeenCalled();expect(box.sessions).toHaveLength(0);expect(localSpawn).not.toHaveBeenCalled();}
    finally{handle.stop();term.dispose();}
  });
  it('runs the chosen official login or account switch inside the existing Box only', async () => {
    vi.useFakeTimers();
    const runner = initialRunner;
    runner.hooksReady();
    for (const args of [['auth', 'login', 'openai', '--method', 'remote-device'], ['auth', 'switch', 'openai', 'remote-account']]) {
      const box = remote();
      const term = new AgentTerminal();
      const exited = vi.fn();
      const handle = runner.startBoxSignIn({ api: box.api, boxId: 'test-box', cli: 'opencode', term, agentId: 'test', authArgs: args }, exited);
      await vi.advanceTimersByTimeAsync(0);
      const spec = JSON.parse([...box.files.entries()].find(([p]) => p.endsWith('/launch.json'))![1]);
      expect(spec.file).toBe('/workspace/home/.cubefarm/cli/bin/opencode');
      expect(spec.args).toEqual(args);
      expect(box.sessions.find(s => s.tty)!.env).toMatchObject({ XDG_DATA_HOME: '/workspace/home/.cubefarm/opencode/data' });
      expect(JSON.stringify(box.sessions.map(s => s.env))).not.toContain('fake-scoped-token');
      expect(localSpawn).not.toHaveBeenCalled();
      box.sessions.find(s => s.cmd.includes('tail -c'))!.onData(JSON.stringify({ hook_event_name: 'CubefarmExit', code: 0 }) + '\n');
      expect(exited).toHaveBeenCalledWith(0);
      handle.stop(); term.dispose();
    }
  });
  it.each([0, 21_000])('keeps an explicit turn error when the process exits zero after %sms', async (elapsed) => {
    vi.resetModules();
    vi.useFakeTimers();
    const runner = await import('./cliRunner.ts');
    runner.hooksReady();
    const box = remote();
    const term = new AgentTerminal();
    const finished = vi.fn();
    const handle = runner.startCliSession({ cwd: '/remote/work', prompt: 'One task', systemAppend: '', cli: 'opencode', model: 'openai/fake', effort: 'medium', role: 'agent', terminal: term, browserTesting: false, additionalDirectories: [], box: box.target },
      { log: () => undefined, tool: () => undefined, sessionId: () => undefined, browserUrl: () => undefined, screenshot: () => undefined, finished });
    try {
      await vi.advanceTimersByTimeAsync(elapsed);
      const tail = box.sessions.find(s => s.cmd.includes('tail -c'))!;
      tail.onData([{ hook_event_name: 'UserPromptSubmit', prompt: 'One task' }, { hook_event_name: 'TurnError', error: 'Synthetic provider error' }, { hook_event_name: 'CubefarmExit', code: 0 }].map(e => JSON.stringify(e)).join('\n') + '\n');
      expect(finished).toHaveBeenCalledOnce();
      expect(finished.mock.calls[0][0]).toMatchObject({ ok: false, errors: ['OpenCode: Synthetic provider error'] });
      await vi.advanceTimersByTimeAsync(6000);
      expect(finished).toHaveBeenCalledOnce();
      expect(localSpawn).not.toHaveBeenCalled();
    } finally { handle.stop(); term.dispose(); }
  });

  it.each([
    { name: 'valid success', code: 0, expectedCode: 0 },
    { name: 'valid failure', code: 3, expectedCode: 3 },
    { name: 'missing', code: undefined, expectedCode: -1 },
    { name: 'null', code: null, expectedCode: -1 },
    { name: 'nonnumeric string', code: 'invalid', expectedCode: -1 },
    { name: 'numeric success string', code: '0', expectedCode: -1 },
    { name: 'fraction', code: 0.5, expectedCode: -1 },
  ])('delivers $name exit through the live Box CLI to the final session result', async ({ code, expectedCode }) => {
    vi.resetModules();
    vi.useFakeTimers();
    const runner = await import('./cliRunner.ts');
    runner.hooksReady();
    const box = remote(), term = new AgentTerminal(), finished = vi.fn();
    const handle = runner.startCliSession({ cwd: '/remote/work', prompt: 'One task', systemAppend: '', cli: 'opencode', model: 'openai/fake', effort: 'medium', role: 'agent', terminal: term, browserTesting: false, additionalDirectories: [], box: box.target },
      { log: () => undefined, tool: () => undefined, sessionId: () => undefined, browserUrl: () => undefined, screenshot: () => undefined, finished });
    try {
      // A process that ran this long can otherwise be considered successful on
      // exit0 even without assistant text. No TurnError masks a malformed exit.
      await vi.advanceTimersByTimeAsync(21_000);
      const tail = box.sessions.find(s => s.cmd.includes('tail -c'))!;
      expect(tail).toBeDefined();
      tail.onData(JSON.stringify({ hook_event_name: 'CubefarmExit', ...(code === undefined ? {} : { code }) }) + '\n');
      expect(finished).toHaveBeenCalledOnce();
      expect(finished.mock.calls[0][0]).toMatchObject({ ok: expectedCode === 0 });
      if (expectedCode !== 0) expect(finished.mock.calls[0][0].errors).toContain(`OpenCode exited with code ${expectedCode} before finishing.`);
      tail.onData(JSON.stringify({ hook_event_name: 'CubefarmExit', code: 0 }) + '\n');
      await vi.advanceTimersByTimeAsync(6000);
      expect(finished).toHaveBeenCalledOnce();
      expect(localSpawn).not.toHaveBeenCalled();
    } finally { handle.stop(); term.dispose(); }
  });

  it.each(['TurnComplete', 'TurnError', 'Interrupt'])('handles %s in the Box without ever spawning locally', async (event) => {
    vi.resetModules();
    vi.useFakeTimers();
    const runner = await import('./cliRunner.ts');
    runner.hooksReady();
    const box = remote();
    const term = new AgentTerminal();
    const finished = vi.fn();
    const handle = runner.startCliSession({
      cwd: '/workspace/home/work/test__repo', prompt: 'Do one task', systemAppend: 'Only this repository.', cli: 'opencode', model: 'openai/test-model#medium', effort: 'medium',
      role: 'agent', terminal: term, agentId: 'test-agent', browserTesting: false, additionalDirectories: [], box: box.target,
    }, { log: () => undefined, tool: () => undefined, sessionId: () => undefined, browserUrl: () => undefined, screenshot: () => undefined, finished });
    await vi.advanceTimersByTimeAsync(0);
    const spec = JSON.parse([...box.files.entries()].find(([p]) => p.endsWith('/launch.json'))![1]);
    expect(spec.file).toBe('/workspace/home/.cubefarm/cli/bin/opencode');
    expect(spec.args).toContain('--standalone');
    const env = box.sessions.find(s => s.tty)!.env!;
    const config = JSON.parse(env.OPENCODE_CONFIG_CONTENT);
    expect(config.plugins[0].package).toBe('file:///workspace/home/.cubefarm/bin/opencode-plugin');
    expect(config.plugins[0].options).toMatchObject({ eventsFile: spec.events, model: { providerID: 'openai', id: 'test-model', variant: 'medium' } });
    expect(config.plugins[0].options).not.toHaveProperty('notifyUrl');
    expect(env.XDG_DATA_HOME).toBe('/workspace/home/.cubefarm/opencode/data');
    expect(JSON.stringify([...box.files.values()])).not.toContain('fake-scoped-token');
    const tail = box.sessions.find(s => s.cmd.includes('tail -c'))!;
    tail.onData(JSON.stringify({ hook_event_name: 'UserPromptSubmit', session_id: config.plugins[0].options.sessionID, prompt: 'Do one task' }) + '\n');
    expect(box.record()?.resumeId).toBe(config.plugins[0].options.sessionID);
    tail.onData(JSON.stringify({ hook_event_name: event, session_id: config.plugins[0].options.sessionID, last_assistant_message: 'Done', error: 'Provider unavailable' }) + '\n');
    await vi.advanceTimersByTimeAsync(3000);
    expect(finished).toHaveBeenCalledOnce();
    expect(finished.mock.calls[0][0]).toMatchObject(event === 'TurnComplete' ? { ok: true, text: 'Done' } : event === 'TurnError' ? { ok: false } : { ok: false, interrupted: true });
    expect(localSpawn).not.toHaveBeenCalled();
    handle.stop();
    term.dispose();
  });

  it('detaches the office connection without sending a kill to the remote CLI', async () => {
    const { BoxPty } = await import('./boxCli.ts');
    const box = remote();
    const gone = vi.fn();
    const pty = new BoxPty({ api: box.api, boxId: 'test-box', token: 'test', cols: 80, rows: 24, offset: 0, event: () => undefined, save: () => undefined, gone }, '/test');
    await pty.open('new');
    pty.detach();
    expect(box.commands).toEqual([]);
    expect(gone).not.toHaveBeenCalled();
    // This proves only our adapter's contract, NOT Upstash's actual process lifetime.
  });

  it('closes an idle cloud CLI at exactly five minutes without Clear desk', async () => {
    vi.resetModules();
    vi.useFakeTimers();
    const runner = await import('./cliRunner.ts');
    runner.hooksReady();
    const box = remote();
    const term = new AgentTerminal();
    let completedAt = 0;
    const finished = vi.fn(() => { completedAt = Date.now(); });
    const handle = runner.startCliSession({ cwd: '/remote/work', prompt: 'One task', systemAppend: '', cli: 'opencode', model: 'openai/fake', effort: 'medium', role: 'agent', terminal: term, keepAlive: true, browserTesting: false, additionalDirectories: [], box: box.target },
      { log: () => undefined, tool: () => undefined, sessionId: () => undefined, browserUrl: () => undefined, screenshot: () => undefined, finished });
    try {
      await vi.advanceTimersByTimeAsync(0);
      const tail = box.sessions.find(s => s.cmd.includes('tail -c'))!;
      tail.onData(JSON.stringify({ hook_event_name: 'TurnComplete', last_assistant_message: 'Done' }) + '\n');
      await vi.advanceTimersByTimeAsync(3000);
      expect(finished).toHaveBeenCalledOnce();
      expect(box.record()).not.toBeNull();
      await vi.advanceTimersByTimeAsync(completedAt + 5 * 60_000 - Date.now() - 1);
      expect(box.record()).not.toBeNull();
      await vi.advanceTimersByTimeAsync(1);
      expect(box.record()).toBeNull();
      expect(localSpawn).not.toHaveBeenCalled();
    } finally { handle.stop(); term.dispose(); }
  });

  it.each(['TurnError', 'Interrupt'])('replays %s that arrived while the office was closed, without a new task', async (event) => {
    vi.resetModules();
    vi.useFakeTimers();
    const runner = await import('./cliRunner.ts');
    const box = remote();
    box.api.run = async () => ({ code: 0, output: 'GONE' });
    const rec: BoxCliRecord = { boxId: 'test-box', cli: 'opencode', token: 'kept', dir: '/kept', offset: 0, resumeId: 'ses_kept', busy: true };
    box.files.set('/kept/events.jsonl', JSON.stringify({ hook_event_name: event, session_id: 'ses_kept', error: 'Remote failure' }) + '\n');
    const term = new AgentTerminal();
    const back = await runner.reconnectBoxClis([{ agentId: 'test-agent', rec, api: box.api, record: box.target.record }], () => term);
    expect(back).toEqual([{ agentId: 'test-agent', cli: 'opencode', resumeId: 'ses_kept', busy: true }]);
    const finished = vi.fn();
    runner.startCliSession({ cwd: '/remote/work', prompt: '', systemAppend: '', cli: 'opencode', model: '', effort: 'medium', role: 'agent', terminal: term, reattach: true, browserTesting: false, additionalDirectories: [] },
      { log: () => undefined, tool: () => undefined, sessionId: () => undefined, browserUrl: () => undefined, screenshot: () => undefined, finished });
    runner.hooksReady();
    await vi.advanceTimersByTimeAsync(3000);
    expect(finished).toHaveBeenCalledOnce();
    expect(finished.mock.calls[0][0]).toMatchObject(event === 'TurnError' ? { ok: false, errors: ['OpenCode: Remote failure'] } : { ok: false, interrupted: true });
    expect(box.sessions).toEqual([]);
    expect(localSpawn).not.toHaveBeenCalled();
    term.dispose();
  });
});
