# Protected launcher probe: process ownership and diagnostic boundary

The post-merge CI for PR #81 (`44068325618`, main `668d25b`) failed on
Windows Node24: 3464 tests passed and one failed. The protected launcher probe
reported `ETIMEDOUT` after4008ms with no output or recognized milestone.
Windows Node22 passed the same scenario in2669ms on a different runner. The
merge tree matched reviewed dev exactly; neither result establishes a Node,
OS, scanner, PowerShell parser or launcher root cause.

## Test-only correction

The protected PowerShell probe now awaits the existing owned-process fixture
helper instead of `spawnSync`. This closes a separate concrete gap: stopping
only the PowerShell root does not establish that its local Node descendants
have stopped. The helper retains a deadline failure, attempts bounded tree
termination, and reports cleanup uncertainty as failure rather than success.
The fixture's teardown awaits that boundary before removing its directory,
including when Vitest's unchanged case deadline expires during termination.

The command deadline remains **4000ms**, including spawn setup. Process-tree
termination and stream drain use the helper's existing separate bounds, only
after a command has already failed; they are not extra execution time in which
the test can pass. No retry, shell warm-up, extra startup allowance, scheduling
change or assertion reduction is introduced.

The helper also rejects a close observed after the command deadline even when
the timer callback has not yet been delivered. That path preserves the observed
exit status for diagnosis but returns ETIMEDOUT and never issues a PID-based
kill against the already exited root. Two deterministic clock/event regressions
fail against the original helper and pass against the corrected boundary:
late close before timer delivery, and spawn setup counted within the deadline.

The actual launcher, local child and loader, synthetic protected input,
preflight, failure exit1, disposal milestone, acknowledgement and secret-output
checks are preserved. There are no production launcher/runtime changes and no
real provider, credentials, Box or office involved.

## Observability

The fixture helper records bounded monotonic offsets for the Node child
`spawn` event, first stdout/stderr chunks, exit and close. A null spawn offset
distinguishes a child that never emitted that event from one that spawned but
produced no output. This does **not** measure when PowerShell finished loading
or prove that an unobserved script instruction did not execute.
The legacy outer `spawnMs` diagnostic remains end-to-end elapsed time and may
include failed-command cleanup; `observation.spawnMs` is the spawn-event offset.
Cleanup time never converts an expired command into a passing scenario.

On CI, an explicit diagnostic directory receives only `safe-diagnostics.json`:
fixed labels, safe error categories, booleans, counts and bounded durations.
Failure-only artifact steps for Windows Node24 and Node22 upload that exact
file for14days. They never upload raw streams, scripts, synthetic-result.json,
credentials, arbitrary environment values or an entire SWARM_HOME. An explicit
workspace location avoids assuming RUNNER_TEMP equals Node's os.tmpdir().

## Interpretation

An original local probe passed on its first run; there was no local reproduction
of the historical empty-startup failure. A green run of this candidate can
validate this process boundary and scenario on that runner, not prove that all
historical PowerShell startup timeouts have been cured. The original negative
CI, its4000ms limit and the unresolved root-cause boundary remain evidence.

Initial local full-suite validation of the first diagnostic candidate did not
complete within its external240s command bound and reported one stale exact
result-shape assertion. The additive observation fields are now expected
explicitly without dropping any previous output/status/error verification.
That incomplete run remains negative evidence, not a completed suite result.

A second full local suite on the corrected source also reached the unchanged
external240s bound. It showed a failure in the unmodified resumeDesk branch-held
case (15738ms, existing15000ms case limit) before the suite's final diagnostics
could be emitted. That duration alone does not establish its failure cause.
No third local full-suite attempt or budget/worker adjustment is planned.
Focused validation passed42/42cases across six files; ordinary typecheck and
build passed. A separate ordinary branch CI run is the next independent
environment check, not a claim that either incomplete local run passed.

## Subsequent observed diagnosis and delivery boundary

The branch CI `44072727543`, attempt1, passed all five environments on
`b366dba`: ordinary typecheck, complete tests, build and installed-package demo
smoke. Windows Node24 and Node22 each passed3468/3468tests across311files.
This is separate evidence, not a retroactive local full-suite PASS.

Two subsequent authorized full-suite diagnoses kept all311modules, existing
concurrency and deadlines, and the same external240s bound. Neither completed.
Immediate reporter diagnostics identified the existing15000ms case timeout in
resumeDesk's branch-held case. The main coordinator remained responsive;
workspace tests were still progressing in the functional phase when stopped.
The timing-sensitive phase, including the launcher, had not yet started.

The final full diagnosis additionally traced only Git calls in synthetic
resume-desk repositories, without recording argv, refs, streams or full paths.
In the failed case, fixture/holder setup and the initial snapshot used about
10.7s. resumeDesk then issued its expected worktree refusal (exit128) at14.18s.
The deadline was crossed by the final preservation snapshot's status command,
which ran from14.743s to15.522s. A subsequent diff began after the deadline;
its completion was not observed. Final preservation assertions were therefore
not completed or certified. No completed individual Git command took2s: the
budget was consumed by an accumulated sequence, not one15s stalled command.

The seven unchanged cases passed in a separate isolated diagnosis, but that
does not substitute for full-load verification. These observations locate the
local failure boundary; they do not identify an OS/I/O cause or cure the old
PowerShell empty-startup failure. No further unchanged retry, timeout increase,
worker reduction or removal of assertions is part of this delivery.

The owner explicitly authorized opening a **draft PR only**, with a documented
exception to the local full-suite PASS prerequisite. That exception does not
declare the local suite passed, accept all remaining risks, or authorize merge,
release, tag/npm changes or a PC update. The original failures remain retained.

## Subsequent PR86 recurrence and diagnostic-only follow-up

The preceding authorization describes the original draft milestone, not a
standing approval. #84 was later integrated into dev and promoted by #85 under
separate, explicit owner decisions. Those decisions did not authorize publication.

Beta.6 candidate PR86 CI44180780366 attempt1 failed a real Windows Node24
launcher test:3467/3468tests passed,one ETIMEDOUT at the unchanged4000ms command
deadline. Ubuntu,macOS Intel and WindowsNode22 passed;ARM64 never acquired a
runner,zero steps. These are distinct outcomes,not four passes plus a capacity gap.
The safe failure artifact recorded spawn callback6ms,exit/close callbacks4098ms,
outer wait4099ms,status1,no output and no milestones. This does not prove script
entry,a native startup cause,successful disposal or natural root exit.
The candidate's local exact-tarball smoke PASS does not erase that test failure.

The helper can create ETIMEDOUT either from its command timer or from its
late-close guard when callback delivery is delayed. The old artifact cannot
distinguish them. The diagnostic-only follow-up adds fixed fields inside
`observation`,automatically retained by the existing safe artifact:

| Field | Meaning |
| --- | --- |
| timeoutSource | `timer`,`late-close`,or null;records which path classified timeout |
| timerExpectedMs | Original command deadline relative to helper start,not a new budget |
| timerFiredMs / timerDelayMs | Observed callback time and nonnegative lateness relative to the original deadline |
| stopRequestedMs | First accepted stop request;can also come from non-timeout failures |
| taskkillRequestedMs | Windows taskkill invocation attempted;does not prove the killer started |
| taskkillCloseMs | Killer close callback observed before result settlement |
| taskkillOutcome | `success`(code0),`nonzero`,`signal`(null close code),`spawn-error`,or null if not observed |

For the existing finite-timeout callers,times are integer-clamped to0..999999999;
this does not introduce a new policy for invalid/NaN caller timeouts.
The fields contain no PID,paths,
arguments,environment,streams or raw errors. POSIX termination does not populate
the Windows-specific taskkill fields. Null does not certify absence of processes.
An observed taskkill success is not proof that root exit was natural or that all
descendant races are solved. A late timer callback is not a child CPU measurement.
Status1 can be the result of forced termination;the test still requires all its
original functional assertions,not merely the expected nonzero status.

The command deadline,cleanup bounds,scenario,worker count,suite assertions and
production PowerShell launcher remain unchanged. Deterministic mocked-process
regressions distinguish the two paths without starting PowerShell. This patch
does not establish the cause of PR86 or authorize a new full run,retry,merge,
release,tag/npm publication or PC update. Any new observation needs its own
scope;no warm-up or minimal probe may silently replace the protected scenario.

Local follow-up validation:23/23mocked-process tests passed across
fixtureProcessExit.test.ts and fixtureProcessProvenance.test.ts (11new cases);
ordinary typecheck passed. A fresh independent static review found no blocking
finding. No protected PowerShell test,full suite,new CI run or retry was executed
for this follow-up. These results validate the diagnostic branches,not a cause
or reproduction of the historical failure.
