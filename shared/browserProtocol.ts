/** One DOM event per action; readers accept both generations. */
export const OFFICE_OPEN_EVENT = 'droidsembly:open';
export const LEGACY_OFFICE_OPEN_EVENT = 'cubefarm:open';

export function officeOpenUrl(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const message = data as { type?: unknown; url?: unknown };
  return (message.type === OFFICE_OPEN_EVENT || message.type === LEGACY_OFFICE_OPEN_EVENT) && typeof message.url === 'string' ? message.url : null;
}

/** A deduplication identity, shared with older tabs/workers: do not rename on upgrade. */
export const notificationTag = (id: string | number) => `cubefarm-${id}`;
