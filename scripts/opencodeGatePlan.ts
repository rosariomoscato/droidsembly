import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import type { OpenCodeGatePlan } from '../server/openCodeBoxGate.ts';

export interface GateLaunchPlan {
  runId: string;
  repository: string;
  model: string;
  localVersion: string;
  remoteVersion: string;
  homeDirectory: string;
  manifestFile: string;
  manifestSha256: string;
}
export function below(parent: string, child: string) {
  const relative=path.relative(path.resolve(parent),path.resolve(child));
  return !!relative&&!relative.startsWith('..')&&!path.isAbsolute(relative);
}
export function loadGatePlan(file: string, source: string): { launch: GateLaunchPlan; office: OpenCodeGatePlan } {
  const input=JSON.parse(fs.readFileSync(file,'utf8')) as GateLaunchPlan;
  const fields=['runId','repository','model','localVersion','remoteVersion','homeDirectory','manifestFile','manifestSha256'];
  if(!input||Object.keys(input).some(k=>!fields.includes(k))||fields.some(k=>typeof input[k as keyof GateLaunchPlan]!=='string'))throw new Error('Plan accepts explicit metadata only, never credentials');
  if(!/^[a-z0-9-]{8,64}$/.test(input.runId)||!/^[\w.-]+\/[\w.-]+$/.test(input.repository)||!/^openai\/[\w.-]+#[\w.-]+$/.test(input.model)||input.remoteVersion!=='2.2.6'||!/^2\.\d+\.\d+$/.test(input.localVersion))throw new Error('Invalid repository, model, run or pinned version');
  const approvedRoot=path.join(os.tmpdir(),'opencode');
  if(!path.isAbsolute(input.homeDirectory)||!below(approvedRoot,input.homeDirectory)||below(input.homeDirectory,source)||below(source,input.homeDirectory)||path.resolve(input.homeDirectory)===path.resolve(source))throw new Error('Use a separate fresh home under the approved temporary opencode folder');
  if(fs.existsSync(input.homeDirectory))throw new Error('This home already exists; no resume or automatic rerun');
  if(!/^[a-f0-9]{64}$/.test(input.manifestSha256))throw new Error('Candidate fingerprint required');
  const manifest=JSON.parse(fs.readFileSync(input.manifestFile,'utf8')) as {manifestSha256:string;sources:{file:string;sha256:string}[]};
  if(!Array.isArray(manifest.sources)||!manifest.sources.length||manifest.manifestSha256!==input.manifestSha256)throw new Error('Manifest does not match the approved candidate');
  const hash=(data:Buffer|string)=>crypto.createHash('sha256').update(data).digest('hex');
  const entries=manifest.sources.map(s=>{
    if(typeof s.file!=='string'||path.isAbsolute(s.file)||!below(source,path.resolve(source,s.file))||s.file.startsWith('.git/')||!/^([a-f0-9]{64})$/.test(s.sha256)||hash(fs.readFileSync(path.resolve(source,s.file)))!==s.sha256)throw new Error('Candidate sources changed');
    return [s.file,s.sha256] as const;
  }).sort(([a],[b])=>a.localeCompare(b));
  if(new Set(entries.map(([file])=>file)).size!==entries.length||hash(JSON.stringify(entries))!==input.manifestSha256)throw new Error('Invalid or duplicate manifest entries');
  return {launch:Object.freeze({...input}),office:{runId:input.runId,repository:input.repository,model:input.model,localVersion:input.localVersion,remoteVersion:input.remoteVersion,ceoDirectory:path.join(input.homeDirectory,'ceo'),repositoryDirectory:path.join(input.homeDirectory,'projects',input.repository.split('/')[1]),workMs:25*60000,totalMs:30*60000}};
}
