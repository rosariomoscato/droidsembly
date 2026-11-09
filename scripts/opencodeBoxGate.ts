// Deliberately no imports of the live office/SDK until BOTH --execute-approved and an interactive confirmation.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { loadGatePlan } from './opencodeGatePlan.ts';
import type { OpenCodeGateOffice, DeviceLogin } from '../server/openCodeGateOffice.ts';
import { GateDiagnostics, GateDiagnosticError, confirmGateApproval } from '../shared/opencodeGateDiagnostics.ts';

const source=path.resolve(import.meta.dirname,'..');
let persistDiagnostics: (() => void) | undefined;
const diagnostics=new GateDiagnostics(()=>persistDiagnostics?.());
async function main() {
const args=process.argv.slice(2);
const planAt=args.indexOf('--plan');
if(planAt<0||!args[planAt+1]||args.some((a,i)=>i!==planAt+1&&!['--plan','--check','--execute-approved'].includes(a)))throw new Error('Use --plan <file> --check; real actions additionally require --execute-approved');
const plan=await diagnostics.step('plan-check',()=>loadGatePlan(args[planAt+1],source));
if(args.includes('--check')){
  console.log(JSON.stringify({outcome:'local-plan-and-candidate-check-pass',runId:plan.launch.runId,repository:plan.launch.repository,model:plan.launch.model,home:plan.launch.homeDirectory,realCloud:false,realLogin:false,realAI:false}));
}else{
  if(!args.includes('--execute-approved')||!process.stdin.isTTY||!process.stdout.isTTY)throw new Error('Execution requires explicit flag and a visible interactive console');
  const ask=async(text:string,signal?:AbortSignal)=>{const rl=createInterface({input:process.stdin,output:process.stdout});try{return(await rl.question(text,{signal})).trim();}finally{rl.close();}};
  console.log(`PLAN: ${plan.launch.repository}; CEO ${plan.launch.localVersion}, Box ${plan.launch.remoteVersion}; ${plan.launch.model}; one small Box, no browser/keepAlive; 25+5 minutes; operational USD0.50 (not a provider cap). One issue/PR, no merge. Native permissions and backend guards are NOT an OS sandbox.`);
  await diagnostics.step('resource-approval',async()=>confirmGateApproval(await ask(`Type APPROVO RISORSE ${plan.launch.runId}: `),'RISORSE',plan.launch.runId));
  const key=process.env.DS_TEST_UPSTASH_KEY?.trim();const token=process.env.DS_TEST_GITHUB_TOKEN?.trim();
  delete process.env.DS_TEST_UPSTASH_KEY;delete process.env.DS_TEST_GITHUB_TOKEN;
  await diagnostics.step('credentials-check',()=>{
    if(!key||key.length>400||/\s/.test(key)||!token?.startsWith('github_pat_')||/\s/.test(token))throw new GateDiagnosticError('credentials-invalid');
  });
  // Keep the narrowing explicit; never echo the values when validation fails.
  if(!key||!token)throw new GateDiagnosticError('credentials-invalid');
  const keep=new Set(['SYSTEMROOT','WINDIR','COMSPEC','PATH','PATHEXT','TEMP','TMP','USERPROFILE','LOCALAPPDATA','APPDATA','PROGRAMFILES','PROGRAMFILES(X86)','PROGRAMDATA','HOMEDRIVE','HOMEPATH','USERNAME','OS','PROCESSOR_ARCHITECTURE','NUMBER_OF_PROCESSORS']);
  const clean=Object.fromEntries(Object.entries(process.env).filter(([k,v])=>keep.has(k.toUpperCase())&&v!==undefined));
  for(const name of Object.keys(process.env))if(!keep.has(name.toUpperCase()))delete process.env[name];
  Object.assign(process.env,{SWARM_HOME:plan.launch.homeDirectory,SWARM_PORT:'0',SWARM_PREVIEW_PORT:'0',GH_TOKEN:token});
  await diagnostics.step('run-home',()=>fs.mkdirSync(plan.launch.homeDirectory)); // fresh; no credential file
  const write=(file:string,value:unknown)=>fs.writeFileSync(path.join(plan.launch.homeDirectory,file),JSON.stringify(value,null,2).split(key).join('[REDACTED]').split(token).join('[REDACTED]'));
  persistDiagnostics=()=>write('GATE_DIAGNOSTICS.json',diagnostics.snapshot());persistDiagnostics();
  const [{OpenCodeGateOffice:GateOffice},{realBackend},{upstashBoxes},{handleHook,handleMcp,setOfficeUrl},{default:express},github,{gateGithubRead}]=await diagnostics.step('live-imports',()=>Promise.all([
    import('../server/openCodeGateOffice.ts'),import('../server/backend.ts'),import('../server/box.ts'),import('../server/cliRunner.ts'),import('express'),import('../server/github.ts'),import('../server/githubGateDiagnostics.ts'),
  ]));
  const app=express();app.post('/api/hooks/:token',express.json({limit:'64mb'}),(req,res)=>res.json(handleHook(String(req.params.token),req.body)));
  app.post('/api/mcp/:token',express.json({limit:'1mb'}),(req,res,next)=>void handleMcp(String(req.params.token),req,res).catch(next));
  const server=http.createServer(app);await diagnostics.step('http-listen',()=>new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);}));
  setOfficeUrl(`http://127.0.0.1:${(server.address() as {port:number}).port}`);
  let office:OpenCodeGateOffice|undefined;
  const raw=upstashBoxes(key,{browser:false});
  const create=raw.create;
  raw.create=async options=>{
    const box=await create(options);
    const state=office!.gate.snapshot();
    write('RESOURCE.json',{boxId:box.id,name:box.name,labels:box.labels,teardownDeadline:state.teardownDeadline});
    const guard=spawn(process.execPath,[path.join(source,'scripts/opencodeBoxGateWatchdog.mjs'),plan.launch.homeDirectory,box.id],{env:{...clean,DS_TEST_UPSTASH_KEY:key},detached:true,windowsHide:true,stdio:['ignore','ignore','ignore','ipc']});
    let timer:ReturnType<typeof setTimeout>|undefined;
    try{await new Promise<void>((resolve,reject)=>{timer=setTimeout(()=>reject(new Error('Teardown guard failed to arm')),10000);guard.once('error',()=>reject(new Error('Teardown guard could not start')));guard.once('exit',()=>reject(new Error('Teardown guard exited early')));guard.on('message',(m:{armed?:boolean;id?:string})=>{if(m.armed&&m.id===box.id)resolve();});});}finally{clearTimeout(timer);}
    guard.unref();write('GUARD_ARMED.json',{boxId:box.id,pid:guard.pid});return box;
  };
  const report:{outcome:string;result?:unknown;cleanup?:unknown;error?:string;diagnostics?:ReturnType<GateDiagnostics['snapshot']>;verification?:ReturnType<OpenCodeGateOffice['verificationSnapshot']>}={outcome:'running'};
  const login:DeviceLogin=async input=>{
    const session=await input.api.session(input.boxId,{cmd:`'/workspace/home/.cubefarm/cli/bin/opencode' auth login openai --method '${input.method.id.replaceAll("'","'\"'\"'")}'`,env:input.env,tty:true,cols:process.stdout.columns||120,rows:process.stdout.rows||32,onData:data=>process.stdout.write(data)});
    const wasRaw=process.stdin.isRaw;process.stdin.setRawMode(true);process.stdin.resume();
    const data=(chunk:Buffer)=>{if(chunk.includes(3))void office!.close();else session.write(chunk.toString('utf8'));};
    const aborted=()=>session.close();input.signal.addEventListener('abort',aborted,{once:true});process.stdin.on('data',data);
    try{if(await session.done!==0)throw new Error('Official device login did not finish');}
    finally{session.close();process.stdin.off('data',data);input.signal.removeEventListener('abort',aborted);process.stdin.setRawMode(!!wasRaw);process.stdin.pause();}
  };
  for(const signal of ['SIGINT','SIGTERM','SIGHUP'] as const)process.once(signal,()=>{void office?.close();});
  process.on('unhandledRejection',()=>{void office?.close().catch(()=>{});}); // fail closed without logging provider errors
  try{
    const backend={...realBackend,
      repoMeta:(repo:string)=>gateGithubRead(()=>realBackend.repoMeta(repo)),
      listIssues:(repo:string)=>gateGithubRead(()=>github.listIssues(repo,github.readOnce)),
      listPulls:(repo:string)=>gateGithubRead(()=>github.listPulls(repo,github.readOnce)),
      prForBranch:(repo:string,branch:string)=>gateGithubRead(()=>realBackend.prForBranch(repo,branch)),
      prDetails:(repo:string,number:number)=>gateGithubRead(()=>realBackend.prDetails(repo,number)),
    };
    office=await GateOffice.prepare({plan:plan.office,backend,boxes:raw,diagnostics,credentials:{upstashBoxKey:key,cloudGithubToken:token},onVerification:value=>write('GATE_VERIFICATION.json',value),onController:o=>{office=o;o.gate.subscribe(()=>write('GATE_STATUS.json',o.gate.snapshot()));}});
    console.log('Shared local OpenCode account: verify with the official auth list in your own terminal. No account is switched by this runner.');
    const confirmed=await diagnostics.step('local-account-confirmation',()=>ask('Is the active local account ChatGPT? Type USA (anything else stops): ',office!.signal));
    await diagnostics.step('authentication',()=>office!.authenticate({confirmLocalChatGPTAccount:confirmed==='USA',login}));
    console.log(`Authentication/inventory ready. Exact common model: ${plan.launch.model}. Original deadlines still apply.`);
    await diagnostics.step('ai-approval',async()=>confirmGateApproval(await ask(`Type APPROVO AI ${plan.launch.runId} ${plan.launch.model}: `,office!.signal),'AI',plan.launch.runId,plan.launch.model));
    report.result=await diagnostics.step('execution-verification',()=>office!.run({runId:plan.launch.runId,repository:plan.launch.repository,model:plan.launch.model}));report.outcome='ai-core-ceo-and-remote-worker-pass';
  }catch(error){
    if(!diagnostics.snapshot().firstFailure)diagnostics.failure('launcher',error);
    report.outcome='failed-stop-no-retry';report.error='Stopped; no raw provider output or credentials recorded. See safe stage metadata.';process.exitCode=1;
  }
  finally{
    try{
      const cleanup=await office?.close();report.cleanup=cleanup;
      if(!cleanup?.confirmedAbsent){report.outcome='cleanup-not-confirmed';process.exitCode=1;}
    }catch{report.cleanup={confirmedAbsent:false};report.outcome='cleanup-not-confirmed';process.exitCode=1;}
    report.diagnostics=diagnostics.snapshot();
    report.verification=office?.verificationSnapshot();
    write('GATE_RESULTS.json',report);console.log(JSON.stringify({outcome:report.outcome,firstFailure:report.diagnostics.firstFailure,report:path.join(plan.launch.homeDirectory,'GATE_RESULTS.json')}));
    await new Promise<void>(resolve=>server.close(()=>resolve()));
    process.stdin.pause();
  }
  process.exit(process.exitCode??0);
}
}
void main().catch(error=>{
  diagnostics.failure('launcher',error);
  console.error(JSON.stringify({outcome:'launcher-stopped-no-retry',firstFailure:diagnostics.snapshot().firstFailure}));
  console.error('STOP. For approval-mismatch, use the COMPLETE phrase including run ID. No automatic retry.');
  process.exit(1);
});
