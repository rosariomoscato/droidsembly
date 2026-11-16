import { describe, expect, it, vi } from 'vitest';
import { withFixtureCleanupSync } from './fixtureCleanup.ts';

describe('synchronous fixture failure evidence', () => {
  it('keeps successful results and runs cleanup exactly once', () => {
    const cleanup = vi.fn();
    expect(withFixtureCleanupSync(() => 7, cleanup)).toBe(7);
    expect(cleanup).toHaveBeenCalledOnce();
  });
  it('preserves the original body error when cleanup succeeds', () => {
    const primary = new Error('synthetic preparation timeout'), cleanup = vi.fn();
    expect(() => withFixtureCleanupSync(() => { throw primary; }, cleanup)).toThrow(primary);
    expect(cleanup).toHaveBeenCalledOnce();
  });
  it('still fails on a cleanup error after a successful body', () => {
    const cleanup = new Error('synthetic EBUSY');
    expect(() => withFixtureCleanupSync(() => 7, () => { throw cleanup; })).toThrow(cleanup);
  });
  it('retains both the preparation timeout and the later EBUSY, in causal order', () => {
    const primary = new Error('synthetic preparation timeout'), secondary = new Error('synthetic EBUSY');
    let caught: unknown;
    try { withFixtureCleanupSync(() => { throw primary; }, () => { throw secondary; }); }
    catch (error) { caught = error; }
    expect(caught).toBeInstanceOf(AggregateError);
    expect((caught as AggregateError).errors).toEqual([primary, secondary]);
    expect((caught as AggregateError).cause).toBe(primary);
  });
  it('does not mistake an undefined thrown value for a successful body', () => {
    const secondary = new Error('synthetic cleanup failure');
    let caught: unknown;
    try { withFixtureCleanupSync(() => { throw undefined; }, () => { throw secondary; }); }
    catch (error) { caught = error; }
    expect(caught).toBeInstanceOf(AggregateError);
    expect((caught as AggregateError).errors).toEqual([undefined, secondary]);
  });
});
