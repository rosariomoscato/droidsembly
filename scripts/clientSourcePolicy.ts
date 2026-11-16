import fs from 'node:fs';
import asyncFs from 'node:fs/promises';
import path from 'node:path';

// Keep the original notifier test's extension set and forbidden-expression semantics.
const sourceFile = /\.(tsx?|js|html|json|webmanifest)$/;
const forbidden = /secrets\.json|push\.json|from '(\.\.\/)+server\//;

/** Scan actual files, including untracked/hidden ones, not a git index or cached result.
 * Dirents avoid per-entry stat calls during recursive enumeration. This test-only
 * driver limits concurrent fresh reads to eight. A reproduced slow scan spent
 * 14.66s in serial reads of595 small files; independent I/O need not block the
 * caller one file at a time. All started reads settle on success AND failure.
 * No cache, extension exclusions, sampled files or altered policy expressions.
 */
export interface SourceScanObservation {
  phase: 'enumeration' | 'selection' | 'file';
  ms: number;
  entries?: number;
  file?: string;
  characters?: number;
  readMs?: number;
  checkMs?: number;
}

export async function scanClientSources(root: string, observe?: (event: SourceScanObservation) => void): Promise<{ files: string[]; violations: string[] }> {
  const started = observe ? performance.now() : 0;
  const entries = fs.readdirSync(root, { recursive: true, withFileTypes: true });
  observe?.({ phase: 'enumeration', ms: performance.now() - started, entries: entries.length });
  const selection = observe ? performance.now() : 0;
  // Do not silently lose coverage if a future source tree introduces symlinks.
  // Fail closed instead of traversing arbitrary external trees or skipping them.
  if (entries.some(entry => entry.isSymbolicLink())) throw new Error('Client source-policy scan requires a tree without symbolic links.');
  const files = entries.map(entry => path.relative(root, path.join(entry.parentPath, entry.name))).filter(file => sourceFile.test(file)).sort();
  observe?.({ phase: 'selection', ms: performance.now() - selection, entries: files.length });
  const violations: string[] = [];
  const observations = observe ? new Array<SourceScanObservation | undefined>(files.length) : undefined;
  let next = 0, failed = false, failure: unknown;
  const worker = async () => {
    while (!failed) {
      const index = next++;
      if (index >= files.length) return;
      const file = files[index], readAt = observe ? performance.now() : 0;
      try {
        const text = await asyncFs.readFile(path.join(root, file), 'utf8');
        const checkAt = observe ? performance.now() : 0;
        if (forbidden.test(text)) violations.push(file);
        if (observations) {
          const end = performance.now();
          observations[index] = { phase: 'file', file, characters: text.length, readMs: checkAt - readAt, checkMs: end - checkAt, ms: end - readAt };
        }
      } catch (error) {
        if (!failed) failure = error;
        failed = true;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(8, files.length) }, worker));
  // Keep deterministic filename-order diagnostics without callbacks after return.
  for (const event of observations ?? []) if (event) observe?.(event);
  if (failed) throw failure;
  return { files, violations: violations.sort() };
}
