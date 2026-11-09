import { BOX_CF, sq } from './boxScripts.ts';
import type { BoxApi } from './box.ts';

/** Opt-in gate only: controller-owned acceptance file outside the worktree, never SDK files.write. */
export function boxGateAcceptanceScript(runId: string, source: string) {
  if (!/^[a-z0-9-]{8,64}$/.test(runId) || typeof source !== 'string' || Buffer.byteLength(source) > 16384) throw new Error('Invalid gate acceptance file');
  return 'node -e ' + sq(`/* DS_GATE_ACCEPTANCE_FILE */
const fs=require('node:fs'),base=${JSON.stringify(BOX_CF)},file=${JSON.stringify(`${BOX_CF}/gate-${runId}.mjs`)};
try{
 if(process.geteuid()===0||fs.realpathSync(base)!==base)throw new Error();
 const fd=fs.openSync(file,fs.constants.O_WRONLY|fs.constants.O_NOFOLLOW|fs.constants.O_CREAT|fs.constants.O_EXCL,0o600);
 try{const st=fs.fstatSync(fd);if(!st.isFile()||st.uid!==process.geteuid()||st.size!==0)throw new Error();fs.writeFileSync(fd,Buffer.from(${JSON.stringify(Buffer.from(source,'utf8').toString('base64'))},'base64'));}finally{fs.closeSync(fd);}
 process.stdout.write('DS_GATE_ACCEPTANCE=written');
}catch{process.stdout.write('DS_GATE_ACCEPTANCE=failed');process.exitCode=1;}`);
}

export async function writeBoxGateAcceptance(api: BoxApi, id: string, runId: string, source: string) {
  const script = boxGateAcceptanceScript(runId, source);
  try {
    const result = await api.run(id, script, { env: { GH_TOKEN: '', GITHUB_TOKEN: '', OPENAI_API_KEY: '', ANTHROPIC_API_KEY: '' }, timeoutMs: 60000 });
    if (result.code !== 0 || result.output !== 'DS_GATE_ACCEPTANCE=written') throw new Error();
  } catch { throw new Error('Independent acceptance file could not be prepared'); }
}
