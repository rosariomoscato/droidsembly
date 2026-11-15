// Browser preference names, not credentials/session storage. Never enumerate,
// delete or rewrite stored data on read. Legacy writes remain visible to old tabs.
type PreferenceStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function preferenceKeys(key: string): string[] {
  const suffix = key.startsWith('droidsembly:') ? key.slice(12) : key.startsWith('cubefarm:') ? key.slice(9) : null;
  // During the mixed-version window, the shared legacy value is authoritative:
  // old tabs only write that name. New writes mirror both, supporting rollback.
  return suffix === null ? [key] : [`cubefarm:${suffix}`, `droidsembly:${suffix}`];
}

export function readPreference(key: string, storage?: PreferenceStorage): string | null {
  try {
    const target = storage ?? globalThis.localStorage;
    for (const name of preferenceKeys(key)) {
      try {
        const value = target.getItem(name);
        if (value !== null) return value;
      } catch { /* Try the other name if only this access failed. */ }
    }
  } catch { /* Unavailable storage: retain the existing per-visit behavior. */ }
  return null;
}

export function writePreference(key: string, value: string, storage?: PreferenceStorage): void {
  try {
    const target = storage ?? globalThis.localStorage;
    for (const name of preferenceKeys(key)) {
      try { target.setItem(name, value); }
      catch { /* Best effort per name; never delete old data to make room. */ }
    }
  } catch { /* Private/blocked storage still permits the setting for this visit. */ }
}

/** A storage.clear event has a null key and also invalidates the preference. */
export const isPreferenceEvent = (key: string | null, expected: string) => key === null || preferenceKeys(expected).includes(key);

export const preferences = { getItem: readPreference, setItem: writePreference };
