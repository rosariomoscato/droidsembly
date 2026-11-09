import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { OpenCodeBoxGate, type GateReadiness } from './openCodeBoxGate.ts';
import { createDemoBackend } from './demo.ts';
import type { BoxApi, BoxInfo } from './box.ts';
import type { SessionCallbacks, SessionOptions } from './agentRunner.ts';
import type { AgentView } from '../shared/types.ts';
import { createOfficeTools } from './ceo.ts';
import { boxDeskDir, tmuxKill } from './boxScripts.ts';
import { boxSessionFilesScripts } from './boxSessionFiles.ts';
import type { OpenCodePermissionRule } from '../shared/opencodePermissions.ts';

// Contract matcher for standalone scanner resources (not an OS sandbox or a replacement for OpenCode's scanner).
function decision(rules:OpenCodePermissionRule[],action:string,resource:string) {
  const match=(value:string,pattern:string)=>{
    let regex=pattern.replace(/[.+^${}()|[\]\\]/g,'\\$&').replace(/\*/g,'.*').replace(/\?/g,'.');
    if(regex.endsWith(' .*'))regex=regex.slice(0,-3)+'( .*)?';
    return new RegExp(`^${regex}$`,'s').test(value);
  };
  return [...rules].reverse().find(r=>match(action,r.action)&&match(resource,r.resource))?.effect??'ask';
}

const repository='test-owner/synthetic';
const model='openai/test-model#medium';
const home=path.join(process.env.SWARM_HOME!,'gate-unit');
function fixture() {
  let now=1_000;
  const plan={runId:'test-run-1234',repository,model,localVersion:'2.2.5',remoteVersion:'2.2.6',ceoDirectory:path.join(home,'ceo'),repositoryDirectory:path.join(home,'project'),workMs:25*60000,totalMs:30*60000};
  const gate=new OpenCodeBoxGate(plan,()=>now);
  let box:BoxInfo|null=null;
  const create=vi.fn<BoxApi['create']>(async o=>box={id:'real-adapter-box',name:o.name,labels:o.labels,status:'running'});
  const remove=vi.fn(async()=>{});const run=vi.fn(async()=>({code:0,output:'actual fake-adapter output'}));
  const raw:BoxApi={create,list:async()=>box?[box]:[],get:async()=>box,remove,run,resume:async()=>{},pause:async()=>{},read:async()=>null,write:async()=>{},files:async()=>[],session:async()=>{throw new Error('not used');},browser:async()=>true};
  const base=createDemoBackend();
  const started:{options:SessionOptions;callbacks:SessionCallbacks;stop:ReturnType<typeof vi.fn>}[]=[];
  const start=base.startSession=vi.fn((options,callbacks)=>{const stop=vi.fn();started.push({options,callbacks,stop});return{stop,send:vi.fn()};});
  base.createIssue=vi.fn(async()=>17);
  const backend=gate.backend(base,raw,{upstashBoxKey:'manual-box-key',cloudGithubToken:'github_pat_manual_fake'});
  const api=backend.cloud.boxes('manual-box-key');
  const ceo={id:'ceo',role:'ceo',host:'local',model,cli:'opencode'} as AgentView;
  const worker={id:'a1b2c3d4-worker',role:'agent',host:'box',repoId:repository,model,cli:'opencode',issueNumber:17,branch:'swarm/issue-17-worker'} as AgentView;
  let agents=[ceo,worker];
  const originalCall=vi.fn(async(name:string)=>`${name}: actual delegated handler`);
  const originalOffice={...createOfficeTools({companyStatus:()=>'',agentDetail:()=>'',setFloorProfile:()=>'',scaleTeam:()=>'',configureAgent:()=>'',fileIssue:async()=>'',setDependencies:async()=>'',closeIssue:async()=>'',retryQa:async()=>'',sendBack:async()=>'',rerunChecks:async()=>'',closePull:async()=>'',escalate:async()=>''}),call:originalCall};
  const callbacks=()=>({log:vi.fn(),tool:vi.fn(),sessionId:vi.fn(),browserUrl:vi.fn(),screenshot:vi.fn(),finished:vi.fn()});
  const options=(role:'ceo'|'agent'):SessionOptions=>({cwd:role==='ceo'?plan.ceoDirectory:boxDeskDir(repository),model,role,cli:'opencode',terminal:{} as SessionOptions['terminal'],agentId:role==='ceo'?ceo.id:worker.id,prompt:'Synthetic task',systemAppend:'',effort:'medium',additionalDirectories:[],browserTesting:false,...(role==='ceo'?{office:originalOffice}:{task:'issue',box:{api,boxId:'real-adapter-box',env:{GH_TOKEN:'github_pat_manual_fake'},apiKeyHelper:null,browser:false,record:()=>{}}})});
  const inventory={directory:plan.ceoDirectory,defaultModel:null,models:[{id:'openai/test-model',provider:'openai',name:'Test',variants:['medium'],tools:true}]};
  const ready:GateReadiness={repositoryPrivate:true,localVersion:'2.2.5',remoteVersion:'2.2.6',localOAuth:true,remoteOAuth:true,deviceMethod:{id:'remote-discovered-device',type:'oauth',label:'Codex device code (legacy)'},localModels:inventory,remoteModels:inventory};
  const prepare=async()=>{await api.create({name:'isolated-box',labels:['cubefarm','cf:test','m:a1b2c3d4'],size:'small'});gate.bindActors(ceo,worker,()=>({agents}));gate.authenticated(ready);};
  const approve=()=>gate.approve({runId:plan.runId,repository,model});
  return{gate,plan,base,backend,api,raw,create,remove,run,start,started,ceo,worker,callbacks,options,ready,prepare,approve,originalCall,setAgents:(value:AgentView[])=>{agents=value;},expire:()=>{now+=25*60000;}};
}

describe('OpenCode phase-2 gate, fake adapters only',()=>{
  it('checks before the new shell file transport and blocks it before any remote mutation if the index fails',async()=>{
    const f=fixture(),observer=vi.fn(async()=>{throw new Error('Synthetic unreadable index');});f.gate.observeWorkerIndex(observer);
    await f.prepare();f.approve();f.backend.startSession(f.options('ceo'),f.callbacks());await f.backend.createIssue(repository,'Clamp','Body');f.backend.startSession(f.options('agent'),f.callbacks());
    const script=boxSessionFilesScripts('/workspace/home/.cubefarm/sessions/01234567-89ab-cdef-0123-456789abcdef',[['/workspace/home/.cubefarm/sessions/01234567-89ab-cdef-0123-456789abcdef/launch.json','synthetic']])[0];
    f.run.mockClear();await expect(f.api.run('real-adapter-box',script)).rejects.toThrow('unreadable');expect(f.run).not.toHaveBeenCalled();expect(observer).toHaveBeenCalledExactlyOnceWith('before-worker-files');
  });
  it('shares a pending preflight across concurrent uploads and blocks all of them on failure',async()=>{
    const f=fixture();let reject!:(error:Error)=>void;
    const pending=new Promise<void>((_resolve,no)=>{reject=no;});const observer=vi.fn(()=>pending);
    f.gate.observeWorkerIndex(observer);const write=f.raw.write=vi.fn(async()=>{});
    await f.prepare();f.approve();f.backend.startSession(f.options('ceo'),f.callbacks());await f.backend.createIssue(repository,'Clamp','Body');f.backend.startSession(f.options('agent'),f.callbacks());
    const uploads=[f.api.write('real-adapter-box','/synthetic/a','a'),f.api.write('real-adapter-box','/synthetic/b','b')];
    await Promise.resolve();expect(observer).toHaveBeenCalledOnce();expect(write).not.toHaveBeenCalled();
    reject(new Error('Synthetic unreadable index'));
    expect((await Promise.allSettled(uploads)).map(result=>result.status)).toEqual(['rejected','rejected']);
    expect(write).not.toHaveBeenCalled();expect(observer).toHaveBeenCalledOnce();
  });
  it('checks the index once before worker uploads and once before the terminal, not during auth or every tail',async()=>{
    const f=fixture(),order:string[]=[];
    f.gate.observeWorkerIndex(async stage=>{order.push(stage);});
    f.raw.write=async()=>{order.push('write');};f.raw.session=async()=>{order.push('session');return {done:Promise.resolve(0),write:()=>{},resize:()=>{},close:()=>{}};};
    await f.prepare();await f.api.write('real-adapter-box','/synthetic/auth-helper','synthetic');expect(order).toEqual(['write']);order.length=0;
    f.approve();f.backend.startSession(f.options('ceo'),f.callbacks());await f.backend.createIssue(repository,'Clamp','Body');f.backend.startSession(f.options('agent'),f.callbacks());
    await f.api.write('real-adapter-box','/synthetic/settings','synthetic');await f.api.write('real-adapter-box','/synthetic/launch','synthetic');await f.api.session('real-adapter-box',{cmd:'synthetic',onData:()=>{}});await f.api.session('real-adapter-box',{cmd:'synthetic tail',onData:()=>{}});
    expect(order).toEqual(['before-worker-files','write','write','before-worker-start','session','session']);expect(f.start).toHaveBeenCalledTimes(2);
  });
  it.each(['before-worker-files','before-worker-start'] as const)('blocks the worker at %s without repairing Git or starting a terminal',async stage=>{
    const f=fixture();f.gate.observeWorkerIndex(async point=>{if(point===stage)throw new Error('Synthetic unreadable index');});const session=f.raw.session=vi.fn(async()=>{throw new Error('Must not launch');});const write=f.raw.write=vi.fn(async()=>{});
    await f.prepare();f.approve();f.backend.startSession(f.options('ceo'),f.callbacks());await f.backend.createIssue(repository,'Clamp','Body');f.backend.startSession(f.options('agent'),f.callbacks());
    if(stage==='before-worker-files'){await expect(f.api.write('real-adapter-box','/synthetic/settings','synthetic')).rejects.toThrow('unreadable');expect(write).not.toHaveBeenCalled();}
    else{await f.api.write('real-adapter-box','/synthetic/settings','synthetic');await expect(f.api.session('real-adapter-box',{cmd:'synthetic',onData:()=>{}})).rejects.toThrow('unreadable');}
    expect(session).not.toHaveBeenCalled();expect(f.gate.snapshot()).toMatchObject({phase:'failed',reason:'worker-index-not-ready'});
  });
  it.each([
    'pwd',
    'git add -- clamp.mjs clamp.test.mjs',
    `gh pr create --draft --repo ${repository} --base main --head swarm/issue-17-worker --title "Implement clamp with node:test coverage" --body "Closes #17"`,
  ])('permits bounded orientation and delivery commands observed in the worker (%s)',async command=>{
    const f=fixture();await f.prepare();f.approve();
    f.backend.startSession(f.options('ceo'),f.callbacks());await f.backend.createIssue(repository,'Clamp','Body');
    f.backend.startSession(f.options('agent'),f.callbacks());
    expect(decision(f.started[1].options.openCodePermissions!,'shell',command)).toBe('allow');
  });
  it.each([
    'pwd -P','pwd -L','pwd /another/repo','pwd > .env','pwd && printenv','bash -c "pwd"',
    'git add -A','git add -- clamp.mjs clamp.test.mjs .env','git add -- ../other/file',
    'git commit --amend -m "Implement clamp"','git commit -m "Implement clamp" --no-verify',
    'git push --force -u origin swarm/issue-17-worker','git push -u origin other-branch',
    'gh pr merge 1','gh repo edit test-owner/synthetic --visibility public',
    'gh pr create --repo other/repo --base main --head swarm/issue-17-worker --title "Implement clamp with node:test coverage" --body "Closes #17"',
    `gh pr create --repo ${repository} --base main --head swarm/issue-17-worker --title "Implement clamp with node:test coverage" --body "Closes #17" --repo other/repo`,
    'git -C /another/repo add -- clamp.mjs clamp.test.mjs','bash -c "git add -A"','node -e "process.env"',
  ])('keeps unapproved delivery operations denied (%s)',async command=>{
    const f=fixture();await f.prepare();f.approve();f.backend.startSession(f.options('ceo'),f.callbacks());await f.backend.createIssue(repository,'Clamp','Body');f.backend.startSession(f.options('agent'),f.callbacks());
    expect(decision(f.started[1].options.openCodePermissions!,'shell',command)).toBe('deny');
  });
  it('keeps delivery permissions finite and gives the worker exact commands without expanding directory access',async()=>{
    const f=fixture();await f.prepare();f.approve();f.backend.startSession(f.options('ceo'),f.callbacks());await f.backend.createIssue(repository,'Clamp','Body');f.backend.startSession(f.options('agent'),f.callbacks());
    const options=f.started[1].options;const rules=options.openCodePermissions!;
    expect(rules.filter(r=>r.action==='shell'&&r.effect==='allow').every(r=>!/[?*]/.test(r.resource))).toBe(true);
    expect(rules.filter(r=>r.action==='external_directory'&&r.effect==='allow')).toEqual([]);
    expect(decision(rules,'edit','/workspace/home/repos/test-owner__synthetic/.git/index')).toBe('deny');
    expect(decision(rules,'external_directory','/workspace/home/repos/test-owner__synthetic/.git/*')).toBe('deny');
    expect(decision(rules,'subagent','general')).toBe('deny');
    expect(options.prompt).toContain('git add -- clamp.mjs clamp.test.mjs');
    expect(options.systemAppend).toContain(`--repo ${repository} --base main --head swarm/issue-17-worker`);
    expect(options.systemAppend).toContain('--body "Closes #17"');
    for(const text of [options.prompt,options.systemAppend]){
      expect(text).toContain('For orientation, only the exact shell command pwd is permitted');
      expect(text).toContain('Use native read, glob and grep tools');
      expect(text).toContain('Do not try ls, cat, find, env, shell wrappers or extra flags');
      expect(text).toContain('If a required action is denied, report the exact denied action and stop');
    }
    for(const action of ['read','glob','grep'])expect(decision(rules,action,'clamp.mjs')).toBe('allow');
    expect(options.prompt).not.toContain('github_pat_manual_fake');
  });
  it('never starts AI on import/preparation/authentication/model listing; approval is one-shot',async()=>{
    const f=fixture();await f.prepare();
    expect(f.gate.snapshot().phase).toBe('awaiting-approval');
    expect(f.backend.allowWork!('ceo',f.ceo)).toBe(false);
    expect(()=>f.backend.startSession(f.options('ceo'),f.callbacks())).toThrow('locked');
    expect(f.start).not.toHaveBeenCalled();
    f.approve();expect(()=>f.approve()).toThrow('Approval');
    expect(f.backend.allowWork!('ceo',f.ceo)).toBe(true);
  });
  it('caps Box creation at one, forces no browser, preserves real responses and keeps teardown available',async()=>{
    const f=fixture();await f.prepare();
    expect(f.create).toHaveBeenCalledWith(expect.objectContaining({browser:false,size:'small'}));
    await expect(f.api.create({name:'extra',labels:[],size:'small'})).rejects.toThrow('one small');
    expect(f.create).toHaveBeenCalledOnce();
    expect(()=>f.api.get('other-box')).toThrow('outside');
    expect(await f.api.browser('real-adapter-box')).toBe(false);
    f.expire();
    expect(()=>f.api.run('real-adapter-box','echo task')).toThrow('stopped');
    await f.api.run('real-adapter-box',tmuxKill('abcdef12-3456'));
    expect(f.run).toHaveBeenCalledOnce();
    await f.api.remove('real-adapter-box');expect(f.remove).toHaveBeenCalledWith('real-adapter-box');
  });
  it('reserves an ambiguous create and never retries it',async()=>{
    const f=fixture();f.create.mockRejectedValueOnce(new Error('ambiguous SDK error'));
    await expect(f.api.create({name:'one',labels:[],size:'small'})).rejects.toThrow('ambiguous');
    await expect(f.api.create({name:'two',labels:[],size:'small'})).rejects.toThrow('one small');
    expect(f.create).toHaveBeenCalledOnce();expect(f.gate.snapshot().phase).toBe('failed');
  });
  it('rejects stale model/run approvals, missing variants, wrong auth method or non-private repository',async()=>{
    const f=fixture();await f.prepare();
    for(const approval of [{runId:'wrong',repository,model},{runId:f.plan.runId,repository:'test-owner/other',model},{runId:f.plan.runId,repository,model:'openai/other#medium'}])expect(()=>f.gate.approve(approval)).toThrow('Approval');
    expect(f.start).not.toHaveBeenCalled();
    for(const change of [{localOAuth:false},{repositoryPrivate:false},{remoteVersion:'2.2.7'},{deviceMethod:{id:'loopback',type:'oauth',label:'Sign in with ChatGPT'}},{remoteModels:{...f.ready.remoteModels,models:[]}}]) {
      const g=fixture();await g.api.create({name:'one',labels:['m:a1b2c3d4'],size:'small'});g.gate.bindActors(g.ceo,g.worker,()=>({agents:[g.ceo,g.worker]}));
      expect(()=>g.gate.authenticated({...g.ready,...change})).toThrow('verified');
    }
  });
  it('denies merge, other repositories, ambient-token lookup and issue mutations before approval',async()=>{
    const f=fixture();await f.prepare();
    await expect(f.backend.mergePull(repository,1,'squash')).rejects.toThrow('not allowed');
    await expect(f.backend.createIssue(repository,'Task','Body')).rejects.toThrow('locked');
    expect(()=>f.backend.listIssues('other/repository')).toThrow('outside');
    await expect(f.backend.cloud.ghToken()).rejects.toThrow('forbidden');
    expect(f.backend.cloud.credentials).toEqual({upstashBoxKey:'manual-box-key',cloudGithubToken:'github_pat_manual_fake'});
    expect(JSON.stringify(f.gate.snapshot())).not.toMatch(/manual-box-key|github_pat/);
  });
  it('delegates allowed CEO office tools but refuses scaling and changing model/CLI',async()=>{
    const f=fixture();await f.prepare();f.approve();
    f.backend.startSession(f.options('ceo'),f.callbacks());
    const office=f.started[0].options.office!;
    expect(await office.call('company_status',{})).toContain('actual delegated handler');
    expect(f.originalCall).toHaveBeenCalledWith('company_status',{});
    expect(await office.call('scale_team',{floor:1,size:2,reason:'extra'})).toContain('Refused');
    expect(await office.call('configure_agent',{agent_id:f.worker.id,model:'other'})).toContain('Refused');
    expect(f.originalCall).toHaveBeenCalledOnce();
    expect(f.started[0].options.openCodePermissions).toContainEqual({action:'subagent',resource:'*',effect:'deny'});
    expect(f.started[0].options.openCodePermissions).not.toContainEqual({action:'shell',resource:'*',effect:'allow'});
  });
  it('uses one actual CEO and one actual Box worker, then requires tests at the open PR head',async()=>{
    const f=fixture();await f.prepare();f.approve();
    f.backend.startSession(f.options('ceo'),f.callbacks());
    expect(await f.backend.createIssue(repository,'Clamp','Synthetic task')).toBe(17);
    await expect(f.backend.createIssue(repository,'Second','No')).rejects.toThrow('one CEO-issued');
    f.backend.startSession(f.options('agent'),f.callbacks());
    expect(f.started).toHaveLength(2);
    expect(f.started[1].options.box?.api).toBe(f.api);
    expect(f.started[1].options.keepAlive).toBe(false);
    expect(f.backend.allowWork!('issue',f.worker)).toBe(false);
    expect(f.backend.allowWork!('qa',f.worker)).toBe(false);
    for(const s of f.started)s.callbacks.finished({ok:true,text:'done',errors:[],costUsd:0,turns:1});
    expect(f.gate.snapshot().phase).toBe('verifying');
    const result={repository,testsCode:0,testHead:'abc',prHead:'abc',prBranch:f.worker.branch!,prState:'OPEN',crossRepository:false,closesIssues:[17]};
    expect(()=>f.gate.verify({...result,testsCode:1})).toThrow('actual remote tests');
    expect(()=>f.gate.verify({...result,prHead:'different'})).toThrow();
    expect(()=>f.gate.verify({...result,prState:'MERGED'})).toThrow();
    expect(()=>f.gate.verify({...result,crossRepository:true})).toThrow();
    f.gate.verify(result);expect(f.gate.snapshot().phase).toBe('complete');
  });
  it('refuses local fallback, wrong model, extra agents, second sessions and stops active work on failure',async()=>{
    const wrong=fixture();await wrong.prepare();wrong.approve();
    expect(()=>wrong.backend.startSession({...wrong.options('ceo'),model:'openai/other#medium'},wrong.callbacks())).toThrow('violates');
    expect(wrong.gate.snapshot().phase).toBe('failed');expect(wrong.start).not.toHaveBeenCalled();
    for(const problem of ['local','extra','duplicate']) {
      const f=fixture();await f.prepare();f.approve();
      f.backend.startSession(f.options('ceo'),f.callbacks());await f.backend.createIssue(repository,'One','Body');
      if(problem==='local')expect(()=>f.backend.startSession({...f.options('agent'),box:undefined},f.callbacks())).toThrow('remote Box');
      if(problem==='extra'){f.setAgents([f.ceo,f.worker,{...f.worker,id:'extra'}]);expect(f.backend.allowWork!('issue',f.worker)).toBe(false);expect(()=>f.backend.startSession(f.options('agent'),f.callbacks())).toThrow('violates');}
      if(problem==='duplicate'){f.backend.startSession(f.options('agent'),f.callbacks());expect(()=>f.backend.startSession(f.options('agent'),f.callbacks())).toThrow('violates');}
      expect(f.gate.snapshot().phase).toBe('failed');
    }
    const f=fixture();await f.prepare();f.approve();
    f.backend.startSession(f.options('ceo'),f.callbacks());await f.backend.createIssue(repository,'One','Body');f.backend.startSession(f.options('agent'),f.callbacks());
    f.started[0].callbacks.finished({ok:false,text:'',errors:['provider rejected'],costUsd:0,turns:0});
    expect(f.gate.snapshot().phase).toBe('failed');expect(f.started[1].stop).toHaveBeenCalledOnce();
  });
  it('never extends the original deadline on model approval or verification',async()=>{
    const f=fixture();await f.prepare();const deadline=f.gate.snapshot().workDeadline;
    f.expire();expect(()=>f.approve()).toThrow('expired');
    expect(f.gate.snapshot().workDeadline).toBe(deadline);expect(f.start).not.toHaveBeenCalled();
    expect(()=>new OpenCodeBoxGate({...f.plan,workMs:26*60000})).toThrow('bounded');
  });
  it('does not reopen a failed/closed run when delayed successful callbacks arrive',async()=>{
    const f=fixture();await f.prepare();f.approve();
    f.backend.startSession(f.options('ceo'),f.callbacks());await f.backend.createIssue(repository,'One','Body');f.backend.startSession(f.options('agent'),f.callbacks());
    f.gate.close();
    for(const s of f.started)s.callbacks.finished({ok:true,text:'late',errors:[],costUsd:0,turns:1});
    expect(f.gate.snapshot().phase).toBe('closed');
    expect(f.gate.snapshot().finished).toEqual({ceo:false,agent:false});
    expect(f.backend.allowWork!('issue',f.worker)).toBe(false);
  });
  it('waits for an in-flight creation before deleting exactly the resulting resource',async()=>{
    const f=fixture();let resolve!:(box:BoxInfo)=>void;
    f.create.mockReturnValueOnce(new Promise<BoxInfo>(r=>{resolve=r;}));
    const creation=f.api.create({name:'pending',labels:['m:a1b2c3d4'],size:'small'});
    const cleanup=f.gate.cleanup({...f.api,remove:f.remove,get:async()=>null});
    expect(f.remove).not.toHaveBeenCalled();
    resolve({id:'late-created-box',name:'pending',labels:['m:a1b2c3d4'],status:'running'});
    await creation;expect((await cleanup).confirmedAbsent).toBe(true);
    expect(f.remove).toHaveBeenCalledExactlyOnceWith('late-created-box');
  });
});
