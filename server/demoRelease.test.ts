// Demo CLI release must quiesce output before the office saves terminal snapshots.
import { afterEach, expect, it, vi } from 'vitest';
import { createDemoBackend } from './demo.ts';
import { AgentTerminal } from './terminal.ts';
import type { SessionCallbacks, SessionHandle } from './agentRunner.ts';

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it.each([false, true])('stops demo session output when CLI release begins (restart: %s)', async (restart) => {
  vi.useFakeTimers();
  const backend = createDemoBackend();
  const terminal = new AgentTerminal();
  const write = vi.spyOn(terminal, 'write');
  const callbacks: SessionCallbacks = {
    log: vi.fn(), tool: vi.fn(), sessionId: vi.fn(), browserUrl: vi.fn(),
    screenshot: vi.fn(), finished: vi.fn(),
  };
  let session: SessionHandle | undefined;
  try {
    session = backend.startSession({
      cwd: '/demo/fixture', prompt: 'Work on issue #1: synthetic task', systemAppend: '',
      model: '', effort: 'medium', browserTesting: false, additionalDirectories: [],
      role: 'agent', task: 'issue', terminal,
    }, callbacks);
    await vi.advanceTimersByTimeAsync(600);
    await backend.releaseClis(restart);
    const writes = write.mock.calls.length;
    const logs = vi.mocked(callbacks.log).mock.calls.length;
    await vi.advanceTimersByTimeAsync(60_000);
    expect(write).toHaveBeenCalledTimes(writes);
    expect(callbacks.log).toHaveBeenCalledTimes(logs);
    expect(callbacks.finished).toHaveBeenCalledTimes(1);
  } finally {
    await backend.releaseClis(restart);
    session?.stop();
    terminal.dispose();
  }
});
