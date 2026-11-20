import { describe, expect, it } from 'vitest';
import { planningMessageId } from './planningMessageId';

describe('planning transport IDs on desktop and LAN HTTP phones', () => {
  it('uses the native UUID when available', () => {
    expect(planningMessageId({ randomUUID: () => 'native-uuid-123' })).toBe('native-uuid-123');
  });
  it('does not require secure-context randomUUID for a planning answer', () => {
    expect(planningMessageId({})).toMatch(/^[a-zA-Z0-9-]{8,80}$/);
  });
  it('falls back if the browser exposes but refuses randomUUID', () => {
    expect(planningMessageId({ randomUUID: () => { throw new Error('not a secure context'); } })).toMatch(/^[a-zA-Z0-9-]{8,80}$/);
  });
});
