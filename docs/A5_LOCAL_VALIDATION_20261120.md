# A5 — local implementation and validation, 20 November 2026

**P11 complete for local/demo acceptance on code bb1f10d, not released:
3569/3569 tests,318/318 files, ordinary typecheck/build and final fresh-install
package smoke PASS under the manager-approved validation conditions below.**
No push, PR, real issue,
CI, merge, tag, release, PC update, real model, Box, database or deployment.

## Subsequent guided-test UX fix: project creation feedback

The manager reported that Create project gave no perceptible confirmation.
The follow-up adds inline pending/error feedback, a persistent named success
confirmation with focus, explicit Create another project, and a direct action
to the newly created project's interview. A synchronous submission guard blocks
duplicate requests, without changing server approval/publication gates.

- `creation-feedback-tests-final.log`: **27/27 tests in4files PASS**, including
  bilingual/static notice rendering, i18n coverage and app-starter workflow gates.
  `creation-feedback-build-final.log`: ordinary typecheck/build/licenses **PASS**.
  **The full3569-test and installed-package results below refer to bb1f10d,
  before this UX change; neither was rerun for this follow-up.**
- Browser on isolated QA demo4438: deferred request displays the pending message
  and disables inputs/button; two additional form submits still produce just
  **1creation request**. Success persists with name, receives focus and removes
  the create-submit button until Create another project. Simulated network
  rejection produces an inline alert and preserves the entered name; a GET
  confirmed no project existed before the test explicitly retried.
- Multi-project browser test caught an intermediate bug: Phone's tab-sync effect
  discarded the requested project, reopening the first interview. Fixed by
  preserving repoId in that effect. After rebuilding/reloading, the success
  action correctly selected **demo-co/feedback-ui-final**, with3active project
  interviews, **0issues/0workers** on that project, no horizontal document
  overflow and no captured console errors. This failing intermediate observation
  is not omitted from the result.
- Screenshot/evidence: `creation-feedback-browser/success-notice.jpg`,
  `creation-feedback-browser/result.json`. QA tab and server4438 stopped.
  The manager's separate guided demo4439 remains intentionally available:
  bibliography project state preserved through the owned demo's time-limit
  restart; no second real GitHub creation was performed.

## Final full-suite result

- Final ordinary installed-package smoke **PASS**, exit0:
  `p11-smoke-bb1f10d-600s.log`. npm pack ran separately to retain the exact
  artifact; the ordinary smoke's supported tarball argument installed that
  artifact into a new directory with ordinary npm caching, **no reused
  node_modules/junction**. npm-init6252ms, npm-install102435ms. CLI/legacy help
  and version,93client-license texts, isolated demo server/client, baseline
 10workers, installed CEO skill loading and persistent scoped question verified;
  **0new-project issues/workers** before approval. Demo port53155, isolated home;
  successful temporary install/demo cleaned automatically. No provider was used.
  Retained artifact: `validated-bb1f10d/droidsembly-0.4.0-beta.5.tgz`, SHA256
  `4982e076b18d70a3fbfa4b6a604d75dd6d180b28a7be7861828fa127f418bee3`.
  Its `pack.json` / `contents-result.json` verify105packaged entries, required
  guides/skill included and private reports/browser files excluded.
- Code **bb1f10d**, `p11-full-segment-1200s.log` and `.jsonl`:
  **318/318 files,3569/3569 tests PASS**, exit0,541.02s. The immediate reporter
  contains318module-end records, no failed tests and a final end record.
  Unchanged walkways benchmark's5batches:
  `[3.6997,4.4465,3.2196,3.5754,3.2761]ms`, median **3.5754ms <8ms**.
- All historical failures below remain evidence. The successful full uses the
  manager-approved quiet phase for4additional complete files and1200s external
  budget; it is not a claim that the original parallel240s condition now passes.
  No internal timeout, test assertion, benchmark threshold/sampling, fixture
  workload or retry count was weakened. The new sample-coverage regression adds
  one test relative to the prior completed full.
- `p11-build-bb1f10d.log`: ordinary typecheck/Vite/client-license/server build
  **PASS** after that full. Packaging the exact rebuilt output separately allows
  the final ordinary smoke to install the retained tarball, not a reused
  dependency directory. The source-checkout dependencies remain the earlier
  validated identical-lock junction; no source `npm ci` PASS is claimed.
- P11 is closed **for this local/demo scope**, combining the explicitly
  revision-labelled prior desktop/mobile UI evidence with the final source
  full/build and exact installed-artifact smoke. The last source change preserves
  collision samples/path semantics; no fresh visual redesign is being certified.
  Remaining non-claims: actual LAN phones, a full accessibility audit, original
  parallel240s full conditions, source clean `npm ci`, Linux/macOS runs, real AI,
  Box/database/Docker/Neon/deployment integration, publication or release.

## P11 second follow-up (manager-authorized validation changes)

- The1200s quiet-home full **completed**, exit1, in568.82s:
  **317files PASS /1FAIL,3567tests PASS /1FAIL (3568total)**.
  All4moved files and CEO runtime passed. The sole remaining failure was the
  unchanged walkways performance check:15paths,5measured batches, median
  **8.3927ms**, required **<8ms**. Evidence:
  `p11-full-quiet-home-1200s.log` and `.jsonl`. This is not a timeout or a full PASS.
  No retries/sampling/threshold changes were applied.
- To address that demonstrated performance miss, `segmentClear` now enumerates
  only odd multiples at each coarse-to-fine stride instead of visiting and
  skipping even multiples with modulo. Deltas are computed once per segment.
  The exact sample positions, numerical operation order, collision checks,
  obstacle set and pathfinding algorithm are retained; no route caching or
  reduced test workload. A new regression places a thin obstacle at **every**
  sample across96segment lengths, including non-powers-of-two, supplementing
  the existing two-floor sampled-reference/tangency/boundary/path tests.
- The600s quiet-Git full still ended **NON-PASS / SIGTERM143**:
  `p11-full-quiet-git.log` and `.jsonl`,308module-end PASS records,
 1module-end FAIL,1failed-test record (homeIntegration's unchanged5s deadline).
  Functional phase ended and the quiet phase started; resumeReviewRegression
  passed in18.237s overall, including all3real-Git cases individually below15s.
  resumeDesk/boxDeskScript had not ended at interruption: do not claim that all
 3Git files passed this full. A conversational overstatement was corrected
  immediately; all3had passed only in the earlier104-test targeted selection.
- The manager then explicitly approved adding the complete homeIntegration file
  to the quiet phase and allowing up to1200s external full budget. All internal
  deadlines, assertions and fixture operations remain unchanged. This changes
  the concurrency of4files relative to the original base. Results of that run
  are recorded separately in `p11-full-quiet-home-1200s.log` and `.jsonl`.
- After `d8860ea`, another full used the original240s budget and unmodified
  concurrency. **NON-PASS / SIGTERM143**:302module-end PASS records,3FAIL and
 8failed-test records before termination (not a final suite summary).
  CEO runtime passed, including the previously failing directory assertion.
  Remaining failures were resumeDesk/resumeReviewRegression15s deadlines and
  boxDeskScript's fixture-command/cleanup error. Evidence:
  `p11-full-d8860ea.log` and `.jsonl`. This supports the shutdown correction;
  it does not prove that the remaining failures are harmless.
- The manager explicitly allowed up to600s external budget for an ordinary
  smoke. **PASS**: `p11-smoke-d8860ea-600s.log`.
  Ordinary npm pack/init/install into a fresh directory, **no dependency junction
  or node_modules reuse**. npm's ordinary download cache remains enabled.
  npm-install completed in113794ms, pack9453ms, init3715ms; the120s external
  limit would not cover even those three completed phases.
  Verified real installed CLI and legacy version/help,93bundled license texts,
  demo server/client/isolated canonical data-home behavior,10baseline workers,
  installed CEO resource loading and a persisted scoped question with
  **0new-project workers/issues**. Demo port62190, own temporary home;
  successful fixture was cleaned by the ordinary script. This is finally an
  ordinary installed-package PASS, not the earlier reused-dependency supplement.
- For the Git gap, the manager deferred to the recommendation after being
  offered unchanged-concurrency diagnosis versus the existing quiet phase.
  The chosen recommendation was explicitly announced before running:
  move only the3complete Git/bash files into the existing timing-sensitive
  project, **1worker for those files**, after all functional files; allow up
  to600s external full-run budget. This intentionally changes the concurrency
  condition and the external budget; it is **not equivalent** to passing the
  old parallel240s run. No test selection, fixture operations, assertions,
  internal command/test/hook deadlines or retries were weakened.
  Config regressions retain full-file coverage/exactly-once partitioning and
  unchanged functional-worker configuration. The original failures are retained.

## P11 follow-up diagnosis (after e01e502)

- Commit `a6e79a8` adds package-smoke phase boundaries and opt-in npm timing.
  Commands, dependency choices, assertions and budgets are unchanged.
  Pure regressions cover intent-before-operation, unchanged results, errors and
  exclusion of command/output/credential values from the phase trace.
- One diagnostic full run used the original **240 s** external budget, unchanged
  workers, load, test deadlines and scheduling. An external reporter wrote failure
  stacks immediately; its synthetic preflight passed. Evidence:
  `p11-full-a6e79a8.log` and `p11-full-a6e79a8.jsonl`.
  **NON-PASS / SIGTERM143**, not a final suite summary: 303 module-end PASS records,
  2 module-end FAIL records, 4 failed test records before termination.
  CEO runtime failed its pre-inventory assertion that the CEO directory is
  absent. Three resumeDesk cases exceeded their unchanged **15 s** deadlines.
  resumeReviewRegression, boxDeskScript and homeIntegration ended PASS in this
  run; their historical failures remain preserved.
- Static inspection found `schedule()` had no shutdown check, including in
  `origin/dev`: queued timers could schedule CEO/worker work after the office was
  closed. A minimal early-return guard and deterministic stopped-callback
  regression were added. This is a concrete lifecycle defect consistent with
  fixture contamination, not proof that it explains every full-suite failure.
  The Git fixture files themselves are unchanged from `origin/dev`.
- One ordinary smoke run with phase/timing diagnostics used the original
  **120 s** external budget: **NON-PASS / SIGTERM143**. Pack completed in7415ms,
  npm-init in3985ms; the unfinished phase is **npm-install**. No demo was started.
  Sanitized npm evidence: 128 HTTP200 fetches, slowest84313ms, no observed
  EAI_AGAIN/ENOTFOUND/ECONNRESET/ETIMEDOUT/ECONNREFUSED/FETCH_ERROR/integrity/
  HTTP401/403/404 error code, no lifecycle starts or successful install exit.
  This localizes the blocker to dependency retrieval/resolution, not an app-start
  failure, but does not certify installability or exclude later install errors.
  Evidence: `p11-smoke-a6e79a8.log`, `p11-smoke-sanitized.json`; retained fixture
  `C:/Users/rosar/AppData/Local/Temp/droidsembly-package-LgOWcd`.
  Raw npm diagnostic logs stay local and are not published.
- No further full/smoke retry merely to obtain green; P11 remains open until an
  ordinary full run and clean install/package smoke actually finish successfully.
  After the scheduler guard, the targeted diagnostic selection passed
  **104/104 tests in8files** in53.67s: all5previously failing file names,
  appStarter/appStarterWorkflow and the3smoke trace regressions.
  Evidence: `p11-targeted-shutdown.log`. This is not a full-suite PASS and does
  not establish that the Git deadlines will hold under full load.
  The previous134-test result and tarball refer to9fc5825, before this server
  change. No new installed-artifact runtime PASS is claimed.
  Ordinary typecheck/client/licenses/server build also passed after the guard:
  `p11-build-shutdown.log`. No new full run was performed after this fix.

## Revisions and safety

- Verified remote development base: `5d47c5029e31d73788fed271bf035ceea08467c1`.
  Both fetch and `ls-remote origin refs/heads/dev` agreed. Not the study's 7400fdb.
- Worktree: `ds-ceo-app-starter-20261120`; branch
  `feat/ceo-app-starter-20261120`.
- Implementation: `862d960ea409d2f990f3c8cbc9e7ac091d51cfc3`.
- Follow-up: `c138d62` binds a pending UI answer to the revision at typing time
  and preserves question/answer association when the scripted demo revises a plan.
  Its new regression retains environments and includes the amendment in task text.
- Final client-only follow-up: `9fc5825`, with the existing project's fallback
  pattern for transport IDs when a LAN HTTP browser lacks/refuses secure-context
  `crypto.randomUUID`. Three pure regressions cover native, absent and refusing
  implementations. This ID is not authentication. The browser captures below
  refer to c138d62; this final change affects ID generation, not the shown UI.
- Original checkout's uncommitted `server/boxCli.ts`, `server/boxMachines.ts`,
  `server/swarm.ts` work is preserved. No live office, home or ports were used.
- Upstream reuse was not established. The manager explicitly authorized original
  instructions from A5 requirements instead. No upstream text is redistributed;
  [provenance](app-starter-provenance.md) records the exact source and 404 limits.

## PASS evidence

Local Windows, Node **v22.23.1**, Vitest **5.0.3**. Evidence directory:
`C:/Users/rosar/AppData/Local/Temp/opencode/ceo-app-starter-plan-20261120/`.

- **Final code9fc5825:** `targeted-9fc5825.log`, **134/134 tests in7 files**;
  `build-9fc5825.log`, ordinary typecheck/Vite/licenses/server build **PASS**.
  No full-suite retry. Final tarball in `final-artifact/`, SHA-256
  `0d7445c06216b7edc6a087ab80c869873132bcc71afa98ac9a60e043fa45a848`.
  `final-artifact/contents-result.json`: **95 packaged files** compared to the
  build/guides, private browser/report files excluded. Server and skill are
  **byte-identical** to the c138d62 installed runtime already exercised below.
  The final client ID fallback has three additional regressions; this does not
  turn the earlier full/clean-install failures into successes.
  The extracted final tarball was also served in demo on **4439**, preview9570,
  with validated reused dependencies and its own `final-ui-home`. Baseline
  **10 workers** retained. A 390×844 browser test temporarily simulated the
  optional UUID method being unavailable: sending an answer returned200 with a
  fallback `message-…` ID, persisted the answer and advanced to the next CEO
  question; the new project still had **0 issues / 0 workers**, with no horizontal
  overflow. See `final-artifact/browser-artifacts/ui-lan-fallback-9fc5825.json`,
  `ui-mobile-final-9fc5825.png`, and its empty error-console capture.
  This is a browser API-availability simulation, not a real LAN phone
  certification or a clean install. The extracted demo and owned browser were
  stopped; no demo listener remains on4437/4438/4439.
- `targeted-c138d62.log`: **131/131 tests, 6 files**, app-starter pure/state/remote
  publication and integrated workflow tests, CEO tools/asks/demo and all 16 CEO
  runtime tests. Includes SDK Claude / terminal Claude / terminal OpenCode
  instruction contracts with scripted sessions, not actual providers.
- `build-c138d62.log`: ordinary build **PASS**, including typecheck, Vite,
  **93 client license texts**, server bundle and copied original planning resource.
  Existing large-chunk warning retained, not suppressed.
- `pack-c138d62.json`: local tarball, version metadata unchanged (beta.5, not a
  new release). SHA-256:
  `aa412a10cc41f58a647f840afbfcad418a27176f4d185c8b04230362a54b4645`.
- Supplemental **installed artifact runtime** check:
  `installed-reused-result.json` / `installed-reused.log`.
  npm had unpacked the exact package but did not complete its command. After
  verifying no owned installer remained, the check supplied a junction to the
  already validated, lock-identical dependencies. Installed server/client/skill
  bytes match the built artifacts; CLI version/help, guide/provenance files,
  served client, isolated state and conditional skill loading worked.
  The normal baseline demo load was retained (**10 workers**, not reduced).
  A new guided app persisted its first CEO question with **zero** project workers
  and issues. The child server was stopped. This is **not clean-install PASS**,
  not PASS of the official smoke's unexecuted assertions.

### Real browser, synthetic backend only

Built `c138d62` served on **4437**, preview range **9530**, isolated `demo-home`.
The startup banner explicitly says `DEMO MODE`; no real external services.

- Desktop 1440×960: initial Create project flow (empty brief allowed), full plan,
  explicit approval and card in the manager console / phone.
- Mobile Pocket 390×844: full document and every task scrollable; approval below
  the document, disabled until both explicit confirmations. Page width390,
  planning scroll width375/client width375: no horizontal overflow observed.
- Persisted interview and presented plan survived a **process restart**.
- Simulated second-tab edit changed revision20→21 while text was already typed.
  Sending the pending old-revision answer returned **409**, preserved the text and
  created no issues. Explicitly editing and resending produced revised plan23,
  preserving worker/test/data decisions and including the author-filter amendment.
- Before approval: **0 workers / 0 issues**, auto-assign and auto-merge on.
  Approved revision23 / fingerprint
  `1e0f0994c8fb7e8646e06e5c9a3a1a53fd45596c9bcb20765b89311409d86286`.
  Exactly two tasks confirmed in the ledger, issue2 depending on issue1.
  Local worker then entered normal preparation/build. No provider was called.
- The foundation went through normal build → QA → merged PR3; issue2 started
  only after that dependency was resolved. Auto-merge was then explicitly turned
  off in the synthetic scenario to exercise normal manager-requested fixes.
  PR4 passed QA1; one synthetic manager fix request returned200, then normal
  fixing → queued → testing → **QA2 passed**. PR4 remained **OPEN**, auto-assign
  on and auto-merge off. See `ui-fix-final-c138d62.json` in the retained browser
  artifacts. These are simulated verdicts, not41 real worker tests.
- Basic keyboard focus on confirmation controls checked. No full accessibility
  audit, native notification focus certification or real touch device certification.
- Desktop WebGL warnings were retained. Mobile console's deliberate stale
  request produced the expected409 resource error, not an unexplained UI error.
  One desktop click attempt was intercepted by the pointer-locked canvas; using
  the documented Esc/P controls proceeded. No force-click/security bypass.

Screenshots:
`ui-mobile-plan-c138d62.png`, `ui-mobile-approval-c138d62.png`,
`ui-desktop-console-plan-c138d62.png`,
`ui-desktop-console-approval-c138d62.png`, `ui-desktop-published-c138d62.png`.
Playwright snapshots and HTTP/workflow observations are retained separately;
screenshots are not evidence of real database/provider behavior.

## NON-PASS and limits retained

1. `npm-ci.log`: PowerShell selected npm.ps1 and execution policy refused it.
   No policy was changed. `npm-ci-cmd.log`: npm.cmd ci exceeded120s without
   output. No increased timeout or unchanged retry. Partial dependencies archived.
2. Dependencies were reused from `ds-ceo-asks-fixture-20261118` only after exact
   lock SHA-256 equality:
   `9f10a5bb04a99c11cc8035f89ef7c092201272d9caa988eff25262c6ffd68bbd`.
   Do not call this a new successful clean install.
3. `targeted-01.log`: two new fixture failures (missing fake cloud key and
   teardown). `targeted-02.log`: xterm teardown failure retained. The fixture now
   drains owned work, leaves fake time, then allows shutdown's **new** terminal
   flush to run on real timers. No timeout/assertion/load/worker reduction.
   `build-02.log`: missing opts argument in a new test; corrected.
4. `full-862d960.log`: **NON-PASS**, stopped at the original external240s budget.
   **12 failures reported** across `server/ceoRuntime.test.ts` (1),
   `server/resumeReviewRegression.test.ts` (2), `server/boxDeskScript.test.ts` (1),
   `scripts/homeIntegration.test.ts` (2), `server/resumeDesk.test.ts` (6).
   No final summary/stacks; do not invent a complete count, cause or a PASS of
   the uncompleted functional/timing-sensitive phases. No unchanged full retry.
   The later16/16 targeted CEO runtime PASS does **not erase** its full-run FAIL.
   Final follow-up changes UI answer binding / demo revision handling, not a
   claimed correction of those full-run failures. Full on the final follow-up is
   not certified.
5. `smoke-c138d62.log`: official package smoke stopped at120s without output;
   **NON-PASS**, no timeout increase or identical retry. Package directory retained
   at `droidsembly-package-NYqTSL`; supplemental reuse check above is distinct.
6. Ambiguous remote creation with zero/multiple/mismatched marker matches stays
   paused; this version has no blind “create again” override. It cannot promise
   distributed exactly-once. External edits after verification remain possible.
7. Secret-paste detection is heuristic. Worker instructions are not a security
   sandbox; no global tool permission rules were introduced. Actual databases,
   Docker, Neon, AI providers and Boxes were not certified.

WPR remains archived. #86, its FAILs and all previous acceptance boundaries remain
separate. This report does not authorize publication or change their status.
