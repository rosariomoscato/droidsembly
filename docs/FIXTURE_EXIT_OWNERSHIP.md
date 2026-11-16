# Fixture process exit/close boundary — local test-only correction

Status: revised locally after explicit authorization of separate shutdown budgets;
**typecheck, 33/33 targeted tests across seven complete files and native
detached-pipe check PASS**. Local/uncommitted; no CI or full-suite acceptance claimed.
Previous regression failure retained. No commit/push/PR. Branch
`fix/fixture-exit-ownership`, base dev `93fdcc3`, isolated checkout. Application
runtime, real Boxes, user office/profile and dependencies remain unchanged.

## Demonstrated mechanism and limits

A controlled Windows scenario used the unchanged helper. The root exited0 after
518.938 ms, but a detached child held inherited pipes, delaying close. The helper
requested taskkill for the already-exited root at 10047.140 ms. The diagnostic
intercepted that request: **no real kill of an expired/reusable PID was allowed**.
An owned synthetic process supplied explicit exit128, then the detached child
was stopped via its private nonce file. Errors remained aggregated, not PASS.

This demonstrates a stale-root request, **not** the cause of the earlier real
taskkill128 or slow preparation. The earlier complete diagnostic remained failed
3273 PASS / 5 FAIL. Original failures and failed/inconclusive probes are retained
outside the checkout. Beta.5 is still draft/blocked.

## Intended correction

- Check observed exit and ChildProcess exitCode/signalCode before requesting
  PID/group termination. Do not interpret root exit0 as proof all children stopped.
- Preserve the original primary timeout and every known termination failure,
  including128, in causal order.
- After the initial failed design, the user explicitly approved separate bounds:
  **5000 ms for termination**, then **1000 ms for inherited-pipe drain** only
  after termination succeeds. The former one-second combined bound is rejected.
  The primary command limit remains supplied by the caller (10000 ms in Box
  preparation); existing case limits, workload, Git commands and assertions stay.
- On an unverifiable shutdown, fail closed: release local pipe handles, explicitly
  report descendant shutdown unverified and settle without waiting forever.
  A best-effort fallback may use only still-owned ChildProcess handles, never
  a new PID lookup/kill of a known-exited root. This does not certify descendants.
- A Node pre-spawn lifetime check is not an OS-atomic Windows Job ownership
  guarantee: exit can race an external killer. Do not claim every PID-reuse race
  or arbitrary detached descendant is solved by this test helper.

## Validation plan

First run a new deterministic stale-root assertion against the old helper (RED),
then implement the guard and run complete new fake-process regressions plus the
existing fixture process/cleanup and real-local-Git Box script test files. No
full-suite retry, live provider/Box, increased primary limit or weakened existing
assertion. Fake processes prevent tests from issuing any real arbitrary PID kill.
Keep every RED/failed report under `b5-exit-fix-20261116` evidence.

The earlier browser/naming documentation and CLI parser work remain uncommitted
in their separate worktree; they are not copied into this patch.

## Observed validation so far

- Deterministic RED on unchanged helper: stale-root case **1 FAIL / 7 filtered
  out**, expected spawn count1 but observed2 (root plus forbidden taskkill).
  Filtering was only the pre-fix negative proof, not skipped coverage claimed green.
  Report: `b5-exit-fix-20261116/red.json`.
- Typecheck after implementation: **PASS**.
- Complete files verified once: `fixtureProcessExit.test.ts`
  (all eight new cases), existing `fixtureProcess.test.ts`, `fixtureCleanup.test.ts`
  and `server/boxDeskScript.test.ts`. Report: `targeted.json` in the same
  new evidence directory. Test and typecheck were launched concurrently; this is
  recorded rather than attributing any possible timing failure to host load.
- No full suite, dependency installation, build or real-provider operation run.

## Targeted result: 17 PASS / 1 FAIL, 4 files, exit1

- All eight new fake-process exit/close regressions PASS.
- Existing cleanup file5/5 PASS and real-Git Box desk script2/2 PASS. The successful
  QA-reuse case was27.673 s under its unchanged30 s bound; not a general performance
  fix or proof the prior preparation timeout is solved.
- Existing fixtureProcess2/3 PASS. Its real owned-child timeout test FAILED:
  the new1000 ms termination/drain bound expired while real termination was
  still incomplete. Returned AggregateError preserves the original ETIMEDOUT plus
  `Fixture termination or stream drain exceeded 1000 ms; descendant shutdown
  remains unverified`. Cleanup then failed EBUSY for the held synthetic cwd;
  both errors are retained by the cleanup wrapper. One failed test, two reported
  errors, not two independent failed tests.

This identifies a problem in the proposed bounded-shutdown design: aborting the
owned killer/root when that short grace expires can prevent completion of tree
termination. It cannot be waved away as a timing-only host issue. Do not increase
the bound, weaken the existing error assertion, ignore128, retry unchanged or
claim the entire patch is validated because fake-process tests passed.

The failed synthetic fixture `cubefarm-owned-tree-8J3Jdl` remains preserved;
no repeated delete or unknown-PID termination was performed. Its child script has
the original20 s failsafe, unchanged. No stale-PID real kill was used by the new
deterministic cases (all process handles mocked).

Next design work must separate releasing the caller's pipe handles from ownership
of in-progress tree termination, without cancelling cleanup prematurely or
claiming descendants stopped before verification. A pre-spawn exit guard alone
is insufficient to guarantee Windows job/process ownership. This requires review
before further runtime changes, not a release-gate waiver. No new tests after the
failure, except reading the retained result; no full-suite retry.

## Authorized revision of the newly introduced shutdown budget

User explicitly accepted the proposal: original command10000 ms and case30000 ms
unchanged, external termination at most5000 ms, then pipe drain at most1000 ms.
This is an authorized revision of the patch's added budget, **not** a silent
increase to make the first failure green. Original targeted.json and RED retained.

Separate termination/drain timers replace the erroneous combined timer. A killer
still running during its allowed termination phase is not aborted by the pipe
drain timer. Nonzero128, missing close, stalled termination and unverifiable
descendants remain errors. Extra deterministic Windows-state regressions cover
a1250 ms killer followed by timely drain, and expiry of the independent drain.
These use mock processes even when run on another OS; no real arbitrary PID kill.

New validation: typecheck first, then the same four complete test files with all
ten new fake-process cases and unchanged existing tests. No concurrent compiler
load in this run. New report `targeted-v2.json`; no full suite or release action.
Result pending.

Revised result: **typecheck PASS; 20/20 tests PASS across all four complete files,
zero skips**,16.94 s. Existing real-child termination case10.705 s and real-Git
QA reuse13.899 s passed under unchanged command/case limits. New fake-process
regressions10/10 PASS. This validates the revised phase separation locally,
not the cause of previous Git slowness/real128 or release readiness.

Final single native Windows check in `b5-exit-native-20261116` exercises actual
parent exit and detached child holding inherited pipes against the patched
helper. Every taskkill attempt is blocked and fails the probe; no synthetic128
is supplied to satisfy a passing assertion. Expected helper outcome is the
original timeout plus explicit descendant-unverified error, not success. The
nonce-owned child must be alive at helper return, then acknowledge private stop
and be absent within the existing1000 ms acknowledgement bound. Result pending.

Native result **PASS**: root exited0 at1290.838 ms; helper returned at10554.396 ms
with original ETIMEDOUT plus explicit descendant-unverified error; **zero killer
requests**. Detached child was genuinely alive at return, acknowledged nonce stop
and was absent by10608.314 ms. Empty owned cwd removed once, no retries. No fake
128 supplied and no arbitrary PID termination executed. This verifies the narrow
guard on actual Windows pipes, not OS-atomic ownership or the old real128 cause.

Import review found only test consumers, no production-runtime import. Three
additional complete direct-caller files now being checked once:
`boxSetupShell.test.ts`, `cliEntry.test.ts`, `homeIntegration.test.ts`, keeping
their existing4000/10000 ms command bounds and case limits. New report
`other-callers.json`. No changes after targeted/native validation except docs.

Final direct-caller result: **13/13 PASS, three complete files, zero skips**,10.53 s.
Combined with the earlier20/20, all seven selected complete files passed without
changing existing assertions, case limits or primary command bounds. No source
changes between those two batches. Typecheck passed on this implementation.

## Outcome and remaining boundaries

Locally verified narrow fix: known-exited root is not targeted, timeout/cleanup
errors remain visible, external termination and pipe draining have independently
bounded phases. Previous RED and failed17/18 are retained, not reclassified.
The newly added termination budget was changed only after explicit authorization.

Remaining: no OS-atomic Windows Job guarantee; external killer launch can still
race an exit after its lifetime check. Unverified descendants produce failure,
not claimed successful cleanup. No proof of the original real128/Git slowness
cause or resolution of other failed beta.5 gates. No full suite, CI, build,
package validation, commit, push, PR, merge, release or live-office update.
