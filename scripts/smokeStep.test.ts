import { describe, expect, it, vi } from 'vitest';
import { smokeStep, type SmokePhase } from './smokeStep.mjs';

describe('package smoke phase diagnostics', () => {
  it('records intent before invoking the identical operation and preserves its result', () => {
    const rows: SmokePhase[] = [];
    const result = { status: 0, stdout: 'unchanged' };
    const run = vi.fn(() => { expect(rows).toEqual([{ phase: 'npm-install', event: 'start' }]); return result; });
    let at = 10;
    expect(smokeStep('npm-install', run, (r) => rows.push(r), () => at++)).toBe(result);
    expect(run).toHaveBeenCalledOnce();
    expect(rows[1]).toEqual({ phase: 'npm-install', event: 'end', ms: 1, status: 0, errorCode: null });
  });
  it('retains a spawn failure without putting output, credentials or arguments in the trace', () => {
    const mark = vi.fn();
    const result = { status: null, error: { code: 'ENOENT', message: 'secret-value' }, stdout: 'private-output' };
    expect(smokeStep('npm-init', () => result, mark)).toBe(result);
    expect(mark.mock.calls[1][0]).toMatchObject({ status: null, errorCode: 'ENOENT' });
    expect(JSON.stringify(mark.mock.calls)).not.toMatch(/secret-value|private-output/);
  });
  it('reports a thrown operation and rethrows the original error', () => {
    const mark = vi.fn(), error = new Error('original');
    expect(() => smokeStep('cli-help', () => { throw error; }, mark)).toThrow(error);
    expect(mark.mock.calls.map(([r]) => r.event)).toEqual(['start', 'throw']);
  });
});
