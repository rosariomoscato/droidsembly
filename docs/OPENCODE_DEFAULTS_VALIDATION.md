# OpenCode defaults and interface copy — validation

Scope: propose OpenCode for new terminal offices, local/Box workers and the CEO;
do not impose a model/provider or change installed offices or cloud machines.
The Claude Agent SDK path remains Claude-only.

## Compatibility

- Persist `agentDefaultsVersion: 1` to distinguish new semantics from older saves.
- Older saves with missing/invalid office CLI retain Claude and its former model
  fallback. An older CEO with an implicit CLI becomes explicitly Claude, keeping
  its model/session; explicit tool/model choices are not replaced.
- A new CEO has OpenCode and an empty model. Clearing its CLI chooses OpenCode,
  independently of worker settings, including after restart.
- An older office without a CEO gets the former Claude CEO when loaded.
- Legacy session ownership still defaults to Claude; switching tools must not
  resume a session owned by another CLI.
- Defaults do not install tools, create Boxes or copy credentials. Compatibility,
  authentication and quota checks remain in place.

## Checks and evidence

1. Initial typecheck passed.
2. First targeted batch: **31/31 passed**, four files (CEO runtime, floor rows,
   Italian coverage and model selection). Report retained outside the checkout:
   `OPENCODE_DEFAULTS_TARGETED_1.json` in the local cleanup evidence directory.
3. Second targeted batch: **44 passed / 2 failed**, seven files. Report:
   `OPENCODE_DEFAULTS_TARGETED_2.json`. Two cloud sign-in tests implicitly used
   Claude-specific expectations (paste-code prompt and Anthropic key). Their
   hires now explicitly select Claude; assertions and time budgets are unchanged.
   OpenCode login retains its own test, now parameterized for both explicit and
   inherited tool choice.
4. The second batch also emitted `EPERM`/`ENOENT` state rename warnings from
   cloud-agent fixtures. Inspection found environment-based config isolation
   happened after demo imports could cache config; a second fixture mocked only
   HOME_DIR, not STATE_FILE/WORKSPACE_ROOT. Both now mock all three paths before
   imports. This addresses the observed shared-path setup, not every historical
   timing/cleanup failure. Subsequent checks are pending.

Earlier failures are not reclassified as passing. No timeout/assertion reductions,
real SDK session, live-office update, Box operation or release is part of this work.

The first build command (`npm run build`) was blocked before execution by the
Windows PowerShell script policy for `npm.ps1`. Running `npm.cmd run build`
uses the Windows command shim instead, without changing that policy.

`npm.cmd run build` completed successfully: typecheck, Vite client build,
license report and server bundle. Warnings: large chunks and ineffective dynamic
import for Rapier; no size budget or import configuration was changed.

One full suite run has been started on the updated code, with original test
selection, assertions, scheduling and deadlines. Report target:
`OPENCODE_DEFAULTS_FULL_1.json`. Its result is pending; do not infer success from
the earlier targeted checks or the build.

### Full suite result — not green

The single full run completed in **1138.17 s**: **3137 passed, 24 failed,
11 skipped**, 3172 tests; **281 files passed / 14 failed**. JSON report and full
console output are retained. The 11 skipped tests belong to the OpenCode Box
runtime suite whose import hook timed out (10 s).

Failures include child-process/Git/Bash timeouts, Box setup and command-tree
cleanup failures (including EBUSY and termination exit 128), journal and HTTP
timeouts, five workspace timeouts, a physics timeout, the scale test's existing
120 s deadline, and **three CEO tests timing out at 5 s** (two new default/migration
cases and the existing language/restart case). CEO tests also emitted a sample-day
warning after timeout. Do not classify these as harmless host load or proven
pre-existing failures without a controlled diagnosis. The candidate is not
validated for integration by this result.

Within this same full run, cloud sign-in **6/6**, cloud agents **5/5**, OpenCode
connections **8/8**, analysis **10/10**, interface translation coverage **4/4**,
and new sign-in/QA text tests **3/3** passed. CEO runtime: **12 passed / 3 failed**.
Thus the previously failing Claude-specific cloud cases now pass with explicit
Claude choices, while inherited and explicit OpenCode login are both exercised.
This does not negate the full-suite failure or prove that all fixture warnings
are resolved.

No unchanged full-suite retry, deadline increase, workload/assertion reduction,
commit/push/merge, release or live-office/Box change followed this run. Next step
is to agree a bounded diagnostic comparison, with special attention to the new
CEO tests and cross-test activity after a timeout.

### Authorized bounded CEO diagnosis

After the user authorized prompt diagnosis, one opt-in instrumented CEO-only run
completed **15/15 passed**, 17.24 s overall / 5.74 s tests. Initialization took
16.96–103.21 ms and shutdown calls up to 95.19 ms; no sample-day warning appeared.
Report `OPENCODE_CEO_TRACE_1.json` and shell trace are retained. This did not
reproduce the full-suite timeouts or establish their root cause. It is not a
replacement for the failed full suite or a baseline comparison.

Code inspection identified a concrete ownership gap: fixtureWork tracked clone
and onboarding children but not `init()` itself. If a test deadline expires while
init is pending, teardown can restore the journal spy/delete the home before init
settles, allowing later demo sample work. The fixture now tracks original init
and journalSample promises as well. A controlled gate test verifies that its drain
remains pending while initialization is held and settles after init is released.
This is a test-lifecycle correction, not a production runtime/default change,
and does not claim to fix host/process timeouts. Temporary trace instrumentation
has been removed; assertions, selection budgets and deadlines are unchanged.

Post-correction targeted validation (`OPENCODE_CEO_INIT_BARRIER_1.json`) and
typecheck are in progress. No further full-suite run has been started.

The post-correction typecheck passed. The targeted batch returned **53 passed /
1 failed plus one unhandled rejection**: the new gate test exposed a recursive
spy interaction when both the prototype and instance spied on init. Corrected
the fixture to call `work.track(swarm.init())` directly instead of installing an
init spy; its ownership guarantee stays the same. The gate is released and its
promises observed in finally, even on assertion failure. All application/runtime
and other fixture tests in the batch passed; the failed report is retained.
One validation of the changed fixture is running with the same eight files,
deadlines and assertions, report `OPENCODE_CEO_INIT_BARRIER_2.json`. Not an
unchanged retry; no new full suite or production code changes.

Final bounded check: **54/54 passed**, eight files, **21.22 s** overall,
including the deterministic init-barrier regression and all 16 CEO cases.
Report `OPENCODE_CEO_INIT_BARRIER_2.json`; no unhandled errors or state/sample-day
warnings were reported in this batch. Typecheck passed during this correction.
The failed full suite has not been rerun or reclassified. The bounded ownership
fix and targeted success do not establish the cause of its timeouts. No commit,
push, PR, merge, live deployment or release performed.

### Manual validation notice (subsequent user request)

Added the agreed informational notice in English and Italian below coding-agent
controls in office settings, agent/CEO setup and the console CEO tab. It describes
manual validation scope, not confirmed instability or whole-version test success;
it does not disable any tool. A shared component prevents wording drift.
Rendering tests cover both languages and the absence of alert/control markup;
translation coverage includes the new surface. Targeted UI checks and typecheck
were pending at that stage. The copy-only request did not itself authorize a PR.

Notice validation completed: **15/15 UI tests passed**, four files, **6.89 s**
(`OPENCODE_TEST_NOTICE_1.json`), and typecheck passed. No full suite or new build
was run for this copy-only addition; earlier full-suite failures remain recorded.

The user subsequently explicitly authorized commit, push and a **draft PR toward
dev**, with these validation limits and cross-platform CI pending. This does not
authorize merge, release or a live-office/Box update.
