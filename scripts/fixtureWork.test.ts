import { describe, expect, it } from 'vitest';
import { fixtureWork } from './fixtureWork.ts';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

describe('fixture background-work barrier', () => {
  it('waits for a delayed clone and its separately launched sweep before closing', async () => {
    const work = fixtureWork(), clone = deferred(), sweep = deferred();
    const events: string[] = [];
    const task = clone.promise.then(() => {
      work.track(sweep.promise.then(() => { events.push('sweep log'); }));
    });
    expect(work.track(task)).toBe(task);
    const close = work.drain().then(() => { events.push('close'); });
    await Promise.resolve();
    expect(events).toEqual([]);
    clone.resolve();
    await task;
    await Promise.resolve();
    expect(events).toEqual([]);
    sweep.resolve();
    await close;
    expect(events).toEqual(['sweep log', 'close']);
  });

  it('does not convert a background failure into successful cleanup', async () => {
    const work = fixtureWork();
    work.track(Promise.reject(new Error('synthetic startup failure')));
    await expect(work.drain()).rejects.toThrow('synthetic startup failure');
  });
});
