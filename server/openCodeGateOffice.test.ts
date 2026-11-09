import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpenCodeGateOffice, clampAcceptanceSource, type GateOfficeInput } from './openCodeGateOffice.ts';
import { GateDiagnostics } from '../shared/opencodeGateDiagnostics.ts';
import { gateGithubRead } from './githubGateDiagnostics.ts';
import { CommandError } from './exec.ts';
import { createDemoBackend } from './demo.ts';
import type { BoxApi, BoxInfo } from './box.ts';
import type { SessionCallbacks, SessionOptions } from './agentRunner.ts';
import type { IssueInfo, PullInfo } from '../shared/types.ts';
import type { PrDetails } from './github.ts';
import { gateWorktreeSnapshotSource, type GateVerification } from './openCodeGateVerification.ts';
import { boxDeskDir, sq } from './boxScripts.ts';
import { boxGateAcceptanceScript } from './openCodeGateFiles.ts';
const {home}=vi.hoisted(()=>({home:`${process.env.SWARM_HOME}/phase2-integration-${process.pid}`}));
vi.mock('./config.ts',async original=>({...await original<typeof import('./config.ts')>(),HOME_DIR:home,STATE_FILE:`${home}/state.json`,WORKSPACE_ROOT:`${home}/workspaces`}));
let office:OpenCodeGateOffice|undefined;
afterEach(async()=>{await office?.close();office=undefined;await fs.rm(home,{recursive:true,force:true,maxRetries:5});vi.restoreAllMocks();});

async function fixture(configure: (input: GateOfficeInput) => void | Promise<void> = ()=>{}) {
  const repository='demo-co/pixel-todo';
  const model='openai/test-model#medium';
  const plan={runId:'integration-run-1234',repository,model,localVersion:'2.2.5',remoteVersion:'2.2.6',ceoDirectory:path.join(home,'ceo'),repositoryDirectory:path.join(home,'project'),workMs:25*60000,totalMs:30*60000};
  const base=createDemoBackend();base.demo=false;base.demoTeam=()=>1;
  base.notify={post:async()=>200}; // no seeded demo webhooks in the isolated real-core fixture
  const meta=base.repoMeta;base.repoMeta=async repo=>({...await meta(repo),isPrivate:true});
  base.mainDir=()=>plan.repositoryDirectory;base.setLocalPath=()=>{};
  base.ensureClone=async()=>{await fs.mkdir(plan.repositoryDirectory,{recursive:true});};
  base.syncMain=async()=>null;
  const issues:IssueInfo[]=[];
  base.listIssues=async()=>issues;base.listPulls=async()=>[];
  base.createIssue=async(_repo,title,body)=>{issues.push({number:17,title,body,labels:[],url:'https://example.invalid/issue/17',createdAt:new Date().toISOString()});return 17;};
  base.detectClis=async()=>[{id:'opencode',installed:true,integrated:true,label:'OpenCode',version:'opencode v2.2.5'}];
  const models={directory:plan.ceoDirectory,defaultModel:null,models:[{id:'openai/test-model',provider:'openai',name:'Test',variants:['medium'],tools:true}]};
  base.openCodeModels=async()=>models;
  base.openCodeConnections=async()=>[{id:'openai',name:'OpenAI',methods:[{id:'remote-dynamic-device',label:'Codex device code (legacy)',type:'oauth'}],connections:[{id:'local',label:'Local',method:'oauth',environment:false,needsAuth:false}]}];
  const sessions:{options:SessionOptions;callbacks:SessionCallbacks}[]=[];
  let driver:((options:SessionOptions,callbacks:SessionCallbacks)=>Promise<void>)|undefined;
  let prReady=false;let prBranch='';
  base.prForBranch=async(_repo,_branch)=>prReady?{number:1,url:'https://example.invalid/pull/1'}:null;
  let detailsPatch:(read:number)=>Partial<PrDetails>=()=>({});let detailsReads=0;
  base.prDetails=async()=>({number:1,title:'Clamp',body:'Closes #17',url:'https://example.invalid/pull/1',headRefName:prBranch,headSha:'a'.repeat(40),isCrossRepository:false,closesIssues:[17],state:'OPEN',mergeable:'MERGEABLE',mergeState:'CLEAN',checks:'none',checkNames:[],failedChecks:[],pendingChecks:[],...detailsPatch(++detailsReads)});
  base.startSession=vi.fn((options,callbacks)=>{
    sessions.push({options,callbacks});
    if(driver)queueMicrotask(()=>void driver!(options,callbacks).catch(()=>callbacks.finished({ok:false,text:'',errors:['simulated driver failure'],costUsd:0,turns:0})));
    return{stop:()=>{},send:()=>{throw new Error('No follow-up');}};
  });
  const automaticLogin=vi.spyOn(base.cloud,'signIn');
  let box:BoxInfo|null=null;let authenticated=false;
  const calls:{script:string;env?:Record<string,string>}[]=[];
  const files=new Map<string,string>();
  const raw:BoxApi={
    create:vi.fn(async o=>box={id:'one-fake-box',name:o.name,labels:o.labels,status:'running'}),
    list:async()=>box?[box]:[],get:async()=>box,remove:vi.fn(async()=>{box=null;}),resume:async()=>{},pause:async()=>{},
    write:async(_id,p,content)=>{files.set(p,content);},read:async(_id,p)=>files.get(p)??null,files:async()=>[],browser:async()=>false,
    session:async()=>{throw new Error('No real terminal or provider in this test');},
    run:async(_id,script,options)=>{
      calls.push({script,env:options?.env});
      if(script.includes('CUBEFARM_SETUP_OK'))return{code:0,output:'CUBEFARM_SETUP_OK'};
      if(script.includes("'connections'"))return{code:0,output:JSON.stringify({data:[{id:'openai',name:'OpenAI',methods:[{id:'actually-returned-remote-id',type:'oauth',label:'Codex device code (legacy)'}],connections:authenticated?[{id:'remote',type:'credential',label:'Remote',method:'oauth'}]:[]}]})};
      if(script.includes('opencode-query.cjs')&&script.includes("'status'"))return{code:0,output:authenticated?'CUBEFARM_SIGNED_IN':'CUBEFARM_SIGNED_OUT'};
      if(script.includes("'readiness'"))return{code:0,output:JSON.stringify({state:authenticated?'ready':'no-connection'})};
      if(script.includes("'models'"))return{code:0,output:JSON.stringify({list:{data:[{id:'test-model',providerID:'openai',name:'Test',capabilities:{tools:true},variants:[{id:'medium'}]}]},selected:{data:null}})};
      if(script.includes('--version'))return{code:0,output:'opencode v2.2.6'};
      if(script.includes('DEPS_NONE'))return{code:0,output:'DEPS_NONE'};
      if(script.includes('DS_GATE_WORKTREE='))return{code:0,output:`DS_GATE_WORKTREE=${JSON.stringify({head:'a'.repeat(40),clean:true,onApprovedBranch:true})}`};
      if(script.includes('DS_GATE_ACCEPTANCE_FILE'))return{code:0,output:'DS_GATE_ACCEPTANCE=written'};
      if(script.includes('DS_GATE_INDEX='))return{code:0,output:'DS_GATE_INDEX='+JSON.stringify({state:'ready',uid:1002,euid:1002,gid:1002,egid:1002,index:{uid:1002,gid:1002,mode:0o644,readable:true,writable:true},gitReadCode:0})};
      if(script.includes('node --test --test-reporter=tap'))return{code:0,output:'# tests 11\n# pass 11\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n'};
      if(script.includes('node --test clamp.test.mjs'))return{code:0,output:'# worker tests simulated PASS'};
      return{code:0,output:''};
    },
  };
  const verificationReports:GateVerification[]=[];
  const input:GateOfficeInput={plan,backend:base,boxes:raw,credentials:{upstashBoxKey:'manual-test-key',cloudGithubToken:'github_pat_test_only'},onVerification:value=>verificationReports.push(value),onController:o=>{office=o;}};
  await configure(input);
  office=await OpenCodeGateOffice.prepare(input);
  return{office,plan,base,raw,sessions,files,calls,automaticLogin,verificationReports,details:(fn:typeof detailsPatch)=>{detailsPatch=fn;},drive:(fn:typeof driver)=>{driver=fn;},pr:(branch:string)=>{prReady=true;prBranch=branch;},login:vi.fn(async(input:Parameters<Parameters<OpenCodeGateOffice['authenticate']>[0]['login']>[0])=>{expect(input.method.id).toBe('actually-returned-remote-id');expect(input.env.GH_TOKEN).toBe('');authenticated=true;})};
}

describe('same-process office handoff, real Swarm with fake outside-world adapters',()=>{
  it.each(['before-login','after-login'])('diagnoses a non-idle worker without blaming OAuth or releasing held work (%s)',async when=>{
    const f=await fixture();const markBusy=()=>{const swarm=f.office.swarm as unknown as {state:{agents:{role:string;status:string;task:string|null}[]}};const worker=swarm.state.agents.find(a=>a.role==='agent')!;worker.status='preparing';worker.task='qa';};
    if(when==='before-login')markBusy();else{const original=f.login.getMockImplementation()!;f.login.mockImplementation(async input=>{await original(input);markBusy();});}
    await expect(f.office.authenticate({confirmLocalChatGPTAccount:true,login:f.login})).rejects.toThrow('auth-worker-not-idle');
    expect(f.office.diagnostics.snapshot().firstFailure).toMatchObject({stage:when==='before-login'?'auth-worker-idle':'auth-remote-ready',category:'auth-worker-not-idle'});
    if(when==='before-login')expect(f.login).not.toHaveBeenCalled();
    expect(f.sessions).toHaveLength(0);expect((await f.office.close()).confirmedAbsent).toBe(true);
  });
  it('keeps a historical PR visible without assigning unauthorized QA before AI approval',async()=>{
    const historical:PullInfo={number:7,title:'Preserved prior smoke',url:'https://example.invalid/pull/7',headRefName:'swarm/issue-6-ada',headSha:'b'.repeat(40),state:'OPEN',isDraft:false,mergeable:'MERGEABLE',reviewDecision:null,closesIssues:[6],createdAt:new Date().toISOString(),mergedAt:null,additions:2,deletions:0,checks:'none',mergeState:'CLEAN',failedChecks:[],pendingChecks:[]};
    const f=await fixture(input=>{input.backend.listPulls=async()=>[historical];});
    expect(await f.office.authenticate({confirmLocalChatGPTAccount:true,login:f.login})).toMatchObject({phase:'awaiting-approval',sessions:{ceo:0,agent:0}});
    const swarm=f.office.swarm as unknown as {state:{repos:{id:string}[];qa:{prNumber:number;status:string}[]};startPipelineWork:(repo:{id:string})=>boolean};
    expect(swarm.state.qa).toContainEqual(expect.objectContaining({prNumber:7,status:'queued'}));
    expect(swarm.startPipelineWork(swarm.state.repos.find(r=>r.id===f.plan.repository)!)).toBe(false);
    const snapshot=f.office.swarm.snapshot(),worker=snapshot.agents.find(a=>a.role==='agent')!;
    expect(snapshot.repos[0].pulls).toContainEqual(expect.objectContaining({number:7,state:'OPEN'}));
    expect(worker).toMatchObject({status:'idle',task:null,issueNumber:null,prNumber:null});
    expect(f.sessions).toHaveLength(0);expect(f.automaticLogin).not.toHaveBeenCalled();
    expect(f.calls.some(c=>c.script.includes('origin/pr/7'))).toBe(false);
    expect(historical).toMatchObject({number:7,state:'OPEN',headSha:'b'.repeat(40)});
  });
  it.each(['microtask','same-stack'] as const)('fails immediately when the only CEO turn finishes without an issue (%s)',async mode=>{
    const f=await fixture(input=>{
      if(mode==='same-stack')input.backend.startSession=vi.fn((_options,callbacks)=>{
        callbacks.finished({ok:true,text:'Existing issue; no duplicate created',errors:[],costUsd:0,turns:1});
        return {stop:()=>{},send:()=>{throw new Error('No follow-up');}};
      });
    });
    await f.office.authenticate({confirmLocalChatGPTAccount:true,login:f.login});
    f.drive(async(_options,callbacks)=>callbacks.finished({ok:true,text:'Existing issue; no duplicate created',errors:[],costUsd:0,turns:1}));
    await expect(f.office.run({runId:f.plan.runId,repository:f.plan.repository,model:f.plan.model})).rejects.toThrow('ceo-finished-without-issue');
    expect(f.office.diagnostics.snapshot().firstFailure).toMatchObject({stage:'issue-created',category:'ceo-finished-without-issue'});
    expect(f.office.gate.snapshot()).toMatchObject({issue:null,sessions:{ceo:1,agent:0},finished:{ceo:true,agent:false},phase:'closed'});
    expect(f.base.startSession).toHaveBeenCalledOnce();
    expect(f.office.verificationSnapshot()).toMatchObject({issue:null,passed:false});
    expect((await f.office.close()).confirmedAbsent).toBe(true);
    expect(f.raw.remove).toHaveBeenCalledExactlyOnceWith('one-fake-box');
  });
  it('explicitly requests a separate run issue while preserving the existing backlog and refusing edits',async()=>{
    const existing:IssueInfo={number:1,title:'Add dependency-free clamp utility and node:test coverage',body:'Prior failed smoke; preserve as evidence',labels:[],url:'https://example.invalid/issue/1',createdAt:'2026-11-08T00:00:00Z'};
    const f=await fixture(input=>{
      const list=input.backend.listIssues;
      input.backend.listIssues=async(...args)=>[existing,...await list(...args)];
      input.backend.editIssue=vi.fn(async()=>{throw new Error('Existing issue must not be edited');});
      input.backend.closeIssue=vi.fn(async()=>{throw new Error('Existing issue must not be closed');});
    });
    await f.office.authenticate({confirmLocalChatGPTAccount:true,login:f.login});
    let instructed=false;
    f.drive(async(options,callbacks)=>{
      if(options.role==='ceo'){
        for(const text of [options.prompt,options.systemAppend]){
          expect(text).toContain(`Independent smoke run ${f.plan.runId}`);
          expect(text).toContain('create exactly ONE NEW issue');
          expect(text).toContain('Preserve all existing issues');
          expect(text).toContain('not a general exception to the no-duplicate rule');
        }
        instructed=true;
        const status=await options.office!.call('company_status',{});
        expect(status).toContain(existing.title);
        expect(await options.office!.call('close_issue',{floor:1,number:1,reason:'Synthetic forbidden close'})).toContain('Refused:');
        await options.office!.call('file_issue',{floor:1,title:`Clamp smoke ${f.plan.runId}`,body:'Independent smoke run; preserve prior issues'});
      } else f.pr(f.office.swarm.snapshot().agents.find(a=>a.role==='agent')!.branch!);
      callbacks.finished({ok:true,text:'Synthetic turn complete',errors:[],costUsd:0,turns:1});
    });
    const result=await f.office.run({runId:f.plan.runId,repository:f.plan.repository,model:f.plan.model});
    expect(instructed).toBe(true);expect(result.verification).toMatchObject({issue:17,passed:true});
    expect(existing.body).toBe('Prior failed smoke; preserve as evidence');
    expect(f.base.editIssue).not.toHaveBeenCalled();expect(f.base.closeIssue).not.toHaveBeenCalled();
    expect(f.sessions).toHaveLength(2);expect(f.raw.create).toHaveBeenCalledOnce();
    expect((await f.office.close()).confirmedAbsent).toBe(true);
  });
  it('records a missing PR as a delivery failure after successful turns, not a generic session success',async()=>{
    const f=await fixture();await f.office.authenticate({confirmLocalChatGPTAccount:true,login:f.login});
    f.drive(async(options,callbacks)=>{
      if(options.role==='ceo')await options.office!.call('file_issue',{floor:1,title:'Implement clamp',body:'Synthetic issue'});
      callbacks.finished({ok:true,text:'Turn complete but no PR delivered',errors:[],costUsd:0,turns:1});
    });
    await expect(f.office.run({runId:f.plan.runId,repository:f.plan.repository,model:f.plan.model})).rejects.toThrow();
    expect(f.office.diagnostics.snapshot().firstFailure).toMatchObject({stage:'pr-lookup',category:'pr-missing'});
    expect(f.sessions).toHaveLength(2);expect((await f.office.close()).confirmedAbsent).toBe(true);
    expect(f.office.verificationSnapshot()).toMatchObject({issue:17,pr:null,workerTestsCode:null,independentTestsCode:null,passed:false});
    expect(f.verificationReports.at(-1)).toMatchObject({issue:17,passed:false,index:{'after-worker':{state:'ready',euid:1002,index:{uid:1002,readable:true}}}});
  });
  it.each([2,3])('detects branch changes at verification checkpoint %s without SDK uploads or running later tests',async failureCall=>{
    const f=await fixture();await f.office.authenticate({confirmLocalChatGPTAccount:true,login:f.login});
    const run=f.raw.run,write=vi.spyOn(f.raw,'write');let snapshots=0,workerTests=0,independentTests=0;
    f.raw.run=async(id,script,options)=>{
      if(script.includes('DS_GATE_WORKTREE=')){snapshots++;return {code:0,output:'DS_GATE_WORKTREE='+JSON.stringify({head:'a'.repeat(40),clean:true,onApprovedBranch:snapshots!==failureCall})};}
      if(script.includes('node --test clamp.test.mjs'))workerTests++;
      if(script.includes('node --test --test-reporter=tap'))independentTests++;
      return run(id,script,options);
    };
    f.drive(async(options,callbacks)=>{
      if(options.role==='ceo')await options.office!.call('file_issue',{floor:1,title:'Implement clamp',body:'Synthetic task'});
      else f.pr(f.office.swarm.snapshot().agents.find(a=>a.role==='agent')!.branch!);
      callbacks.finished({ok:true,text:'Synthetic completed turn',errors:[],costUsd:0,turns:1});
    });
    await expect(f.office.run({runId:f.plan.runId,repository:f.plan.repository,model:f.plan.model})).rejects.toThrow();
    expect(f.office.diagnostics.snapshot().firstFailure).toMatchObject({stage:failureCall===2?'worktree-after-acceptance':'worktree-after-worker-tests',category:'worktree-branch-mismatch'});
    expect(write).not.toHaveBeenCalled();expect(independentTests).toBe(0);expect(workerTests).toBe(failureCall===2?0:1);
    expect(f.office.verificationSnapshot()).toMatchObject({passed:false,[failureCall===2?'afterAcceptance':'afterWorkerTests']:{onApprovedBranch:false}});
    expect((await f.office.close()).confirmedAbsent).toBe(true);
  });
  it('preserves an unreadable root index and reports it before looking up a missing PR',async()=>{
    const f=await fixture();const run=f.raw.run;
    f.raw.run=async(id,script,options)=>script.includes('DS_GATE_INDEX=')?{code:0,output:'DS_GATE_INDEX='+JSON.stringify({state:'index-unreadable',uid:1002,euid:1002,gid:1002,egid:1002,index:{uid:0,gid:0,mode:0o600,readable:false,writable:false},gitReadCode:null})}:run(id,script,options);
    await f.office.authenticate({confirmLocalChatGPTAccount:true,login:f.login});
    f.drive(async(options,callbacks)=>{
      if(options.role==='ceo')await options.office!.call('file_issue',{floor:1,title:'Implement clamp',body:'Synthetic issue'});
      callbacks.finished({ok:true,text:'No PR delivered',errors:[],costUsd:0,turns:1});
    });
    await expect(f.office.run({runId:f.plan.runId,repository:f.plan.repository,model:f.plan.model})).rejects.toThrow();
    expect(f.office.diagnostics.snapshot().firstFailure).toMatchObject({stage:'after-worker',category:'git-index-not-ready'});
    expect((await f.office.close()).confirmedAbsent).toBe(true);
    expect(f.verificationReports.at(-1)).toMatchObject({passed:false,pr:null,index:{'after-worker':{state:'index-unreadable',euid:1002,index:{uid:0,mode:0o600,readable:false}}}});
  });
  it.each(['dirty','wrong-branch','worktree-query','worker-tests','independent-tests','incomplete-tests','head-changed','pr-head-changed','pr-closed','pr-cross-repo','pr-wrong-branch','pr-wrong-issue'] as const)('keeps a precise verification failure and partial safe evidence after cleanup (%s)',async failure=>{
    const f=await fixture();let snapshotCalls=0;let independentFinished=false;
    f.details(()=>({
      ...(failure==='pr-closed'?{state:'CLOSED' as const}:{}),
      ...(failure==='pr-cross-repo'?{isCrossRepository:true}:{}),
      ...(failure==='pr-wrong-branch'?{headRefName:'swarm/issue-99-other'}:{}),
      ...(failure==='pr-wrong-issue'?{closesIssues:[99]}:{}),
      ...(failure==='pr-head-changed'&&independentFinished?{headSha:'b'.repeat(40)}:{}),
    }));
    const run=f.raw.run;
    f.raw.run=async(id,script,options)=>{
      if(script.includes('DS_GATE_WORKTREE=')){
        snapshotCalls++;
        if(failure==='worktree-query')return {code:2,output:'private query error'};
        return {code:0,output:`DS_GATE_WORKTREE=${JSON.stringify({head:failure==='head-changed'&&snapshotCalls===4?'b'.repeat(40):'a'.repeat(40),clean:failure!=='dirty',onApprovedBranch:failure!=='wrong-branch'})}`};
      }
      if(script.includes('node --test clamp.test.mjs')&&failure==='worker-tests')return {code:1,output:'private worker failure'};
      if(script.includes('node --test --test-reporter=tap')){
        independentFinished=true;
        if(failure==='independent-tests')return {code:1,output:'private independent failure'};
        if(failure==='incomplete-tests')return {code:0,output:'# tests 10\n# pass 10\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n'};
      }
      return run(id,script,options);
    };
    await f.office.authenticate({confirmLocalChatGPTAccount:true,login:f.login});
    f.drive(async(options,callbacks)=>{
      if(options.role==='ceo')await options.office!.call('file_issue',{floor:1,title:'Implement clamp',body:'Synthetic task'});
      else f.pr(f.office.swarm.snapshot().agents.find(a=>a.role==='agent')!.branch!);
      callbacks.finished({ok:true,text:'Synthetic completed turn',errors:[],costUsd:0,turns:1});
    });
    await expect(f.office.run({runId:f.plan.runId,repository:f.plan.repository,model:f.plan.model})).rejects.toThrow();
    const expected={dirty:['worktree-before','worktree-dirty'],'wrong-branch':['worktree-before','worktree-branch-mismatch'],'worktree-query':['worktree-before','worktree-query-failed'],'worker-tests':['worker-tests','worker-tests-failed'],'independent-tests':['independent-tests','independent-tests-failed'],'incomplete-tests':['independent-tests','independent-tests-incomplete'],'head-changed':['delivery-check','worktree-head-changed'],'pr-head-changed':['delivery-check','pr-head-mismatch'],'pr-closed':['pr-details-before','pr-not-open'],'pr-cross-repo':['pr-details-before','pr-cross-repository'],'pr-wrong-branch':['pr-details-before','pr-branch-mismatch'],'pr-wrong-issue':['pr-details-before','pr-issue-mismatch']}[failure];
    expect(f.office.diagnostics.snapshot().firstFailure).toMatchObject({stage:expected[0],category:expected[1]});
    const verification=f.office.verificationSnapshot();
    expect(verification).toMatchObject({issue:17,passed:false});
    if(failure==='worker-tests')expect(verification.workerTestsCode).toBe(1);
    if(failure==='independent-tests')expect(verification.independentTestsCode).toBe(1);
    if(failure==='dirty')expect(verification.before?.clean).toBe(false);
    if(failure==='head-changed')expect(verification.after?.head).toBe('b'.repeat(40));
    expect(JSON.stringify(f.verificationReports)).not.toMatch(/private|github_pat|secret/);
    expect(f.verificationReports.at(-1)?.passed).toBe(false);
    expect(f.sessions).toHaveLength(2);expect(f.raw.create).toHaveBeenCalledOnce();
    expect((await f.office.close()).confirmedAbsent).toBe(true);expect(f.raw.remove).toHaveBeenCalledExactlyOnceWith('one-fake-box');
  });
  it('creates the isolated CEO directory before the first local connection query',async()=>{
    const f=await fixture(i=>{
      const connections=i.backend.openCodeConnections!;
      i.backend.openCodeConnections=vi.fn(async directory=>{
        const info=await fs.stat(directory);
        expect(info.isDirectory()).toBe(true);
        expect(directory).toBe(i.plan.ceoDirectory);
        return connections(directory);
      });
    });
    expect((await f.office.authenticate({confirmLocalChatGPTAccount:true,login:f.login})).phase).toBe('awaiting-approval');
    expect(f.base.openCodeConnections).toHaveBeenCalledOnce();
    expect(f.sessions).toHaveLength(0);
  });
  it('prepares the CEO directory before provisioning a Box and refuses an existing non-directory without replacing it',async()=>{
    const diagnostics=new GateDiagnostics();let input!:GateOfficeInput;
    await expect(fixture(async i=>{
      input=i;i.diagnostics=diagnostics;
      await fs.mkdir(path.dirname(i.plan.ceoDirectory),{recursive:true});
      await fs.writeFile(i.plan.ceoDirectory,'preserved local fixture');
    })).rejects.toThrow();
    expect(diagnostics.snapshot().firstFailure).toMatchObject({stage:'ceo-directory',category:'already-exists'});
    expect(input.boxes.create).not.toHaveBeenCalled();expect(input.backend.startSession).not.toHaveBeenCalled();
    expect(await fs.readFile(input.plan.ceoDirectory,'utf8')).toBe('preserved local fixture');
  });
  it('recreates an empty CEO directory removed after preparation, before querying local metadata',async()=>{
    const f=await fixture(i=>{
      const create=i.boxes.create;
      i.boxes.create=vi.fn(async options=>{
        expect((await fs.stat(i.plan.ceoDirectory)).isDirectory()).toBe(true);
        return create(options);
      });
      const connections=i.backend.openCodeConnections!;
      i.backend.openCodeConnections=async directory=>{expect((await fs.stat(directory)).isDirectory()).toBe(true);return connections(directory);};
    });
    await fs.rmdir(f.plan.ceoDirectory); // this fixture's own newly-created empty directory only
    await f.office.authenticate({confirmLocalChatGPTAccount:true,login:f.login});
    expect(f.office.gate.snapshot().phase).toBe('awaiting-approval');expect(f.sessions).toHaveLength(0);
  });
  it.each(['local-connections','local-oauth','remote-connections','method','login','remote-ready','local-models','remote-models','local-version','remote-version','readiness'] as const)('identifies authentication subphase without recording injected private errors (%s)',async failure=>{
    let enabled=false;
    const f=await fixture(i=>{
      const connections=i.backend.openCodeConnections!;
      i.backend.openCodeConnections=async directory=>{
        if(enabled&&failure==='local-connections')throw new Error('github_pat_synthetic private OAuth details');
        if(enabled&&failure==='local-oauth')return [];
        return connections(directory);
      };
      const models=i.backend.openCodeModels;
      i.backend.openCodeModels=async(...args)=>{
        if(enabled&&failure==='local-models')throw new Error('private model query');
        if(enabled&&failure==='readiness')return {directory:i.plan.ceoDirectory,defaultModel:null,models:[]};
        return models(...args);
      };
      const detect=i.backend.detectClis;
      i.backend.detectClis=async(...args)=>{if(enabled&&failure==='local-version')throw new Error('private version query');return detect(...args);};
    });
    enabled=true;
    const run=f.raw.run;
    f.raw.run=async(id,script,options)=>{
      if(failure==='remote-connections'&&script.includes("'connections'"))return {code:1,output:'private remote query'};
      if(failure==='method'&&script.includes("'connections'"))return {code:0,output:JSON.stringify({data:[{id:'openai',name:'OpenAI',methods:[],connections:[]}]})};
      if(failure==='remote-ready'&&script.includes("'readiness'"))return {code:0,output:JSON.stringify({state:'no-connection'})};
      if(failure==='remote-models'&&script.includes("'models'"))return {code:1,output:'private remote inventory'};
      if(failure==='remote-version'&&script.includes('--version'))return {code:1,output:'private remote version'};
      return run(id,script,options);
    };
    const login=vi.fn(async(input:Parameters<typeof f.login>[0])=>{
      if(failure==='login')throw new Error('private device login output, synthetic-code');
      await f.login(input);
    });
    await expect(f.office.authenticate({confirmLocalChatGPTAccount:true,login})).rejects.toThrow();
    const stage={
      'local-connections':'auth-local-connections','local-oauth':'auth-local-oauth','remote-connections':'auth-remote-connections',method:'auth-device-method',login:'auth-device-login',
      'remote-ready':'auth-remote-ready','local-models':'auth-local-models','remote-models':'auth-remote-models','local-version':'auth-local-version','remote-version':'auth-remote-version',readiness:'auth-readiness',
    }[failure];
    const diagnostics=f.office.diagnostics.snapshot();
    expect(diagnostics.firstFailure?.stage).toBe(stage);
    expect(JSON.stringify(diagnostics)).not.toMatch(/github_pat|private|synthetic-code/);
    expect(f.sessions).toHaveLength(0);expect(f.raw.create).toHaveBeenCalledOnce();
    expect((await f.office.close()).confirmedAbsent).toBe(true);
    expect(f.raw.remove).toHaveBeenCalledExactlyOnceWith('one-fake-box');
    if(['local-connections','local-oauth','remote-connections','method'].includes(failure))expect(login).not.toHaveBeenCalled();
    const entries=diagnostics.entries;
    if(failure!=='readiness')expect(entries.some(e=>e.stage==='auth-readiness')).toBe(false);
  });
  it('reports a non-directory replacement at auth-local-directory without running a local connection query',async()=>{
    const f=await fixture(i=>{i.backend.openCodeConnections=vi.fn(i.backend.openCodeConnections!);});
    await fs.rmdir(f.plan.ceoDirectory);await fs.writeFile(f.plan.ceoDirectory,'keep this fixture file');
    await expect(f.office.authenticate({confirmLocalChatGPTAccount:true,login:f.login})).rejects.toThrow();
    expect(f.office.diagnostics.snapshot().firstFailure).toMatchObject({stage:'auth-local-directory',category:'already-exists'});
    expect(f.base.openCodeConnections).not.toHaveBeenCalled();expect(f.login).not.toHaveBeenCalled();
    expect(await fs.readFile(f.plan.ceoDirectory,'utf8')).toBe('keep this fixture file');
    expect((await f.office.close()).confirmedAbsent).toBe(true);
  });
  it('catches an abort from inside the login callback without hanging or accepting another authentication attempt',async()=>{
    const f=await fixture();
    const login=vi.fn(()=>{void f.office.close();return new Promise<void>(()=>{});});
    await expect(f.office.authenticate({confirmLocalChatGPTAccount:true,login})).rejects.toThrow('run-aborted');
    expect(f.office.diagnostics.snapshot().firstFailure).toMatchObject({stage:'auth-device-login',category:'run-aborted'});
    await expect(f.office.authenticate({confirmLocalChatGPTAccount:true,login})).rejects.toThrow('one-shot');
    expect(login).toHaveBeenCalledOnce();expect(f.sessions).toHaveLength(0);
    expect((await f.office.close()).confirmedAbsent).toBe(true);
  });
  it.each([
    [{code:2,output:'{"state":"query-failed","check":"models"}'},'remote-query-models-failed'],
    [{code:2,output:'{"state":"query-failed","check":"provider"}'},'remote-query-provider-failed'],
    [{code:0,output:'{"state":"no-connection"}'},'remote-no-connection'],
    [{code:0,output:'{"state":"connection-needs-auth"}'},'remote-connection-needs-auth'],
    [{code:0,output:'{"state":"model-not-listed"}'},'remote-model-not-listed'],
    [{code:0,output:'{"state":"provider-disabled"}'},'remote-provider-disabled'],
    [{code:0,output:'{"state":"provider-not-listed"}'},'remote-provider-not-listed'],
    [{code:0,output:'{"state":"integration-not-listed"}'},'remote-integration-not-listed'],
    [{code:0,output:'{"state":"oauth-unavailable"}'},'remote-oauth-unavailable'],
    [{code:0,output:'{"state":"ready","token":"secret"}'},'remote-query-output-failed'],
  ])('preserves the precise post-login readiness category through cleanup with zero AI (%#)',async(result,category)=>{
    const f=await fixture();const run=f.raw.run;
    f.raw.run=(id,script,options)=>script.includes("'readiness'")?Promise.resolve(result):run(id,script,options);
    await expect(f.office.authenticate({confirmLocalChatGPTAccount:true,login:f.login})).rejects.toThrow(category);
    expect(f.login).toHaveBeenCalledOnce();
    const diagnostics=f.office.diagnostics.snapshot();
    expect(diagnostics.firstFailure).toEqual({stage:'auth-remote-ready',status:'failed',category});
    expect(diagnostics.entries.some(e=>e.stage==='auth-local-models'||e.stage==='auth-remote-models')).toBe(false);
    expect(JSON.stringify(diagnostics)).not.toContain('secret');
    expect(f.sessions).toHaveLength(0);expect(f.raw.create).toHaveBeenCalledOnce();
    expect((await f.office.close()).confirmedAbsent).toBe(true);expect(f.raw.remove).toHaveBeenCalledExactlyOnceWith('one-fake-box');
  });
  it.each([
    ['HTTP 401: Bad credentials','github-unauthorized'],
    ['HTTP 403: Forbidden','github-forbidden'],
    ['HTTP 404: Not Found','github-repository-unavailable'],
    ['error connecting to synthetic.invalid','github-network-failed'],
  ])('fails the repository preflight before office init/account queries/Box creation (%#)',async(stderr,category)=>{
    const diagnostics=new GateDiagnostics();let input!:GateOfficeInput;
    let user!:ReturnType<typeof vi.spyOn>;let detect!:ReturnType<typeof vi.spyOn>;let release!:ReturnType<typeof vi.spyOn>;
    await expect(fixture(i=>{
      input=i;i.diagnostics=diagnostics;
      user=vi.spyOn(i.backend,'user');detect=vi.spyOn(i.backend,'detectClis');release=vi.spyOn(i.backend,'releaseClis');
      i.backend.repoMeta=()=>gateGithubRead(async()=>{throw new CommandError('private arguments',stderr,1);});
    })).rejects.toThrow(category);
    expect(user).not.toHaveBeenCalled();expect(detect).not.toHaveBeenCalled();expect(release).not.toHaveBeenCalled();
    expect(input.boxes.create).not.toHaveBeenCalled();expect(input.backend.startSession).not.toHaveBeenCalled();
    expect(diagnostics.snapshot().firstFailure).toMatchObject({stage:'repository-metadata',category});
    expect(diagnostics.snapshot().entries.some(e=>e.stage==='office-init')).toBe(false);
    expect((await office!.close()).confirmedAbsent).toBe(true);
  });
  it.each(['metadata','connect-metadata','privacy','branch','owner','init'] as const)('reports the first preparation failure before any Box/AI (%s)',async failure=>{
    const diagnostics=new GateDiagnostics();let input!:GateOfficeInput;
    await expect(fixture(i=>{
      input=i;i.diagnostics=diagnostics;
      const original=i.backend.repoMeta;
      let calls=0;
      i.backend.repoMeta=async repo=>{
        calls++;
        if(failure==='metadata'||failure==='connect-metadata'&&calls===2)throw Object.assign(new Error('private stderr github_pat_synthetic'),{code:1});
        const meta=await original(repo);
        if(failure==='privacy')return {...meta,isPrivate:false};
        if(failure==='branch')return {...meta,defaultBranch:'dev'};
        if(failure==='owner')return {...meta,nameWithOwner:'other/repository'};
        return meta;
      };
      if(failure==='init')i.backend.office={...i.backend.office,head:async()=>{throw Object.assign(new Error('sensitive init detail'),{code:'ENOENT'});}};
    })).rejects.toThrow();
    expect(input.boxes.create).not.toHaveBeenCalled();expect(input.backend.startSession).not.toHaveBeenCalled();
    const expected={metadata:['repository-metadata','command-failed'],'connect-metadata':['repository-connect','command-failed'],privacy:['repository-policy','repository-not-private'],branch:['repository-policy','repository-main-required'],owner:['repository-policy','repository-name-mismatch'],init:['office-init','command-not-found']}[failure];
    expect(diagnostics.snapshot().firstFailure).toMatchObject({stage:expected[0],category:expected[1]});
    expect(diagnostics.snapshot().entries).toContainEqual({stage:'cleanup',status:'passed'});
    expect(office!.gate.snapshot()).toMatchObject({phase:'closed',creationAttempted:false,sessions:{ceo:0,agent:0}});
    expect(JSON.stringify(diagnostics.snapshot())).not.toMatch(/private stderr|github_pat|sensitive init detail/);
  });
  it('hands one real-core CEO issue to one real-core remote worker, verifies the PR/test head and tears down',async()=>{
    const f=await fixture();
    await f.office.authenticate({confirmLocalChatGPTAccount:true,login:f.login});
    expect(f.sessions).toHaveLength(0);
    f.drive(async(options,callbacks)=>{
      if(options.role==='ceo') {
        expect(await options.office!.call('company_status',{})).toContain(f.plan.repository);
        const issued=await options.office!.call('file_issue',{floor:1,title:'Implement clamp',body:'clamp.mjs and clamp.test.mjs, node --test clamp.test.mjs'});
        expect(issued).toContain('Filed #17');
      } else {
        expect(options.box?.boxId).toBe('one-fake-box');
        expect(options.box?.env.GH_TOKEN).toBe('github_pat_test_only');
        const branch=f.office.swarm.snapshot().agents.find(a=>a.role==='agent')!.branch!;
        f.pr(branch);
      }
      callbacks.finished({ok:true,text:'Synthetic fake-adapter completion',errors:[],costUsd:0,turns:1});
    });
    const result=await f.office.run({runId:f.plan.runId,repository:f.plan.repository,model:f.plan.model});
    expect(result.gate.sessions).toEqual({ceo:1,agent:1});expect(result.pr.head).toBe('a'.repeat(40));
    expect(f.sessions.map(s=>s.options.role)).toEqual(['ceo','agent']);
    expect(f.calls.some(c=>c.script.includes('node --test clamp.test.mjs'))).toBe(true);
    const snapshots=f.calls.filter(c=>c.script.includes('DS_GATE_WORKTREE='));
    expect(snapshots).toHaveLength(4);
    const expectedSnapshot=`node -e ${sq(gateWorktreeSnapshotSource(boxDeskDir(f.plan.repository),result.gate.branch))}`;
    expect(snapshots.map(c=>c.script)).toEqual([expectedSnapshot,expectedSnapshot,expectedSnapshot,expectedSnapshot]);
    expect(result.verification).toMatchObject({passed:true,workerTestsCode:0,independentTestsCode:0,independentSummary:{tests:11,passed:11,failed:0,skipped:0}});
    expect(f.verificationReports.at(-1)?.passed).toBe(true);
    expect(JSON.stringify(f.verificationReports)).not.toContain('github_pat');
    expect([...f.files.keys()].some(file=>file.endsWith(`gate-${f.plan.runId}.mjs`))).toBe(false);
    expect(f.calls.filter(c=>c.script.includes('DS_GATE_ACCEPTANCE_FILE')).map(c=>c.script)).toEqual([boxGateAcceptanceScript(f.plan.runId,clampAcceptanceSource(boxDeskDir(f.plan.repository)))]);
    expect(f.raw.create).toHaveBeenCalledOnce();expect((await f.office.close()).confirmedAbsent).toBe(true);
  });
  it('uses actual selected-CLI bootstrap and retains manual credentials only in memory across login and approval',async()=>{
    const f=await fixture();
    expect(f.raw.create).toHaveBeenCalledOnce();
    const setup=f.calls.find(c=>c.script.includes('CUBEFARM_SETUP_OK'))!.script;
    expect(setup).toContain('@opencode/cli@2.2.6');expect(setup).not.toMatch(/@anthropic-ai|@openai\/codex|@playwright\/mcp/);
    expect(f.automaticLogin).not.toHaveBeenCalled();expect(f.sessions).toHaveLength(0);
    const snapshot=f.office.swarm.snapshot();
    const stages=f.office.diagnostics.snapshot().entries;
    expect(stages.findIndex(e=>e.stage==='repository-policy'&&e.status==='passed')).toBeLessThan(stages.findIndex(e=>e.stage==='office-init'&&e.status==='started'));
    expect(snapshot.agents).toHaveLength(2);
    expect(snapshot.repos[0]).toMatchObject({autoAssign:false,autoMerge:false,browserTesting:false});
    const ready=await f.office.authenticate({confirmLocalChatGPTAccount:true,login:f.login});
    expect(ready.phase).toBe('awaiting-approval');expect(f.login).toHaveBeenCalledOnce();
    expect(f.sessions).toHaveLength(0);expect(f.raw.create).toHaveBeenCalledOnce();
    await expect(fs.stat(path.join(home,'secrets.json'))).rejects.toMatchObject({code:'ENOENT'});
    expect(JSON.stringify(f.office.swarm.snapshot())).not.toContain('github_pat_test_only');
    const cleanup=await f.office.close();expect(cleanup.confirmedAbsent).toBe(true);expect(f.raw.remove).toHaveBeenCalledWith('one-fake-box');
  });
  it('fails closed if local account confirmation is absent and removes only the known Box',async()=>{
    const f=await fixture();
    await expect(f.office.authenticate({confirmLocalChatGPTAccount:false,login:f.login})).rejects.toThrow('confirmation');
    expect(f.login).not.toHaveBeenCalled();expect(f.sessions).toHaveLength(0);
    expect(f.raw.remove).toHaveBeenCalledExactlyOnceWith('one-fake-box');
    expect((await f.office.close()).confirmedAbsent).toBe(true);
  });
  it('keeps caller-chosen metadata paths from escaping a fresh isolated office',async()=>{
    const f=await fixture();await f.office.close();
    await expect(OpenCodeGateOffice.prepare({plan:{...f.plan,ceoDirectory:path.parse(home).root},backend:f.base,boxes:f.raw,credentials:{upstashBoxKey:'key',cloudGithubToken:'pat'}})).rejects.toThrow('separate');
    expect(f.raw.create).toHaveBeenCalledOnce();
  });
});

describe('independent clamp acceptance program',()=>{
  it.each([true,false])('accepts only a correct implementation (correct=%s), not merely AI-authored tests',async correct=>{
    const dir=path.join(home,correct?'correct':'wrong');await fs.mkdir(dir,{recursive:true});
    const implementation=correct?'export function clamp(v,min,max){if(![v,min,max].every(Number.isFinite))throw new TypeError();if(min>max)throw new RangeError();return Math.min(max,Math.max(min,v));}':'export function clamp(){return 0;}';
    await fs.writeFile(path.join(dir,'clamp.mjs'),implementation);
    await fs.writeFile(path.join(dir,'acceptance.mjs'),clampAcceptanceSource(dir.replaceAll('\\','/')));
    const result=spawnSync(process.execPath,['--test',path.join(dir,'acceptance.mjs')],{encoding:'utf8',timeout:4000});
    expect(result.error,`child error: ${String(result.error)}; ${result.stdout}`).toBeUndefined();
    expect(result.status).toBe(correct?0:1);
    expect(result.stdout).toContain('tests 11');
  });
});
