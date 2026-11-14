export interface PublicationIdentity {
  name: string;
  version: string;
  channel: string;
  gitHead: string;
  integrity: string;
  size: number;
}
export interface PublicationSnapshot extends PublicationIdentity {
  previousChannels: Record<string, string>;
}
export interface PublicationObservation {
  available: boolean;
  reason?: string;
  channels?: Record<string, string>;
}
export interface PublicationResult extends PublicationObservation {
  bytes?: Buffer;
  sha256?: string;
}
export const publicationBudgetMs: number;
export function integrity(bytes: Uint8Array): string;
export function capturePublication(expected: PublicationIdentity, fetcher?: typeof fetch): Promise<PublicationSnapshot>;
export function inspectPublication(expected: PublicationSnapshot, fetcher?: typeof fetch, budgetMs?: number): Promise<PublicationResult>;
export function waitForPublication(expected: PublicationSnapshot, options?: {
  fetcher?: typeof fetch;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  observe?: (observation: PublicationObservation & { attempt: number }) => void;
}): Promise<PublicationResult>;
