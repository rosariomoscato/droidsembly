// Versioned cloud work profiles: selecting one reserves a worker, never starts a task or grants deployment consent.
export type WorkerProfile = 'generic' | 'review' | 'vercel';
export const WORKER_PROFILES: { id: WorkerProfile; label: string }[] = [
  { id: 'generic', label: 'Generic worker' },
  { id: 'review', label: 'Application review' },
  { id: 'vercel', label: 'Vercel deployment' },
];
export const isWorkerProfile = (value: unknown): value is WorkerProfile => WORKER_PROFILES.some(p => p.id === value);
export const genericWorker = (a: { profile?: WorkerProfile }) => !a.profile || a.profile === 'generic';

export interface ProfileRequest {
  instructions: string;
  baseline: string;
  url: string;
  target: 'preview' | 'production';
}
export type ProfilePhase = 'review' | 'preflight' | 'awaiting-approval' | 'deploy' | 'complete' | 'blocked' | 'stopped' | 'error';
/** Small metadata only in the world snapshot. Reports are explicitly read over REST. */
export interface ProfileRunView {
  id: string;
  profile: Exclude<WorkerProfile, 'generic'>;
  version: number;
  phase: ProfilePhase;
  commit: string;
  target: 'preview' | 'production';
  requiresResources: boolean;
  approval: string | null;
}
export interface ProfileReport extends ProfileRunView {
  execution: string;
  request: ProfileRequest;
  report: string;
  plan: string;
}
