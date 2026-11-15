# Technical name alignment — inventory and proposed compatibility plan

Status: the user approved **phase 1 only** (new Box identity and CLI entry,
legacy compatibility). Implemented on a separate branch toward dev; the user
subsequently authorized commit, push and a draft PR for this phase only. Not yet
integrated or released. No live resource/data migration performed.

## Boundaries found on dev

| Surface | Current contract | Safe treatment |
| --- | --- | --- |
| Package / public CLI | Package and public command already `droidsembly`; entry file remains `bin/cubefarm.js` | Rename canonical entry with an explicit compatibility wrapper; update package/smoke/build metadata together |
| Box names and ownership | `cubefarm-<office>-<machine>`, labels `cubefarm`, `cf:<office>`, `m:<machine>` in `server/cloud.ts` | New names under Droidsembly; recognize complete legacy and new ownership schemas without broadening scope across offices |
| Destructive Box cleanup | Inventory and orphan deletion filter legacy labels independently | Share a strict ownership predicate; test mixed accounts, foreign offices, malformed labels, referenced legacy IDs and orphans |
| Local office home | `~/.cubefarm` in `server/config.ts`, launcher home in `scripts/officeSteps.mjs` | Never move/merge a live home implicitly; agree on new-office default and legacy selection/conflict behavior before changing either reader |
| Box files / auth | `/workspace/home/.cubefarm` in `server/boxScripts.ts`, session records, XDG auth directories and helper paths | Treat as persistent storage/session identity, not branding; no credential copy or automatic move |
| Environment | `SWARM_*` plus `CUBEFARM_CLAUDE_TOKEN`, local model URL and callback/status variables | Add canonical aliases with defined precedence, retain legacy consumers and generated hooks; no secret values in diagnostics |
| Session identifiers | OpenCode session prefixes, legacy agent names, callback plugin IDs in `server/clis.ts` / `server/cliRunner.ts` | Preserve ability to resume old sessions; separate new identifiers from protocol compatibility |
| Browser data / PWA | `cubefarm:*` localStorage, events, notification tags and preview checks | Maintain settings and cross-tab/service-worker compatibility; do not clear/reset saved data or duplicate notifications |
| History | Upstream links, attribution, old changelog entries, fixtures, backups and evidence | Not targets of a blanket replacement |

## Recommended delivery order

1. Cloud identity and command entry naming, with dual recognition of legacy
   resources and tests guarding all cleanup/destructive boundaries. Preserve
   storage, sessions, credentials and existing Box names/tags as-is.
2. Environment aliases and new-office home selection, shared by launcher/server,
   with explicit handling when both old/new homes exist. Legacy home reuse is not
   physical migration; a later physical move needs separate offline procedure,
   backup, rollback and approval.
3. Browser/session/internal path transition only with per-contract compatibility
   rules. Do not change every occurrence of the old name at once.

## Phase 1 implementation and rollback

- New Boxes: `droidsembly-<office>-<machine>`, with `droidsembly`/`ds:<office>`
  canonical ownership and `m:<machine>`. Also write `cubefarm`/`cf:<office>`
  compatibility labels, staying within five labels of at most 20 characters.
  Older software can therefore rediscover new Boxes after rollback; no global
  account retagging or renaming is required.
- Recognize complete legacy, current-only and dual schemas with one unambiguous
  office and machine. Reject conflicting office claims, missing counterparts,
  duplicate office/machine labels and malformed machine labels. Account total
  still includes all resources for the plan limit, even those not owned.
- Use the same ownership parser for discovery, listing, counting and orphan
  cleanup. Recheck current office/machine ownership before each orphan deletion.
  Ambiguous/unlabelled Boxes are left untouched, not classified as safe orphans.
- Existing Box IDs/names/labels are reused, not recreated. No changes to Box
  paths, logins, session IDs, XDG data, local home, tokens or environment names.
- Public CLI points to `bin/droidsembly.js`; `bin/cubefarm.js` forwards to it,
  preserving arguments/output/exit status. Both ship in the package. Existing
  launcher copies can still invoke the old path; the current checkout launcher
  uses the canonical entry. Package/version/dependency versions unchanged.
- Rollback: use the prior app version/checkout against the same office home,
  never a parallel process against that home. Both generations recognize legacy
  and dual-labelled resources. No file/state/credential restoration or movement
  is required by phase 1. Current-only labels are accepted for forward
  compatibility but are **not** emitted by this implementation, since older
  software would not recognize them. No rollback executed against the real office.

## Validation

- First targeted batch: **96/96 passed**, six files (cloud schemas, Box discovery
  and removal, CLI entries, distribution, launcher options), **13.26 s**.
- Typecheck and full build passed (client/licenses/server); existing large-chunk
  and ineffective Rapier dynamic-import warnings retained. Installed-tarball smoke
  test passed: public CLI, both entry files/wrapper output, 93 bundled license texts,
  isolated demo HTTP/client and saved state (two floors, 11 agents). No real state
  file created. No full-suite result for this branch yet. Earlier local full-suite failures from the preceding task are
  not reclassified as passing.
- CLI tests execute both entries with help/version/invalid arguments and verify
  matching output/status and no office-home writes. Box tests use fake adapters,
  including genuine legacy/current/dual records and foreign/ambiguous resources;
  they do not contact Upstash or start AI sessions.

Reports retained locally as `TECHNICAL_NAME_TARGETED_1.json`; no secret values
are included here. No timeout/assertion/workload relaxation, installed-office
update, live Box operation or credential read/copy. Commit/push/draft PR preparation
was subsequently authorized; merge and release remain separate decisions.

## Subsequent phase 2 work

Phase 1 was merged into dev separately. The user then approved environment aliases
and safe home selection on another branch, without physical data migration. See
[ENV_HOME_MIGRATION.md](ENV_HOME_MIGRATION.md) for that implementation and its
validation status. Phase 3 browser/session/internal-path contracts remain deferred.
