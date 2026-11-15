import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const rooms = new Map<string, Set<FakeChannel>>();
const blocked = new Set<string>();
class FakeChannel {
  listeners: ((event: { data: unknown }) => void)[] = [];
  constructor(readonly name: string) {
    if (blocked.has(name)) throw new Error('blocked');
    if (!rooms.has(name)) rooms.set(name, new Set());
    rooms.get(name)!.add(this);
  }
  addEventListener(_type: string, fn: (event: { data: unknown }) => void) { this.listeners.push(fn); }
  postMessage(data: unknown) { for (const peer of rooms.get(this.name) ?? []) if (peer !== this) for (const fn of peer.listeners) fn({ data }); }
  close() { rooms.get(this.name)?.delete(this); }
}

beforeEach(() => {
  vi.resetModules(); rooms.clear(); blocked.clear();
  vi.stubGlobal('document', { visibilityState: 'visible' });
  vi.stubGlobal('BroadcastChannel', FakeChannel);
  vi.spyOn(Date, 'now').mockReturnValue(1000);
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.resetModules(); });

describe('mixed-version voice claims', () => {
  it('shares claims with legacy-only tabs, accepting duplicate delivery without changing the winner', async () => {
    const old = new FakeChannel('cubefarm:voice');
    const modern = new FakeChannel('droidsembly:voice');
    const seen: unknown[] = [];
    old.addEventListener('message', (event) => seen.push(event.data));
    const voice = await import('./voiceClaim');
    expect(voice.claimVoice(42)).toBe(250);
    expect(seen).toHaveLength(1);
    const claim = { id: 42, tab: '000-old-tab', visible: true, at: 1000 };
    old.postMessage(claim); modern.postMessage(claim);
    expect(voice.wonVoice(42)).toBe(false);
    expect(rooms.has('droidsembly:voice')).toBe(true); expect(rooms.has('cubefarm:voice')).toBe(true);
  });

  it('elects exactly one of two new tabs even when each claim arrives on both channels', async () => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.1).mockReturnValue(0.9);
    const first = await import('./voiceClaim');
    vi.resetModules();
    const second = await import('./voiceClaim');
    first.claimVoice(7); second.claimVoice(7);
    expect(Number(first.wonVoice(7)) + Number(second.wonVoice(7))).toBe(1);
  });

  it('keeps legacy coordination if the canonical channel is blocked', async () => {
    blocked.add('droidsembly:voice');
    const old = new FakeChannel('cubefarm:voice');
    const voice = await import('./voiceClaim');
    expect(voice.claimVoice(5)).toBe(250);
    old.postMessage({ id: 5, tab: '000-old-tab', visible: true, at: 1000 });
    expect(voice.wonVoice(5)).toBe(false);
  });

  it('can still speak in this tab when cross-tab messaging is unavailable', async () => {
    blocked.add('droidsembly:voice'); blocked.add('cubefarm:voice');
    const voice = await import('./voiceClaim');
    expect(voice.claimVoice(5)).toBe(0); expect(voice.wonVoice(5)).toBe(true);
  });
});
