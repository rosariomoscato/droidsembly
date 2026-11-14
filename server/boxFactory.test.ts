import { describe, expect, it, vi } from 'vitest';
import { upstashBoxes } from './box.ts';
const {create}=vi.hoisted(()=>({create:vi.fn(async()=>({id:'fake-box-id'}))}));
vi.mock('@upstash/box',()=>({Box:{create},BoxError:class extends Error {statusCode=500;}}));
describe('real SDK adapter creation options, mocked SDK only',()=>{
  it('honors the gate no-browser request and explicitly disables keepAlive',async()=>{
    create.mockClear();
    await upstashBoxes('manual-fake-key').create({name:'test',labels:['test'],size:'small',browser:false});
    expect(create).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({browser:false,keepAlive:false,size:'small',runtime:'node',enableTelemetry:false}));
  });
  it('preserves normal browser behavior when no gate override was requested',async()=>{
    create.mockClear();await upstashBoxes('manual-fake-key').create({name:'test',labels:['test'],size:'small'});
    expect(create).toHaveBeenCalledWith(expect.objectContaining({browser:true,keepAlive:false}));
  });
});
