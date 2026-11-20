// Scripted interview fixture. Synthetic only: no model, credentials, database or Box.
import type { AppPlan, AppStarter } from '../shared/appStarter.ts';

const questions = [
  ['Who will use the app, and what is their main action?', 'Chi userà l’app e qual è la sua azione principale?'],
  ['What data should it remember, and who may see or change it?', 'Quali dati deve ricordare e chi può vederli o modificarli?'],
  ['Where should workers develop: this computer or Upstash Boxes?', 'Dove lavoreranno i worker: questo computer oppure Upstash Box?'],
  ['Where will isolated tests and previews run?', 'Dove saranno eseguiti test e preview isolati?'],
  ['Where will the finished app be published?', 'Dove verrà pubblicata l’app finale?'],
  ['Are synthetic sample data enough, or do you need existing data?', 'Bastano dati sintetici di esempio oppure servono dati esistenti?'],
  ['Must any existing data stay local, or can anonymized copies / safe services be used?', 'Gli eventuali dati esistenti devono restare locali oppure si possono usare copie anonimizzate o servizi sicuri?'],
  ['What belongs in the MVP, and what must remain outside it?', 'Cosa comprende l’MVP e cosa deve restarne escluso?'],
  ['What visual style and device layouts do you want?', 'Quale stile visivo e quali dispositivi vuoi supportare?'],
];

// Fixture hints, not language understanding: a negated alternative is not a choice.
function affirms(text: string, choice: RegExp): boolean {
  return text.split(/[.!?;,\n]|\b(?:ma|but)\b/i).some((clause) => {
    const match = choice.exec(clause);
    if (!match) return false;
    const before = clause.slice(0, match.index);
    const after = clause.slice(match.index + match[0].length);
    return !/\b(?:non|no|not|without|senza|nessun[oaie]?|né|neither)\b/i.test(before)
      && !/^\s+(?:non\s+(?:servono|occorrono|sono\s+necessari)|(?:are|is)\s+not\s+(?:needed|required))/i.test(after);
  });
}

export function demoAppTurn(d: AppStarter, italian: boolean): { decisions: string; question?: string; plan?: AppPlan } {
  const asked = d.messages.filter((m) => m.from === 'ceo').length;
  const answers = d.messages.filter((m) => m.from === 'manager');
  const decisions = answers.map((m) => m.text).join('\n').slice(0, 8000);
  if (asked < questions.length) return { decisions, question: questions[asked][italian ? 1 : 0] };
  // Keep answers attached to their questions when a later revision request arrives.
  // Taking the last nine messages would shift worker/test/data answers into other slots.
  const a = questions.map((q) => {
    const at = d.messages.findIndex((m) => m.from === 'ceo' && q.includes(m.text));
    return d.messages.slice(at + 1).find((m) => m.from === 'manager')?.text ?? '';
  });
  const designQuestion = d.messages.findIndex((m) => m.from === 'ceo' && questions[8].includes(m.text));
  const designAnswer = d.messages.findIndex((m, i) => i > designQuestion && m.from === 'manager');
  const changes = d.messages.slice(designAnswer + 1).filter((m) => m.from === 'manager').map((m) => m.text).join('\n');
  const amendment = changes ? `\n\nManager revision requests:\n${changes}` : '';
  const existing = affirms(a[5], /\b(?:esistent\w*|existing)\b/i);
  const workerHost = affirms(a[2], /\b(?:boxes|box|cloud)\b/i) ? 'box' as const : 'local' as const;
  const anonymized = affirms(a[6], /\banon\w*/i);
  const secure = affirms(a[6], /\b(?:sicur\w*|secure|safe)\b/i);
  if (existing && workerHost === 'box' && !anonymized && !secure)
    return { decisions, question: italian ? 'Per i Box scegli una copia anonimizzata o un servizio raggiungibile in sicurezza; nessun dato locale non trasferibile.' : 'For Boxes choose anonymized copies or a safely reachable service; non-transferable local data needs local workers.' };
  return { decisions, plan: {
    requirements: (answers[0]?.text ?? 'Synthetic demo app') + amendment,
    users: a[0], dataModel: a[1], mvp: a[7] + amendment, exclusions: 'Everything not explicitly in the agreed MVP.',
    stack: 'Suggested React + TypeScript; SQLite with synthetic per-environment seeds. Alternatives remain open; no provider is mandatory.',
    design: a[8],
    environments: { workerHost, testPreview: a[3], deployment: a[4], data: existing ? 'existing' : 'sample',
      dataAccess: !existing ? 'sample' : workerHost === 'local' ? 'local-only' : anonymized ? 'anonymized-copy' : 'secure-service',
      database: 'SQLite for this synthetic demo; confirm suitability for the chosen deployment.',
      isolation: 'Disposable test and preview databases, separate from production. Migrations tested only on synthetic seeds or approved anonymized copies.',
      prerequisites: 'Verify runtime and database tooling in each environment. No provisioning or deploy is authorized. Local workers require this computer on.' },
    risks: 'Synthetic demo proposal, not a certification of real infrastructure. SQLite to Postgres can require code and migration changes.',
    tasks: [
      { id: 'foundation', title: 'Create the agreed application foundation', body: 'Implement the approved stack and design tokens. Configure separate development, preview and disposable test databases; supply synthetic seed and migration commands. Acceptance: tests and build pass without production access or committed secrets.', dependsOn: [] },
      { id: 'mvp', title: 'Implement the approved MVP', body: `Implement: ${a[7]}${amendment}. Acceptance: ownership rules and core actions work end to end; regression tests and accessible desktop/mobile UI pass. Document prerequisites and deployment steps without deploying.`, dependsOn: ['foundation'] },
    ],
  } };
}
