import type { GateErrorCategory } from './opencodeGateDiagnostics.ts';

export const READINESS_STATES = ['ready','model-not-listed','model-disabled','model-non-chat','model-no-tools','variant-unavailable','provider-not-listed','provider-disabled','provider-no-integration','integration-not-listed','no-connection','connection-needs-auth','connection-status-unknown','oauth-unavailable'] as const;
export const READINESS_CHECKS = ['box','transport','output','version','models','default-model','provider','integration'] as const;
export type OpenCodeReadiness = { state: typeof READINESS_STATES[number] } | { state: 'query-failed'; check: typeof READINESS_CHECKS[number] };

/** Fixed diagnostic codes only; never convert provider text or connection metadata into a category. */
export function readinessCategory(result: OpenCodeReadiness): GateErrorCategory {
  if(result.state==='query-failed')return `remote-query-${result.check}-failed`;
  return result.state==='ready' ? 'unknown' : `remote-${result.state}`;
}
