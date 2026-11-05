import fs from 'node:fs';
import asyncFs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WebSocket } from 'ws';
import { DEFAULT_NOTIFY, notifySettings } from '../shared/notify.ts';
import type { NoteView, NotifySettings } from '../shared/types.ts';
import { createDemoBackend } from './demo.ts';
import { Notifier, type NotifyRequest } from './notifier.ts';
import { Swarm } from './swarm.ts';
import { scanClientSources } from '../scripts/clientSourcePolicy.ts';

const SECRETS = {
  ntfy: { url: 'https://ntfy.sh/ntfySECRETtopic4242', token: 'tk_ntfySECRET4242' },
};
const SECRET_STRINGS = ['ntfySECRETtopic4242', 'tk_ntfySECRET4242', 'pushSECRETendpoint4242'];

/** A browser's push subscription, with a real P-256 key so the office can encrypt for it. */
function subscription(endpoint = 'https://push.example.net/push/pushSECRETendpoint4242') {
  const ua = crypto.createECDH('prime256v1');
  ua.generateKeys();
  return { endpoint, keys: { p256dh: ua.getPublicKey().toString('base64url'), auth: crypto.randomBytes(16).toString('base64url') } };
}

const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'cubefarm-notify-'));
function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('notification secrets', () => {
  it('never reach the snapshot, a broadcast, an API answer or the log', async () => {
    const out: string[] = [];
    for (const m of ['log', 'warn', 'error', 'info'] as const) vi.spyOn(console, m).mockImplementation((...a: unknown[]) => void out.push(a.map(String).join(' ')));
    const swarm = new Swarm(createDemoBackend());
    const sent: string[] = [];
    swarm.addClient({ OPEN: 1, readyState: 1, send: (m: string) => sent.push(m), on: () => undefined } as unknown as WebSocket);
    await swarm.notifier.init();

    const answers: unknown[] = [];
    for (const [c, body] of Object.entries(SECRETS)) answers.push(await swarm.notifier.setWebhook(c, body));
    answers.push(await swarm.notifier.pushKey());
    answers.push(await swarm.notifier.subscribe(subscription()));
    swarm.updateSettings({ notify: { ...DEFAULT_NOTIFY, events: { ...DEFAULT_NOTIFY.events, merge: true }, officeUrl: 'https://office.example.ts.net/' } });

    out.length = 0;
    const delivered = swarm.notifier.notify('needsHuman', 'PR #4 needs you', 'pixel-todo: Add login.');
    for (const c of ['desktop', 'push', 'ntfy']) answers.push(await swarm.notifier.test(c));
    await delivered;

    // The demo shows what each channel would get: one formatted line per chat app and device for the PR.
    const pr = out.filter((l) => l.includes('⚠️ PR #4 needs you'));
    expect(pr.map((l) => l.match(/demo (\w+)/)?.[1]).sort()).toEqual(['ntfy', 'push']);
    expect(pr[0]).toContain('pixel-todo: Add login. ⏎ https://office.example.ts.net/');
    expect(sent.filter((m) => JSON.parse(m).type === 'notify').map((m) => (JSON.parse(m).note as NoteView).title)).toEqual(['⚠️ PR #4 needs you', '🔔 Test from Droidsembly']);

    const snap = swarm.snapshot();
    expect(snap.notifyChannels.webhooks.ntfy).toEqual({ set: true, hint: 'ntfy.sh/…4242 · with a token' });
    expect(snap.notifyChannels.pushDevices).toBe(1);
    const vapid = JSON.parse(fs.readFileSync(path.join(process.env.SWARM_HOME!, 'demo-push.json'), 'utf8')).vapid.privateKey as string;
    const everything = [JSON.stringify(snap), ...sent, ...out, JSON.stringify(answers)].join('\n');
    for (const s of [...SECRET_STRINGS, vapid]) expect(everything).not.toContain(s);
  });

  it('say why a test failed without the address', async () => {
    const out: string[] = [];
    for (const m of ['log', 'warn'] as const) vi.spyOn(console, m).mockImplementation((...a: unknown[]) => void out.push(a.map(String).join(' ')));
    const swarm = new Swarm(createDemoBackend());
    await swarm.notifier.setWebhook('ntfy', { url: 'https://bad.example/SECRETtopic77', token: 'tk_badSECRET77' });
    await expect(swarm.notifier.test('ntfy')).rejects.toThrow("The test didn't arrive: ntfy doesn't know that webhook (HTTP 404).");
    expect(out.join('\n')).not.toMatch(/SECRETtopic77|tk_badSECRET77/);
  });

  it('keep the ElevenLabs key in the same file', async () => {
    const dir = tmpDir();
    const secretsFile = path.join(dir, 'secrets.json');
    fs.writeFileSync(secretsFile, JSON.stringify({ elevenlabsKey: 'sk_keep_me' }));
    const n = notifier(dir, () => 200).n;
    await n.init();
    await n.setWebhook('ntfy', SECRETS.ntfy);
    expect(JSON.parse(fs.readFileSync(secretsFile, 'utf8'))).toEqual({ elevenlabsKey: 'sk_keep_me', notify: { ntfy: SECRETS.ntfy } });
    await n.setWebhook('ntfy', { url: '' });
    expect(JSON.parse(fs.readFileSync(secretsFile, 'utf8'))).toEqual({ elevenlabsKey: 'sk_keep_me', notify: {} });
  });

  it('are deleted for chat apps the office no longer sends to', async () => {
    const dir = tmpDir();
    const secretsFile = path.join(dir, 'secrets.json');
    const old = { discord: { url: 'https://old.example/1' }, slack: { url: 'https://old.example/2' }, telegram: { token: 'old', chatId: '1' } };
    fs.writeFileSync(secretsFile, JSON.stringify({ elevenlabsKey: 'sk_keep_me', notify: { ntfy: SECRETS.ntfy, ...old } }));
    const n = notifier(dir, () => 200).n;
    await n.init();
    expect(JSON.parse(fs.readFileSync(secretsFile, 'utf8'))).toEqual({ elevenlabsKey: 'sk_keep_me', notify: { ntfy: SECRETS.ntfy } });
    expect(Object.keys(n.channelsView().webhooks)).toEqual(['ntfy']);
  });

  it('are never handled by the browser code', async () => {
    // The client gets hints over REST and the websocket; nothing under client/ may read the server's secrets files or import its code.
    const root = path.resolve(import.meta.dirname, '..', 'client');
    const started = performance.now();
    const { files, violations } = await scanClientSources(root);
    // Synchronous I/O must not evade the existing five-second asynchronous
    // timeout by blocking its timer. Enforce the same budget explicitly too.
    expect(performance.now() - started).toBeLessThan(5_000);
    expect(files.length).toBeGreaterThan(20);
    expect(violations).toEqual([]);
  });
});

function notifier(dir: string, status: (req: NotifyRequest) => number | Promise<number>, settings: NotifySettings = notifySettings(DEFAULT_NOTIFY, { events: { merge: true } })) {
  const posts: NotifyRequest[] = [];
  const notes: NoteView[] = [];
  const n = new Notifier({
    transport: { post: async (req) => (posts.push(req), status(req)) },
    secretsFile: path.join(dir, 'secrets.json'),
    pushFile: path.join(dir, 'push.json'),
    settings: () => settings,
    broadcast: (note) => notes.push(note),
    channelsChanged: () => undefined,
    log: () => undefined,
  });
  return { n, posts, notes };
}

describe('the notifier', () => {
  it('exposes completion of an immediate notification without finishing before its transport', async () => {
    const dir = tmpDir();
    const gate = deferred<number>();
    const { n } = notifier(dir, () => gate.promise);
    let completed = false;
    try {
      await n.setWebhook('ntfy', SECRETS.ntfy);
      const delivery = n.notify('ceoMessage', 'Morgan', 'Synthetic completion fixture');
      expect(delivery).toBeInstanceOf(Promise);
      const done = Promise.resolve(delivery).then(() => { completed = true; });
      await Promise.resolve();
      expect(completed).toBe(false);
      gate.resolve(201);
      await done;
      expect(completed).toBe(true);
    } finally {
      gate.resolve(201);
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('waits for a gone push device to be persisted, not only removed from memory', async () => {
    const dir = tmpDir();
    const { n } = notifier(dir, () => 410);
    const entered = deferred<void>();
    const release = deferred<void>();
    const rename = asyncFs.rename.bind(asyncFs);
    let delivery: Promise<unknown> | undefined;
    try {
      await n.pushKey();
      await n.subscribe(subscription());
      vi.spyOn(asyncFs, 'rename').mockImplementation(async (from, to) => {
        if (String(to) === path.join(dir, 'push.json')) {
          entered.resolve();
          await release.promise;
        }
        await rename(from, to);
      });
      const result = n.notify('ceoMessage', 'Morgan', 'Synthetic persistence fixture');
      expect(result).toBeInstanceOf(Promise);
      let completed = false;
      delivery = Promise.resolve(result).then(() => { completed = true; });
      await entered.promise;
      expect(n.channelsView().pushDevices).toBe(0);
      expect(JSON.parse(fs.readFileSync(path.join(dir, 'push.json'), 'utf8')).devices).toHaveLength(1);
      expect(completed).toBe(false);
      release.resolve();
      await delivery;
      const again = notifier(dir, () => 201).n;
      await again.init();
      expect(again.channelsView().pushDevices).toBe(0);
      expect((await again.pushKey()).publicKey).toBe((await n.pushKey()).publicKey);
    } finally {
      release.resolve();
      // On the old API a delivery still runs even though notify returned void.
      // Its gate must settle before the fixture directory can be removed.
      if (!delivery) {
        await entered.promise;
        await n.unsubscribe(subscription().endpoint);
      } else await delivery;
      vi.restoreAllMocks();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('sends a burst of 10 merges as one notification now and one summary a minute later, on every channel', async () => {
    vi.useFakeTimers({ now: Date.UTC(2026, 9, 4, 12) });
    const { n, posts, notes } = notifier(tmpDir(), () => 200);
    await n.init();
    await n.setWebhook('ntfy', SECRETS.ntfy);
    for (let i = 1; i <= 10; i++) n.notify('merge', `Merged PR #${i}`, `pixel-todo: Change ${i}`, `#${i} Change ${i}`);
    await vi.advanceTimersByTimeAsync(10);
    expect(posts.map((p) => p.channel)).toEqual(['ntfy']);
    expect(posts[0].url).toBe('https://ntfy.sh/');
    expect(posts[0].headers).toMatchObject({ Authorization: `Bearer ${SECRETS.ntfy.token}` });
    expect(JSON.parse(String(posts[0].body))).toMatchObject({ topic: 'ntfySECRETtopic4242', title: '🔀 Merged PR #1', message: 'pixel-todo: Change 1' });
    await vi.advanceTimersByTimeAsync(59_000);
    expect(posts).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(posts).toHaveLength(2);
    expect(posts[1].text).toMatch(/^🔀 9 more merges\n• #2 Change 2/);
    expect(notes.map((x) => x.title)).toEqual(['🔀 Merged PR #1', '🔀 9 more merges']);
    expect(notes[0].url).toBe('/?tab=company');
  });

  it('says nothing about events or channels that are off', async () => {
    const settings = notifySettings(DEFAULT_NOTIFY, { channels: { desktop: false } });
    const { n, posts, notes } = notifier(tmpDir(), () => 200, settings);
    await n.setWebhook('ntfy', SECRETS.ntfy);
    await n.notify('merge', 'Merged PR #1', 'x'); // merges are off by default
    await n.notify('hire', 'A new agent waits for floor 1', 'Ada');
    expect(notes).toEqual([]);
    expect(posts.map((p) => [p.channel, p.text])).toEqual([['ntfy', '📄 A new agent waits for floor 1\nAda']]);
    const quiet = notifier(tmpDir(), () => 200, notifySettings(DEFAULT_NOTIFY, { channels: { ntfy: false } }));
    await quiet.n.setWebhook('ntfy', SECRETS.ntfy);
    await quiet.n.notify('hire', 'A new agent waits for floor 1', 'Ada');
    expect(quiet.posts).toEqual([]);
  });

  it('pushes an encrypted note to each device and forgets one its push service says is gone', async () => {
    const dir = tmpDir();
    const { n, posts } = notifier(dir, (req) => (req.url.includes('gone') ? 410 : 201));
    await n.pushKey();
    await n.subscribe(subscription('https://push.example.net/push/alive'));
    await n.subscribe(subscription('https://push.example.net/push/gone'));
    expect(n.channelsView().pushDevices).toBe(2);
    await n.notify('ceoMessage', 'Morgan', 'Floor 2 is done.');
    expect(posts.map((p) => [p.channel, p.url])).toEqual([
      ['push', 'https://push.example.net/push/alive'],
      ['push', 'https://push.example.net/push/gone'],
    ]);
    expect(posts[0].headers).toMatchObject({ 'Content-Encoding': 'aes128gcm' });
    expect(Buffer.isBuffer(posts[0].body) && posts[0].body.includes(Buffer.from('Floor 2'))).toBe(false); // encrypted
    expect(n.channelsView().pushDevices).toBe(1);
    // Kept on disk across a restart, with the same keys.
    const again = notifier(dir, () => 201).n;
    await again.init();
    expect(again.channelsView().pushDevices).toBe(1);
    expect((await again.pushKey()).publicKey).toBe((await n.pushKey()).publicKey);
  });

  it('refuses a test of a channel that is not set up', async () => {
    const { n } = notifier(tmpDir(), () => 200);
    await expect(n.test('ntfy')).rejects.toThrow('Save the ntfy settings first.');
    await expect(n.test('push')).rejects.toThrow(/No device gets push yet/);
    await expect(n.test('carrier-pigeon')).rejects.toThrow(/no notification channel/);
    await expect(n.setWebhook('carrier-pigeon', {})).rejects.toThrow(/no chat app/);
    for (const gone of ['discord', 'slack', 'telegram']) {
      await expect(n.setWebhook(gone, { url: 'https://old.example/1' })).rejects.toThrow(/no chat app/);
      await expect(n.test(gone)).rejects.toThrow(/no notification channel/);
    }
  });
});
