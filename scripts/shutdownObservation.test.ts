import { describe, expect, it } from 'vitest';
import { createPrefixSampler, createShutdownObservation } from './shutdownObservation.ts';

describe('non-awaiting shutdown diagnostic observer', () => {
  it('preserves synchronous return identity and measures only the call', () => {
    let now = 0;
    const observer = createShutdownObservation(() => now);
    const value = {};
    expect(observer.measure('snapshot', () => { now = 3; return value; })).toBe(value);
    expect(observer.snapshot()).toMatchObject({ metrics: { snapshot: { started: 1, fulfilled: 1, rejected: 0, active: 0, settledMs: 3 } }, pending: {} });
  });
  it('returns the same promise without awaiting or replacing it', async () => {
    let resolve!: () => void, now = 0;
    const promise = new Promise<void>(done => { resolve = done; });
    const observer = createShutdownObservation(() => now);
    expect(observer.measure('write', () => promise)).toBe(promise);
    now = 7;
    expect(observer.snapshot().pending.write).toEqual({ count: 1, oldestMs: 7 });
    resolve();
    await promise;
    expect(observer.snapshot()).toMatchObject({ metrics: { write: { fulfilled: 1, active: 0, maxSettledMs: 7 } }, pending: {} });
  });
  it('preserves rejection and counts settlement rather than claiming a successful write', async () => {
    const observer = createShutdownObservation();
    const error = new Error('synthetic write failure');
    const promise = Promise.reject(error);
    expect(observer.measure('rename', () => promise)).toBe(promise);
    await expect(promise).rejects.toBe(error);
    expect(observer.snapshot().metrics.rename).toMatchObject({ fulfilled: 0, rejected: 1, active: 0 });
  });
  it('rethrows the same synchronous failure', () => {
    const observer = createShutdownObservation();
    const error = new Error('synthetic serialization failure');
    expect(() => observer.measure('snapshot', () => { throw error; })).toThrow(error);
    expect(observer.snapshot().metrics.snapshot).toMatchObject({ fulfilled: 0, rejected: 1, active: 0 });
  });
  it('reports concurrent pending observations and snapshots without mutating earlier reports', async () => {
    let a!: () => void, b!: () => void;
    const observer = createShutdownObservation(() => 10);
    const first = observer.measure('flush', () => new Promise<void>(resolve => { a = resolve; }));
    const second = observer.measure('flush', () => new Promise<void>(resolve => { b = resolve; }));
    const before = observer.snapshot();
    expect(before.metrics.flush).toMatchObject({ active: 2, peak: 2 });
    a(); b();
    await Promise.all([first, second]);
    expect(observer.snapshot().metrics.flush).toMatchObject({ active: 0, peak: 2, fulfilled: 2 });
    expect(before.metrics.flush.active).toBe(2);
  });
  it('does not issue a later queued operation ahead of its original predecessor', async () => {
    const observer = createShutdownObservation();
    const calls: number[] = [];
    let resolve!: () => void;
    const first = new Promise<void>(done => { resolve = done; });
    observer.measure('prefix', () => first);
    const next = first.then(() => { calls.push(2); });
    expect(observer.measure('queued', () => next)).toBe(next);
    expect(calls).toEqual([]);
    calls.push(1); resolve();
    await next;
    expect(calls).toEqual([1, 2]);
  });

  it('samples only changed queue prefixes without replacing or advancing them', async () => {
    const observed: Promise<void>[] = [];
    const sample = createPrefixSampler(promise => observed.push(promise));
    const terminal = {};
    let resolve!: () => void;
    const prefix = new Promise<void>(done => { resolve = done; });
    const next = prefix.then(() => undefined);
    expect(sample(terminal, prefix)).toBe(true);
    expect(sample(terminal, prefix)).toBe(false);
    expect(sample(terminal, next)).toBe(true);
    expect(sample(terminal, next)).toBe(false);
    expect(observed).toEqual([prefix, next]);
    resolve();
    await next;
  });

  it('keeps queue-prefix observations distinct per terminal, not physical I/O counts', () => {
    const observed: Promise<void>[] = [];
    const sample = createPrefixSampler(promise => observed.push(promise));
    const prefix = Promise.resolve();
    expect(sample({}, prefix)).toBe(true);
    expect(sample({}, prefix)).toBe(true);
    expect(observed).toEqual([prefix, prefix]);
  });
});
