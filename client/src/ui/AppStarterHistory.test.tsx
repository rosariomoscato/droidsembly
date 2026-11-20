import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { AppPlan, AppStarter } from '../../../shared/appStarter';
import type { RepoView } from '../../../shared/types';
import { translate } from '../../../shared/i18n';
import { AppStarterHistory, AppStarterPrompt } from './AppStarterHistory';
import { AppStarterChat } from './AppStarter';

const language = vi.hoisted(() => ({ value: 'en' as 'en' | 'it' }));
vi.mock('../i18n', () => ({ useT: () => (text: string, values?: Record<string, string | number>) => translate(language.value, text, values) }));
vi.mock('../api', () => ({ api: {} }));
const messages: AppStarter['messages'] = Array.from({ length: 40 }, (_, i) => ({ id: `turn-${i}`, from: i % 2 ? 'manager' : 'ceo', text: `Previous turn ${i}` }));

describe('compact project interview', () => {
  it.each(['en', 'it'] as const)('keeps every old turn and decision in closed disclosures in %s', (value) => {
    language.value = value;
    const html = renderToStaticMarkup(<AppStarterHistory messages={messages} decisions="Long accumulated decisions" />);
    expect(html.match(/<details/g)).toHaveLength(2);
    expect(html).not.toMatch(/<details[^>]*\bopen\b/);
    for (const m of messages) expect(html).toContain(m.text);
    expect(html).toContain('Long accumulated decisions');
    expect(html).toContain(value === 'it' ? 'Storico della conversazione (40)' : 'Conversation history (40)');
  });
  it('renders the complete latest question separately, without old answers', () => {
    language.value = 'en';
    const html = renderToStaticMarkup(<AppStarterPrompt question={{ id: 'latest', from: 'ceo', text: 'Which devices should it support?' }} editing={false} />);
    expect(html).toContain('aria-label="Current CEO question"');
    expect(html).toContain('Which devices should it support?');
    expect(html).not.toContain('Previous turn');
    expect(html).not.toContain('<details');
  });
  it('distinguishes waiting for the CEO from explicitly editing an existing plan', () => {
    language.value = 'it';
    const waiting = renderToStaticMarkup(<AppStarterPrompt editing={false} answered />);
    expect(waiting).toContain('role="status"');
    expect(waiting).toContain('La risposta è salvata.');
    const editing = renderToStaticMarkup(<AppStarterPrompt editing />);
    expect(editing).toContain('Richiedi una modifica al piano');
    expect(editing).toContain('Leggi la nuova revisione prima di approvarla.');
    expect(editing).not.toContain('In attesa');
    const starting = renderToStaticMarkup(<AppStarterPrompt editing={false} />);
    expect(starting).toContain('In attesa dell’inizio dell’intervista');
    expect(starting).not.toContain('La risposta è salvata.');
  });
  it('keeps the complete plan and every task outside the collapsed history, with approval still disabled', () => {
    language.value = 'en';
    const plan: AppPlan = {
      requirements: 'Fixture requirements', users: 'Reader', dataModel: 'Books', mvp: 'Catalogue', exclusions: 'No cloud',
      stack: 'SQLite', design: 'Readable', risks: 'Fixture only',
      environments: { workerHost: 'local', testPreview: 'Local', deployment: 'Local', data: 'sample', dataAccess: 'sample',
        database: 'SQLite', isolation: 'Synthetic', prerequisites: 'Local runtime' },
      tasks: [{ id: 'first', title: 'Foundation task', body: 'Foundation acceptance stays visible', dependsOn: [] },
        { id: 'second', title: 'Catalogue task', body: 'Catalogue acceptance stays visible', dependsOn: ['first'] }],
    };
    const draft: AppStarter = { id: 'draft', revision: 3, status: 'awaiting-approval', messages, decisions: 'Prior answers', plan, hash: 'a'.repeat(64), ledger: [] };
    const repo = { id: 'office/books', fullName: 'office/books', appStarter: draft, autoAssign: false } as RepoView;
    const html = renderToStaticMarkup(<AppStarterChat repo={repo} navigation={null} />);
    const endOfHistory = html.lastIndexOf('</details>');
    for (const text of ['Complete proposed plan', 'Foundation acceptance stays visible', 'Catalogue acceptance stays visible', draft.hash!]) {
      expect(html.indexOf(text)).toBeGreaterThan(endOfHistory);
    }
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Approve plan and create issues<\/button>/);
    expect(html).not.toContain('Current CEO question');
  });
});
