import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AgentTerminal } from './terminal.ts';

const roots: string[] = [];
const terminals: AgentTerminal[] = [];
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}
async function fixture() {
  const parent = path.join(os.tmpdir(), 'opencode');
  await fs.mkdir(parent, { recursive: true });
  const root = await fs.mkdtemp(path.join(parent, 'terminal-persistence-'));
  roots.push(root);
  const terminal = new AgentTerminal();
  terminals.push(terminal);
  return { terminal, file: path.join(root, 'fixture.ansi') };
}
afterEach(async () => {
  vi.restoreAllMocks();
  for (const terminal of terminals.splice(0)) terminal.dispose();
  for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true });
});

describe('terminal save serialization', () => {
  it('does not begin a second parser flush/write while the first rename is blocked', async () => {
    const { terminal, file } = await fixture();
    const flush = vi.spyOn(terminal, 'flush').mockResolvedValue(undefined);
    let text = 'first synthetic screen';
    vi.spyOn(terminal, 'snapshot').mockImplementation(() => text);
    const entered = deferred();
    const release = deferred();
    const rename = fs.rename.bind(fs);
    let blocked = false;
    vi.spyOn(fs, 'rename').mockImplementation(async (from, to) => {
      if (String(to) === file && !blocked) {
        blocked = true;
        entered.resolve();
        await release.promise;
      }
      await rename(from, to);
    });
    const first = terminal.save(file);
    // Attach rejection handlers before exercising an unsafe old overlap.
    const firstResult = Promise.allSettled([first]);
    let outcomes: Promise<PromiseSettledResult<void>[]> = firstResult;
    try {
      await entered.promise;
      text = 'second synthetic screen';
      const second = terminal.save(file);
      outcomes = Promise.allSettled([first, second]);
      expect(flush).toHaveBeenCalledTimes(1);
    } finally {
      release.resolve();
      await outcomes;
    }
    expect((await outcomes).map(result => result.status)).toEqual(['fulfilled', 'fulfilled']);
    expect(flush).toHaveBeenCalledTimes(2);
    expect(await fs.readFile(file, 'utf8')).toBe('second synthetic screen');
    await expect(fs.stat(`${file}.tmp`)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('propagates a failed save without preventing a later save', async () => {
    const { terminal, file } = await fixture();
    vi.spyOn(terminal, 'flush').mockResolvedValue(undefined);
    vi.spyOn(terminal, 'snapshot').mockReturnValue('synthetic recovery screen');
    const failure = new Error('synthetic rename failure');
    const rename = fs.rename.bind(fs);
    vi.spyOn(fs, 'rename').mockImplementationOnce(async () => { throw failure; }).mockImplementation(rename);
    await expect(terminal.save(file)).rejects.toBe(failure);
    await terminal.save(file);
    expect(await fs.readFile(file, 'utf8')).toBe('synthetic recovery screen');
  });

  it('allows an already queued save to proceed after an earlier save rejects', async () => {
    const { terminal, file } = await fixture();
    const failure = new Error('synthetic parser failure');
    vi.spyOn(terminal, 'flush').mockRejectedValueOnce(failure).mockResolvedValue(undefined);
    vi.spyOn(terminal, 'snapshot').mockReturnValue('synthetic queued recovery');
    const results = await Promise.allSettled([terminal.save(file), terminal.save(file)]);
    expect(results[0]).toEqual({ status: 'rejected', reason: failure });
    expect(results[1]).toEqual({ status: 'fulfilled', value: undefined });
    expect(await fs.readFile(file, 'utf8')).toBe('synthetic queued recovery');
  });

  it('does not block an unrelated terminal behind a pending save', async () => {
    const first = await fixture();
    const second = await fixture();
    const release = deferred();
    vi.spyOn(first.terminal, 'flush').mockImplementation(() => release.promise);
    vi.spyOn(second.terminal, 'flush').mockResolvedValue(undefined);
    vi.spyOn(second.terminal, 'snapshot').mockReturnValue('independent synthetic screen');
    const pending = first.terminal.save(first.file);
    const settled = Promise.allSettled([pending]);
    try {
      await second.terminal.save(second.file);
      expect(await fs.readFile(second.file, 'utf8')).toBe('independent synthetic screen');
    } finally {
      release.resolve();
      await settled;
    }
  });
});
