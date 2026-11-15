# Environment aliases and office-home selection — phase 2

Status: authorized implementation on a separate branch toward dev, not released
or installed in the real office. No data or credentials are moved/copied.

The user subsequently authorized commit, push and a draft PR toward dev for this
phase. Merge/release/live adoption remain separate decisions.

## Home selection

CLI, checkout launcher and server share `bin/environment.js`:

1. Explicit `DROIDSEMBLY_HOME` wins over `SWARM_HOME`, even if both are set.
   A blank explicit choice is rejected, not treated as a request to guess.
   Relative explicit paths resolve against the invoking working directory.
2. With no explicit choice, use an existing `~/.cubefarm` when it is the only
   existing default; this preserves the existing office and all its data in place.
3. If only `~/.droidsembly` exists, use it. If neither exists, select
   `~/.droidsembly` for a new office. Selection itself does not create a folder.
4. If both exist, refuse startup and ask for an explicit home. Never merge them,
   pick the newest, inspect token/state contents, or silently start a second office.
5. Permission/I/O errors, files and dangling symlinks at the candidate paths are
   not interpreted as absence. Valid directory symlinks may be used; both defaults
   still require explicit choice even if they lead to the same place.

The CLI/launcher pin the chosen absolute path under **both** home variables for
their children and restarts. CLI flags similarly override both generations of
the relevant inherited variable, preventing an old alias from undoing a flag.
Existing homes are used as-is: state, transcripts, backups, journal, sessions,
secrets and per-machine work stay in their existing location.

## Canonical aliases

| Canonical | Legacy (still accepted) |
| --- | --- |
| `DROIDSEMBLY_HOME` | `SWARM_HOME` |
| `DROIDSEMBLY_PORT` | `SWARM_PORT` |
| `DROIDSEMBLY_HOST` | `SWARM_HOST` |
| `DROIDSEMBLY_CLIENT_PORT` | `SWARM_CLIENT_PORT` |
| `DROIDSEMBLY_DEMO` | `SWARM_DEMO` |
| `DROIDSEMBLY_DEMO_FLOORS` / `DROIDSEMBLY_DEMO_AGENTS` | `SWARM_DEMO_FLOORS` / `SWARM_DEMO_AGENTS` |
| `DROIDSEMBLY_PREVIEW_PORT` | `SWARM_PREVIEW_PORT` |
| `DROIDSEMBLY_PR_PREVIEW_IDLE_MIN` | `SWARM_PR_PREVIEW_IDLE_MIN` |
| `DROIDSEMBLY_CLAUDE_TOKEN` | `CUBEFARM_CLAUDE_TOKEN` |
| `DROIDSEMBLY_OLLAMA_URL` | `CUBEFARM_OLLAMA_URL` |
| `DROIDSEMBLY_LMSTUDIO_URL` | `CUBEFARM_LMSTUDIO_URL` |
| `DROIDSEMBLY_LLAMACPP_URL` | `CUBEFARM_LLAMACPP_URL` |
| `DROIDSEMBLY_OMLX_URL` | `CUBEFARM_OMLX_URL` |

Canonical values take precedence when present, including empty strings. An empty
canonical token disables the legacy token fallback; an empty model-server URL
uses that provider's default URL, not the legacy override. Existing validation
and fallback rules for ports, hosts and minutes remain unchanged. The subscription
token still comes from environment only and is never persisted; redaction covers
both the effective token and shadowed legacy/canonical values.

Launcher flags (`DROIDSEMBLY_LAUNCHER` / `SWARM_LAUNCHER`, demo equivalent) retain
the existing IPC checks. They do not grant a standalone process launcher authority.
Provider-owned variables such as `GH_TOKEN`, `OPENAI_API_KEY` and Anthropic's own
names are **not** renamed. Generated callback/status/key-helper variables,
OpenCode session IDs, browser storage and Box filesystem/XDG paths are not changed
by phase 2; those protocol/storage identities remain phase 3 work.

## Safe adoption and rollback

- Existing users need not change environment/profile files. The old home and
  variable names remain supported. Do not create a second default directory just
  to rename branding.
- To select an office explicitly, set `DROIDSEMBLY_HOME` to its existing absolute
  folder. If the defaults conflict, review the two folders yourself and choose
  one; this version neither merges nor deletes either.
- For rollback to software that only knows legacy variables, stop the office
  cleanly and set **`SWARM_HOME` to the exact selected absolute folder**, including
  `.droidsembly` if that is the selected office. Use legacy port/host/token/URL
  names with the intended values as well. Do not rely on old software recognizing
  `DROIDSEMBLY_*` or defaulting to the new directory.
- Before any future deployment, back up the selected office offline and confirm
  no other process uses that home. No backup is automatically restored, and no
  profile files are edited by this change. No physical migration or rollback has
  been executed against the user's real office or Box.

## Validation history

- First targeted batch: **163 passed / 2 failed**, 165 tests in nine files,
  21.99 s. The two failures are 5 s deadlines in child-process integration cases
  (new/legacy default homes), not assertion mismatches. Report
  `ENV_HOME_TARGETED_1.json` retained locally. No deadlines increased or cases
  removed; cause not yet established.
- First typecheck failed because `officeSteps.d.mts` still declared the earlier
  two-argument home resolver. Updated the declaration to include the injected
  filesystem probe; no runtime behavior changed by that correction.
- Integration fixture now owns pending process promises before cleanup and keeps
  evidence on failure. One opt-in isolated timing trace passed **6/6**, 5.68 s
  overall (`ENV_HOME_INTEGRATION_TRACE_1.json`): source-server/launcher contract
  cases 791–969 ms, ambiguous CLI/launcher rejection 357–384 ms. This did not
  reproduce or establish the cause of the earlier timeouts. All original
  assertions/deadlines are unchanged; no cases removed or scheduler changed.
- Build (including the corrected typecheck) passed: client, 93 bundled license
  texts and server. Existing large-chunk/Rapier dynamic-import warnings retained.
  Installed-package smoke with deliberately conflicting canonical/legacy home and
  demo values **passed**: public CLI and wrapper, packaged helper, 93 licenses,
  isolated demo HTTP/client/state (two floors / 11 fake agents), no real state and
  no directory created at the shadowed legacy home. No Upstash/provider calls.
- Additional runtime regression batch **49/49 passed**, six files, **23.13 s**:
  CEO, state shutdown, cloud agents/login, analysis and OpenCode connections,
  report `ENV_HOME_RUNTIME_REGRESSION_1.json`. No full-suite result for this phase.
  Earlier full-suite failures remain documented, not reclassified.
