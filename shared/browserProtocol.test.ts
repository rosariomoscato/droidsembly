import { describe, expect, it } from 'vitest';
import { LEGACY_OFFICE_OPEN_EVENT, notificationTag, OFFICE_OPEN_EVENT, officeOpenUrl } from './browserProtocol';

describe('browser protocol compatibility', () => {
  it.each([OFFICE_OPEN_EVENT, LEGACY_OFFICE_OPEN_EVENT])('accepts one %s message without duplicating it', (type) => {
    expect(officeOpenUrl({ type, url: '/?tab=team' })).toBe('/?tab=team');
  });
  it.each([null, {}, { type: 'other', url: '/' }, { type: OFFICE_OPEN_EVENT, url: 42 }])('rejects malformed messages (%j)', (data) => {
    expect(officeOpenUrl(data)).toBeNull();
  });
  it('keeps desktop/server push notification deduplication identities stable across upgrades', () => {
    expect(notificationTag(42)).toBe('cubefarm-42');
    expect(notificationTag('test-42')).toBe('cubefarm-test-42');
  });
});
