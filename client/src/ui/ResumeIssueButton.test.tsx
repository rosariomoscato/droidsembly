import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { translate } from '../../../shared/i18n';
import type { AgentView } from '../../../shared/types';
import { ResumeIssueButton } from './ResumeIssueButton';

const language = vi.hoisted(() => ({ value: 'en' as 'en' | 'it' }));
vi.mock('../i18n', () => ({ useT: () => (text: string, values?: Record<string, string | number>) => translate(language.value, text, values) }));
vi.mock('../api', () => ({ api: { resumeIssue: vi.fn() } }));
vi.mock('../store', () => ({ useStore: { getState: () => { throw new Error('Rendering must not request live actions'); } } }));
vi.mock('./Confirm', () => ({ confirmDialog: vi.fn() }));
const agent = { id: 'ada', name: '<Ada>', repoId: 'repo', role: 'agent', task: 'issue', status: 'stopped', issueNumber: 3, branch: 'swarm/issue-3-ada', prNumber: null, prUrl: null, canResumeIssue: true } as AgentView;
describe('resume issue button', () => {
  it.each(['en', 'it'] as const)('renders an accessible translated action in %s, without starting work', value => {
    language.value = value;
    const html = renderToStaticMarkup(<ResumeIssueButton agent={agent} repoId="repo" issueNumber={3} />);
    expect(html).toContain(value === 'it' ? 'Riprendi attività' : 'Resume task');
    expect(html).toContain('aria-label='); expect(html).toContain('&lt;Ada&gt;');
    const body = translate(value, 'Restart preparation for {name} on the same issue and branch, preserving the existing worktree. No reset or duplicate issue. This starts agent work and may consume AI quota.', { name: 'Ada' });
    expect(body).toContain(value === 'it' ? 'può consumare quota AI' : 'may consume AI quota');
  });
  it('hides the action when the server has not granted the capability', () => {
    expect(renderToStaticMarkup(<ResumeIssueButton agent={{ ...agent, canResumeIssue: false }} repoId="repo" issueNumber={3} />)).toBe('');
  });
});
