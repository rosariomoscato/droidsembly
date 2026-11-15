import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { translate } from '../../../shared/i18n';
import { CodingAgentTestNotice } from './CodingAgentTestNotice';

const language = vi.hoisted(() => ({ value: 'en' as 'en' | 'it' }));
vi.mock('../i18n', () => ({
  T: ({ children }: { children: string }) => translate(language.value, children),
}));

describe('coding agent manual validation notice', () => {
  it.each(['en', 'it'] as const)('renders an informational note in %s without claiming instability', (value) => {
    language.value = value;
    const html = renderToStaticMarkup(<CodingAgentTestNotice />);
    expect(html).toContain('<p class="muted small">');
    expect(html).toContain(value === 'it'
      ? 'OpenCode è lo strumento collaudato nei test manuali di questa versione. Claude Code e Codex sono disponibili, ma non ancora verificati allo stesso livello.'
      : 'OpenCode is the coding agent validated in manual testing for this version. Claude Code and Codex are available but have not yet been tested to the same extent.');
    expect(html).not.toMatch(/role="alert"|unstable|instabili|<button|<select/);
  });
});
