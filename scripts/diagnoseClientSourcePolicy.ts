// One bounded, read-only source scan, not a replacement for the notifier test.
// Reports paths/timings/counts only; never source contents or credential values.
import fs from 'node:fs';
import path from 'node:path';
import { scanClientSources, type SourceScanObservation } from './clientSourcePolicy.ts';

const output = process.argv[2];
if (!output) throw new Error('Provide a new report file path. Existing reports are never overwritten.');
if (fs.existsSync(output)) throw new Error('Report already exists; refusing to overwrite diagnostic evidence.');
const root = path.resolve(import.meta.dirname, '..', 'client');
const observations: SourceScanObservation[] = [];
const cpu = process.cpuUsage();
const started = performance.now();
try {
  const result = await scanClientSources(root, (event) => observations.push(event));
  const elapsedMs = performance.now() - started;
  const files = observations.filter((event) => event.phase === 'file');
  const report = {
    kind: 'isolated-instrumented-diagnosis-not-full-test-validation',
    elapsedMs, budgetMs: 5000, cpuMicroseconds: process.cpuUsage(cpu),
    files: result.files.length, violations: result.violations,
    enumeration: observations.find((event) => event.phase === 'enumeration'),
    selection: observations.find((event) => event.phase === 'selection'),
    totalReadMs: files.reduce((sum, event) => sum + (event.readMs ?? 0), 0),
    totalCheckMs: files.reduce((sum, event) => sum + (event.checkMs ?? 0), 0),
    slowestFiles: [...files].sort((a, b) => b.ms - a.ms).slice(0, 15),
    conditions: { withinBudget: elapsedMs < 5000, enoughFiles: result.files.length > 20, noViolations: result.violations.length === 0 },
  };
  fs.writeFileSync(output, JSON.stringify(report, null, 2), { flag: 'wx' });
  console.log(JSON.stringify(report, null, 2));
  if (!Object.values(report.conditions).every(Boolean)) process.exitCode = 1;
} catch (error) {
  fs.writeFileSync(output, JSON.stringify({ kind: 'diagnosis-error', elapsedMs: performance.now() - started, error: String(error), observations }, null, 2), { flag: 'wx' });
  throw error;
}
