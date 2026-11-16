// Shared by the published CLI, checkout launcher and bundled server. No I/O at import time.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** Canonical values win even when empty (an empty token must not revive a legacy token). */
export function officeEnv(env, legacyName) {
  const canonical = legacyName.replace(/^(SWARM|CUBEFARM)_/, 'DROIDSEMBLY_');
  return env[canonical] ?? env[legacyName];
}

/** Explicit process options must override both generations of inherited variables. */
export function officeOverrides(env, values) {
  const result = { ...env };
  for (const [name, value] of Object.entries(values)) {
    result[name] = value;
    result[name.replace(/^(SWARM|CUBEFARM)_/, 'DROIDSEMBLY_')] = value;
  }
  return result;
}

function directoryExists(file) {
  try { fs.lstatSync(file); }
  catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error; // Permission/I/O errors are not evidence of a new office.
  }
  // Do not silently bypass a file or dangling symlink at either data path.
  if (!fs.statSync(file).isDirectory()) throw new Error('Office home path is not a directory. Set DROIDSEMBLY_HOME explicitly.');
  return true;
}

/** Selection only: never create, move, merge or read the contents of a data folder. */
export function officeHome(env = process.env, home = os.homedir(), exists = directoryExists) {
  const explicit = officeEnv(env, 'SWARM_HOME');
  if (explicit !== undefined) {
    if (!explicit.trim()) throw new Error('DROIDSEMBLY_HOME / SWARM_HOME must not be empty. Select an office folder explicitly.');
    const selected = path.resolve(explicit);
    exists(selected); // An absent explicit path is allowed; invalid existing paths are not.
    return selected;
  }
  const current = path.resolve(home, '.droidsembly');
  const legacy = path.resolve(home, '.cubefarm');
  const hasCurrent = exists(current);
  const hasLegacy = exists(legacy);
  if (hasCurrent && hasLegacy) throw new Error('Both .droidsembly and .cubefarm exist. Set DROIDSEMBLY_HOME (or SWARM_HOME) explicitly; no data was merged or moved.');
  return hasLegacy ? legacy : current;
}
