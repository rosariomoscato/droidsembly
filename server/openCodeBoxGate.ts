import path from 'node:path';
import type { Backend } from './backend.ts';
import type { BoxApi, BoxInfo } from './box.ts';
import type { GateIndexStage } from './openCodeGateIndex.ts';
import { isBoxSessionFilesScript } from './boxSessionFiles.ts';
import type { SessionHandle, SessionResult } from './agentRunner.ts';
import { createOfficeTools, type OfficeTools } from './ceo.ts';
import { machineName } from './machines.ts';
import type { CloudSecrets } from './cloud.ts';
import type { OpenCodeCatalog } from '../shared/opencodeModels.ts';
import type { OpenCodePermissionRule } from '../shared/opencodePermissions.ts';
import type { AgentView } from '../shared/types.ts';
import { boxDeskDir, tmuxKill } from './boxScripts.ts';
import { gateWorkerPermissionRules, gateDeliveryInstructions, gateCeoInstructions } from '../shared/opencodeGateDelivery.ts';

export interface OpenCodeGatePlan {
  runId: string;
  repository: string;
  model: string;
  localVersion: string;
  remoteVersion: string;
  ceoDirectory: string;
  repositoryDirectory: string;
  workMs: number;
  totalMs: number;
}
type Phase = 'preparing' | 'awaiting-approval' | 'running' | 'verifying' | 'complete' | 'failed' | 'closed';
export interface GateReadiness {
  repositoryPrivate: boolean;
  localVersion: string;
  remoteVersion: string;
  localOAuth: boolean;
  remoteOAuth: boolean;
  deviceMethod: { id: string; type: string; label: string };
  localModels: OpenCodeCatalog;
  remoteModels: OpenCodeCatalog;
}

/** Opt-in controller for one test run. Importing this module never starts a process, login, HTTP request or timer. */
export class OpenCodeBoxGate {
  private phase: Phase = 'preparing';
  private box: BoxInfo | null = null;
  private creationAttempted = false;
  private creation: { name: string; labels: string[] } | null = null;
  private creating: Promise<BoxInfo> | null = null;
  private startedAt: number | null = null;
  private ceoId = '';
  private workerId = '';
  private branch = '';
  private issueAttempted = false;
  private issue: number | null = null;
  private sessions = { ceo: 0, agent: 0 };
  private finished = { ceo: false, agent: false };
  private handles = new Set<SessionHandle>();
  private listeners = new Set<() => void>();
  private reason: string | null = null;
  private inspect: (() => { agents: AgentView[] }) | null = null;
  private backendConfigured = false;
  private indexObserver:((stage:Exclude<GateIndexStage,'after-worker'>)=>Promise<void>)|null=null;
  private indexChecks:Partial<Record<Exclude<GateIndexStage,'after-worker'>,Promise<void>>>={};
  private plan: Readonly<OpenCodeGatePlan>;

  constructor(plan: OpenCodeGatePlan, private now = Date.now) {
    if (!/^[a-z0-9-]{8,64}$/.test(plan.runId) || !/^[\w.-]+\/[\w.-]+$/.test(plan.repository) || !/^openai\/[\w.-]+#[\w.-]+$/.test(plan.model)) throw new Error('Invalid isolated run plan');
    if (!Number.isFinite(plan.workMs) || !Number.isFinite(plan.totalMs) || plan.workMs <= 0 || plan.workMs > 25*60000 || plan.totalMs < plan.workMs+5*60000 || plan.totalMs > 30*60000) throw new Error('A run needs bounded work time and five minutes reserved for teardown');
    for (const dir of [plan.ceoDirectory, plan.repositoryDirectory]) if (!path.isAbsolute(dir) || /[\x00-\x1f*?]/.test(dir) || path.resolve(dir) === path.parse(dir).root) throw new Error('Explicit non-root isolated directories required');
    this.plan = Object.freeze({ ...plan });
  }

  snapshot() {
    return { phase: this.phase, runId: this.plan.runId, repository: this.plan.repository, model: this.plan.model,
      boxId: this.box?.id ?? null, creationAttempted: this.creationAttempted, issue: this.issue, sessions: { ...this.sessions },
      creation: this.creation ? {name:this.creation.name,labels:[...this.creation.labels]} : null,
      finished: { ...this.finished }, reason: this.reason, branch: this.branch,
      workDeadline: this.startedAt === null ? null : this.startedAt+this.plan.workMs,
      teardownDeadline: this.startedAt === null ? null : this.startedAt+this.plan.totalMs };
  }
  subscribe(listener: () => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  observeWorkerIndex(observer:(stage:Exclude<GateIndexStage,'after-worker'>)=>Promise<void>) {
    if(this.phase!=='preparing'||this.indexObserver)throw new Error('Index observer must be bound once before work');
    this.indexObserver=observer;
  }
  private async checkWorkerIndex(stage:Exclude<GateIndexStage,'after-worker'>) {
    if(!this.indexObserver||this.phase!=='running'||this.sessions.agent!==1)return;
    const observer=this.indexObserver;
    const check=this.indexChecks[stage]??=Promise.resolve().then(()=>observer(stage)).catch(error=>{this.fail('worker-index-not-ready');throw error;});
    await check;
    this.requireWork();
  }
  private changed() { for (const listener of this.listeners) listener(); }
  private withinBudget() { return this.startedAt !== null && this.now() < this.startedAt+this.plan.workMs; }
  private requireWork() {
    if (!this.withinBudget()) { this.fail('work-deadline'); throw new Error('Original work deadline reached; teardown only'); }
    if (this.phase !== 'running') throw new Error('AI/mutations are locked until explicit model approval');
  }
  private repo(value: string) { if (value !== this.plan.repository) throw new Error('Repository is outside this run'); }
  private refuse = async (): Promise<never> => { throw new Error('Operation is not allowed in this isolated run'); };
  private invalidSession(message:string):never {this.fail('invalid-session');throw new Error(message);}

  bindActors(ceo: AgentView, worker: AgentView, inspect: () => { agents: AgentView[] }) {
    if (this.phase !== 'preparing' || !this.box || this.ceoId || ceo.id === worker.id || ceo.role !== 'ceo' || ceo.host === 'box' || worker.role !== 'agent' || worker.host !== 'box' || worker.repoId !== this.plan.repository || !this.box.labels.includes(`m:${machineName(worker.id)}`)) throw new Error('Exactly one real local CEO and the Box owner are required');
    this.ceoId=ceo.id; this.workerId=worker.id; this.inspect=inspect;
  }
  private actorsValid() {
    const agents=this.inspect?.().agents ?? [];
    return agents.length===2 && agents.some(a=>a.id===this.ceoId&&a.role==='ceo'&&a.host!=='box')
      && agents.some(a=>a.id===this.workerId&&a.role==='agent'&&a.host==='box'&&a.repoId===this.plan.repository);
  }
  authenticated(e: GateReadiness) {
    const [base,variant]=this.plan.model.split('#');
    const listed=(catalog:OpenCodeCatalog)=>catalog.models.some(m=>m.id===base&&m.provider==='openai'&&m.tools&&m.variants.includes(variant));
    if (this.phase!=='preparing' || !this.withinBudget() || !this.actorsValid() || !e.repositoryPrivate || e.localVersion!==this.plan.localVersion || e.remoteVersion!==this.plan.remoteVersion || !e.localOAuth || !e.remoteOAuth || e.deviceMethod.type!=='oauth' || e.deviceMethod.label!=='Codex device code (legacy)' || !e.deviceMethod.id || e.deviceMethod.id.startsWith('-') || !listed(e.localModels) || !listed(e.remoteModels)) throw new Error('Authentication, inventories, versions and original resource scope must all be verified');
    this.phase='awaiting-approval'; this.changed();
  }
  approve(input: { runId: string; repository: string; model: string }) {
    if (this.phase!=='awaiting-approval' || !this.withinBudget() || input.runId!==this.plan.runId || input.repository!==this.plan.repository || input.model!==this.plan.model || !this.actorsValid()) throw new Error('Approval is missing, stale, expired or for another run/model');
    this.phase='running'; this.changed();
  }
  allowsWork(kind: string, agent: { id: string; role: string; host?: string }) {
    if (this.phase!=='running' || !this.withinBudget() || !this.actorsValid()) return false;
    return kind==='ceo' && agent.id===this.ceoId && agent.role==='ceo' && agent.host!=='box' && this.sessions.ceo===0
      || kind==='issue' && agent.id===this.workerId && agent.host==='box' && this.sessions.agent===0 && this.issue!==null;
  }
  fail(reason = 'stopped') {
    if (this.phase==='closed' || this.phase==='complete' || this.phase==='failed') return;
    this.phase='failed'; this.reason=reason;
    for (const handle of this.handles) handle.stop();
    this.handles.clear(); this.changed();
  }
  close() { this.fail('closed'); this.phase='closed'; this.changed(); }

  /** The actual API is retained. We cap creations and IDs; no fake setup response, marker, transport or success. */
  guardBoxes(api: BoxApi): BoxApi {
    const own=(id:string)=>{if(id!==this.box?.id)throw new Error('Box is outside this run');};
    return { ...api,
      list: async()=>this.box ? (await api.list()).filter(b=>b.id===this.box!.id) : [],
      create: async options=>{
        if(this.phase!=='preparing'||this.creationAttempted||options.size!=='small')throw new Error('Only one small Box creation is approved');
        this.creationAttempted=true;this.startedAt=this.now();this.changed();
        this.creation={name:options.name,labels:[...options.labels]};
        try { this.creating=api.create({...options,browser:false});this.box=await this.creating;this.changed();return this.box; }
        catch { this.fail('box-create-failed-or-ambiguous');throw new Error('Box create failed or is ambiguous; no retry'); }
      },
      get: id=>{own(id);return api.get(id);},
      resume: async id=>{own(id);if(!this.withinBudget())throw new Error('Original deadline reached');await api.resume(id);},
      pause: async id=>{own(id);throw new Error('Pause is not part of this test; teardown deletes the Box');},
      remove: id=>{own(id);return api.remove(id);},
      run: (id,script,options)=>{
        own(id);
        const token=script.match(/; rm -rf '\/workspace\/home\/\.cubefarm\/sessions\/([a-f0-9-]+)'; true$/)?.[1];
        const stopping=!!token&&script===tmuxKill(token);
        if(!stopping&&(!this.withinBudget()||['failed','closed','complete'].includes(this.phase)))throw new Error('Box work stopped; teardown only');
        if(isBoxSessionFilesScript(script))return this.checkWorkerIndex('before-worker-files').then(()=>api.run(id,script,options));
        return api.run(id,script,options);
      },
      session: (id,options)=>{own(id);if(!this.withinBudget()||['failed','closed','complete'].includes(this.phase))throw new Error('Box work stopped; teardown only');return this.checkWorkerIndex('before-worker-start').then(()=>api.session(id,options));},
      read: (id,file,options)=>{own(id);return api.read(id,file,options);},
      files: (id,dir)=>{own(id);return api.files(id,dir);},
      write: (id,file,content)=>{own(id);if(!this.withinBudget()||['failed','closed','complete'].includes(this.phase))throw new Error('Box work stopped');return this.checkWorkerIndex('before-worker-files').then(()=>api.write(id,file,content));},
      browser: async id=>{own(id);return false;},
    };
  }

  private office(original: OfficeTools): OfficeTools {
    const call=(name:string,args:Record<string,unknown>)=>{this.requireWork();return original.call(name,args);};
    return createOfficeTools({
      companyStatus:()=>call('company_status',{}),
      agentDetail:args=>{if(![this.ceoId,this.workerId].includes(args.agent_id))throw new Error('Agent is outside this run');return call('agent_detail',args);},
      setFloorProfile:()=>{throw new Error('Profile changes are not part of this run');},
      scaleTeam:()=>{throw new Error('No additional agents');}, configureAgent:()=>{throw new Error('The run model and CLI are fixed');},
      fileIssue:args=>call('file_issue',args),
      setDependencies:this.refuse, closeIssue:this.refuse, retryQa:this.refuse, sendBack:this.refuse, rerunChecks:this.refuse, closePull:this.refuse, escalate:this.refuse,
    });
  }

  permissions(role: 'ceo'|'agent', cwd: string, branch = ''): OpenCodePermissionRule[] {
    const rules:OpenCodePermissionRule[]=[{action:'*',resource:'*',effect:'deny'},{action:'read',resource:'*',effect:'allow'},{action:'glob',resource:'*',effect:'allow'},{action:'grep',resource:'*',effect:'allow'}];
    const allow=(action:string,resource:string)=>rules.push({action,resource,effect:'allow'});
    if(role==='ceo') {
      const repo=this.plan.repositoryDirectory.replaceAll('\\','/');
      allow('external_directory',`${repo}/*`);allow('external_directory',repo);
      for(const action of ['office_company_status','office_agent_detail','office_file_issue'])allow(action,'*');
    } else {
      if(!this.issue)throw new Error('An approved issue is required for worker permissions');
      rules.push(...gateWorkerPermissionRules(this.plan.repository,branch,this.issue,cwd));
    }
    rules.push({action:'read',resource:'*.env',effect:'deny'},{action:'read',resource:'*.env.*',effect:'deny'},{action:'subagent',resource:'*',effect:'deny'});
    return rules;
  }

  /** This backend is the real office backend plus explicit safety gates; tests inject fakes, live callers supply real adapters. */
  backend(base: Backend, boxes: BoxApi, credentials: Readonly<Pick<CloudSecrets,'upstashBoxKey'|'cloudGithubToken'>>): Backend {
    if(this.backendConfigured||!credentials.upstashBoxKey||!credentials.cloudGithubToken)throw new Error('One backend with manual in-memory Upstash and scoped GitHub credentials required');
    this.backendConfigured=true;
    const restrictedBoxes=this.guardBoxes(boxes);
    const guarded:Backend={...base,
      detectClis:()=>base.detectClis(['opencode']),
      allowWork:(kind,agent)=>this.allowsWork(kind,agent),
      cloud:{...base.cloud,credentials:{upstashBoxKey:credentials.upstashBoxKey,cloudGithubToken:credentials.cloudGithubToken},automaticSignIn:false,boxes:()=>restrictedBoxes,ghToken:async()=>{throw new Error('Reading the PC GitHub token is forbidden in this run');},env:()=>({})},
      createIssue:async(repo,title,body,labels)=>{
        this.repo(repo);this.requireWork();
        if(this.issueAttempted||this.sessions.ceo!==1)throw new Error('Only one CEO-issued task is approved');
        this.issueAttempted=true;
        try {const n=await base.createIssue(repo,title,body,labels);if(!Number.isSafeInteger(n)||n<=0)throw new Error();this.issue=n;this.changed();return n;}
        catch {this.fail('issue-create-failed-or-ambiguous');throw new Error('Issue creation failed or ambiguous; no retry');}
      },
      startSession:(options,callbacks)=>{
        this.requireWork();
        const role=options.role;
        if(!this.actorsValid()||options.cli!=='opencode'||options.model!==this.plan.model||!options.terminal||options.reattach||options.typed||options.resumeSessionId||options.browserTesting||this.sessions[role]!==0)this.invalidSession('Session violates the approved model, role, host or one-shot limit');
        if(role==='ceo'&&(options.agentId!==this.ceoId||options.box||path.resolve(options.cwd)!==path.resolve(this.plan.ceoDirectory)||!options.office))this.invalidSession('CEO must remain in its isolated local office');
        if(role==='agent') {
          const agent=this.inspect!().agents.find(a=>a.id===this.workerId)!;
          if(options.agentId!==this.workerId||options.task!=='issue'||!this.issue||agent.issueNumber!==this.issue||options.box?.boxId!==this.box?.id||!options.box||options.box.api!==restrictedBoxes||options.cwd!==boxDeskDir(this.plan.repository)||!agent.branch||!agent.branch.startsWith(`swarm/issue-${this.issue}-`)||!/^swarm\/[\w.-]+$/.test(agent.branch))this.invalidSession('Worker must use the one approved remote Box and issue branch');
          this.branch=agent.branch;
        }
        this.sessions[role]++;
        let ended=false;
        let handle:SessionHandle|undefined;
        const finish=(result:SessionResult)=>{
          if(ended)return;ended=true;if(handle)this.handles.delete(handle);
          if(['closed','failed','complete'].includes(this.phase)){callbacks.finished(result);return;}
          if(!result.ok||result.signedOut||result.interrupted)this.fail(`${role}-failed`);
          else {this.finished[role]=true;if(this.finished.ceo&&this.finished.agent)this.phase='verifying';this.changed();}
          callbacks.finished(result);
        };
        try {
          const instructions=role==='agent'?gateDeliveryInstructions(this.plan.repository,this.branch,this.issue!):gateCeoInstructions(this.plan.runId,this.plan.repository);
          handle=base.startSession({...options,systemAppend:`${options.systemAppend??''}\n\n${instructions}`,prompt:`${options.prompt}\n\n${instructions}`,keepAlive:false,openCodePermissions:this.permissions(role,options.cwd,this.branch),...(options.office?{office:this.office(options.office)}:{})},{...callbacks,finished:finish});
          if(!ended)this.handles.add(handle);this.changed();
          return {stop:()=>handle!.stop(),send:()=>{throw new Error('No follow-up AI turns are approved');}};
        } catch {this.fail('session-start-failed');throw new Error('Session failed to start; no retry or fallback');}
      },
      mergePull:this.refuse,updateBranch:this.refuse,rerunFailedJobs:this.refuse,closePull:this.refuse,closeIssue:this.refuse,editIssue:this.refuse,commentPull:this.refuse,uploadEvidence:this.refuse,
      publishFolder:this.refuse,createProject:this.refuse,
      listMyRepos:this.refuse,
    };
    const readOps=['repoMeta','listIssues','listPulls','issueState','prForBranch','prDetails','issueDetails','ensureClone','syncMain','mainDir','deskDir','prepareDesk','removeDesk','sweepDesks','trimDesk','releaseDesk','setLocalPath','failedRunLog'] as const;
    for(const key of readOps) {
      const fn=base[key] as (...args:unknown[])=>unknown;
      (guarded as unknown as Record<string,unknown>)[key]=(repo:string,...args:unknown[])=>{this.repo(repo);return fn.call(base,repo,...args);};
    }
    return guarded;
  }

  verify(e: { repository: string; testsCode: number; testHead: string; prHead: string; prBranch: string; prState: string; crossRepository: boolean; closesIssues: number[] }) {
    if(!this.withinBudget()||this.phase!=='verifying'||!this.finished.ceo||!this.finished.agent||e.repository!==this.plan.repository||e.testsCode!==0||!e.testHead||e.testHead!==e.prHead||e.prBranch!==this.branch||e.prState!=='OPEN'||e.crossRepository||!e.closesIssues.includes(this.issue!))throw new Error('Success requires actual remote tests at the open PR head, with no merge');
    this.phase='complete';this.changed();
  }

  /** Teardown is an explicit async operation; a successful request alone is never an absence confirmation. */
  async cleanup(api: BoxApi) {
    this.close();
    // A cancellation during an in-flight create must not race its eventual ID and leave an unowned resource.
    if(this.creating)await this.creating.catch(()=>undefined);
    let id=this.box?.id;
    if(!id&&this.creationAttempted&&this.creation) {
      const request=this.creation;
      const matches=(await api.list()).filter(b=>b.name===request.name&&request.labels.every(l=>b.labels.includes(l)));
      if(matches.length!==1)return {requested:false,confirmedAbsent:false,ambiguousCreate:true};
      id=matches[0].id;
    }
    if(!id)return {requested:false,confirmedAbsent:true,noResourceCreated:true};
    await api.remove(id);
    return {requested:true,boxId:id,confirmedAbsent:await api.get(id)===null};
  }
}
