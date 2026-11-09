import { describe, expect, it, vi } from 'vitest';
import { GateDiagnostics, GateDiagnosticError, confirmGateApproval, gateErrorCategory } from './opencodeGateDiagnostics.ts';

describe('safe gate diagnostics, local only',()=>{
  it('keeps the first failing stage after successful or failed cleanup without serializing raw errors',async()=>{
    const changed=vi.fn();const d=new GateDiagnostics(changed);
    const error=Object.assign(new Error('Authorization: Bearer synthetic-secret https://private.invalid/device?code=1234'),{code:1,stderr:'github_pat_synthetic secret-value',path:'private/path'});
    await expect(d.step('repository-metadata',async()=>{throw error;})).rejects.toBe(error);
    await d.step('cleanup',async()=>true);
    await expect(d.step('office-shutdown',async()=>{throw new Error('another private-value');})).rejects.toThrow();
    expect(d.snapshot().firstFailure).toEqual({stage:'repository-metadata',status:'failed',category:'command-failed'});
    expect(JSON.stringify(d.snapshot())).not.toMatch(/Authorization|Bearer|synthetic-secret|private|1234|github_pat|secret-value/);
    expect(changed).toHaveBeenCalledTimes(6);
  });
  it.each([
    [{code:'ENOENT'},'command-not-found'],[{code:'EPERM'},'access-denied'],[{code:'EEXIST'},'already-exists'],
    [new SyntaxError('sensitive output'),'invalid-json'],[Object.assign(new Error('secret'),{name:'AbortError'}),'aborted'],
    [new GateDiagnosticError('repository-not-private'),'repository-not-private'],[{code:'secret-in-code'},'unknown'],['secret-error','unknown'],
  ])('classifies only fixed error metadata (%#)',(error,expected)=>expect(gateErrorCategory(error)).toBe(expected));
  it('requires the exact full resource phrase and never authorizes a retry or AI by partial input',()=>{
    for(const answer of ['APPROVO RISORSE','APPROVO RISORSE wrong','APPROVO AI test-run-1234 openai/test#medium','']) {
      expect(()=>confirmGateApproval(answer,'RISORSE','test-run-1234')).toThrow('approval-mismatch');
    }
    expect(()=>confirmGateApproval(' APPROVO RISORSE test-run-1234 ','RISORSE','test-run-1234')).not.toThrow();
    expect(()=>confirmGateApproval('APPROVO AI test-run-1234','AI','test-run-1234','openai/test#medium')).toThrow('approval-mismatch');
    expect(()=>confirmGateApproval('APPROVO AI test-run-1234 openai/test#medium','AI','test-run-1234','openai/test#medium')).not.toThrow();
  });
  it('returns detached snapshots that cannot overwrite the recorded failure',async()=>{
    const d=new GateDiagnostics();await expect(d.step('resource-approval',()=>confirmGateApproval('APPROVO RISORSE','RISORSE','test-run-1234'))).rejects.toThrow();
    const copy=d.snapshot();copy.entries.length=0;copy.firstFailure!.stage='cleanup';
    expect(d.snapshot().firstFailure?.stage).toBe('resource-approval');expect(d.snapshot().entries).toHaveLength(2);
  });
});
