import { afterEach, describe, expect, it, vi } from 'vitest';
import { CloudError, upstashBoxes } from './box.ts';
import { BoxMachines } from './boxMachines.ts';

const { session } = vi.hoisted(() => ({ session: vi.fn() }));
vi.mock('@upstash/box', () => ({
  Box: { get: vi.fn(async () => ({ exec: { session } })) },
  BoxError: class extends Error { statusCode?: number; },
}));

afterEach(() => { vi.useRealTimers(); session.mockReset(); });

function fixture(code: unknown, reject = false) {
  const close = vi.fn();
  session.mockImplementation(async (options) => {
    options.onStdout(Buffer.from('/workspace/home/work/test__repo\n'));
    return { close, wait: async () => { if (reject) throw new Error('synthetic-private-transport-error'); return code; } };
  });
  return close;
}

describe('Box command completion, SDK mocked without cloud access', () => {
  it('keeps a verified success and its output', async () => {
    fixture(0);
    await expect(upstashBoxes('synthetic-key').run('synthetic-box', 'synthetic command')).resolves.toEqual({ code: 0, output: '/workspace/home/work/test__repo\n' });
    expect(session).toHaveBeenCalledOnce();
  });

  it('keeps an actual nonzero shell exit distinct from missing transport completion', async () => {
    fixture(128);
    await expect(upstashBoxes('synthetic-key').run('synthetic-box', 'synthetic command')).resolves.toMatchObject({ code: 128 });
    expect(session).toHaveBeenCalledOnce();
  });

  it('preserves verified exit 1 after a success-looking desk path without inferring success or retrying', async () => {
    fixture(1);
    await expect(upstashBoxes('synthetic-key').run('synthetic-box', 'synthetic command')).resolves.toEqual({
      code: 1, output: '/workspace/home/work/test__repo\n',
    });
    expect(session).toHaveBeenCalledOnce();
  });

  it('keeps verified signal-style exit codes as actual shell failures', async () => {
    fixture(137);
    await expect(upstashBoxes('synthetic-key').run('synthetic-box', 'synthetic command')).resolves.toMatchObject({ code: 137 });
  });

  it('propagates missing completion through QA desk preparation as cloud trouble, not a PR desk strike', async () => {
    fixture(-1);
    class ReadyMachines extends BoxMachines {
      override ensure() { return Promise.resolve('synthetic-box'); }
    }
    const api = upstashBoxes('synthetic-key');
    const machines = new ReadyMachines({ api: () => api, office: () => 'abc123', size: () => 'small',
      versions: { claude: 'synthetic', codex: 'synthetic', opencode: 'synthetic', playwrightMcp: 'synthetic' },
      git: async () => ({ name: 'Test', email: 'test@example.invalid' }), githubEnv: async () => ({ GH_TOKEN: 'synthetic' }),
      state: () => {}, secrets: () => [], log: () => {},
    });
    await expect(machines.prepareDesk('synthetic', 'test/repo', { defaultBranch: 'main', pr: 7 }, 'qa/pr-7-ada')).rejects.toSatisfy((error: unknown) =>
      error instanceof CloudError && error.kind === 'other' && /verified exit status/.test(error.message));
    expect(session).toHaveBeenCalledOnce();
  });

  for (const code of [-1, -9, NaN, undefined, 256, '0']) {
    it(`refuses unverified exit ${String(code)} even after success-looking stdout, without retry`, async () => {
      fixture(code);
      await expect(upstashBoxes('synthetic-key').run('synthetic-box', 'synthetic command')).rejects.toSatisfy((error: unknown) =>
        error instanceof CloudError && error.kind === 'other' && /verified exit status/.test(error.message) && !error.message.includes('/workspace/'));
      expect(session).toHaveBeenCalledOnce();
    });
  }

  it('does not expose a rejected wait error or mistake it for a Git failure', async () => {
    fixture(null, true);
    await expect(upstashBoxes('synthetic-key').run('synthetic-box', 'synthetic command')).rejects.toSatisfy((error: unknown) =>
      error instanceof CloudError && error.kind === 'other' && !error.message.includes('synthetic-private-transport-error'));
    expect(session).toHaveBeenCalledOnce();
  });

  it('keeps the original deadline and reports timeout as cloud trouble without retry', async () => {
    vi.useFakeTimers();
    let finish!: (code: number) => void;
    const close = vi.fn(() => finish(-1));
    session.mockResolvedValue({ close, wait: () => new Promise<number>(resolve => { finish = resolve; }) });
    const run = upstashBoxes('synthetic-key').run('synthetic-box', 'synthetic command', { timeoutMs: 25 });
    const settled = run.then(value => ({ value, error: null }), (error: unknown) => ({ value: null, error }));
    await vi.advanceTimersByTimeAsync(24);
    expect(close).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    const { value, error } = await settled;
    expect(value).toBeNull();
    expect(error).toBeInstanceOf(CloudError);
    expect((error as Error).message).toMatch(/timed out/i);
    expect(close).toHaveBeenCalledOnce();
    expect(session).toHaveBeenCalledOnce();
  });
});
