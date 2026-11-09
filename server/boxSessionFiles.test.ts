import vm from 'node:vm';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { boxSessionFilesScripts, isBoxSessionFilesScript, writeBoxSessionFiles } from './boxSessionFiles.ts';
import type { BoxApi } from './box.ts';

const base='/workspace/home/.cubefarm',directory=base+'/sessions/01234567-89ab-cdef-0123-456789abcdef';
function fixture(mode='ready'){
  const files=new Map<string,Buffer>(),handles=new Map<number,string>(),dirs=new Set([base]),calls:string[]=[];
  const fs={constants:{O_WRONLY:1,O_NOFOLLOW:2,O_CREAT:4,O_EXCL:8},
    realpathSync:(file:string)=>{calls.push('realpath');return mode==='symlink-dir'&&file===directory?'/outside':file;},
    mkdirSync:(dir:string)=>{calls.push('mkdir');if(dirs.has(dir))throw Object.assign(new Error('PRIVATE'),{code:'EEXIST'});dirs.add(dir);},
    openSync:(file:string,flags:number,permissions:number)=>{
      calls.push('open');expect(file.startsWith(directory+'/')).toBe(true);expect(flags&2).toBe(2);expect(permissions).toBe(0o600);
      if(mode==='symlink-file'||mode==='access-denied')throw new Error('PRIVATE');
      if(flags&8){if(files.has(file))throw new Error('PRIVATE');files.set(file,Buffer.alloc(0));}
      if(!files.has(file))throw new Error('PRIVATE');handles.set(9,file);return 9;
    },
    fstatSync:(fd:number)=>({isFile:()=>mode!=='not-file',uid:mode==='wrong-owner'?0:1002,size:files.get(handles.get(fd)!)!.length}),
    writeSync:(fd:number,data:Buffer,_start:number,length:number,offset:number)=>{
      calls.push('write');const file=handles.get(fd)!;expect(files.get(file)!.length).toBe(offset);files.set(file,Buffer.concat([files.get(file)!,data]));return mode==='short-write'?Math.max(0,length-1):length;
    },closeSync:(fd:number)=>{calls.push('close');handles.delete(fd);},
  };
  const execute=(script:string)=>{
    expect(isBoxSessionFilesScript(script)).toBe(true);expect(script.length).toBeLessThan(26000);
    const code=script.slice("node -e '".length,-1).replaceAll("'\"'\"'","'");let output='';const process={geteuid:()=>mode==='root'?0:1002,stdout:{write:(s:string)=>{output+=s;}},exitCode:0};
    vm.runInNewContext(code,{process,Buffer,require:(name:string)=>{if(name==='node:fs')return fs;expect(name).toBe('node:path');return path.posix;}});
    expect(output).not.toContain('PRIVATE');expect(handles.size).toBe(0);return {code:process.exitCode,output};
  };
  return {execute,files,calls};
}
describe('OpenCode session files via shell process, no SDK uploads',()=>{
  it('writes exact Unicode/quotes/newlines and empty files without changing Git or existing files',()=>{
    const f=fixture(),content='è😀\n\'"$HOME; '+String.fromCharCode(0)+'\n';
    for(const script of boxSessionFilesScripts(directory,[[directory+'/instructions.md',content],[directory+'/settings.json','']]))expect(f.execute(script)).toEqual({code:0,output:'DS_SESSION_FILES=written'});
    expect(f.files.get(directory+'/instructions.md')!.toString('utf8')).toBe(content);expect(f.files.get(directory+'/settings.json')!.length).toBe(0);
    expect(f.calls.every(call=>['realpath','mkdir','open','write','close'].includes(call))).toBe(true);
  });
  it('chunks large multibyte prompts with exact byte offsets and bounded commands',()=>{
    const f=fixture(),text='à😀'.repeat(20000);const scripts=boxSessionFilesScripts(directory,[[directory+'/task.md',text]]);
    expect(scripts.length).toBeGreaterThan(1);for(const script of scripts)expect(f.execute(script).code).toBe(0);
    expect(f.files.get(directory+'/task.md')!.equals(Buffer.from(text))).toBe(true);
  });
  it.each(['root','symlink-dir','symlink-file','access-denied','wrong-owner','not-file','short-write'])('fails closed on %s without exposing errors or repairing permissions',mode=>{
    const f=fixture(mode);expect(f.execute(boxSessionFilesScripts(directory,[[directory+'/launch.json','synthetic']])[0])).toEqual({code:1,output:'DS_SESSION_FILES=failed'});
  });
  it('refuses an existing file and refuses replay instead of overwriting or retrying',()=>{
    const f=fixture(),script=boxSessionFilesScripts(directory,[[directory+'/launch.json','original']])[0];expect(f.execute(script).code).toBe(0);expect(f.execute(script).code).toBe(1);expect(f.files.get(directory+'/launch.json')!.toString()).toBe('original');
  });
  it('rejects an out-of-order chunk without creating a file',()=>{
    const f=fixture(),scripts=boxSessionFilesScripts(directory,[[directory+'/task.md','x'.repeat(20000)]]);expect(f.execute(scripts[1]).code).toBe(1);expect(f.files.size).toBe(0);
  });
  it('rejects worktrees, traversal, non-session files and duplicates before any remote action',()=>{
    for(const dir of ['/workspace/home/repos/owner__repo/.git',directory+'/../other','/workspace/home/.cubefarm/sessions/not-a-token'])expect(()=>boxSessionFilesScripts(dir,[[dir+'/launch.json','x']])).toThrow();
    for(const names of [['../index'],['index'],['nested/launch.json'],['launch.json','launch.json']])expect(()=>boxSessionFilesScripts(directory,names.map(name=>[directory+'/'+name,'x']))).toThrow();
  });
  it('preserves transport order and stops at the first failure without SDK fallback or raw remote errors',async()=>{
    const run=vi.fn(async()=>({code:1,output:'PRIVATE REMOTE ERROR'})),write=vi.fn();
    await expect(writeBoxSessionFiles({run,write} as unknown as BoxApi,'box',directory,[[directory+'/task.md','x'.repeat(20000)]])).rejects.toThrow('worker not started');
    expect(run).toHaveBeenCalledOnce();expect(write).not.toHaveBeenCalled();expect(run.mock.calls[0]).toBeDefined();
  });
  it('does not export a transport exception containing private data',async()=>{
    const run=vi.fn(async()=>{throw new Error('PRIVATE TOKEN');});
    await expect(writeBoxSessionFiles({run} as unknown as BoxApi,'box',directory,[[directory+'/launch.json','x']])).rejects.toThrow(/^Remote session files could not be prepared; worker not started$/);
  });
});
