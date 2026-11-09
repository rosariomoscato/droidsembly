import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { OPENCODE_PLUGIN_SOURCE } from './clis.ts';

const SESSION = 'ses_cubefarm_test';
const URL = 'http://127.0.0.1:4417/api/hooks/test';
const user = { id: 'user', type: 'user', text: 'Plan the work' };
const reply = { id: 'reply', type: 'assistant', content: [{ type: 'reasoning', text: 'private reasoning' }, { type: 'text', text: 'The plan is ready.' }] };
const idle = { id: 'idle', type: 'idle', outcome: 'succeeded' };

async function plugin(events: Record<string, unknown>[], messages: unknown[] = [user, reply, idle], model?: { providerID: string; id: string; variant?: string }, rejectUsage = false, eventsFile?: string) {
  const posts: Record<string, unknown>[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
    expect(url).toBe(URL);
    posts.push(JSON.parse(String(init.body)));
    if (rejectUsage && posts.at(-1)?.hook_event_name === 'AiUsage') return new Response('', { status: 503 });
    return new Response('{}');
  }));
  let signal: AbortSignal | undefined;
  const context = vi.fn(async () => messages);
  const definition = (await import(`data:text/javascript;base64,${Buffer.from(OPENCODE_PLUGIN_SOURCE).toString('base64')}`)).default;
  const promptHook = vi.fn();
  const switchModel = vi.fn();
  const defaultModel = vi.fn(async () => ({ providerID: 'openai', id: 'configured-default' }));
  const dispose = await definition.setup({
    options: { sessionID: SESSION, ...(eventsFile ? { eventsFile } : { notifyUrl: URL }), model },
    model: { default: defaultModel },
    provider: { get: async () => ({ integrationID: 'fixture', headers: { authorization: 'secret' } }) },
    integration: { connection: { active: async () => ({ type: 'credential', id: 'credential-fixture', method: 'oauth', label: 'private account label' }) } },
    session: { context, get: async () => ({ id: SESSION, outcome: 'succeeded' }), hook: promptHook, switchModel },
    event: { subscribe: async function* (options: { signal: AbortSignal }) {
      signal = options.signal;
      for (const event of events) yield event;
    } },
  });
  return { posts, context, dispose, promptHook, switchModel, defaultModel, signal: () => signal };
}

afterEach(() => vi.unstubAllGlobals());

describe('OpenCode V2 turn notifications', () => {
  it('writes replayable ASCII events in a Box, with no callback to the local office', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'opencode-box-plugin-'));
    const file = path.join(dir, 'events.jsonl');
    const p = await plugin([{ type: 'session.execution.succeeded', data: { sessionID: SESSION } }], [user, { ...reply, content: [{ type: 'text', text: 'Finito: città 🚀' }] }, idle], undefined, false, file);
    await vi.waitFor(() => expect(fs.existsSync(file)).toBe(true));
    const raw = fs.readFileSync(file, 'utf8');
    expect(raw).toMatch(/^[\x00-\x7f]*$/);
    expect(JSON.parse(raw)).toMatchObject({ hook_event_name: 'TurnComplete', session_id: SESSION, last_assistant_message: 'Finito: città 🚀' });
    expect(p.posts).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
    p.dispose();
  });

  it('reports remote tool names without exporting tool arguments or output', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'opencode-box-plugin-'));
    const file = path.join(dir, 'events.jsonl');
    const messages = [user, { ...reply, content: [{ type: 'tool', id: 'call-1', name: 'shell', state: { input: { command: 'secret' }, output: 'private' } }] }];
    const p = await plugin([{ type: 'session.tool.called', data: { sessionID: SESSION, id: 'call-1', input: { key: 'secret' } } }], messages, undefined, false, file);
    await vi.waitFor(() => expect(fs.existsSync(file)).toBe(true));
    const raw = fs.readFileSync(file, 'utf8');
    expect(JSON.parse(raw)).toMatchObject({ hook_event_name: 'PreToolUse', tool_name: 'shell', tool_use_id: 'call-1' });
    expect(raw).not.toMatch(/secret|private/);
    p.dispose();
  });
  it('discovers active metadata for arbitrary providers and forwards 429 without modifying retries or HTTP', async () => {
    const p = await plugin([]);
    const hook = (name: string) => p.promptHook.mock.calls.find((call) => call[0] === name)![1];
    const event = { sessionID: SESSION, model: { providerID: 'future-provider', id: 'future-model' } };
    await hook('model.request')(event);
    expect(p.posts[0]).toMatchObject({ hook_event_name: 'AiResource', resource: { provider: 'future-provider', model: 'future-model', account: 'credential-fixture', access: 'unknown' } });
    const response = new Response('', { status: 429, headers: { 'retry-after': '60', authorization: 'secret' } });
    const http = { ...event, response };
    await hook('http.response')(http);
    expect(http.response).toBe(response);
    expect(p.posts[1]).toMatchObject({ hook_event_name: 'AiLimit', status: 429 });
    expect(p.posts[1].resetsAt).toBeGreaterThan(Date.now());
    const retry = { ...event, error: { status: 429 }, decision: { retry: true, delay: 1000 } };
    await hook('retry')(retry);
    expect(retry.decision).toEqual({ retry: true, delay: 1000 });
    await hook('retry')({ ...retry, sessionID: 'foreign' });
    expect(p.posts).toHaveLength(3);
    expect(JSON.stringify(p.posts)).not.toMatch(/secret|private account label|authorization/);
    p.dispose();
  });
  it('reports actual per-message providers without forwarding content or provider credentials', async () => {
    const messages = [user,
      { ...reply, id: 'first', time: { created: 10 }, model: { providerID: 'provider-a', id: 'model-a', key: 'secret' }, tokens: { input: 42 } },
      { ...reply, id: 'second', time: { created: 20 }, model: { providerID: 'provider-b', id: 'model-b' }, cost: 0 }, idle];
    const p = await plugin([{ type: 'session.execution.succeeded', data: { sessionID: SESSION } }], messages);
    await vi.waitFor(() => expect(p.posts).toHaveLength(3));
    const usage = p.posts.filter((v) => v.hook_event_name === 'AiUsage');
    expect(usage).toHaveLength(2);
    expect(usage[0]).toMatchObject({ session_id: SESSION, message: { model: { providerID: 'provider-a', id: 'model-a' }, tokens: { input: 42 } } });
    expect(usage[1]).toMatchObject({ message: { model: { providerID: 'provider-b' }, cost: 0 } });
    expect(JSON.stringify(usage)).not.toMatch(/secret|private reasoning|content/);
    p.dispose();
  });
  it('applies the selected model and variant before admitting a resumed prompt', async () => {
    const model = { providerID: 'openai', id: 'gpt-6.1-sol', variant: 'medium' };
    const p = await plugin([], undefined, model);
    await p.promptHook.mock.calls[0][1]({ sessionID: SESSION, prompt: { text: 'Continue' } });
    expect(p.switchModel).toHaveBeenCalledWith({ sessionID: SESSION, model });
    expect(p.defaultModel).not.toHaveBeenCalled();
    expect(p.posts[0].hook_event_name).toBe('UserPromptSubmit');
    p.dispose();
  });

  it('still delivers completion when the usage callback is unavailable', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const p = await plugin([{ type: 'session.execution.succeeded', data: { sessionID: SESSION } }], [user, { ...reply, time: { created: 10 } }, idle], undefined, true);
    await vi.waitFor(() => expect(p.posts.at(-1)?.hook_event_name).toBe('TurnComplete'));
    expect(p.posts.some((post) => post.hook_event_name === 'TurnError')).toBe(false);
    expect(warn).toHaveBeenCalled();
    p.dispose();
    warn.mockRestore();
  });

  it('restores the OpenCode default on resume when the explicit model is cleared', async () => {
    const p = await plugin([]);
    await p.promptHook.mock.calls[0][1]({ sessionID: SESSION, prompt: { text: 'Continue' } });
    expect(p.switchModel).toHaveBeenCalledWith({ sessionID: SESSION, model: { providerID: 'openai', id: 'configured-default' } });
    p.dispose();
  });
  it('forwards native V2 execution completion without relying on the compatibility idle event', async () => {
    const p = await plugin([{ id: 'evt_native', type: 'session.execution.succeeded', data: { sessionID: SESSION }, durable: { aggregateID: SESSION, seq: 1, version: 1 } }]);
    await vi.waitFor(() => expect(p.posts).toHaveLength(1));
    expect(p.posts[0]).toMatchObject({ hook_event_name: 'TurnComplete', last_assistant_message: 'The plan is ready.' });
    p.dispose();
  });

  it.each(['failed', 'interrupted'])('handles native execution %s events', async (outcome) => {
    const p = await plugin([{ type: `session.execution.${outcome}`, data: { sessionID: SESSION, error: 'provider unavailable' } }]);
    await vi.waitFor(() => expect(p.posts).toHaveLength(1));
    expect(p.posts[0].hook_event_name).toBe(outcome === 'failed' ? 'TurnError' : 'Interrupt');
    p.dispose();
  });

  it('does not deliver twice when native and compatibility completion events both arrive', async () => {
    const p = await plugin([
      { type: 'session.execution.succeeded', data: { sessionID: SESSION } },
      { type: 'session.idle', data: { sessionID: SESSION } },
    ]);
    await vi.waitFor(() => expect(p.context).toHaveBeenCalledTimes(2));
    expect(p.posts).toHaveLength(1);
    p.dispose();
  });
  it('handles the native V2 event envelope: sessionID is inside data', async () => {
    const p = await plugin([{ id: 'evt_test', created: 1, type: 'session.idle', data: { sessionID: SESSION } }]);
    await vi.waitFor(() => expect(p.posts).toHaveLength(1));
    expect(p.posts[0]).toEqual({ hook_event_name: 'TurnComplete', session_id: SESSION, last_assistant_message: 'The plan is ready.' });
    p.dispose();
  });
  it('reports new prompts only for its own session so the office knows it is busy', async () => {
    const p = await plugin([]);
    expect(p.promptHook.mock.calls[0][0]).toBe('prompt');
    const hook = p.promptHook.mock.calls[0][1];
    await hook({ sessionID: 'ses_foreign', prompt: { text: 'Ignore this' } });
    expect(p.posts).toEqual([]);
    await hook({ sessionID: SESSION, prompt: { text: 'Plan it' } });
    expect(p.posts).toEqual([{ hook_event_name: 'UserPromptSubmit', session_id: SESSION, prompt: 'Plan it' }]);
    p.dispose();
  });
  it('reads the V2 context, forwards only the final text, and deduplicates idle events', async () => {
    const event = { type: 'session.idle', sessionID: SESSION };
    const p = await plugin([event, event]);
    await vi.waitFor(() => expect(p.context).toHaveBeenCalledTimes(2));
    expect(p.posts).toEqual([{ hook_event_name: 'TurnComplete', session_id: SESSION, last_assistant_message: 'The plan is ready.' }]);
    p.dispose();
    expect(p.signal()?.aborted).toBe(true);
  });

  it('ignores other sessions and subagents, including their failures', async () => {
    const p = await plugin([
      { type: 'session.idle', sessionID: 'ses_other' },
      { type: 'session.error', sessionID: 'ses_child', error: 'child failed' },
      { type: 'session.idle', properties: { sessionID: SESSION } },
    ]);
    await vi.waitFor(() => expect(p.posts).toHaveLength(1));
    expect(p.context).toHaveBeenCalledTimes(1);
    p.dispose();
  });

  it.each(['failed', 'interrupted'])('reports a %s turn instead of treating it as a successful reply', async (outcome) => {
    const p = await plugin([{ type: 'session.idle', sessionID: SESSION }], [user, reply, { ...idle, outcome, error: 'provider unavailable' }]);
    await vi.waitFor(() => expect(p.posts).toHaveLength(1));
    expect(p.posts[0].hook_event_name).toBe(outcome === 'failed' ? 'TurnError' : 'Interrupt');
    p.dispose();
  });

  it('does not reuse an old reply when the new turn produced none', async () => {
    const p = await plugin([{ type: 'session.idle', sessionID: SESSION }], [reply, user, idle]);
    await vi.waitFor(() => expect(p.posts).toHaveLength(1));
    expect(p.posts[0]).toMatchObject({ hook_event_name: 'TurnError', error: 'OpenCode finished without a final reply' });
    p.dispose();
  });
});
