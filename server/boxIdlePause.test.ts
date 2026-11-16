import { describe, expect, it, vi } from 'vitest';
import { Swarm } from './swarm.ts';

// Exercise the real lifecycle methods without starting an office, CLI, filesystem
// fixture or provider connection. Only the terminal and Box API boundary are fake.
function fixture() {
  const a = { id: 'ada', name: 'Ada', status: 'done', task: 'qa' as string | null, host: 'box', machine: 'machine', boxCli: { token: 'old' } };
  const pause = vi.fn(async (_machine: string, _stillIdle?: () => boolean) => undefined);
  const swarm = Object.assign(Object.create(Swarm.prototype), {
    state: { agents: [a], qa: [] }, quotaWaiting: new Set(), agentRt: new Map(),
    boxMachines: { pause }, finishingAgents: new Map(), pausingAgents: new Set(), save: vi.fn(), emitAgent: vi.fn(), appendLog: vi.fn(),
  });
  return { a, pause, swarm };
}

describe('idle cloud desk pause', () => {
  it('pauses when clearing a completed desk synchronously closes its CLI', async () => {
    const { a, pause, swarm } = fixture();
    swarm.agentRt.set(a.id, { terminal: { releaseIdle: () => swarm.boxCliRecord(a.id, null) } });
    swarm.resetAgent(a.id);
    await Promise.resolve();
    expect(a.task).toBeNull();
    expect(a.boxCli).toBeNull();
    expect(pause).toHaveBeenCalledOnce();
  });

  it('pauses when the CLI already ended before the desk was cleared', async () => {
    const { a, pause, swarm } = fixture();
    a.status = 'working'; // process exits before result finalization clears the desk
    swarm.boxCliRecord(a.id, null);
    expect(pause).not.toHaveBeenCalled();
    a.status = 'done';
    swarm.resetAgent(a.id);
    await Promise.resolve();
    expect(pause).toHaveBeenCalledOnce();
  });

  it('does not pause a cleared desk while its CLI is still live', () => {
    const { a, pause, swarm } = fixture();
    swarm.resetAgent(a.id);
    expect(pause).not.toHaveBeenCalled();
    swarm.boxCliRecord(a.id, null);
    expect(pause).toHaveBeenCalledOnce();
  });

  it('does not erase a replacement CLI when old remote cleanup finishes', () => {
    const { a, pause, swarm } = fixture();
    a.boxCli = { token: 'new' };
    swarm.boxCliRecord(a.id, null, 'old');
    expect(a.boxCli).toEqual({ token: 'new' });
    expect(pause).not.toHaveBeenCalled();
  });

  it('also pauses a completed desk cleared by PR merge reconciliation', () => {
    const { a, pause, swarm } = fixture();
    swarm.dropping = new Map();
    swarm.agentRt.set(a.id, { terminal: { releaseIdle: () => swarm.boxCliRecord(a.id, null) } });
    swarm.dropTask(a, null);
    expect(a.task).toBeNull();
    expect(pause).toHaveBeenCalledOnce();
  });

  it('passes a live guard so a new task or sign-in cancels a pending idle pause', () => {
    const { a, pause, swarm } = fixture();
    a.status = 'working';
    swarm.boxCliRecord(a.id, null);
    a.status = 'done';
    swarm.resetAgent(a.id);
    const guard = pause.mock.calls[0][1]!;
    expect(guard()).toBe(true);
    a.task = 'issue';
    expect(guard()).toBe(false);
    a.task = null;
    swarm.openCodeAuthRun = { agentId: a.id };
    expect(guard()).toBe(false);
  });

  it('reports pause failure without including raw provider errors', async () => {
    const { a, pause, swarm } = fixture();
    pause.mockRejectedValueOnce(new Error('private-provider-secret'));
    a.status = 'working';
    swarm.boxCliRecord(a.id, null);
    a.status = 'done';
    swarm.resetAgent(a.id);
    await Promise.resolve();
    expect(swarm.appendLog).toHaveBeenCalledWith(a, expect.arrayContaining([expect.objectContaining({ text: expect.stringContaining('Automatic Box pause failed') })]));
    expect(JSON.stringify(swarm.appendLog.mock.calls)).not.toContain('private-provider-secret');
  });

  it('pauses after the idle CLI expires while a completed task stays on the desk', () => {
    const { a, pause, swarm } = fixture();
    swarm.boxCliRecord(a.id, null);
    expect(a.status).toBe('done');
    expect(a.task).toBe('qa'); // keep the completed report available to the manager
    expect(pause).toHaveBeenCalledOnce();
  });

  it('does not pause while the result is still being finalized', () => {
    const { a, pause, swarm } = fixture();
    swarm.finishingAgents.set(a.id, 1);
    swarm.boxCliRecord(a.id, null);
    expect(pause).not.toHaveBeenCalled();
  });

  it('waits for finalization then pauses without clearing the completed task', async () => {
    const { a, pause, swarm } = fixture();
    let finish!: () => void;
    swarm.finishAgentSession = async () => {
      swarm.boxCliRecord(a.id, null);
      await new Promise<void>(resolve => { finish = resolve; });
    };
    const finalizing = swarm.onFinished(a, {}, {});
    expect(pause).not.toHaveBeenCalled();
    finish();
    await finalizing;
    expect(pause).toHaveBeenCalledOnce();
    expect(a.task).toBe('qa');
    expect(swarm.finishingAgents.size).toBe(0);
  });

  it('does not pause before overlapping finalizations have both settled', async () => {
    const { a, pause, swarm } = fixture();
    const finish: (() => void)[] = [];
    swarm.finishAgentSession = () => new Promise<void>(resolve => { finish.push(resolve); });
    const first = swarm.onFinished(a, {}, {});
    const second = swarm.onFinished(a, {}, {});
    swarm.boxCliRecord(a.id, null);
    finish[0](); await first;
    expect(pause).not.toHaveBeenCalled();
    finish[1](); await second;
    expect(pause).toHaveBeenCalledOnce();
  });
});
