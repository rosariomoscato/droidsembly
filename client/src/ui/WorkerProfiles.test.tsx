import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { translate } from '../../../shared/i18n';
import type { AgentView } from '../../../shared/types';
import { WorkerProfileSelect } from './WorkerProfileSelect';
import { WorkerProfileTask } from './WorkerProfileTask';
import { agentActions, doing } from '../pocket/pocketData';

const language = vi.hoisted(() => ({ value: 'en' as 'en' | 'it' }));
const start = vi.hoisted(() => vi.fn());
vi.mock('../api', () => ({ api: { startProfile: start, profileReport: vi.fn(), approveProfile: vi.fn() } }));
vi.mock('./Confirm', () => ({ confirmDialog: vi.fn() }));
vi.mock('../i18n', () => ({
  T: ({ children }: { children: string }) => translate(language.value, children),
  useT: () => (text: string) => translate(language.value, text),
}));

describe('worker profile UI', () => {
  it('does not offer issue assignment or message-based resume on Pocket profile cards', () => {
    expect(agentActions({ status: 'done', task: 'profile', profile: 'vercel', branch: 'swarm/profile-1' })).toEqual({ stop: false, clear: true, assign: false, message: false });
    expect(agentActions({ status: 'idle', task: null, profile: 'review', branch: null }).assign).toBe(false);
    expect(agentActions({ status: 'idle', task: null, profile: 'generic', branch: null }).assign).toBe(true);
    expect(doing({ status: 'working', task: 'profile', issueNumber: null, prNumber: null, issueTitle: 'Application review' }, 'it')).toBe('Review applicazione');
  });
  it.each(['en', 'it'] as const)('offers three profiles with Generic selected by default in %s', value => {
    language.value = value;
    const html = renderToStaticMarkup(<WorkerProfileSelect onChange={() => undefined} />);
    expect(html.match(/<option/g)).toHaveLength(3);
    expect(html).toContain('<option value="generic" selected="">');
    expect(html).toContain(value === 'it' ? 'Review applicazione' : 'Application review');
    expect(html).toContain(value === 'it' ? 'Deploy Vercel' : 'Vercel deployment');
  });

  it('requires an explicit request, defaults deployment to preview and never starts work on render', () => {
    language.value = 'en';
    const agent = { id: 'worker', profile: 'vercel', status: 'idle' } as AgentView;
    const html = renderToStaticMarkup(<WorkerProfileTask agent={agent} />);
    expect(html).toContain('<option value="preview" selected="">');
    expect(html).toContain('Production (requires explicit approval)');
    expect(html).toContain('Never paste secrets');
    expect(html).toContain('<button class="btn" disabled="">');
    expect(html).not.toContain('Approve and deploy');
    expect(start).not.toHaveBeenCalled();
  });
});
