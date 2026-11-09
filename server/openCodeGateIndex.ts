import { boxDeskDir, boxRepoDir } from './boxScripts.ts';
import { GateDiagnosticError } from '../shared/opencodeGateDiagnostics.ts';

export type GateIndexStage = 'before-worker-files' | 'before-worker-start' | 'after-worker';
export interface GateIndexSnapshot {
  state:'ready'|'scope-invalid'|'index-missing'|'index-unreadable'|'index-not-writable'|'git-read-failed'|'query-failed';
  uid:number|null;
  euid:number|null;
  gid:number|null;
  egid:number|null;
  index:{uid:number;gid:number;mode:number;readable:boolean;writable:boolean}|null;
  gitReadCode:number|null;
}

/** Read-only controller probe; never exports index contents, paths, stderr or environment. */
export function gateIndexSnapshotSource(repository:string) {
  if(!/^[\w.-]+\/[\w.-]+$/.test(repository))throw new Error('Invalid gate repository');
  return `const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const cwd=${JSON.stringify(boxDeskDir(repository))},root=${JSON.stringify(boxRepoDir(repository)+'/.git')};
const id=name=>typeof process[name]==='function'?process[name]():null;
const value={state:'query-failed',uid:id('getuid'),euid:id('geteuid'),gid:id('getgid'),egid:id('getegid'),index:null,gitReadCode:null};
const within=(parent,child)=>{const relative=path.relative(parent,child);return relative!==''&&!path.isAbsolute(relative)&&relative!=='..'&&!relative.startsWith('..'+path.sep);};
try{
 const r=spawnSync('git',['rev-parse','--path-format=absolute','--git-path','index'],{cwd,encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:10000,maxBuffer:4096});
 if(r.status!==0||typeof r.stdout!=='string')throw new Error();
 const index=r.stdout.trim(),canonical=fs.realpathSync(root),parent=fs.realpathSync(path.dirname(index));
 if(!path.isAbsolute(index)||(parent!==canonical&&!within(canonical,parent))||path.basename(index)!=='index'){value.state='scope-invalid';}
 else{
  let st;try{st=fs.statSync(index);}catch(e){if(e.code==='ENOENT')value.state='index-missing';else throw e;}
  if(st){
   if(!st.isFile()||!within(canonical,fs.realpathSync(index))){value.state='scope-invalid';}
   else{let readable=false,writable=false,fd;
    try{fd=fs.openSync(index,'r');fs.readSync(fd,Buffer.alloc(1),0,1,0);readable=true;}catch{}finally{if(fd!==undefined)fs.closeSync(fd);}
    try{fs.accessSync(index,fs.constants.W_OK);writable=true;}catch{}
    value.index={uid:st.uid,gid:st.gid,mode:st.mode&0o7777,readable,writable};
    if(!readable)value.state='index-unreadable';else if(!writable)value.state='index-not-writable';else{
     const query=spawnSync('git',['ls-files','--stage','-z'],{cwd,stdio:'ignore',timeout:10000});value.gitReadCode=Number.isInteger(query.status)&&query.status>=0?query.status:null;value.state=value.gitReadCode===0?'ready':'git-read-failed';
    }
   }
  }
 }
}catch{}
process.stdout.write('DS_GATE_INDEX='+JSON.stringify(value));`;
}

export function parseGateIndex(code:number,output:string):GateIndexSnapshot {
  try{
    if(code!==0||typeof output!=='string'||output.length>2048||!output.startsWith('DS_GATE_INDEX='))throw new Error();
    const v=JSON.parse(output.slice('DS_GATE_INDEX='.length));
    const integer=(n:unknown)=>Number.isSafeInteger(n)&&Number(n)>=0;
    if(!v||Object.keys(v).sort().join(',')!=='egid,euid,gid,gitReadCode,index,state,uid'||!['ready','scope-invalid','index-missing','index-unreadable','index-not-writable','git-read-failed','query-failed'].includes(v.state)||!['uid','euid','gid','egid'].every(k=>v[k]===null||integer(v[k]))||!(v.gitReadCode===null||integer(v.gitReadCode)&&v.gitReadCode<=255))throw new Error();
    if(v.index!==null){const m=v.index;if(!m||Object.keys(m).sort().join(',')!=='gid,mode,readable,uid,writable'||!['uid','gid','mode'].every(k=>integer(m[k]))||m.mode>4095||typeof m.readable!=='boolean'||typeof m.writable!=='boolean')throw new Error();}
    if(v.state==='ready'&&(!v.index?.readable||!v.index?.writable||v.gitReadCode!==0))throw new Error();
    return {state:v.state,uid:v.uid,euid:v.euid,gid:v.gid,egid:v.egid,index:v.index===null?null:{uid:v.index.uid,gid:v.index.gid,mode:v.index.mode,readable:v.index.readable,writable:v.index.writable},gitReadCode:v.gitReadCode};
  }catch{throw new GateDiagnosticError('git-index-query-failed');}
}
