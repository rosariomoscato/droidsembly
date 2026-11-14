import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { loadGatePlan } from './opencodeGatePlan.ts';
let root='';
afterEach(()=>{if(root)fs.rmSync(root,{recursive:true,force:true,maxRetries:5});root='';});
function fixture(){
  const base=path.join(os.tmpdir(),'opencode');fs.mkdirSync(base,{recursive:true});root=fs.mkdtempSync(path.join(base,'phase2-plan-'));
  const source=path.join(root,'source');fs.mkdirSync(source);
  const content='export const fixture = true;';fs.writeFileSync(path.join(source,'fixture.ts'),content);
  const hash=(s:string)=>crypto.createHash('sha256').update(s).digest('hex');
  const entries=[['fixture.ts',hash(content)]];const manifestSha256=hash(JSON.stringify(entries));
  const manifestFile=path.join(root,'manifest.json');fs.writeFileSync(manifestFile,JSON.stringify({manifestSha256,sources:[{file:'fixture.ts',sha256:hash(content)}]}));
  const input={runId:'plan-run-123456',repository:'test-owner/synthetic',model:'openai/test-model#medium',localVersion:'2.2.5',remoteVersion:'2.2.6',homeDirectory:path.join(root,'fresh-home'),manifestFile,manifestSha256};
  const file=path.join(root,'plan.json');
  const save=(value:unknown=input)=>{fs.writeFileSync(file,JSON.stringify(value));};save();return{source,input,file,save};
}
describe('isolated gate launch preflight',()=>{
  it('validates the candidate without creating the run home, touching credentials or importing the office',()=>{
    const f=fixture();const result=loadGatePlan(f.file,f.source);
    expect(result.office.ceoDirectory).toBe(path.join(f.input.homeDirectory,'ceo'));
    expect(result.office.workMs).toBe(25*60000);expect(result.office.totalMs).toBe(30*60000);
    expect(fs.existsSync(f.input.homeDirectory)).toBe(false);
  });
  it('refuses candidate drift, existing homes and secrets in the plan',()=>{
    const f=fixture();
    fs.writeFileSync(path.join(f.source,'fixture.ts'),'changed');expect(()=>loadGatePlan(f.file,f.source)).toThrow('changed');
    f.save({...f.input,token:'must-not-be-read'});expect(()=>loadGatePlan(f.file,f.source)).toThrow('metadata only');
    f.save();fs.mkdirSync(f.input.homeDirectory);expect(()=>loadGatePlan(f.file,f.source)).toThrow('already exists');
  });
  it('rejects protected or overlapping directories, unpinned remote version and an implicit model',()=>{
    const f=fixture();
    for(const change of [{homeDirectory:f.source},{homeDirectory:root},{remoteVersion:'latest'},{model:'openai/test-model'}]){f.save({...f.input,...change});expect(()=>loadGatePlan(f.file,f.source)).toThrow();}
  });
});
