// Keep old turns available without letting the transcript bury the current question.
import type { AppStarter } from '../../../shared/appStarter';
import { useT } from '../i18n';
import { Markdown } from './Markdown';

type Message = AppStarter['messages'][number];

export function AppStarterHistory({ messages, decisions }: { messages: Message[]; decisions: string }) {
  const t = useT();
  return <>
    {messages.length > 0 && <details className="app-interview-history">
      <summary>{t('Conversation history ({count})', { count: messages.length })}</summary>
      <div className="app-history-messages">
        {messages.map((m) => <div key={m.id} className={`bubble ${m.from === 'manager' ? 'bubble-me' : 'bubble-them'}`}>
          <b>{m.from === 'manager' ? t('You') : 'CEO'}</b><Markdown text={m.text} />
        </div>)}
      </div>
    </details>}
    {decisions && <details className="app-interview-history">
      <summary>{t('Decisions so far')}</summary>
      <div className="app-history-messages"><Markdown text={decisions} /></div>
    </details>}
  </>;
}

export function AppStarterPrompt({ question, editing, answered = false }: { question?: Message; editing: boolean; answered?: boolean }) {
  const t = useT();
  return <section className="app-current-question" aria-label={t(editing ? 'Request a plan change' : 'Current CEO question')} tabIndex={0}>
    <strong>{t(editing ? 'Request a plan change' : 'Current CEO question')}</strong>
    {question ? <Markdown text={question.text} />
      : <p role={editing ? undefined : 'status'}>{t(editing
        ? 'Describe your changes below. Review the new revision before approving.'
        : answered ? 'Your answer is saved. Waiting for the next CEO question…'
          : 'Waiting for the CEO interview to start…')}</p>}
  </section>;
}
