import vm from 'node:vm';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { gateIndexSnapshotSource, parseGateIndex } from './openCodeGateIndex.ts';

function probe(mode='ready') {
  const root='/workspace/home/repos/owner__repo/.git',index=`${root}/worktrees/desk/index`;
  const calls:{command:string;args:string[]}[]=[],opened:string[]=[],closed:number[]=[];let output='';
  const denied=()=>Object.assign(new Error('PRIVATE RAW ERROR'),{code:'EACCES'});
  const fs={constants:{W_OK:2},realpathSync:(file:string)=>mode==='outside-file'&&file===index?'/outside/secret':file,statSync:()=>{if(mode==='missing')throw Object.assign(new Error('PRIVATE'),{code:'ENOENT'});return {uid:mode==='root-denied'?0:1002,gid:mode==='root-denied'?0:1002,mode:mode==='root-denied'?0o600:0o644,isFile:()=>mode!=='not-file'};},openSync:(file:string,flags:string)=>{expect(file).toBe(index);expect(flags).toBe('r');if(mode==='root-denied')throw denied();opened.push(file);return 9;},readSync:()=>{if(mode==='read-failed')throw denied();return 1;},closeSync:(fd:number)=>closed.push(fd),accessSync:(file:string,flags:number)=>{expect(file).toBe(index);expect(flags).toBe(2);if(['root-denied','not-writable'].includes(mode))throw denied();}};
  vm.runInNewContext(gateIndexSnapshotSource('owner/repo'),{Buffer,process:{getuid:()=>1002,geteuid:()=>1002,getgid:()=>1002,getegid:()=>1002,stdout:{write:(value:string)=>output+=value}},require:(name:string)=>{
    if(name==='node:fs')return fs;if(name==='node:path')return path.posix;expect(name).toBe('node:child_process');return {spawnSync:(command:string,args:string[],options:{cwd:string})=>{expect(options.cwd).toBe('/workspace/home/work/owner__repo');calls.push({command,args:Array.from(args)});expect(command).toBe('git');if(args[0]==='rev-parse')return {status:mode==='query-error'?2:0,stdout:mode==='outside-parent'?'/outside/index':index};return {status:mode==='git-read-failed'?128:0};}};
  }});
  expect(output).not.toContain('PRIVATE');expect(output).not.toContain('/workspace/');expect(closed).toHaveLength(opened.length);
  return {value:parseGateIndex(0,output),calls,output};
}
describe('read-only worker index preflight',()=>{
  it.each([
    ['ready','ready'],['root-denied','index-unreadable'],['read-failed','index-unreadable'],['not-writable','index-not-writable'],['missing','index-missing'],['outside-parent','scope-invalid'],['outside-file','scope-invalid'],['not-file','scope-invalid'],['git-read-failed','git-read-failed'],['query-error','query-failed'],
  ])('captures %s without changing permissions or contents', (mode,state)=>{
    const result=probe(mode);expect(result.value.state).toBe(state);
    expect(result.calls.every(call=>['rev-parse','ls-files'].includes(call.args[0]))).toBe(true);
    if(mode==='root-denied')expect(result.value).toMatchObject({euid:1002,index:{uid:0,gid:0,mode:0o600,readable:false,writable:false}});
  });
  it('records exact fixed Git argv',()=>{
    expect(probe().calls).toEqual([{command:'git',args:['rev-parse','--path-format=absolute','--git-path','index']},{command:'git',args:['ls-files','--stage','-z']}]);
  });
  it('rejects invalid/extra metadata instead of exporting private fields',()=>{
    const original=probe().value;
    for(const change of [(v:Record<string,unknown>)=>v.token='PRIVATE',(v:Record<string,unknown>)=>v.state='PRIVATE',(v:Record<string,unknown>)=>v.euid='PRIVATE',(v:Record<string,unknown>)=>(v.index as Record<string,unknown>).mode=4096,(v:Record<string,unknown>)=>(v.index as Record<string,unknown>).readable=false]){const v=structuredClone(original) as unknown as Record<string,unknown>;change(v);expect(()=>parseGateIndex(0,'DS_GATE_INDEX='+JSON.stringify(v))).toThrow('git-index-query-failed');}
    expect(()=>parseGateIndex(1,probe().output)).toThrow('git-index-query-failed');expect(()=>parseGateIndex(0,'PRIVATE')).toThrow('git-index-query-failed');
  });
});
