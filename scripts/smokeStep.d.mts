export interface SmokePhase {
  phase: string;
  event: 'start' | 'end' | 'throw';
  ms?: number;
  status?: number | null;
  errorCode?: string | null;
}
export function smokeStep<T extends { status: number | null; error?: { code?: string } }>(
  label: string, run: () => T, mark: (row: SmokePhase) => void, now?: () => number,
): T;
