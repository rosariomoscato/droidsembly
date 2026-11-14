import fs from 'node:fs';
import path from 'node:path';
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

let dir='';
// Fixed protocol only: never include raw subprocess streams, errors, paths or environment in CI diagnostics.
function launcherDiagnostics(result: Pick<SpawnSyncReturns<string>, 'error' | 'status' | 'signal' | 'stderr'>) {
  const milestones=[...(result.stderr ?? '').matchAll(/^probe (preflight-start|preflight-done|first-input-done|inputs-done|marshal-start|marshal-done|process-info-ready|environment-ready|child-start|child-wait|disposed) ms=(\d{1,9})\r?$/gm)]
    .slice(-16).map((m)=>({stage:m[1],ms:Number(m[2])}));
  const code=(result.error as NodeJS.ErrnoException | undefined)?.code;
  return {error:result.error ? (code && ['ETIMEDOUT','ENOENT','EACCES','EPERM'].includes(code) ? code : 'other') : null,
    status:result.status,signal:result.signal ? (/^SIG[A-Z]{1,10}$/.test(result.signal) ? result.signal : 'other') : null,
    milestones,lastStage:milestones.at(-1)?.stage ?? 'no-milestone'};
}
afterEach(()=>{if(dir)fs.rmSync(dir,{recursive:true,force:true,maxRetries:5});});
describe('protected PowerShell launcher failure visibility, no real credentials or provider',()=>{
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
  it.skipIf(process.platform!=='win32')('disposes synthetic secrets then keeps the failure visible until acknowledgement',()=>{
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
      return label ? `[Console]::Error.WriteLine('probe ${label} ms=' + $probeClock.ElapsedMilliseconds)\n${line}` : line;
    });
    fs.writeFileSync(script,`$probeClock=[Diagnostics.Stopwatch]::StartNew()\nfunction Read-Host { param([string]$Prompt,[switch]$AsSecureString)\nif($AsSecureString){$secure=[Security.SecureString]::new(); foreach($c in 'synthetic-not-a-secret'.ToCharArray()){$secure.AppendChar($c)}; return $secure}\n[IO.File]::WriteAllText('${quote(path.join(dir,'acknowledged.txt'))}', $Prompt)\nreturn ''\n}\n${traced}`.replace('param([Parameter(Mandatory=$true)][string]$PlanFile)',"$PlanFile = 'synthetic-plan-not-read-by-probe'"));
    const keep=new Set(['SYSTEMROOT','WINDIR','COMSPEC','PATH','PATHEXT','TEMP','TMP','USERPROFILE','LOCALAPPDATA','APPDATA','PROGRAMFILES','PROGRAMFILES(X86)','PROGRAMDATA','HOMEDRIVE','HOMEPATH','USERNAME','OS','PROCESSOR_ARCHITECTURE','NUMBER_OF_PROCESSORS']);
    const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>keep.has(k.toUpperCase())));
    const result=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',script],{env,encoding:'utf8',timeout:4000,windowsHide:true});
    // Reporters can omit assertion-message stderr; emit only bounded safe protocol data on failure.
    if(result.error || result.status!==1 || result.signal) console.error('launcher-probe-diagnostics',JSON.stringify(launcherDiagnostics(result)));
    expect(result.error).toBeUndefined();expect(result.status).toBe(1);
    expect(result.stdout).toContain('Runner exit code: 1');
    expect(result.stderr).toContain('probe disposed ms=');
    expect(fs.readFileSync(path.join(dir,'acknowledged.txt'),'utf8')).toContain('Press Enter to close');
    expect(result.stdout+result.stderr).not.toContain('synthetic-not-a-secret');
  });
});
