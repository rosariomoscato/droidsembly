import { GateDiagnosticError } from '../shared/opencodeGateDiagnostics.ts';
import type { GateIndexSnapshot, GateIndexStage } from './openCodeGateIndex.ts';

export interface GateWorktreeSnapshot { head:string; clean:boolean; onApprovedBranch:boolean }
export interface GateAcceptanceSummary { tests:number; passed:number; failed:number; cancelled:number; skipped:number; todo:number }
export interface GateVerification {
  issue:number|null;
  branch:string|null;
  pr:{number:number;head:string;state:'OPEN'|'CLOSED'|'MERGED';branchMatches:boolean;crossRepository:boolean;closesApprovedIssue:boolean}|null;
  before:GateWorktreeSnapshot|null;
  after:GateWorktreeSnapshot|null;
  afterAcceptance:GateWorktreeSnapshot|null;
  afterWorkerTests:GateWorktreeSnapshot|null;
  workerTestsCode:number|null;
  independentTestsCode:number|null;
  independentSummary:GateAcceptanceSummary|null;
  passed:boolean;
  index:Partial<Record<GateIndexStage,GateIndexSnapshot>>;
}
export const emptyGateVerification=():GateVerification=>({issue:null,branch:null,pr:null,before:null,after:null,afterAcceptance:null,afterWorkerTests:null,workerTestsCode:null,independentTestsCode:null,independentSummary:null,passed:false,index:{}});

/** Trusted controller code, not AI code. Raw git output/stderr never leaves the probe. */
export function gateWorktreeSnapshotSource(directory:string,branch:string) {
  return `const {execFileSync}=require('node:child_process');\nconst cwd=${JSON.stringify(directory)};\nconst git=(...args)=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe'],timeout:10000}).trim();\ntry{const value={head:git('rev-parse','HEAD'),clean:git('status','--porcelain').length===0,onApprovedBranch:git('rev-parse','--abbrev-ref','HEAD')===${JSON.stringify(branch)}};process.stdout.write('DS_GATE_WORKTREE='+JSON.stringify(value));}catch{process.stdout.write('DS_GATE_WORKTREE_QUERY_FAILED');process.exitCode=2;}\n`;
}

export function parseGateWorktree(code:number,output:string):GateWorktreeSnapshot {
  try {
    if(code!==0||output.length>512||!output.trim().startsWith('DS_GATE_WORKTREE='))throw new Error();
    const v=JSON.parse(output.trim().slice('DS_GATE_WORKTREE='.length));
    if(!v||Object.keys(v).sort().join(',')!=='clean,head,onApprovedBranch'||typeof v.head!=='string'||!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(v.head)||typeof v.clean!=='boolean'||typeof v.onApprovedBranch!=='boolean')throw new Error();
    return {head:v.head,clean:v.clean,onApprovedBranch:v.onApprovedBranch};
  }catch{throw new GateDiagnosticError('worktree-query-failed');}
}

/** Require the 11 harness-owned tests to actually report completion, not only a zero process exit. */
export function parseGateAcceptance(output:string):GateAcceptanceSummary {
  const count=(label:string)=>{
    const matches=[...output.matchAll(new RegExp(`^# ${label} (\\d+)\\r?$`,'gm'))];
    if(!matches.length)throw new GateDiagnosticError('independent-tests-incomplete');
    return Number(matches.at(-1)![1]);
  };
  const summary={tests:count('tests'),passed:count('pass'),failed:count('fail'),cancelled:count('cancelled'),skipped:count('skipped'),todo:count('todo')};
  if(summary.tests!==11||summary.passed!==11||summary.failed!==0||summary.cancelled!==0||summary.skipped!==0||summary.todo!==0)throw new GateDiagnosticError('independent-tests-incomplete');
  return summary;
}
