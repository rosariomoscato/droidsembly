import fs from 'node:fs';
import path from 'node:path';

// Keep the original notifier test's extension set and forbidden-expression semantics.
const sourceFile = /\.(tsx?|js|html|json|webmanifest)$/;
const forbidden = /secrets\.json|push\.json|from '(\.\.\/)+server\//;

/** Scan actual files, including untracked/hidden ones, not a git index or cached result.
 * Dirents avoid per-entry stat calls during recursive enumeration. This test-only
 * driver reads one file at a time synchronously: promise-based per-file I/O can
 * dominate the small source files on Windows. No reads remain after completion
 * or failure. Keep the Promise API so callers await the entire scan and errors.
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
  for (const file of files) {
    const readAt = observe ? performance.now() : 0;
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    const checkAt = observe ? performance.now() : 0;
    if (forbidden.test(text)) violations.push(file);
    if (observe) {
      const end = performance.now();
      observe({ phase: 'file', file, characters: text.length, readMs: checkAt - readAt, checkMs: end - checkAt, ms: end - readAt });
    }
  }
  return { files, violations: violations.sort() };
}
