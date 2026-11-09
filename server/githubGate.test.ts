import { describe, expect, it, vi } from 'vitest';
import { listIssues, listPulls, readOnce, repoMeta } from './github.ts';
const {query}=vi.hoisted(()=>({query:vi.fn()}));
vi.mock('./exec.ts',async original=>({...await original<typeof import('./exec.ts')>(),ghJson:query}));
describe('GitHub gate reads, mocked official CLI only',()=>{
  it('does not retry a failed issue read when the explicit single-read policy is selected',async()=>{
    query.mockReset().mockRejectedValue(new Error('read failed'));
    await expect(listIssues('test/repo',readOnce)).rejects.toThrow('read failed');
    expect(query).toHaveBeenCalledOnce();
  });
  it('does not retry either open/merged PR read under the single-read policy',async()=>{
    query.mockReset().mockRejectedValue(new Error('read failed'));
    await expect(listPulls('test/repo',readOnce)).rejects.toThrow('read failed');
    expect(query).toHaveBeenCalledTimes(2);
  });
  it('retrieves privacy metadata without deriving it from token permissions',async()=>{
    query.mockReset().mockResolvedValue({nameWithOwner:'test/repo',url:'https://example.invalid/test/repo',isPrivate:true,defaultBranchRef:{name:'main'},description:null});
    expect(await repoMeta('test/repo')).toMatchObject({nameWithOwner:'test/repo',isPrivate:true,defaultBranch:'main'});
    expect(query.mock.calls[0][0]).toContain('nameWithOwner,description,url,defaultBranchRef,isPrivate');
  });
});
