import { describe, expect, it, vi } from 'vitest';
import { CommandError } from './exec.ts';
import { gateGithubRead, githubGateCategory } from './githubGateDiagnostics.ts';
import { GateDiagnostics } from '../shared/opencodeGateDiagnostics.ts';

describe('opt-in GitHub error categories, synthetic stderr only; no network',()=>{
  it.each([
    ['gh: Bad credentials (HTTP 401)','github-unauthorized'],
    ['HTTP 403: Forbidden (https://example.invalid/private)','github-forbidden'],
    ['GraphQL: Resource not accessible by personal access token (repository)','github-forbidden'],
    ['GraphQL: Resource not accessible by integration (repository)','github-forbidden'],
    ['HTTP 404: Not Found (https://example.invalid/private)','github-repository-unavailable'],
    ["GraphQL: Could not resolve to a Repository with the name 'synthetic/private'. (repository)",'github-repository-unavailable'],
    ['HTTP 429: Too Many Requests','github-rate-limited'],
    ['HTTP 403: API rate limit exceeded','github-rate-limited'],
    ['HTTP 403: secondary rate limit reached','github-rate-limited'],
    ['HTTP 502: Bad Gateway','github-server-failed'],
    ['To get started with GitHub CLI, please run: gh auth login','github-auth-required'],
    ['Alternatively, set the GH_TOKEN environment variable to a token.','github-auth-required'],
    ['error connecting to example.invalid','github-network-failed'],
    ['dial tcp: lookup example.invalid: no such host','github-network-failed'],
    ['TLS handshake timeout','github-network-failed'],
    ['Unknown JSON field: "synthetic"','github-cli-unsupported'],
    ['unknown flag: --synthetic','github-cli-unsupported'],
  ])('maps known signatures to one fixed category (%#)',(stderr,expected)=>{
    expect(githubGateCategory(new CommandError('private command arguments',stderr,1))).toBe(expected);
  });
  it('does not inspect arbitrary error stderr or guess unfamiliar failures',()=>{
    expect(githubGateCategory(Object.assign(new Error('raw secret'),{stderr:'HTTP 401'}))).toBeNull();
    expect(githubGateCategory(new CommandError('private','unfamiliar failure github_pat_synthetic',1))).toBeNull();
    expect(githubGateCategory(new CommandError('HTTP 401 only in a private message','',1))).toBeNull();
  });
  it('performs one read, preserves only the safe category through cleanup, and drops raw command output',async()=>{
    const d=new GateDiagnostics();
    const read=vi.fn(async()=>{throw new CommandError('secret arguments github_pat_synthetic','HTTP 404: Not Found https://example.invalid/hidden?token=synthetic',1);});
    await expect(d.step('repository-metadata',()=>gateGithubRead(read))).rejects.toThrow('github-repository-unavailable');
    await d.step('cleanup',async()=>true);
    expect(read).toHaveBeenCalledOnce();
    expect(d.snapshot().firstFailure).toEqual({stage:'repository-metadata',status:'failed',category:'github-repository-unavailable'});
    expect(JSON.stringify(d.snapshot())).not.toMatch(/secret arguments|github_pat|example.invalid|token=|HTTP 404/);
  });
  it('returns successful metadata unchanged and retains generic command-failed for an unknown signature',async()=>{
    const meta={isPrivate:true,nameWithOwner:'synthetic/private'};
    expect(await gateGithubRead(async()=>meta)).toBe(meta);
    const d=new GateDiagnostics();const error=new CommandError('private','unknown synthetic failure',1);
    await expect(d.step('repository-metadata',()=>gateGithubRead(async()=>{throw error;}))).rejects.toBe(error);
    expect(d.snapshot().firstFailure?.category).toBe('command-failed');
  });
});
