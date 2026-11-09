import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
if(process.argv.includes('--check')){console.log('Independent watchdog syntax only; no cloud access.');process.exit(0);}
const [home,id]=process.argv.slice(2);
const rel=path.relative(path.join(os.tmpdir(),'opencode'),home??'');
if(!rel||rel.startsWith('..')||path.isAbsolute(rel)||!id||!/^[\w-]+$/.test(id))throw new Error('Invalid watchdog ownership');
const resource=JSON.parse(fs.readFileSync(path.join(home,'RESOURCE.json'),'utf8'));
if(resource.boxId!==id||!Number.isFinite(resource.teardownDeadline)||resource.teardownDeadline>Date.now()+30*60000)throw new Error('Watchdog resource does not match');
const key=process.env.DS_TEST_UPSTASH_KEY;delete process.env.DS_TEST_UPSTASH_KEY;
if(!key)throw new Error('Manual Upstash credential required');
const {Box}=await import('@upstash/box');
const conn={apiKey:key,enableTelemetry:false,debug:false,timeout:60000};
let timer;let watcher;let ended=false;
const stop=()=>{ended=true;clearTimeout(timer);watcher?.close();};
const record=result=>fs.writeFileSync(path.join(home,'WATCHDOG.json'),JSON.stringify({...result,boxId:id,at:new Date().toISOString()},null,2),{flag:'wx'});
const check=()=>{if(ended)return;try{if(JSON.parse(fs.readFileSync(path.join(home,'GATE_RESULTS.json'),'utf8')).cleanup?.confirmedAbsent){record({outcome:'parent-cleanup-confirmed'});stop();}}catch{}};
watcher=fs.watch(home,(_event,name)=>{if(String(name)==='GATE_RESULTS.json')check();});
timer=setTimeout(async()=>{
  if(ended)return;stop();const result={outcome:'independent-teardown',deleted:false,confirmedAbsent:false};
  try{await Box.delete({...conn,boxIds:id});result.deleted=true;}catch{}
  try{const box=await Box.get(id,conn);await box.getStatus();}catch(error){result.confirmedAbsent=error?.statusCode===404;}
  record(result);
},Math.max(0,resource.teardownDeadline-3*60000-Date.now()));
check();if(process.send)process.send({armed:true,id},()=>process.disconnect());
