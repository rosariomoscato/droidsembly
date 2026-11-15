import { translate, type Language } from '../../../shared/i18n';

/** Cloud authentication varies by CLI, provider and method; do not prescribe Claude's flow to OpenCode. */
export function signInInstructions(provider: string, language?: Language): string {
  const t = (key: string) => translate(language, key);
  return provider === 'Codex'
    ? t('Open the link in their terminal, sign in to ChatGPT there and enter the one-time code the terminal shows.')
    : provider === 'OpenCode'
      ? t('Follow the instructions in their terminal for the selected provider and sign-in method. If a link is shown, open it and use the account for that provider; enter or paste a code only where instructed.')
      : t('Open the link in their terminal, approve it with your Claude account, then paste the code the page gives you into the terminal and press Enter.');
}
