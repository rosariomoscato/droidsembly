// Transport deduplication only, not authentication. LAN HTTP may lack randomUUID.
export function planningMessageId(source: { randomUUID?: () => string } | undefined = globalThis.crypto): string {
  try {
    if (source?.randomUUID) return source.randomUUID();
  } catch { /* Some browsers expose the method but refuse it outside a secure context. */ }
  return `message-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
}
