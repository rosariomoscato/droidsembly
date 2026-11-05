import fs from 'node:fs/promises';
import path from 'node:path';

// Keep the original notifier test's extension set and forbidden-expression semantics.
const sourceFile = /\.(tsx?|js|html|json|webmanifest)$/;
const forbidden = /secrets\.json|push\.json|from '(\.\.\/)+server\//;

/** Scan actual files, including untracked/hidden ones, not a git index or cached result.
 * Dirents avoid per-entry stat calls during recursive enumeration. Reads are bounded
 * to eight at a time; all reads and checks must finish before the result resolves.
 */
export async function scanClientSources(root: string): Promise<{ files: string[]; violations: string[] }> {
  const entries = await fs.readdir(root, { recursive: true, withFileTypes: true });
  // Do not silently lose coverage if a future source tree introduces symlinks.
  // Fail closed instead of traversing arbitrary external trees or skipping them.
  if (entries.some(entry => entry.isSymbolicLink())) throw new Error('Client source-policy scan requires a tree without symbolic links.');
  const files = entries.map(entry => path.relative(root, path.join(entry.parentPath, entry.name))).filter(file => sourceFile.test(file)).sort();
  const violations: string[] = [];
  for (let i = 0; i < files.length; i += 8) {
    const batch = await Promise.allSettled(files.slice(i, i + 8).map(async file => {
      const text = await fs.readFile(path.join(root, file), 'utf8');
      if (forbidden.test(text)) violations.push(file);
    }));
    for (const read of batch) if (read.status === 'rejected') throw read.reason;
  }
  return { files, violations: violations.sort() };
}
