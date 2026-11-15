import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
import { serviceWorkerSource, swVersion } from './pwa.ts';

describe('the service worker version', () => {
  it('changes with every office update: a new build, a new package version or a new commit', () => {
    const v = swVersion('<html>a</html>', '0.3.14', 'abc1234');
    expect(v).toMatch(/^[0-9a-f]{12}$/);
    expect(swVersion('<html>a</html>', '0.3.14', 'abc1234')).toBe(v);
    expect(swVersion('<html>b</html>', '0.3.14', 'abc1234')).not.toBe(v);
    expect(swVersion('<html>a</html>', '0.3.15', 'abc1234')).not.toBe(v);
    expect(swVersion('<html>a</html>', '0.3.14', 'def5678')).not.toBe(v);
    expect(swVersion('<html>a</html>', '0.3.14', null)).not.toBe(v);
  });
});

/** Runs the worker in a sandbox and returns its fetch handler, which reports what it would do with a request. */
function fetchHandler() {
  const handlers: Record<string, (e: unknown) => void> = {};
  const self = { addEventListener: (type: string, fn: (e: unknown) => void) => (handlers[type] = fn), location: { origin: 'https://office.example' } };
  const caches = { match: async () => undefined, has: async () => true, open: async () => ({ put: async () => undefined, match: async () => undefined }) };
  vm.runInNewContext(serviceWorkerSource('v1'), { self, URL, caches, fetch: () => new Promise(() => undefined), Response: { error: () => null } });
  return (url: string, init: { method?: string; mode?: string } = {}) => {
    let handled = false;
    handlers.fetch({ request: { url, method: init.method ?? 'GET', mode: init.mode ?? 'cors' }, respondWith: () => (handled = true), waitUntil: () => undefined });
    return handled;
  };
}

describe('the service worker', () => {
  it('names its cache by version, so an update drops the old one', () => {
    const src = serviceWorkerSource('0123456789ab');
    expect(src).toContain('const VERSION = "0123456789ab";');
    expect(src).toContain("const CACHE = 'droidsembly-shell-' + VERSION");
    expect(src).toContain("k.startsWith('cubefarm-shell-')");
    expect(src).toContain("k.startsWith('droidsembly-shell-')");
    expect(() => new vm.Script(src)).not.toThrow();
  });

  it('cleans only obsolete app-shell caches in both namespaces', async () => {
    const handlers: Record<string, (event: unknown) => void> = {};
    const removed: string[] = [];
    let done: Promise<unknown> | undefined;
    const claim = vi.fn();
    vm.runInNewContext(serviceWorkerSource('current'), {
      self: { addEventListener: (name: string, fn: (event: unknown) => void) => { handlers[name] = fn; }, clients: { claim } },
      caches: { keys: async () => ['cubefarm-shell-old', 'droidsembly-shell-old', 'droidsembly-shell-current', 'other-app-cache', 'cubefarm-settings'], delete: async (name: string) => { removed.push(name); return true; } },
    });
    handlers.activate({ waitUntil: (task: Promise<unknown>) => { done = task; } });
    await done;
    expect(removed).toEqual(['cubefarm-shell-old', 'droidsembly-shell-old']);
    expect(claim).toHaveBeenCalledTimes(1);
  });

  it('sends one compatible click message to old or new open pages', async () => {
    const handlers: Record<string, (event: unknown) => void> = {};
    let done: Promise<unknown> | undefined;
    const postMessage = vi.fn(), focus = vi.fn(), openWindow = vi.fn(), close = vi.fn();
    vm.runInNewContext(serviceWorkerSource('current'), {
      self: { addEventListener: (name: string, fn: (event: unknown) => void) => { handlers[name] = fn; }, location: { origin: 'https://office.example' }, clients: { matchAll: async () => [{ url: 'https://office.example/', postMessage, focus }], openWindow } }, URL,
    });
    handlers.notificationclick({ notification: { data: { url: '/?tab=team' }, close }, waitUntil: (task: Promise<unknown>) => { done = task; } });
    await done;
    expect(postMessage).toHaveBeenCalledExactlyOnceWith({ type: 'cubefarm:open', canonicalType: 'droidsembly:open', url: 'https://office.example/?tab=team' });
    expect(close).toHaveBeenCalledTimes(1); expect(focus).toHaveBeenCalledTimes(1); expect(openWindow).not.toHaveBeenCalled();
  });

  it('never serves an asset from an unrelated or older cache', async () => {
    const handlers: Record<string, (event: unknown) => void> = {};
    const open = vi.fn(async () => ({ match: async () => 'current-cache-response' }));
    const globalMatch = vi.fn();
    let response: Promise<unknown> | undefined;
    vm.runInNewContext(serviceWorkerSource('current'), {
      self: { addEventListener: (name: string, fn: (event: unknown) => void) => { handlers[name] = fn; }, location: { origin: 'https://office.example' } },
      caches: { open, match: globalMatch, has: async () => true }, URL,
    });
    handlers.fetch({ request: { method: 'GET', mode: 'cors', url: 'https://office.example/assets/app.js' }, respondWith: (task: Promise<unknown>) => { response = task; } });
    expect(await response).toBe('current-cache-response');
    expect(open).toHaveBeenCalledExactlyOnceWith('droidsembly-shell-current'); expect(globalMatch).not.toHaveBeenCalled();
  });

  it('does not recreate an already removed shell cache when a stale worker handles an asset', async () => {
    const handlers: Record<string, (event: unknown) => void> = {};
    const open = vi.fn();
    const res = { ok: true, clone: () => res };
    const fetch = vi.fn(async () => res);
    let response: Promise<unknown> | undefined, pending: Promise<unknown> | undefined;
    vm.runInNewContext(serviceWorkerSource('old'), {
      self: { addEventListener: (name: string, fn: (event: unknown) => void) => { handlers[name] = fn; }, location: { origin: 'https://office.example' } },
      caches: { open, has: async () => false }, URL, fetch,
    });
    handlers.fetch({ request: { method: 'GET', mode: 'cors', url: 'https://office.example/assets/app.js' }, respondWith: (task: Promise<unknown>) => { response = task; }, waitUntil: (task: Promise<unknown>) => { pending = task; } });
    expect(await response).toBe(res); await pending;
    expect(fetch).toHaveBeenCalledTimes(1); expect(open).not.toHaveBeenCalled();
  });

  it('caches only the app shell: never the API, the websockets or anything else', () => {
    const handles = fetchHandler();
    expect(handles('https://office.example/', { mode: 'navigate' })).toBe(true);
    expect(handles('https://office.example/assets/index-abc123.js')).toBe(true);
    expect(handles('https://office.example/icons/icon-192.png')).toBe(true);
    expect(handles('https://office.example/manifest.webmanifest')).toBe(true);
    expect(handles('https://office.example/api/state')).toBe(false);
    expect(handles('https://office.example/api/voice/messages/3?cached=1')).toBe(false);
    expect(handles('https://office.example/api/agents/a1/screen')).toBe(false);
    expect(handles('https://office.example/ws')).toBe(false);
    expect(handles('https://office.example/sw.js')).toBe(false);
    expect(handles('https://office.example/assets/index-abc123.js', { method: 'POST' })).toBe(false);
    expect(handles('https://fonts.googleapis.com/css2?family=Fredoka')).toBe(false);
  });
});
