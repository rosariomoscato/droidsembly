import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const data = new Map<string, string>();
let windowEvents: EventTarget;
beforeEach(() => {
  vi.resetModules(); data.clear(); windowEvents = new EventTarget();
  vi.stubGlobal('window', windowEvents);
  vi.stubGlobal('localStorage', { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value) });
  vi.stubGlobal('document', { documentElement: { setAttribute: vi.fn(), removeAttribute: vi.fn(), style: { setProperty: vi.fn(), removeProperty: vi.fn() } } });
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn() }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

describe('preference stores using legacy browser data', () => {
  it('keeps accessibility settings and accepts old/new storage events without duplicate updates', async () => {
    data.set('cubefarm:a11y', JSON.stringify({ readableFont: true }));
    const a11y = await import('./ui/a11y');
    expect(a11y.getA11y().readableFont).toBe(true);
    a11y.setA11y({ uiScale: 110 });
    expect(data.get('droidsembly:a11y')).toBe(data.get('cubefarm:a11y'));
    const changes = vi.fn(); const stop = a11y.useA11y.subscribe(changes);
    data.set('cubefarm:a11y', JSON.stringify({ readableFont: false }));
    for (const key of ['cubefarm:a11y', 'droidsembly:a11y']) windowEvents.dispatchEvent(Object.assign(new Event('storage'), { key }));
    expect(a11y.getA11y().readableFont).toBe(false); expect(changes).toHaveBeenCalledTimes(1);
    data.clear(); windowEvents.dispatchEvent(Object.assign(new Event('storage'), { key: null }));
    expect(a11y.getA11y().uiScale).toBe(100);
    stop();
  });

  it('preserves game best scores and theme state while writing both names', async () => {
    data.set('cubefarm:games:best', JSON.stringify({ snake: 40 }));
    data.set('cubefarm:eggs', JSON.stringify({ day: '2026-11-15', list: [1, 3] }));
    const games = await import('./ui/games/storage');
    const theme = await import('./world/themes/kit/store');
    expect(games.bestScore('snake')).toBe(40); expect(games.recordScore('snake', 41)).toBe(true);
    expect(data.get('cubefarm:games:best')).toBe(data.get('droidsembly:games:best'));
    expect(theme.daily('droidsembly:eggs', '2026-11-15')).toEqual([1, 3]);
    theme.daily('droidsembly:eggs', '2026-11-15', [1, 3, 4]);
    expect(data.get('cubefarm:eggs')).toBe(data.get('droidsembly:eggs'));
  });

  it('preserves controls preferences and mirrors later changes', async () => {
    data.set('cubefarm:controls', JSON.stringify({ padSensitivity: 1.2 }));
    const controls = await import('./ui/controls');
    expect(controls.useControls.getState().padSensitivity).toBe(1.2);
    controls.setPadSensitivity(1.3);
    expect(data.get('droidsembly:controls')).toBe(data.get('cubefarm:controls'));
  });
});
