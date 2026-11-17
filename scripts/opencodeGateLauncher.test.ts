import fs from 'node:fs';
import path from 'node:path';
import type { SpawnSyncReturns } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';
import { runFixtureProcess, type FixtureProcessResult } from './fixtureProcess.ts';

let dir='';
let pendingProbe: Promise<FixtureProcessResult> | undefined;
type LauncherResult = Pick<SpawnSyncReturns<string>, 'error' | 'status' | 'signal'> & { stdout: string | null; stderr: string | null };
// Fixed protocol only: never include raw subprocess streams, errors, paths or environment in CI diagnostics.
function launcherDiagnostics(result: Omit<LauncherResult, 'stdout'>) {
  const milestones=[...(result.stderr ?? '').matchAll(/^probe (script-enter|resolve-node-start|resolve-node-done|resolve-loader-start|resolve-loader-done|script-path-ready|preflight-start|preflight-done|first-input-done|inputs-done|marshal-start|marshal-done|process-info-ready|environment-ready|child-start|child-wait|disposed) ms=(\d{1,9})\r?$/gm)]
    .slice(-16).map((m)=>({stage:m[1],ms:Number(m[2])}));
  const code=(result.error as NodeJS.ErrnoException | undefined)?.code;
  return {error:result.error ? (code && ['ETIMEDOUT','ENOENT','EACCES','EPERM'].includes(code) ? code : 'other') : null,
    status:result.status,signal:result.signal ? (/^SIG[A-Z]{1,10}$/.test(result.signal) ? result.signal : 'other') : null,
    milestones,lastStage:milestones.at(-1)?.stage ?? 'no-milestone'};
}
function launcherProbeDiagnostics(result: LauncherResult) {
  const stdout=result.stdout ?? '', stderr=result.stderr ?? '';
  return {...launcherDiagnostics(result),parserError:stderr.includes('ParserError'),preflightRejected:stderr.includes('Preflight failed.'),
    failureVisible:stdout.includes('Runner exit code: 1'),disposed:stderr.includes('probe disposed ms='),
    stdoutNull:result.stdout===null,stderrNull:result.stderr===null,stdoutCharacters:stdout.length,stderrCharacters:stderr.length,
    startupCategory:!stderr ? 'empty' : /ParserError|ParseException/.test(stderr) ? 'parser'
      : /CommandNotFoundException|command was not found|not recognized as the name/.test(stderr) ? 'command-not-found'
        : /PSSecurityException|UnauthorizedAccessException/.test(stderr) ? 'access' : 'unclassified'};
}
afterEach(async(context)=>{
  // Vitest's unchanged case deadline may expire during tree termination. Never
  // remove a directory still owned by that asynchronous fixture process.
  await pendingProbe;
  pendingProbe=undefined;
  if(dir && context.task.result?.state==='fail') {
    console.error('launcher-fixture-retained', JSON.stringify({synthetic:true}));
    return;
  }
  if(dir)fs.rmSync(dir,{recursive:true,force:true,maxRetries:5});
});
describe('protected PowerShell launcher failure visibility, no real credentials or provider',()=>{
  it('retains safe startup-error diagnostics when both subprocess streams are null',()=>{
    const diagnostics=launcherProbeDiagnostics({error:Object.assign(new Error('private executable path'),{code:'ENOENT'}),status:null,signal:null,stdout:null,stderr:null});
    expect(diagnostics).toEqual({error:'ENOENT',status:null,signal:null,milestones:[],lastStage:'no-milestone',
      parserError:false,preflightRejected:false,failureVisible:false,disposed:false,
      stdoutNull:true,stderrNull:true,stdoutCharacters:0,stderrCharacters:0,startupCategory:'empty'});
    expect(JSON.stringify(diagnostics)).not.toContain('private executable path');
  });
  it('distinguishes unclassified startup output from no output without exposing its content',()=>{
    const stderr='private-path private-output\nprobe script-enter ms=0\nprobe resolve-node-start ms=12\n';
    const diagnostics=launcherProbeDiagnostics({status:null,signal:'SIGTERM',stdout:'',stderr});
    expect(diagnostics.lastStage).toBe('resolve-node-start');
    expect(diagnostics.milestones).toEqual([{stage:'script-enter',ms:0},{stage:'resolve-node-start',ms:12}]);
    expect(diagnostics).toMatchObject({stdoutNull:false,stderrNull:false,stdoutCharacters:0,stderrCharacters:stderr.length,startupCategory:'unclassified'});
    expect(JSON.stringify(diagnostics)).not.toContain('private-');
  });
  it.each([['ParserError','parser'],['CommandNotFoundException','command-not-found'],['PSSecurityException','access']])('categorizes startup %s using fixed labels only',(stderr,category)=>{
    expect(launcherProbeDiagnostics({status:1,signal:null,stdout:'',stderr}).startupCategory).toBe(category);
  });
  it('retains bounded milestone diagnostics for a timeout without exposing raw subprocess data',()=>{
    const diagnostics=launcherDiagnostics({error:Object.assign(new Error('synthetic-private-error'),{code:'ETIMEDOUT'}),status:null,signal:'SIGTERM',
      stderr:'synthetic-private-output\nprobe child-wait ms=123\r\nprobe synthetic-private-stage ms=124\n'});
    expect(diagnostics).toEqual({error:'ETIMEDOUT',status:null,signal:'SIGTERM',milestones:[{stage:'child-wait',ms:123}],lastStage:'child-wait'});
    expect(JSON.stringify(diagnostics)).not.toContain('synthetic-private');
  });
  it('reports a missing milestone and caps recognized diagnostics',()=>{
    expect(launcherDiagnostics({error:Object.assign(new Error('private'),{code:'PRIVATE'}),status:null,signal:null,stderr:''}))
      .toEqual({error:'other',status:null,signal:null,milestones:[],lastStage:'no-milestone'});
    const stderr=Array.from({length:30},(_,i)=>`probe child-wait ms=${i}\n`).join('');
    const diagnostics=launcherDiagnostics({status:1,signal:null,stderr});
    expect(diagnostics.milestones).toHaveLength(16);
    expect(diagnostics.milestones[0]).toEqual({stage:'child-wait',ms:14});
  });
  it.skipIf(process.platform!=='win32')('disposes synthetic secrets then keeps the failure visible until acknowledgement',async()=>{
    dir=path.join(process.env.SWARM_HOME!,'launcher-local-probe');fs.mkdirSync(dir,{recursive:true});
    const probe=path.join(dir,'probe.mjs');
    fs.writeFileSync(probe,"process.exit(process.argv.includes('--check')?0:1);\n");
    const loader=path.join(dir,'probe-loader.mjs');
    fs.writeFileSync(loader,'// Local fixture loader: the synthetic .mjs child needs no TypeScript transform or dependencies.\n');
    const source=path.resolve(import.meta.dirname,'..');
    const quote=(s:string)=>s.replaceAll("'","''");
    const launcher=fs.readFileSync(path.join(source,'scripts/opencodeBoxGateLauncher.ps1'),'utf8')
      .replace('$source = Split-Path -Parent $PSScriptRoot',`$source = '${quote(source)}'`)
      .replace("$loader = ([Uri](Join-Path $source 'node_modules\\tsx\\dist\\loader.mjs')).AbsoluteUri",`$loader = ([Uri]'${quote(loader)}').AbsoluteUri`)
      .replace("$script = Join-Path $PSScriptRoot 'opencodeBoxGate.ts'",`$script = '${quote(probe)}'`);
    expect(launcher).toContain(`$loader = ([Uri]'${quote(loader)}').AbsoluteUri`);
    expect(launcher).toContain(`$source = '${quote(source)}'`);
    expect(launcher).toContain(`$script = '${quote(probe)}'`);
    const script=path.join(dir,'test.ps1');
    // Exercise the actual launcher with a local child and loader. Read-Host is synthetic and never reads stdin.
    // Construct the synthetic input directly: ConvertTo-SecureString autoloads an unrelated security module.
    // Milestones contain fixed labels/times only and make a subprocess stall diagnosable on hosted runners.
    const traced = launcher.replaceAll(/^(.*)$/gm, (line) => {
      const label = line.startsWith('& $node') ? 'preflight-start' : line.startsWith('$a = Read-Host') ? 'preflight-done'
        : line.startsWith('$b = Read-Host') ? 'first-input-done' : line.startsWith('$pa=') ? 'inputs-done'
          : line.includes('$pa=[Runtime.') ? 'marshal-start' : line.includes('$info=[System.') ? 'marshal-done'
            : line.includes('$keep=@') ? 'process-info-ready' : line.includes('$p=[System.') ? 'environment-ready'
        : line.includes('[void]$p.Start()') ? 'child-start' : line.includes('$p.WaitForExit()') ? 'child-wait'
          : line.startsWith('if ($result -ne 0)') ? 'disposed' : '';
      const early=line.startsWith('$node = ') ? 'resolve-node' : line.startsWith('$loader = ') ? 'resolve-loader' : '';
      if(early) return `[Console]::Error.WriteLine('probe ${early}-start ms=' + $probeClock.ElapsedMilliseconds)\n${line}\n[Console]::Error.WriteLine('probe ${early}-done ms=' + $probeClock.ElapsedMilliseconds)`;
      if(line.startsWith('$script = ')) return `${line}\n[Console]::Error.WriteLine('probe script-path-ready ms=' + $probeClock.ElapsedMilliseconds)`;
      return label ? `[Console]::Error.WriteLine('probe ${label} ms=' + $probeClock.ElapsedMilliseconds)\n${line}` : line;
    });
    fs.writeFileSync(script,`[Console]::Error.WriteLine('probe script-enter ms=0')\n$probeClock=[Diagnostics.Stopwatch]::StartNew()\nfunction Read-Host { param([string]$Prompt,[switch]$AsSecureString)\nif($AsSecureString){$secure=[Security.SecureString]::new(); foreach($c in 'synthetic-not-a-secret'.ToCharArray()){$secure.AppendChar($c)}; return $secure}\n[IO.File]::WriteAllText('${quote(path.join(dir,'acknowledged.txt'))}', $Prompt)\nreturn ''\n}\n${traced}`.replace('param([Parameter(Mandatory=$true)][string]$PlanFile)',"$PlanFile = 'synthetic-plan-not-read-by-probe'"));
    const keep=new Set(['SYSTEMROOT','WINDIR','COMSPEC','PATH','PATHEXT','TEMP','TMP','USERPROFILE','LOCALAPPDATA','APPDATA','PROGRAMFILES','PROGRAMFILES(X86)','PROGRAMDATA','HOMEDRIVE','HOMEPATH','USERNAME','OS','PROCESSOR_ARCHITECTURE','NUMBER_OF_PROCESSORS']);
    const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>keep.has(k.toUpperCase())));
    const spawnAt=performance.now();
    pendingProbe=runFixtureProcess('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',script],{cwd:process.cwd(),env,timeout:4000});
    const result=await pendingProbe;
    const spawnMs=Math.min(999999999,Math.floor(performance.now()-spawnAt));
    const diagnostics=launcherProbeDiagnostics(result);
    const safeDiagnostics={...diagnostics,spawnMs,observation:result.observation,
      executionMode:'owned-async',commandDeadlineMs:4000,
      hasPath:Object.keys(env).some((key)=>key.toUpperCase()==='PATH'),hasSystemRoot:Object.keys(env).some((key)=>key.toUpperCase()==='SYSTEMROOT')};
    // CI uploads only this fixed-schema file, never the raw synthetic result or
    // a whole SWARM_HOME. Its location is explicit: RUNNER_TEMP != os.tmpdir().
    if(process.env.DS_LAUNCHER_DIAGNOSTICS_DIR){
      fs.mkdirSync(process.env.DS_LAUNCHER_DIAGNOSTICS_DIR,{recursive:true});
      fs.writeFileSync(path.join(process.env.DS_LAUNCHER_DIAGNOSTICS_DIR,'safe-diagnostics.json'),JSON.stringify(safeDiagnostics,null,2));
    }
    // Reporters can omit assertion-message stderr; emit only bounded safe protocol data on failure.
    if(result.error || result.status!==1 || result.signal || !diagnostics.failureVisible || !diagnostics.disposed) {
      console.error('launcher-probe-diagnostics',JSON.stringify(safeDiagnostics));
      fs.writeFileSync(path.join(dir,'safe-diagnostics.json'),JSON.stringify(safeDiagnostics,null,2));
      // This fixture has only fixed synthetic inputs. Keep its local raw result
      // for diagnosis, but never emit arbitrary streams/paths to the CI log.
      fs.writeFileSync(path.join(dir,'synthetic-result.json'),JSON.stringify({status:result.status,signal:result.signal,stdout:result.stdout,stderr:result.stderr},null,2));
    }
    expect(result.error).toBeUndefined();expect(result.status).toBe(1);
    expect(result.stdout).toContain('Runner exit code: 1');
    expect(result.stderr).toContain('probe disposed ms=');
    expect(fs.readFileSync(path.join(dir,'acknowledged.txt'),'utf8')).toContain('Press Enter to close');
    expect(result.stdout+result.stderr).not.toContain('synthetic-not-a-secret');
  });
});
