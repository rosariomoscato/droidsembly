import { describe, expect, it, vi } from 'vitest';
import { isPreferenceEvent, preferenceKeys, readPreference, writePreference } from './preferences';

function storage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return { data, getItem: vi.fn((key: string) => data.get(key) ?? null), setItem: vi.fn((key: string, value: string) => { data.set(key, value); }) };
}

describe('browser preference namespace compatibility', () => {
  it.each(['view', 'mode', 'a11y', 'controls', 'graphics', 'audio', 'look', 'profile', 'presence', 'daytime', 'replay', 'workers', 'workers:collapsed', 'games:pet', 'games:best', 'hoop-best', 'jukebox', 'jukebox:vol:3', 'jukebox:station:3', 'birthday-sung', 'cake', 'presents', 'stickers', 'eggs'])('preserves legacy %s and mirrors explicit writes without changing other data', (suffix) => {
    const old = `cubefarm:${suffix}`, current = `droidsembly:${suffix}`;
    const s = storage({ [old]: 'old-value', 'other-app:key': 'keep' });
    expect(preferenceKeys(current)).toEqual([old, current]);
    expect(readPreference(current, s)).toBe('old-value');
    expect(s.setItem).not.toHaveBeenCalled(); // no migration writes on load/render
    writePreference(current, 'new-value', s);
    expect(s.data.get(old)).toBe('new-value'); // rollback / already-open old tab
    expect(s.data.get(current)).toBe('new-value');
    expect(s.data.get('other-app:key')).toBe('keep');
    expect(s.setItem).toHaveBeenCalledTimes(2);
  });

  it('observes old-tab changes after new writes instead of trusting a stale canonical mirror', () => {
    const s = storage();
    writePreference('droidsembly:a11y', 'new-tab', s);
    s.setItem('cubefarm:a11y', 'old-tab-later');
    expect(readPreference('droidsembly:a11y', s)).toBe('old-tab-later');
    expect(s.data.get('droidsembly:a11y')).toBe('new-tab'); // read never overwrites either value
  });

  it('supports canonical-only values, empty strings and unnamespaced callers', () => {
    const s = storage({ 'droidsembly:mode': 'pocket', 'cubefarm:empty': '', 'droidsembly:empty': 'not-empty' });
    expect(readPreference('cubefarm:mode', s)).toBe('pocket');
    expect(readPreference('droidsembly:empty', s)).toBe('');
    writePreference('unrelated', 'value', s);
    expect(s.data.get('unrelated')).toBe('value');
    expect(s.data.has('cubefarm:unrelated')).toBe(false);
  });

  it('tolerates unavailable or partially failing storage without deleting values', () => {
    const s = storage({ 'droidsembly:view': 'current', 'cubefarm:mode': 'keep' });
    s.getItem.mockImplementation((key) => { if (key.startsWith('cubefarm:')) throw new Error('blocked'); return s.data.get(key) ?? null; });
    s.setItem.mockImplementation((key, value) => { if (key.startsWith('cubefarm:')) throw new Error('quota'); s.data.set(key, value); });
    expect(readPreference('droidsembly:view', s)).toBe('current');
    expect(() => writePreference('droidsembly:mode', 'office', s)).not.toThrow();
    expect(s.data.get('cubefarm:mode')).toBe('keep');
    expect(s.data.get('droidsembly:mode')).toBe('office');
    const blocked = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
    expect(readPreference('droidsembly:view', blocked)).toBeNull();
    expect(() => writePreference('droidsembly:view', 'x', blocked)).not.toThrow();
  });

  it('recognizes both event keys and clear, but not unrelated preferences', () => {
    for (const key of ['cubefarm:a11y', 'droidsembly:a11y', null]) expect(isPreferenceEvent(key, 'droidsembly:a11y')).toBe(true);
    expect(isPreferenceEvent('droidsembly:audio', 'droidsembly:a11y')).toBe(false);
  });
});
