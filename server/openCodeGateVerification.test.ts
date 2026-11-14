import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { gateWorktreeSnapshotSource, parseGateWorktree, parseGateAcceptance } from './openCodeGateVerification.ts';

const head='a'.repeat(40);
const summary='# tests 11\n# pass 11\n# fail 0\n# cancelled 0\n# skipped 0\n# todo 0\n';
describe('gate verification probes, synthetic only',()=>{
  it('executes the real snapshot source and projects only safe metadata, not git output or stderr',()=>{
    const calls:string[][]=[];let output='';
    const process={stdout:{write:(s:string)=>{output+=s;}},exitCode:0};
    vm.runInNewContext(gateWorktreeSnapshotSource('/synthetic/work','swarm/issue-17-worker'),{process,require:(name:string)=>{
      expect(name).toBe('node:child_process');
      return {execFileSync:(cmd:string,args:string[],options:{cwd:string})=>{
        expect(cmd).toBe('git');expect(options.cwd).toBe('/synthetic/work');calls.push(args);
        if(args[0]==='status')return '';
        if(args.includes('--abbrev-ref'))return 'swarm/issue-17-worker\n';
        return `${head}\n`;
      }};
    }});
    expect(calls).toEqual([['rev-parse','HEAD'],['status','--porcelain'],['rev-parse','--abbrev-ref','HEAD']]);
    expect(parseGateWorktree(process.exitCode,output)).toEqual({head,clean:true,onApprovedBranch:true});
  });
  it('turns an execution error into a fixed marker without exporting raw command error text',()=>{
    let output='';const process={stdout:{write:(s:string)=>{output+=s;}},exitCode:0};
    vm.runInNewContext(gateWorktreeSnapshotSource('/synthetic/work','swarm/issue-17-worker'),{process,require:()=>({execFileSync:()=>{throw new Error('private token stdout stderr');}})});
    expect(process.exitCode).toBe(2);expect(output).toBe('DS_GATE_WORKTREE_QUERY_FAILED');
    expect(()=>parseGateWorktree(process.exitCode,output)).toThrow('worktree-query-failed');
  });
  it.each([
    [1,`DS_GATE_WORKTREE=${JSON.stringify({head,clean:true,onApprovedBranch:true})}`],
    [0,'private invalid JSON'],[0,'DS_GATE_WORKTREE={"head":"short","clean":true,"onApprovedBranch":true}'],
    [0,`DS_GATE_WORKTREE=${JSON.stringify({head,clean:true,onApprovedBranch:true,token:'private'})}`],
  ])('rejects incomplete, hostile or nonzero snapshot results (%#)',(code,output)=>{
    expect(()=>parseGateWorktree(Number(code),String(output))).toThrow('worktree-query-failed');
  });
  it('requires all eleven independent tests, with zero skipped/cancelled/todo cases',()=>{
    expect(parseGateAcceptance(summary)).toEqual({tests:11,passed:11,failed:0,cancelled:0,skipped:0,todo:0});
    for(const output of ['',summary.replace('# tests 11','# tests 10'),summary.replace('# pass 11','# pass 10'),summary.replace('# skipped 0','# skipped 1'),summary.replace('# todo 0','# todo 1'),summary.replace('# cancelled 0','# cancelled 1'),summary.replace('# fail 0','# fail 1')])expect(()=>parseGateAcceptance(output)).toThrow('independent-tests-incomplete');
  });
});
