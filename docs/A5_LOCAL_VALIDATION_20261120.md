# A5 — local implementation and validation, 20 November 2026

**Implemented locally, not released. P11 remains incomplete: full suite and
ordinary clean-install package smoke are NON-PASS.** No push, PR, real issue,
CI, merge, tag, release, PC update, real model, Box, database or deployment.

## Revisions and safety

- Verified remote development base: `5d47c5029e31d73788fed271bf035ceea08467c1`.
  Both fetch and `ls-remote origin refs/heads/dev` agreed. Not the study's 7400fdb.
- Worktree: `ds-ceo-app-starter-20261120`; branch
  `feat/ceo-app-starter-20261120`.
- Implementation: `862d960ea409d2f990f3c8cbc9e7ac091d51cfc3`.
- Follow-up: `c138d62` binds a pending UI answer to the revision at typing time
  and preserves question/answer association when the scripted demo revises a plan.
  Its new regression retains environments and includes the amendment in task text.
- Original checkout's uncommitted `server/boxCli.ts`, `server/boxMachines.ts`,
  `server/swarm.ts` work is preserved. No live office, home or ports were used.
- Upstream reuse was not established. The manager explicitly authorized original
  instructions from A5 requirements instead. No upstream text is redistributed;
  [provenance](app-starter-provenance.md) records the exact source and 404 limits.

## PASS evidence

Local Windows, Node **v22.23.1**, Vitest **5.0.3**. Evidence directory:
`C:/Users/rosar/AppData/Local/Temp/opencode/ceo-app-starter-plan-20261120/`.

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
