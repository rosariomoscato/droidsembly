import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

let dir='';
afterEach(()=>{if(dir)fs.rmSync(dir,{recursive:true,force:true,maxRetries:5});});
describe('protected PowerShell launcher failure visibility, no real credentials or provider',()=>{
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
    fs.writeFileSync(script,`function Read-Host { param([string]$Prompt,[switch]$AsSecureString)\nif($AsSecureString){return (ConvertTo-SecureString 'synthetic-not-a-secret' -AsPlainText -Force)}\n[IO.File]::WriteAllText('${quote(path.join(dir,'acknowledged.txt'))}', $Prompt)\nreturn ''\n}\n${launcher}`.replace('param([Parameter(Mandatory=$true)][string]$PlanFile)',"$PlanFile = 'synthetic-plan-not-read-by-probe'"));
    const keep=new Set(['SYSTEMROOT','WINDIR','COMSPEC','PATH','PATHEXT','TEMP','TMP','USERPROFILE','LOCALAPPDATA','APPDATA','PROGRAMFILES','PROGRAMFILES(X86)','PROGRAMDATA','HOMEDRIVE','HOMEPATH','USERNAME','OS','PROCESSOR_ARCHITECTURE','NUMBER_OF_PROCESSORS']);
    const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>keep.has(k.toUpperCase())));
    const result=spawnSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',script],{env,encoding:'utf8',timeout:4000,windowsHide:true});
    expect(result.error).toBeUndefined();expect(result.status).toBe(1);
    expect(result.stdout).toContain('Runner exit code: 1');
    expect(fs.readFileSync(path.join(dir,'acknowledged.txt'),'utf8')).toContain('Press Enter to close');
    expect(result.stdout+result.stderr).not.toContain('synthetic-not-a-secret');
  });
});
