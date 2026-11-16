import { describe, expect, it } from 'vitest';
import { translate } from '../../../shared/i18n';
import { signInInstructions } from './signInText';

describe('cloud sign-in instructions', () => {
  it.each(['en', 'it'] as const)('does not assume an account or code flow for OpenCode (%s)', (language) => {
    const text = signInInstructions('OpenCode', language);
    expect(text).toContain('provider');
    expect(text).not.toMatch(/Claude|ChatGPT/);
    expect(text).toContain(language === 'it' ? 'metodo di accesso' : 'sign-in method');
    expect(text).toContain(language === 'it' ? 'solo dove indicato' : 'only where instructed');
    expect(signInInstructions('Claude Code', language)).toContain(language === 'en' ? 'Claude account' : 'account Claude');
    expect(signInInstructions('Codex', language)).toContain('ChatGPT');
  });

  it('uses a dedicated empty QA label without changing the shared suffix', () => {
    expect(translate('it', 'QA brief — not filled in yet')).toBe('Indicazioni QA — non ancora compilate');
    expect(translate('en', 'QA brief — not filled in yet')).toBe('QA brief — not filled in yet');
    expect(translate('it', 'QA brief')).toBe('Indicazioni QA');
    expect(translate('it', ' (none yet)')).toBe(' (non ancora disponibile)');
  });
});
