import { expect, it, vi } from 'vitest';
import { fixtureOffice } from './fixtureOffice.ts';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

it('waits for foreground initialization and its separately registered child before shutdown', async () => {
  const root = deferred(), child = deferred(), events: string[] = [];
  const fixture = fixtureOffice(async () => { events.push('shutdown'); });
  const opening = root.promise.then(() => {
    fixture.background(child.promise.then(() => { events.push('child settled'); }));
  });
  expect(fixture.track(opening)).toBe(opening);
  const closing = fixture.close();
  expect(fixture.close()).toBe(closing);
  await Promise.resolve();
  expect(events).toEqual([]);
  root.resolve(); await opening; await Promise.resolve();
  expect(events).toEqual([]);
  child.resolve(); await closing;
  expect(events).toEqual(['child settled', 'shutdown']);
});

it('preserves an expected foreground refusal but still releases the office', async () => {
  const shutdown = vi.fn(async () => undefined), fixture = fixtureOffice(shutdown);
  const refusal = Promise.reject(new Error('manager did not ask'));
  expect(fixture.track(refusal)).toBe(refusal);
  await expect(refusal).rejects.toThrow('manager did not ask');
  await fixture.close();
  expect(shutdown).toHaveBeenCalledOnce();
});

it('does not release early when one background task rejects while another is still active', async () => {
  const held = deferred(), events: string[] = [], error = new Error('background failure');
  const fixture = fixtureOffice(async () => { events.push('shutdown'); });
  fixture.background(Promise.reject(error));
  fixture.background(held.promise.then(() => { events.push('held settled'); }));
  const closing = fixture.close();
  // Attach the rejection assertion before releasing the gate: no unhandled rejection.
  const rejected = expect(closing).rejects.toMatchObject({ errors: [error], cause: error });
  await Promise.resolve(); await Promise.resolve();
  expect(events).toEqual([]);
  held.resolve(); await rejected;
  expect(events).toEqual(['held settled', 'shutdown']);
});

it('drains children registered during shutdown even when shutdown rejects', async () => {
  const held = deferred(), entered = deferred(), error = new Error('shutdown failure'), events: string[] = [];
  const fixture = fixtureOffice(async () => {
    fixture.background(held.promise.then(() => { events.push('final child settled'); }));
    entered.resolve();
    throw error;
  });
  const closing = fixture.close();
  const rejected = expect(closing).rejects.toMatchObject({ errors: [error], cause: error });
  let released = false;
  void closing.then(() => { released = true; }, () => { released = true; });
  await entered.promise;
  await Promise.resolve(); await Promise.resolve();
  expect(released).toBe(false);
  expect(events).toEqual([]);
  held.resolve(); await rejected;
  expect(events).toEqual(['final child settled']);
});

it('does not retry a failed release or allow it to masquerade as successful reuse', async () => {
  const error = new Error('retained failed fixture'), shutdown = vi.fn(async () => { throw error; });
  const fixture = fixtureOffice(shutdown), closing = fixture.close();
  await expect(closing).rejects.toMatchObject({ cause: error });
  expect(fixture.close()).toBe(closing);
  await expect(fixture.close()).rejects.toMatchObject({ cause: error });
  expect(shutdown).toHaveBeenCalledOnce();
});
