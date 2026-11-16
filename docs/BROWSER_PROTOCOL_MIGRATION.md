# Browser preferences and protocol names — phase 3

Status: authorized continuation on a separate branch from dev. Not integrated or
released; no existing browser profile, office home or Box was changed by tools.

After the bounded source-scan diagnosis, the user explicitly authorized commit,
push and a draft PR toward dev. Merge, release and live deployment remain separate
decisions; the failed local timing check stays documented.

## Preference keys

Office UI preferences now use `droidsembly:*` names through one compatibility
adapter (`client/src/preferences.ts`): view/mode, controls, accessibility,
graphics/audio, look/profile/presence, day time, replay, workers panel, games,
jukebox and seasonal state (including per-floor/suffixed keys).

- Reads accept legacy `cubefarm:*` and canonical names without writing anything,
  enumerating unrelated site storage or deleting/resetting data.
- Explicit user writes mirror both names, preserving already-open old tabs and
  rollback. Legacy keys are intentionally not removed.
- **During mixed-version compatibility, an existing legacy value wins**, including
  an empty string. Old clients can only write that key; canonical-first reads
  would ignore their later changes. A canonical-only value works when the legacy
  key is absent. This differs intentionally from environment alias precedence:
  storage has concurrent old writers, not just startup inputs.
- Existing parsers and normalization stay in each store; corrupt values still
  follow those stores' existing fallback rules. No merging of preference objects.
- Storage failures remain best effort/per visit. Each write is attempted
  independently; quota/privacy failures do not trigger deletion to free space.
  Mirroring is not atomic: if a legacy write fails while a stale legacy value
  remains, a later read can still see that value. No persistence guarantee is
  claimed for blocked/full storage.
- Accessibility and pet listeners accept both event names and storage-clear,
  reload through the adapter and suppress identical duplicate updates. No echo
  writes from event listeners. No automatic migration is performed on render.

The adapter covers application preferences only, not credentials or provider data.
The existing sessionStorage reload guard remains unchanged. Rollback needs no
preference conversion: mirrored legacy values remain readable by older clients.
Manual deletion of only one of a mirrored pair is not a supported reset procedure;
the app's reset controls write their defaults through the same adapter.

## Notifications, voice and app-shell cache

- New DOM notification navigation uses `droidsembly:open`; readers accept both it
  and `cubefarm:open`. A worker click emits **one** message, retaining its legacy
  type for already-open old pages and including canonical metadata. New pages
  normalize it to one canonical DOM event; no dual navigation dispatch.
- Desktop and server Web Push keep a shared **legacy notification tag** on
  purpose: it is a deduplication identity, not visible branding. Renaming it while
  old tabs remain could display the same notification twice. No subscription or
  VAPID-key migration.
- Voice claims use both `droidsembly:voice` and the legacy BroadcastChannel. Claims
  delivered twice are deduplicated by tab/timestamp; the existing election window
  and winner rules are unchanged. New/old tabs can still elect one speaker. A
  blocked channel does not prevent app startup; hot disposal closes both channels.
- New service-worker caches use `droidsembly-shell-<version>`. Activation cleans
  only obsolete shell caches in the two app namespaces, never preferences,
  credentials or unrelated caches. Asset lookup is scoped to the active version's
  own cache. This cleanup is normal app-shell replacement, not a data migration.

## Session branding and intentional compatibility contracts

New OpenCode sessions use `ses_droidsembly…`; a supplied resume ID is passed
unchanged for both legacy/current prefixes, including agent/CEO model variants.
The historical hidden OpenCode agent profile remains available on resume. Generated
plugin package branding and the Claude SDK client-app label now say Droidsembly.

Existing session IDs, provider IDs, callback plugin IDs/hooks, preview/sync wire
formats and Box filesystem/XDG paths remain compatibility contracts. They are
not globally substituted or rewritten. These require their own protocol-specific
transition if later changed; this branch does not claim every historical/internal
occurrence of cubefarm has disappeared. Upstream URLs and attribution stay intact.
No real AI session was started to validate this change.

## Validation

Initial typecheck passed before the added regression-test files. First targeted
batch **137/137 passed**, ten files, **8.63 s**, report
`BROWSER_PROTOCOL_TARGETED_1.json`: preference schemas/integrated stores,
mixed-version voice claims, worker cache/navigation, notification tags and
legacy/current OpenCode resumes. First full build/typecheck passed (client,
licenses, server), with existing large-chunk/Rapier dynamic-import warnings.
A subsequent guard prevents an already-deleted shell cache from being recreated
by a stale worker's asset lookup; a dedicated regression was added. Follow-up
PWA/protocol check **14/14 passed**, two files, **1.85 s**
(`BROWSER_PROTOCOL_CACHE_GUARD_1.json`); rebuild/typecheck then passed on the
updated source. Installed-package smoke passed: public CLI/wrapper, 93 bundled
licenses, isolated demo HTTP/client and saved state (two floors, 11 fake agents),
canonical environment precedence and no real state/shadowed home created.

Broader module regressions: **247 passed / 1 failed**, 13 files, **38.27 s**
(`BROWSER_PROTOCOL_REGRESSION_1.json`). The failing notifier client-source scan
completed in 8425.52 ms and exceeded its unchanged 5000 ms assertion. Its later
file-count/violation assertions were not reached; do not report that scan as fully
validated or attribute the delay to the host without diagnosis. No unchanged
rerun or budget relaxation followed. Other tests, including CEO, preserved Box
session-file contracts, themes, controls/audio/accessibility and game rules passed.

No full-suite result for this branch. Earlier negative
test evidence remains preserved; no deadline/assertion/workload reductions.
Storage/channels/worker behavior was exercised with fake browser primitives or VM
sandboxes, not a manual test of an existing user's profile or real mixed-version
tabs. Installed-package smoke will not by itself validate those browser scenarios.

### Authorized bounded source-scan diagnosis

After explicit user approval, added an optional test-only timing observer to the
existing scanner and a one-run diagnostic CLI. The notifier test, its 5000 ms
assertion, extension set, actual-file traversal, forbidden expression and symlink
guard are unchanged. The diagnostic reports counts/paths/timings, never contents,
and refuses to overwrite evidence files. No application code changed for this
diagnosis.

One isolated instrumented scan (`BROWSER_SOURCE_SCAN_DIAG_1.json`) checked
**595 actual files**, **0 policy violations**, **547.85 ms** total: enumeration
84.87 ms / selection 39.47 ms / reads 391.89 ms / expression checks 23.75 ms.
Slowest single file: 3.78 ms. CPU: 219000 user / 328000 system microseconds.
All three diagnostic conditions held (original 5 s budget, >20 files, no
violations). This is independent diagnostic evidence, **not** a replacement for
the failed regression test. The earlier 8425.52 ms was not reproduced and its
cause is not established; no optimization or budget/scheduler change is justified
by this one run.

Scanner/observer regression: **10/10 passed**, 1.73 s, including unchanged
extension/hidden/untracked coverage, forbidden expressions, fresh reads,
read-error/symlink fail-closed behavior and instrumented/uninstrumented result
equivalence. Report `BROWSER_SOURCE_SCAN_OBSERVER_TEST_1.json`. Typecheck after
this diagnostic addition passed. No further original notifier/full-suite
rerun was performed; original negative reports remain preserved.
