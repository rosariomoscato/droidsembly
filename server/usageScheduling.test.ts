import { afterEach, describe, expect, it, vi } from 'vitest';
import { Swarm } from './swarm.ts';

// Exercise real admission/scheduling methods with no constructor, filesystem, CLI, GitHub or AI backend.
function office() {
  const s = Object.create(Swarm.prototype) as any;
  const agent = (id: string, provider: string, role = 'developer') => ({ id, name: id, repoId: role === 'ceo' ? '' : 'repo', role, cli: 'opencode', model: `${provider}/model`, status: 'idle', task: null, desk: id === 'a' ? 1 : 2 });
  const agents = [agent('a', 'one'), agent('b', 'two'), agent('ceo', 'one', 'ceo')];
  s.state = { agents, aiResources: {}, aiQuotas: {}, aiGroups: {}, qa: [], repos: [], settings: { runtime: 'terminal', defaultCli: 'opencode', defaultModel: '', pacingSessions: 1, sessionLimit: 0 }, ceo: { queue: [{ kind: 'chat', text: 'fixture' }], job: null } };
  s.backend = { terminals: true, demo: true };
  s.quotaWaiting = new Map();
  s.repoRt = new Map([['repo', { pulls: [{ number: 1, headRefName: 'branch' }] }]]);
  s.prepStrikes = new Map();
  s.save = vi.fn(); s.emitUsage = vi.fn(); s.emitAgent = vi.fn(); s.emitCeo = vi.fn(); s.postMessage = vi.fn();
  s.runCeoJob = vi.fn(); s.runQa = vi.fn(); s.runFix = vi.fn();
  s.floorState = () => ({ fetchedAt: 0, openIssues: [], closedIssues: new Map(), closedPulls: new Map(), pulls: [{ number: 1, state: 'OPEN' }] });
  s.readyIssues = () => [{ issue: { number: 1 } }];
  s.assign = vi.fn(async (id: string) => { s.agent(id).status = 'preparing'; });
  for (const a of agents) s.recordResource(a, { tool: 'opencode', provider: a.model.split('/')[0], model: 'model', account: 'same-connection', access: 'unknown' });
  return s;
}
afterEach(() => vi.useRealTimers());

describe('AI quota scheduling integration', () => {
  it.each(['issue','qa','fix'])('pauses new cloud %s without blocking local agents or the CEO', kind => {
    const s=office();s.state.settings.cloud={pauseNewWork:true};s.agent('a').host='box';
    expect(s.mayStart(kind,s.agent('a'))).toBe(false);
    expect(s.mayStart(kind,s.agent('b'))).toBe(true);
    expect(s.mayStart('ceo',s.agent('ceo'))).toBe(true);
    expect(()=>s.ensureUsage(s.agent('a'),kind)).toThrow(/New cloud work is paused/);
    expect(s.agent('a')).toMatchObject({status:'idle',task:null});
  });
  it.each(['qa','fix'])('does not begin direct cloud %s or mutate a PR while paused',async kind=>{
    const s=office();s.state.settings.cloud={pauseNewWork:true};s.agent('a').host='box';s.beginTask=vi.fn();s.setQa=vi.fn();
    await (Swarm.prototype as any)[kind==='qa'?'runQa':'runFix'].call(s,s.agent('a'),{id:'repo'},{prNumber:1,status:'queued'});
    expect(s.beginTask).not.toHaveBeenCalled();expect(s.setQa).not.toHaveBeenCalled();
  });
  it('holds a prepared cloud session before provider startup when work is paused meanwhile',()=>{
    const s=office(),a=s.agent('a');s.state.settings.cloud={pauseNewWork:true};a.host='box';a.task='qa';
    s.agentRt=new Map([[a.id,{}]]);s.backend.startSession=vi.fn();s.sessionRuntime=vi.fn();
    s.launchSession(a,{id:'repo'},'/synthetic','synthetic prompt','',undefined,undefined,null);
    expect(a.status).toBe('stopped');expect(s.quotaWaiting.has(a.id)).toBe(true);
    expect(s.backend.startSession).not.toHaveBeenCalled();expect(s.sessionRuntime).not.toHaveBeenCalled();
  });
  it('holds a prepared task before provisioning or waking its Box when paused meanwhile',()=>{
    const s=office(),a=s.agent('a');s.state.settings.cloud={pauseNewWork:true};a.host='box';
    s.agentRt=new Map([[a.id,{}]]);s.boxTarget=vi.fn();s.sessionRuntime=vi.fn();
    s.startAgentSession(a,{id:'repo'},'/synthetic','synthetic prompt','');
    expect(s.boxTarget).not.toHaveBeenCalled();expect(s.sessionRuntime).not.toHaveBeenCalled();
    expect(s.quotaWaiting.has(a.id)).toBe(true);
  });
  it('keeps held cloud launches pending through scheduler ticks and still respects quota after resuming',()=>{
    const s=office(),a=s.agent('a'),launch=vi.fn();a.host='box';s.state.settings.cloud={pauseNewWork:true};
    s.tickUsage=vi.fn();s.progressTick=vi.fn();s.officeUpdateTick=()=>false;s.applyTeamChanges=vi.fn();s.maybeHeartbeat=vi.fn();
    s.slotsFull=()=>false;s.limited=()=>false;s.quotaWaiting.set(a.id,launch);
    s.schedule();expect(launch).not.toHaveBeenCalled();expect(s.quotaWaiting.has(a.id)).toBe(true);
    s.state.settings.cloud.pauseNewWork=false;s.limited=()=>true;
    s.schedule();expect(launch).not.toHaveBeenCalled();
    s.limited=()=>false;s.schedule();expect(launch).toHaveBeenCalledOnce();expect(s.quotaWaiting.has(a.id)).toBe(false);
  });
  it.each(['queued','failed'])('respects backend admission before preparing automatic pipeline work (%s)',status=>{
    const s=office();s.backend.allowWork=vi.fn((kind:string)=>kind==='issue'||kind==='ceo');
    const rec={repoId:'repo',prNumber:1,status,devAgentId:'a',updatedAt:0};s.state.qa=[rec];
    expect(s.startPipelineWork({id:'repo'})).toBe(false);
    expect(s.runQa).not.toHaveBeenCalled();expect(s.runFix).not.toHaveBeenCalled();expect(rec.status).toBe(status);
    expect(s.state.agents.every((a:any)=>a.status==='idle'&&a.task===null)).toBe(true);
  });
  it.each(['qa','fix'])('refuses direct %s preparation when backend admission is denied',async kind=>{
    const s=office();s.backend.allowWork=()=>false;s.beginTask=vi.fn();s.setQa=vi.fn();
    const method=kind==='qa'?'runQa':'runFix';
    await (Swarm.prototype as any)[method].call(s,s.agent('a'),{id:'repo'},{prNumber:1,status:'queued'});
    expect(s.beginTask).not.toHaveBeenCalled();expect(s.setQa).not.toHaveBeenCalled();expect(s.agent('a')).toMatchObject({status:'idle',task:null});
  });
  it('uses only policy-eligible testers without falling back to a denied resource',()=>{
    const s=office();s.backend.allowWork=(kind:string,a:{id:string})=>kind==='qa'&&a.id==='b';const rec={repoId:'repo',prNumber:1,status:'queued',devAgentId:'a',updatedAt:0};s.state.qa=[rec];
    expect(s.startPipelineWork({id:'repo'})).toBe(true);expect(s.runQa).toHaveBeenCalledExactlyOnceWith(s.agent('b'),{id:'repo'},rec);expect(s.runFix).not.toHaveBeenCalled();
  });
  it('cancels a deferred launch when its task is cleared', () => {
    const s = office();
    const launch = vi.fn();
    s.quotaWaiting.set('a', launch);
    s.clearTask(s.agent('a'));
    expect(s.quotaWaiting.has('a')).toBe(false);
    expect(launch).not.toHaveBeenCalled();
  });
  it('starts queued QA only on an eligible resource and holds an author’s fix instead of changing provider', () => {
    const s = office();
    s.pauseForLimit(Date.now() + 60000, s.agent('a'));
    const rec = { repoId: 'repo', prNumber: 1, status: 'queued', devAgentId: 'a', updatedAt: 0 };
    s.state.qa = [rec];
    expect(s.startPipelineWork({ id: 'repo' })).toBe(true);
    expect(s.runQa).toHaveBeenCalledWith(s.agent('b'), { id: 'repo' }, rec);
    rec.status = 'failed';
    expect(s.startPipelineWork({ id: 'repo' })).toBe(false);
    expect(s.runFix).not.toHaveBeenCalled();
  });
  it('blocks the actual shared connection including CEO while another provider starts an issue', () => {
    const s = office();
    s.pauseForLimit(Date.now() + 60000, s.agent('a'));
    expect(s.available({ id: 'repo' }).map((a: any) => a.id)).toEqual(['b']);
    s.startCeoWork();
    expect(s.runCeoJob).not.toHaveBeenCalled();
    expect(s.state.ceo.queue).toHaveLength(1);
    expect(s.startIssueWork({ id: 'repo', autoAssign: false })).toBe(false);
    expect(s.startIssueWork({ id: 'repo', autoAssign: true })).toBe(true);
    expect(s.assign).toHaveBeenCalledWith('b', 1);
  });
  it('counts only the affected quota for pacing and keeps QA/fix/CEO eligible', () => {
    const s = office();
    s.agent('b').status = 'working';
    s.paceForWarning({ resetsAt: Date.now() + 60000, utilization: .9, rateLimitType: 'weekly' }, s.agent('a'));
    expect(s.mayStart('issue', s.agent('a'))).toBe(true);
    s.agent('ceo').status = 'working';
    expect(s.mayStart('issue', s.agent('a'))).toBe(false);
    for (const kind of ['qa', 'fix', 'ceo']) expect(s.mayStart(kind, s.agent('a'))).toBe(true);
  });
  it('joins tools only after confirmation, persists gates, and does not bypass a hard limit on unlink', () => {
    const s = office();
    s.agent('b').cli = 'codex';
    const a = s.resourceKey(s.agent('a')), b = s.resourceKey(s.agent('b'));
    s.setUsageGroup(a, 'confirmed'); s.setUsageGroup(b, 'confirmed');
    s.pauseForLimit(Date.now() + 60000, s.agent('a'));
    expect(s.limited(s.agent('b'))).toBe(true);
    s.state = JSON.parse(JSON.stringify(s.state));
    expect(s.limited(s.agent('b'))).toBe(true);
    s.setUsageGroup(b, '');
    expect(s.limited(s.agent('b'))).toBe(true);
    expect(() => s.resumeFullSpeed(b)).toThrow(/hard limit/);
  });
  it('keeps history and provider-level limits when changing model, releases a different provider', () => {
    const s = office();
    s.pauseForLimit(Date.now() + 60000, s.agent('a'));
    s.agent('a').model = 'one/another-model';
    expect(s.limited(s.agent('a'))).toBe(true);
    s.agent('a').model = 'new-provider/model';
    expect(s.limited(s.agent('a'))).toBe(false);
    expect(s.limited(s.agent('a'), true)).toBe(true); // the previous failure still belongs to its observed resource
  });
  it('resumes only a selected paced quota and keeps unrelated limits', () => {
    vi.useFakeTimers();
    const s = office(), warning = { resetsAt: Date.now() + 60000, utilization: .9, rateLimitType: 'weekly' };
    s.paceForWarning(warning, s.agent('a')); s.paceForWarning(warning, s.agent('b'));
    const b = s.resourceKey(s.agent('b'));
    s.resumeFullSpeed(b);
    expect(s.usageNow().resources.find((r: any) => r.key === b).state).toBe('normal');
    expect(s.usageNow().resources.find((r: any) => r.agentIds.includes('a')).state).toBe('pacing');
    vi.clearAllTimers();
  });
});
