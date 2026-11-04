import RAPIER from '@dimforge/rapier3d-compat';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { loadPhysics, shoot } from './throwSim';

beforeAll(() => loadPhysics());
afterEach(() => vi.restoreAllMocks());

describe('throw simulation resource cleanup', () => {
  it.each([
    { chargeMs: 650, scored: true },
    { chargeMs: 100, scored: false },
  ])('frees the event queue and world when scored is $scored', ({ chargeMs, scored }) => {
    const freeQueue = vi.spyOn(RAPIER.EventQueue.prototype, 'free');
    const freeWorld = vi.spyOn(RAPIER.World.prototype, 'free');

    expect(shoot({ distance: 4, angle: 0, chargeMs }).scored).toBe(scored);

    expect(freeQueue).toHaveBeenCalledTimes(1);
    expect(freeWorld).toHaveBeenCalledTimes(1);
  });

  it('frees both resources when a physics step throws', () => {
    const failure = new Error('physics step failed');
    const freeQueue = vi.spyOn(RAPIER.EventQueue.prototype, 'free');
    const freeWorld = vi.spyOn(RAPIER.World.prototype, 'free');
    vi.spyOn(RAPIER.World.prototype, 'step').mockImplementation(() => { throw failure; });

    expect(() => shoot({ distance: 4, angle: 0, chargeMs: 650 })).toThrow(failure);

    expect(freeQueue).toHaveBeenCalledTimes(1);
    expect(freeWorld).toHaveBeenCalledTimes(1);
  });

  it('frees the world if setup fails before the event queue exists', () => {
    const failure = new Error('rigid body setup failed');
    const freeQueue = vi.spyOn(RAPIER.EventQueue.prototype, 'free');
    const freeWorld = vi.spyOn(RAPIER.World.prototype, 'free');
    vi.spyOn(RAPIER.World.prototype, 'createRigidBody').mockImplementation(() => { throw failure; });

    expect(() => shoot({ distance: 4, angle: 0, chargeMs: 650 })).toThrow(failure);

    expect(freeQueue).not.toHaveBeenCalled();
    expect(freeWorld).toHaveBeenCalledTimes(1);
  });

  it('still frees the world if freeing the event queue throws', () => {
    const failure = new Error('event queue cleanup failed');
    const originalFree = RAPIER.EventQueue.prototype.free;
    const freeQueue = vi.spyOn(RAPIER.EventQueue.prototype, 'free').mockImplementation(function (this: RAPIER.EventQueue) {
      originalFree.call(this);
      throw failure;
    });
    const freeWorld = vi.spyOn(RAPIER.World.prototype, 'free');

    expect(() => shoot({ distance: 4, angle: 0, chargeMs: 100 })).toThrow(failure);

    expect(freeQueue).toHaveBeenCalledTimes(1);
    expect(freeWorld).toHaveBeenCalledTimes(1);
  });
});
