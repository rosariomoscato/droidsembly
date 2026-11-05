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
export async function scanClientSources(root: string): Promise<{ files: string[]; violations: string[] }> {
  const entries = fs.readdirSync(root, { recursive: true, withFileTypes: true });
  // Do not silently lose coverage if a future source tree introduces symlinks.
  // Fail closed instead of traversing arbitrary external trees or skipping them.
  if (entries.some(entry => entry.isSymbolicLink())) throw new Error('Client source-policy scan requires a tree without symbolic links.');
  const files = entries.map(entry => path.relative(root, path.join(entry.parentPath, entry.name))).filter(file => sourceFile.test(file)).sort();
  const violations: string[] = [];
  for (const file of files) {
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    if (forbidden.test(text)) violations.push(file);
  }
  return { files, violations: violations.sort() };
}
