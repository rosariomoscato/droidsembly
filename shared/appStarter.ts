// A new application's project-scoped planning document; absent on legacy floors.
export interface AppPlan {
  requirements: string;
  users: string;
  dataModel: string;
  mvp: string;
  exclusions: string;
  stack: string;
  design: string;
  environments: {
    workerHost: 'local' | 'box';
    testPreview: string;
    deployment: string;
    data: 'sample' | 'existing';
    dataAccess: 'sample' | 'local-only' | 'anonymized-copy' | 'secure-service';
    database: string;
    isolation: string;
    prerequisites: string;
  };
  risks: string;
  tasks: { id: string; title: string; body: string; dependsOn: string[] }[];
}

export interface AppStarter {
  id: string;
  revision: number;
  status: 'interview' | 'awaiting-approval' | 'publishing' | 'ready' | 'paused' | 'cancelled';
  messages: { id: string; from: 'manager' | 'ceo'; text: string }[];
  decisions: string;
  plan?: AppPlan;
  hash?: string;
  approved?: { revision: number; hash: string; at: number; environments: true; localWorkers: boolean };
  ledger: { taskId: string; state: 'pending' | 'in-flight' | 'confirmed' | 'unknown'; number?: number }[];
  problem?: string;
}

export interface DraftRef { draftId: string; revision: number }

export const planningHeld = (draft?: AppStarter) => !!draft && draft.status !== 'ready';
export const compatibleHost = (draft: AppStarter | undefined, host: 'local' | 'box') =>
  !draft || (draft.status === 'ready' && draft.plan?.environments.workerHost === host);

/** The exact document shown to the manager and attached to every approved task. */
export function appPlanText(p: AppPlan): string {
  const e = p.environments;
  return [
    `## Requirements\n${p.requirements}`, `## Users\n${p.users}`, `## Data model\n${p.dataModel}`,
    `## MVP\n${p.mvp}`, `## Exclusions\n${p.exclusions}`, `## Stack / alternatives\n${p.stack}`,
    `## Design\n${p.design}`,
    `## Environments / data\nWorker: ${e.workerHost}\n\nTest / preview: ${e.testPreview}\n\nDeployment: ${e.deployment}\n\nData: ${e.data} / ${e.dataAccess}\n\nDatabase: ${e.database}\n\nIsolation: ${e.isolation}\n\nPrerequisites: ${e.prerequisites}`,
    `## Risks\n${p.risks}`,
    '## Tasks',
    ...p.tasks.map((t) => `### ${t.id}: ${t.title}\n${t.body}\n\nDepends on tasks: ${t.dependsOn.join(', ') || '—'}`),
  ].join('\n\n');
}
