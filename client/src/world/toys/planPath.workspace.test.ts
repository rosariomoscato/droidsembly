import { describe, expect, it } from 'vitest';
import { walkways } from '../walkways';
import { makeNav, planPath, type Nav, type Pt } from './roombaBrain';

const fresh = (nav: Nav) => makeNav(nav.rects, { planR: nav.planR, lineR: nav.lineR, greed: nav.greed });

describe('private planning workspace reset', () => {
  it.each(['office', 'lobby'] as const)('matches fresh-grid routes across interleaved %s searches', floor => {
    const w = walkways(floor);
    const nav = fresh(w.nav);
    const other = fresh(w.nav);
    const from = w.homes[0];
    const cases: { to: Pt; avoid: (Pt & { r: number }) | null }[] = [
      { to: w.spots[0], avoid: null },
      { to: w.spots[w.spots.length - 1], avoid: { x: 0, z: 0, r: 1 } },
      { to: from, avoid: null },
      { to: w.spots[1], avoid: { ...from, r: 0.5 } },
    ];
    const expected = cases.map(c => planPath(fresh(nav), from, c.to, c.avoid));
    for (let repeat = 0; repeat < 3; repeat++) {
      for (let i = 0; i < cases.length; i++) {
        const c = cases[i];
        expect(planPath(nav, from, c.to, c.avoid)).toEqual(expected[i]);
        expect(planPath(other, from, c.to, c.avoid)).toEqual(expected[i]);
      }
    }
  });

  it('still observes blocked-grid changes and recovers after an unreachable request', () => {
    const w = walkways('office');
    const nav = fresh(w.nav);
    const from = w.homes[0];
    const to = w.spots[0];
    const expected = planPath(nav, from, to);
    expect(expected).not.toBeNull();
    const blocked = nav.blocked.slice();
    nav.blocked.fill(1);
    expect(planPath(nav, from, to)).toBeNull();
    nav.blocked.set(blocked);
    expect(planPath(nav, from, to)).toEqual(expected);
  });

  it('does not mutate or recycle returned waypoints on subsequent calls', () => {
    const w = walkways('office');
    const nav = fresh(w.nav);
    const result = planPath(nav, w.homes[0], w.spots[0]);
    const saved = structuredClone(result);
    planPath(nav, w.homes[1], w.spots[1]);
    expect(result).toEqual(saved);
  });
});
