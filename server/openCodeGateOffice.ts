import fs from 'node:fs/promises';
import path from 'node:path';
import { HOME_DIR, STATE_FILE } from './config.ts';
import { Swarm } from './swarm.ts';
import { CEO_ID } from '../shared/types.ts';
import { DEFAULT_CLOUD } from '../shared/cloud.ts';
import { OpenCodeBoxGate, type OpenCodeGatePlan } from './openCodeBoxGate.ts';
import type { Backend } from './backend.ts';
import type { BoxApi } from './box.ts';
import type { CloudSecrets } from './cloud.ts';
import { BOX_CF, BOX_CLI_BIN, boxDeskDir, sq } from './boxScripts.ts';
import { OPENCODE_BOX_ENV } from './openCodeBox.ts';
import type { OpenCodeIntegration } from '../shared/opencodeConnections.ts';
import { GateDiagnostics, GateDiagnosticError, type GateStage } from '../shared/opencodeGateDiagnostics.ts';
import { readinessCategory } from '../shared/opencodeReadiness.ts';
import { emptyGateVerification, gateWorktreeSnapshotSource, parseGateWorktree, parseGateAcceptance, type GateVerification } from './openCodeGateVerification.ts';
import { gateIndexSnapshotSource, parseGateIndex, type GateIndexStage } from './openCodeGateIndex.ts';
import { writeBoxGateAcceptance } from './openCodeGateFiles.ts';

export function deviceCodeMethod(integrations: OpenCodeIntegration[]) {
  const methods=integrations.filter(i=>i.id==='openai').flatMap(i=>i.methods).filter(m=>m.type==='oauth'&&m.label==='Codex device code (legacy)');
  if(methods.length!==1||!methods[0].id||methods[0].id.startsWith('-'))throw new GateDiagnosticError('device-method-unavailable');
  return methods[0];
}

/** Fixed acceptance checks are owned by the harness, not by the AI-generated test file. */
export function clampAcceptanceSource(directory: string) {
  return `import {test} from 'node:test';\nimport assert from 'node:assert/strict';\nimport {pathToFileURL} from 'node:url';\nconst {clamp}=await import(pathToFileURL(${JSON.stringify(`${directory}/clamp.mjs`)}).href);\nconst values=[[5,0,10,5],[-1,0,10,0],[11,0,10,10],[0,0,10,0],[10,0,10,10],[3,3,3,3],[-2,-5,-1,-2]];\nfor(const [v,min,max,expected] of values)test('clamp '+[v,min,max],()=>assert.equal(clamp(v,min,max),expected));\ntest('inverted bounds',()=>assert.throws(()=>clamp(0,10,0),RangeError));\nfor(const args of [[NaN,0,10],[0,-Infinity,10],[0,0,Infinity]])test('nonfinite '+String(args),()=>assert.throws(()=>clamp(...args),TypeError));\n`;
}

export interface GateOfficeInput {
  plan: OpenCodeGatePlan;
  backend: Backend;
  boxes: BoxApi;
  credentials: Readonly<Pick<CloudSecrets,'upstashBoxKey'|'cloudGithubToken'>>;
  onController?: (office: OpenCodeGateOffice) => void;
  diagnostics?: GateDiagnostics;
  onVerification?: (verification:GateVerification) => void;
}
export type DeviceLogin = (input: { api: BoxApi; boxId: string; method: { id: string; label: string }; env: Record<string,string>; signal: AbortSignal }) => Promise<void>;
export interface GateRunResult {
  gate:ReturnType<OpenCodeBoxGate['snapshot']>;
  pr:{number:number;url:string;head:string};
  verification:GateVerification;
  worker:string;
}

/** Same-process handoff: the real Swarm, real selected-CLI setup and the same in-memory backend own all phases. */
export class OpenCodeGateOffice {
  readonly gate: OpenCodeBoxGate;
  readonly swarm: Swarm;
  readonly diagnostics: GateDiagnostics;
  private backend: Backend;
  private api: BoxApi;
  private workerId='';
  private abort=new AbortController();
  private timer: ReturnType<typeof setTimeout>|undefined;
  private unsubscribe: ()=>void;
  private unSwarm: ()=>void;
  private closing: Promise<Awaited<ReturnType<OpenCodeBoxGate['cleanup']>>>|null=null;
  private authenticating=false;
  private initializationAttempted=false;
  private verification=emptyGateVerification();
  get signal() {return this.abort.signal;}
  verificationSnapshot():GateVerification {return structuredClone(this.verification);}
  private recordVerification(patch:Partial<GateVerification>):void {
    Object.assign(this.verification,patch);
    this.input.onVerification?.(this.verificationSnapshot());
  }

  private constructor(private input: GateOfficeInput) {
    this.diagnostics=input.diagnostics ?? new GateDiagnostics();
    this.gate=new OpenCodeBoxGate(input.plan);
    this.gate.observeWorkerIndex(stage=>this.inspectWorkerIndex(stage));
    this.backend=this.gate.backend(input.backend,input.boxes,input.credentials);
    this.api=this.backend.cloud.boxes(input.credentials.upstashBoxKey!);
    this.swarm=new Swarm(this.backend);
    this.unsubscribe=this.gate.subscribe(()=>{
      const state=this.gate.snapshot();
      if(state.workDeadline!==null&&!this.timer)this.timer=setTimeout(()=>{this.abort.abort();this.gate.fail('work-deadline');void this.close().catch(()=>{});},Math.max(0,state.workDeadline-Date.now()));
      if(state.phase==='failed'){this.abort.abort();queueMicrotask(()=>void this.close().catch(()=>{}));}
    });
    this.unSwarm=this.swarm.onEvent(()=>{
      const snapshot=this.swarm.snapshot();
      if(snapshot.repos.some(r=>r.syncError||r.cloneStatus==='error')||snapshot.agents.some(a=>a.status==='error'))this.gate.fail('office-or-repository-error');
    });
  }

  static async prepare(input: GateOfficeInput) {
    const diagnostics=input.diagnostics ?? new GateDiagnostics();
    input={...input,diagnostics};
    await diagnostics.step('office-state',async()=>{
    if(path.resolve(input.plan.ceoDirectory)!==path.join(HOME_DIR,'ceo')||path.resolve(STATE_FILE)!==path.join(HOME_DIR,'state.json'))throw new Error('The runner must set a separate SWARM_HOME before importing the office');
    await fs.mkdir(HOME_DIR,{recursive:true});
    // A real, fresh configuration, not forged agents, Box records, setup markers, credentials or success evidence.
    await fs.writeFile(STATE_FILE,JSON.stringify({settings:{runtime:'terminal',defaultCli:'opencode',defaultModel:input.plan.model,scaling:'approve',maxAgents:1,sessionLimit:2,ceoHeartbeatMin:0,autoUpdate:false,projectsDir:path.dirname(input.plan.repositoryDirectory),cloud:{...DEFAULT_CLOUD,machineKind:'box',boxLimit:1}},repos:[],agents:[]}),{flag:'wx'});
    });
    const office=await diagnostics.step('office-controller',()=>new OpenCodeGateOffice(input));
    try {
      input.onController?.(office);
      const meta=await diagnostics.step('repository-metadata',()=>office.backend.repoMeta(input.plan.repository));
      await diagnostics.step('repository-policy',()=>{
        if(!meta || typeof meta!=='object')throw new GateDiagnosticError('metadata-invalid');
        if(meta.nameWithOwner!==input.plan.repository)throw new GateDiagnosticError('repository-name-mismatch');
        if(meta.isPrivate!==true)throw new GateDiagnosticError('repository-not-private');
        if(meta.defaultBranch!=='main')throw new GateDiagnosticError('repository-main-required');
      });
      await diagnostics.step('ceo-directory',()=>fs.mkdir(input.plan.ceoDirectory,{recursive:true}));
      // Read/policy preflight before office initialization, CLI detection, account lookup or any Box setup.
      office.initializationAttempted=true;
      await diagnostics.step('office-init',()=>office.swarm.init());
      await diagnostics.step('ceo-configure',()=>office.swarm.updateAgent(CEO_ID,{cli:'opencode',model:input.plan.model}));
      await diagnostics.step('repository-connect',()=>office.swarm.connectRepo(input.plan.repository,{localPath:input.plan.repositoryDirectory,onboardCeo:false,autoAssign:false,autoMerge:false,browserTesting:false}));
      await diagnostics.step('machines-ready',()=>office.wait(()=>{
        const snapshot=office.swarm.snapshot();
        const repo=snapshot.repos.find(r=>r.id===input.plan.repository);
        const workers=snapshot.agents.filter(a=>a.role!=='ceo');
        if(repo?.cloneStatus==='error'||workers.some(a=>a.cloud==='error'))throw new Error('Clone or actual Box setup failed; no retry');
        return workers.length===1&&workers[0].cloud==='ready'&&repo?.cloneStatus==='ready';
      }));
      const snapshot=office.swarm.snapshot();
      const ceo=snapshot.agents.find(a=>a.id===CEO_ID)!;
      const worker=snapshot.agents.find(a=>a.role!=='ceo')!;
      office.workerId=worker.id;
      office.swarm.updateAgent(worker.id,{model:input.plan.model});
      await diagnostics.step('actors-bind',()=>office.gate.bindActors(ceo,worker,()=>office.swarm.snapshot()));
      return office;
    } catch(error) {await office.close();throw error;}
  }

  /** Resolve on public office/gate events; no polling or repeated work requests. */
  private wait(predicate: ()=>boolean): Promise<void> {
    return new Promise((resolve,reject)=>{
      let unOffice=()=>{};let unGate=()=>{};
      const clear=()=>{unOffice();unGate();this.abort.signal.removeEventListener('abort',aborted);};
      const aborted=()=>{clear();reject(new Error('Run stopped at its original deadline or first failure'));};
      const check=()=>{try{
        if(this.abort.signal.aborted)return aborted();
        if(this.swarm.snapshot().agents.some(a=>a.status==='error')){this.gate.fail('office-agent-error');return aborted();}
        if(predicate()){clear();resolve();}
      }catch(error){clear();reject(error);}};
      unOffice=this.swarm.onEvent(check);unGate=this.gate.subscribe(check);
      this.abort.signal.addEventListener('abort',aborted,{once:true});check();
    });
  }

  private authStep<T>(stage: GateStage, work: () => T | Promise<T>) {
    return this.diagnostics.step(stage,()=>{
      if(this.abort.signal.aborted)throw new GateDiagnosticError('run-aborted');
      return work();
    });
  }
  private requireIdleWorker() {
    const worker=this.swarm.snapshot().agents.find(a=>a.id===this.workerId);
    if(!worker||worker.status!=='idle'||worker.task!==null)throw new GateDiagnosticError('auth-worker-not-idle');
  }

  private async inspectWorkerIndex(stage:GateIndexStage) {
    return this.diagnostics.step(stage,async()=>{
      const boxId=this.gate.snapshot().boxId;
      if(!boxId)throw new GateDiagnosticError('git-index-query-failed');
      let result;
      try{result=await this.api.run(boxId,`node -e ${sq(gateIndexSnapshotSource(this.input.plan.repository))}`,{env:{GH_TOKEN:'',GITHUB_TOKEN:'',OPENAI_API_KEY:'',ANTHROPIC_API_KEY:''},timeoutMs:60000});}
      catch{throw new GateDiagnosticError('git-index-query-failed');}
      const snapshot=parseGateIndex(result.code,result.output);
      this.recordVerification({index:{...this.verification.index,[stage]:snapshot}});
      if(snapshot.state!=='ready')throw new GateDiagnosticError('git-index-not-ready');
      if(snapshot.euid===0||snapshot.euid!==null&&snapshot.index?.uid!==snapshot.euid)throw new GateDiagnosticError('git-index-identity-mismatch');
    });
  }

  async authenticate(input: { confirmLocalChatGPTAccount: boolean; login: DeviceLogin }) {
    if(this.gate.snapshot().phase!=='preparing'||this.authenticating)throw new Error('Authentication is one-shot');
    this.authenticating=true;
    try {
      await this.authStep('auth-local-confirmation',()=>{
        if(!input.confirmLocalChatGPTAccount)throw new GateDiagnosticError('local-account-confirmation-required');
      });
      // Also guard deletion between prepare() and the manual account confirmation; never forge metadata or auth.
      await this.authStep('auth-local-directory',()=>fs.mkdir(this.input.plan.ceoDirectory,{recursive:true}));
      const local=await this.authStep('auth-local-connections',()=>this.backend.openCodeConnections!(this.input.plan.ceoDirectory));
      await this.authStep('auth-local-oauth',()=>{
        if(!local.find(i=>i.id==='openai')?.connections.some(c=>c.method==='oauth'&&!c.needsAuth))throw new GateDiagnosticError('local-oauth-unavailable');
      });
      const remote=await this.authStep('auth-remote-connections',()=>this.swarm.openCodeConnections(this.workerId));
      const method=await this.authStep('auth-device-method',()=>deviceCodeMethod(remote.integrations));
      const boxId=this.gate.snapshot().boxId!;
      await this.authStep('auth-worker-idle',()=>this.requireIdleWorker());
      await this.authStep('auth-device-login',async()=>{
      let loginTimer:ReturnType<typeof setTimeout>|undefined;
      let abortListener:()=>void=()=>{};
      try {
        // Arm cancellation before invoking the login callback, including synchronous throws/aborts.
        const cancelled=new Promise<never>((_,reject)=>{
          loginTimer=setTimeout(()=>{reject(new GateDiagnosticError('device-login-timeout'));this.abort.abort();},10*60000);
          abortListener=()=>reject(new GateDiagnosticError('run-aborted'));
          this.abort.signal.addEventListener('abort',abortListener,{once:true});
        });
        await Promise.race([
          cancelled,
          input.login({api:this.api,boxId,method,env:{...OPENCODE_BOX_ENV,OPENAI_API_KEY:'',ANTHROPIC_API_KEY:'',GH_TOKEN:'',GITHUB_TOKEN:''},signal:this.abort.signal}),
        ]);
      } finally {clearTimeout(loginTimer);this.abort.signal.removeEventListener('abort',abortListener);}
      });
      await this.authStep('auth-remote-ready',async()=>{
        this.requireIdleWorker();
        const result=await this.swarm.inspectOpenCodeSignIn(this.workerId);
        if(result.state!=='ready')throw new GateDiagnosticError(readinessCategory(result));
      });
      // Sequential fail-fast probes: a failing stage cannot start later version/model queries in parallel.
      const localModels=await this.authStep('auth-local-models',()=>this.swarm.openCodeModels(CEO_ID));
      const remoteModels=await this.authStep('auth-remote-models',()=>this.swarm.openCodeModels(this.workerId));
      const clis=await this.authStep('auth-local-version',()=>this.backend.detectClis());
      const remoteVersion=await this.authStep('auth-remote-version',async()=>{
        const result=await this.api.run(boxId,`${sq(`${BOX_CLI_BIN}/opencode`)} --version`,{env:OPENCODE_BOX_ENV,timeoutMs:30000});
        if(result.code!==0)throw new GateDiagnosticError('remote-version-query-failed');
        return result;
      });
      const version=(text:string)=>text.trim().replace(/^opencode\s+/i,'').replace(/^v/,'');
      await this.authStep('auth-readiness',()=>{
        try {this.gate.authenticated({repositoryPrivate:true,localVersion:version(clis.find(c=>c.id==='opencode')?.version??''),remoteVersion:version(remoteVersion.output),localOAuth:true,remoteOAuth:true,deviceMethod:method,localModels,remoteModels});}
        catch {throw new GateDiagnosticError('auth-readiness-invalid');}
      });
      return this.gate.snapshot();
    } catch(error) {this.gate.fail('authentication-failed');await this.close();throw error;}
  }

  async run(approval: {runId:string;repository:string;model:string}):Promise<GateRunResult> {
    this.gate.approve(approval);
    try {
      await this.diagnostics.step('ceo-dispatch',()=>this.swarm.messageCeo(`This is the single approved synthetic smoke test on ${this.input.plan.repository}. Call office_company_status, then file exactly ONE issue for the existing worker: named export clamp(value,min,max) in clamp.mjs, tests in clamp.test.mjs using node:test, no package dependencies. Clamp finite numbers to inclusive bounds; throw TypeError for any non-finite argument and RangeError for min > max. Acceptance: node --test clamp.test.mjs. Do not create other issues, agents, profiles, models or repositories. Do not merge, deploy or run QA. Commit only clamp.mjs, clamp.test.mjs and optionally README.md. The controller supplies exact bounded commit/push/PR commands to the worker: instruct it to follow those commands rather than invent flag variants. Finish after filing the issue; do not wait or start another task.`));
      await this.diagnostics.step('issue-created',()=>this.wait(()=>{
        const state=this.gate.snapshot();
        if(state.issue!==null)return true;
        if(state.finished.ceo)throw new GateDiagnosticError('ceo-finished-without-issue');
        return false;
      }));
      this.recordVerification({issue:this.gate.snapshot().issue});
      await this.diagnostics.step('issue-sync',()=>this.swarm.syncRepo(this.input.plan.repository));
      await this.diagnostics.step('worker-assign',()=>this.swarm.assign(this.workerId,this.gate.snapshot().issue!));
      await this.diagnostics.step('sessions-finished',()=>this.wait(()=>this.gate.snapshot().phase==='verifying'));
      return await this.verifyDelivery();
    } catch(error) {this.gate.fail('execution-or-verification-failed');throw error;}
    finally {await this.close();}
  }

  private async verifyDelivery():Promise<GateRunResult> {
    const boxId=this.gate.snapshot().boxId!;
    const branch=this.gate.snapshot().branch;
    const issue=this.gate.snapshot().issue!;
    const repository=this.input.plan.repository;
    const directory=boxDeskDir(repository);
    this.recordVerification({issue,branch});
    await this.inspectWorkerIndex('after-worker');
    const pr=await this.diagnostics.step('pr-lookup',async()=>{
      const found=await this.backend.prForBranch(repository,branch);
      if(!found)throw new GateDiagnosticError('pr-missing');
      if(!Number.isSafeInteger(found.number)||found.number<=0)throw new GateDiagnosticError('pr-invalid');
      return found;
    });
    const details=async(stage:'pr-details-before'|'pr-details-after')=>this.diagnostics.step(stage,async()=>{
      const d=await this.backend.prDetails(repository,pr.number);
      if(d.number!==pr.number||!['OPEN','CLOSED','MERGED'].includes(d.state)||typeof d.headSha!=='string'||!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(d.headSha)||typeof d.isCrossRepository!=='boolean'||!Array.isArray(d.closesIssues))throw new GateDiagnosticError('pr-invalid');
      this.recordVerification({pr:{number:pr.number,head:d.headSha,state:d.state,branchMatches:d.headRefName===branch,crossRepository:d.isCrossRepository,closesApprovedIssue:d.closesIssues.includes(issue)}});
      if(d.state!=='OPEN')throw new GateDiagnosticError('pr-not-open');
      if(d.isCrossRepository)throw new GateDiagnosticError('pr-cross-repository');
      if(d.headRefName!==branch)throw new GateDiagnosticError('pr-branch-mismatch');
      if(!d.closesIssues.includes(issue))throw new GateDiagnosticError('pr-issue-mismatch');
      return d;
    });
    const initialPr=await details('pr-details-before');
    const env={GH_TOKEN:'',GITHUB_TOKEN:'',OPENAI_API_KEY:'',ANTHROPIC_API_KEY:''};
    const worktree=async(stage:'worktree-before'|'worktree-after-acceptance'|'worktree-after-worker-tests'|'worktree-after',field:'before'|'afterAcceptance'|'afterWorkerTests'|'after',expectedHead?:string)=>this.diagnostics.step(stage,async()=>{
      let r;
      try{r=await this.api.run(boxId,`node -e ${sq(gateWorktreeSnapshotSource(directory,branch))}`,{env,timeoutMs:60000});}
      catch{throw new GateDiagnosticError('worktree-query-failed');}
      const snapshot=parseGateWorktree(r.code,r.output);
      this.recordVerification({[field]:snapshot});
      if(!snapshot.clean)throw new GateDiagnosticError('worktree-dirty');
      if(!snapshot.onApprovedBranch)throw new GateDiagnosticError('worktree-branch-mismatch');
      if(expectedHead&&snapshot.head!==expectedHead)throw new GateDiagnosticError('worktree-head-changed');
      return snapshot;
    });
    const before=await worktree('worktree-before','before');
    await this.diagnostics.step('delivery-check',()=>{
      if(before.head!==initialPr.headSha)throw new GateDiagnosticError('pr-head-mismatch');
    });
    const acceptance=`${BOX_CF}/gate-${this.input.plan.runId}.mjs`;
    await this.diagnostics.step('acceptance-write',()=>writeBoxGateAcceptance(this.api,boxId,this.input.plan.runId,clampAcceptanceSource(directory)));
    await worktree('worktree-after-acceptance','afterAcceptance',before.head);
    await this.diagnostics.step('worker-tests',async()=>{
      let r;
      try{r=await this.api.run(boxId,`cd ${sq(directory)} && node --test clamp.test.mjs`,{env,timeoutMs:60000});}
      catch{throw new GateDiagnosticError('worker-tests-query-failed');}
      if(!Number.isInteger(r.code))throw new GateDiagnosticError('worker-tests-query-failed');
      this.recordVerification({workerTestsCode:r.code});
      if(r.code!==0)throw new GateDiagnosticError('worker-tests-failed');
    });
    await worktree('worktree-after-worker-tests','afterWorkerTests',before.head);
    await this.diagnostics.step('independent-tests',async()=>{
      let r;
      try{r=await this.api.run(boxId,`cd ${sq(directory)} && node --test --test-reporter=tap ${sq(acceptance)}`,{env,timeoutMs:60000});}
      catch{throw new GateDiagnosticError('independent-tests-query-failed');}
      if(!Number.isInteger(r.code))throw new GateDiagnosticError('independent-tests-query-failed');
      this.recordVerification({independentTestsCode:r.code});
      if(r.code!==0)throw new GateDiagnosticError('independent-tests-failed');
      this.recordVerification({independentSummary:parseGateAcceptance(r.output)});
    });
    const after=await worktree('worktree-after','after');
    const finalPr=await details('pr-details-after');
    await this.diagnostics.step('delivery-check',()=>{
      if(after.head!==before.head)throw new GateDiagnosticError('worktree-head-changed');
      if(finalPr.headSha!==after.head)throw new GateDiagnosticError('pr-head-mismatch');
      this.gate.verify({repository,testsCode:0,testHead:after.head,prHead:finalPr.headSha,prBranch:finalPr.headRefName,prState:finalPr.state,crossRepository:finalPr.isCrossRepository,closesIssues:finalPr.closesIssues});
      this.recordVerification({passed:true});
    });
    return {gate:this.gate.snapshot(),pr:{number:pr.number,url:`https://github.com/${repository}/pull/${pr.number}`,head:after.head},verification:this.verificationSnapshot(),worker:this.workerId};
  }

  close() {
    return this.closing??=(async()=>{
      this.abort.abort();clearTimeout(this.timer);this.unsubscribe();this.unSwarm();
      try{return await this.diagnostics.step('cleanup',()=>this.gate.cleanup(this.input.boxes));}
      finally{await this.diagnostics.step('office-shutdown',()=>this.initializationAttempted ? this.swarm.shutdown() : Promise.resolve());}
    })();
  }
}
