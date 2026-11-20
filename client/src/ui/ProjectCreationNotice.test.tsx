import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { translate } from '../../../shared/i18n';
import type { RepoView } from '../../../shared/types';
import { ProjectCreationNotice } from './ProjectCreationNotice';

const language = vi.hoisted(() => ({ value: 'en' as 'en' | 'it' }));
vi.mock('../i18n', () => ({ useT: () => (text: string, values?: Record<string, string | number>) => translate(language.value, text, values) }));
describe('persistent project creation feedback', () => {
  it('stays silent before a request', () => {
    expect(renderToStaticMarkup(<ProjectCreationNotice />)).toBe('');
  });
  it.each(['en', 'it'] as const)('announces pending, success and failures in %s', (value) => {
    language.value = value;
    const pending = renderToStaticMarkup(<ProjectCreationNotice pendingName="office/books" />);
    expect(pending).toContain('role="status"');
    expect(pending).toContain(value === 'it' ? 'Creazione del progetto office/books' : 'Creating project office/books');
    const repo = { id: 'office/books', fullName: 'office/<books>', appStarter: {} } as RepoView;
    const success = renderToStaticMarkup(<ProjectCreationNotice repo={repo} />);
    expect(success).toContain(value === 'it' ? 'Progetto creato:' : 'Project created:');
    expect(success).toContain('office/&lt;books&gt;');
    expect(success).toContain('tabindex="-1"');
    expect(success).toContain(value === 'it' ? 'Apri intervista del progetto' : 'Open project interview');
    expect(success).toContain('type="button"');
    const failure = renderToStaticMarkup(<ProjectCreationNotice error="Synthetic <failure>" />);
    expect(failure).toContain('role="alert"');
    expect(failure).toContain('Synthetic &lt;failure&gt;');
    expect(failure).toContain(value === 'it' ? 'Controlla l’elenco' : 'Check the project list');
  });
  it('does not promise an interview when CEO planning was skipped', () => {
    language.value = 'en';
    const html = renderToStaticMarkup(<ProjectCreationNotice repo={{ id: 'office/books', fullName: 'office/books' }} />);
    expect(html).toContain('View project');
    expect(html).not.toContain('Open project interview');
  });
});
