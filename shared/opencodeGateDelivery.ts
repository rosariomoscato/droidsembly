import type { OpenCodePermissionRule } from './opencodePermissions.ts';

/** Only for the manager-approved one-shot gate; ordinary office deduplication stays unchanged. */
export function gateCeoInstructions(runId:string,repository:string):string {
  if(!/^[a-z0-9-]{8,64}$/.test(runId)||!/^[\w.-]+\/[\w.-]+$/.test(repository))throw new Error('Invalid bounded CEO scope');
  return `Independent smoke run ${runId} on ${repository}: the manager explicitly approved a separate experiment ticket even if a similar issue from an earlier run is still open. After office_company_status, create exactly ONE NEW issue for this run, with "Independent smoke run ${runId}" in its title and body. Preserve all existing issues: do not reuse, edit, close, assign or change their dependencies. An earlier clamp issue is historical evidence, not this run's ticket. This is not a general exception to the no-duplicate rule: it applies only to this single manager-approved smoke run. Do not create another ticket, agent, AI follow-up or QA task. Finish after filing the new issue; if unable, report failure and stop.`;
}

/** Finite commands for this smoke task, not a generic shell authorization mechanism. */
export interface GateDeliveryCommands {stage:string[];commit:string[];push:string;pr:string[]}
export function gateDeliveryCommands(repository:string,branch:string,issue:number):GateDeliveryCommands {
  if(!/^[\w.-]+\/[\w.-]+$/.test(repository)||!Number.isSafeInteger(issue)||issue<=0||!new RegExp(`^swarm/issue-${issue}-[\\w.-]+$`).test(branch))throw new Error('Invalid bounded delivery scope');
  const stage=['git add clamp.mjs clamp.test.mjs','git add -- clamp.mjs clamp.test.mjs','git add clamp.mjs clamp.test.mjs README.md','git add -- clamp.mjs clamp.test.mjs README.md'];
  const commit=['git commit -m "Implement clamp"',"git commit -m 'Implement clamp'"];
  const push=`git push -u origin ${branch}`;
  const pr=['"',"'"].flatMap(q=>['','--draft '].map(draft=>`gh pr create ${draft}--repo ${repository} --base main --head ${branch} --title ${q}Implement clamp with node:test coverage${q} --body ${q}Closes #${issue}${q}`));
  return {stage,commit,push,pr};
}

export function gateWorkerPermissionRules(repository:string,branch:string,issue:number,cwd:string):OpenCodePermissionRule[] {
  if(cwd!==`/workspace/home/work/${repository.replace('/','__')}`)throw new Error('Worker directory is outside delivery scope');
  const commands=gateDeliveryCommands(repository,branch,issue);
  const rules:OpenCodePermissionRule[]=[];
  for(const file of ['clamp.mjs','clamp.test.mjs','README.md'])for(const resource of [file,`${cwd}/${file}`])rules.push({action:'edit',resource,effect:'allow'});
  const inspect=['pwd','git status','git status --short','git status --porcelain','git status --short --branch','git diff','git diff --stat','git diff --check','git diff --cached','git diff --cached --stat','git diff -- clamp.mjs clamp.test.mjs','git diff -- clamp.mjs clamp.test.mjs README.md','git branch --show-current','git rev-parse HEAD'];
  for(const resource of ['node --test clamp.test.mjs',...inspect,...commands.stage,...commands.commit,commands.push,...commands.pr])rules.push({action:'shell',resource,effect:'allow'});
  return rules;
}

export function gateDeliveryInstructions(repository:string,branch:string,issue:number):string {
  const commands=gateDeliveryCommands(repository,branch,issue);
  return `Delivery is restricted to the approved repository/branch and clamp.mjs, clamp.test.mjs, optionally README.md. Use the shell tool's workdir (do not prepend cd). For orientation, only the exact shell command pwd is permitted, without flags, arguments or redirections. Use native read, glob and grep tools to inspect files, and the native edit tool for the approved task files. Do not try ls, cat, find, env, shell wrappers or extra flags. If a required action is denied, report the exact denied action and stop; do not seek broader access or request another AI turn. After node --test clamp.test.mjs, use these EXACT commands, one at a time:\n${commands.stage[1]}\n${commands.commit[0]}\n${commands.push}\n${commands.pr[0]}\nIf README.md was changed, stage it with ${commands.stage[3]} instead. Do not change flag order, add flags, amend, force-push, merge, create other issues/PRs, run QA or use another repository. If delivery fails, report failure and stop; do not request more AI turns.`;
}
