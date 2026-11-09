import { BOX_CF, sq } from './boxScripts.ts';
import type { BoxApi } from './box.ts';

const marker='/* DS_BOX_SESSION_FILES */\n';
const allowed=new Set(['settings.json','mcp.json','instructions.md','task.md','launch.json']);
/** Commands stay bounded even for long UTF-8 prompts; no SDK files.write or index operations. */
export function boxSessionFilesScripts(directory:string,files:readonly (readonly [string,string])[]):string[] {
  if(!new RegExp(`^${BOX_CF.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}/sessions/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$`).test(directory))throw new Error('Invalid remote session directory');
  const seen=new Set<string>(),scripts:string[]=[];
  for(const [file,text] of files){
    const name=file.slice(directory.length+1);
    if(file!==directory+'/'+name||!allowed.has(name)||seen.has(name)||typeof text!=='string')throw new Error('Invalid remote session file');
    seen.add(name);
    const bytes=Buffer.from(text,'utf8');
    for(let offset=0;offset===0||offset<bytes.length;offset+=16384){
      const request={directory,name,offset,base64:bytes.subarray(offset,offset+16384).toString('base64')};
      const code=marker+`const request=${JSON.stringify(request)};
const fs=require('node:fs'),path=require('node:path');
try{
 if(process.geteuid()===0)throw new Error();
 const base=${JSON.stringify(BOX_CF)};
 if(fs.realpathSync(base)!==base)throw new Error();
 for(const dir of [base+'/sessions',request.directory]){try{fs.mkdirSync(dir,{mode:0o700});}catch(e){if(e.code!=='EEXIST')throw e;}if(fs.realpathSync(dir)!==dir)throw new Error();}
 const file=path.join(request.directory,request.name),data=Buffer.from(request.base64,'base64');
 const flags=fs.constants.O_WRONLY|fs.constants.O_NOFOLLOW|(request.offset===0?fs.constants.O_CREAT|fs.constants.O_EXCL:0);
 const fd=fs.openSync(file,flags,0o600);
 try{const st=fs.fstatSync(fd);if(!st.isFile()||st.uid!==process.geteuid()||st.size!==request.offset)throw new Error();if(fs.writeSync(fd,data,0,data.length,request.offset)!==data.length)throw new Error();}finally{fs.closeSync(fd);}
 process.stdout.write('DS_SESSION_FILES=written');
}catch{process.stdout.write('DS_SESSION_FILES=failed');process.exitCode=1;}`;
      scripts.push('node -e '+sq(code));
    }
  }
  return scripts;
}
export const isBoxSessionFilesScript=(script:string)=>script.startsWith("node -e '"+marker);

/** Fail closed: no SDK upload fallback, retry, raw remote error or output in the office terminal. */
export async function writeBoxSessionFiles(api:BoxApi,id:string,directory:string,files:readonly (readonly [string,string])[]) {
  const scripts=boxSessionFilesScripts(directory,files);
  try{
    for(const script of scripts){
      const result=await api.run(id,script,{env:{GH_TOKEN:'',GITHUB_TOKEN:'',OPENAI_API_KEY:'',ANTHROPIC_API_KEY:''},timeoutMs:60000});
      if(result.code!==0||result.output!=='DS_SESSION_FILES=written')throw new Error();
    }
  }catch{throw new Error('Remote session files could not be prepared; worker not started');}
}
