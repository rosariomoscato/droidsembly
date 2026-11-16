# Beta.5 blockers — autonomous local follow-up

## Promotion blocker after documentation integration

PR77 documentation merged devacd0fbcb61559f3b129dc6e8480da6b46bd02e47.
Draft dev-to-main PR78 opened under preparation-only authorization; main merge
and publication remain separate. Promotion CI43833575604 failed Windows Node24:
3307PASS/1FAIL,304files,129.62s,launcher spawnSync ETIMEDOUT4000ms,statusnull,
SIGTERM,no recognized milestones. Other4platform jobs PASS; failed job's build
and smoke skipped. Prior green pre/postmerge76 and docs77 CI remain distinct.
Raw promotion logs/status retained in b5review-20261116; no CI rerun requested.

Read-only diagnosis: first existing marker follows PowerShell startup/parsing,
stopwatch/function initialization,Get-Command node.exe and URI/script assignment.
No-milestone does NOT prove empty stderr or a specific host/Defender/Node cause.
Local source comparison after fetch confirms launcher/scheduling/config identical
between reviewed docs87b948c and actual CI headacd0fbc.

Dedicated diagnostic branch adds script-entry and pre/post node/loader markers,
stream nullness/length and fixed startup categories plus monotonic spawn duration
and essential-variable presence booleans. No raw streams/environment/path values
printed. Extra synthetic regressions cover startup phases/null/unclassified/error
categories. Original real case,assertions,4000ms command budget,scheduling and
payload retained; no warmup. This is observability,not a claimed performance fix.
No external fixture/provider action or main merge/publication performed.

Diagnostic patch typecheck and8/8 targeted tests PASS; native synthetic launcher
2174ms,original4000ms deadline. Independent fresh-session static review PASS,
no blocking findings. These local results do not explain the original CI timeout.
Separate diagnostic PR toward dev planned for a changed,observable CI experiment;
promotion78 remains draft/blocked and failed run43833575604 is not retried.

## Current integration status — November 16, 2026

Historical sections below retain their then-current pending/negative states.
Current result: PR76 merged into dev at1352bf6bb21eb2ae0f908db34bcf388aaf0558ba,
reviewed head8df6429a1caa8ce4f94221a5a30bca02cc43e806. Independent static review
and functional QA PASS for scanner,cleanup,PTY boundaries. Original QA harness
FAIL/inconclusive attempts remain retained; the distinct corrected native
detached-child experiment observed stdout/stderr after root exit,600ms command
deadline unchanged,zero stale taskkill requests,ETIMEDOUT plus explicit unknown
descendant error,and acknowledged owned-child stop/absence. PTY boundary tests
stub native dependency and do not prove native race recovery; no UI focus claim.

Premerge CI43825433481 and postmerge CI43829688789 PASS on all five platform/
runtime jobs,including install/typecheck/full tests/build/installed demo smoke.
Initial premerge monitor network failure was retained; the same CI run continued,
not rerun. Evidence roots b5review-20261116 and b5qa-independent-20261116 retain
logs,JSON,artifact hashes and negative attempts. Old draft67 closed as superseded
with original head/failures/branch preserved. Issue39/42 remain open.

Owner authorized closing67,updating docs,and opening dev-to-main promotion PR
with CI. No main merge,tag/npm publication,channel change,installed-PC update
or new real-provider/Box action authorized or performed. README changes here
mean old local tarball hashes are historical exact-artifact evidence,not hashes
of a future canonical publication artifact.

Branch `fix/beta5-validation-blockers`, base dev93fdcc3. Dedicated checkout
`ds-b5fix-20261116`; the locally verified fixture-exit patch/tests/docs are copied
from their separate worktree, not committed or promoted. User asked to resolve
open issues autonomously, then conclude beta.5. Publication/main promotion/live
office/real provider/Box actions remain separate; no risk waiver inferred.

## Retained starting evidence

`b5d-20261116`: one instrumented full dev run3273PASS/5FAIL, exit1. Box fixture
timeout/termination issue followed up separately (33 targeted PASS plus native
guard check). Remaining failures: PTY keeper exit undefined, PowerShell launcher
exit1 without visible marker, i18n coverage5s timeout, client source-policy scan
12250.5815ms>5000ms. Original candidate #67 and issues39/42 remain open evidence;
green isolated checks do not erase them.

## Current work

- i18n AST collection now uses the installed parser's Visitor to avoid generic
  Object.values allocation/traversal of every AST metadata object. Key selection
  rules and all54 surfaces retained. Differential checks compare all key sets
  with the original reference traversal; targeted6/6 PASS, typecheckPASS. Added
  explicit wall-time5000ms assertion (no relaxation of the original test limit).
  Need actual-workload timing comparison before claiming a performance fix.
- Launcher diagnostics previously emitted only for error/non1 status/signal;
  the failing exit1-with-empty-output case was invisible. The condition now also
  covers missing visibility/disposal markers. Console remains fixed safe labels
  and booleans; failed synthetic fixture/raw result are retained locally, never
  printed as arbitrary streams or used for real secrets. One enhanced diagnostic
  on synthetic HOME/AppData passed3/3: historical failure not reproduced/fixed.
- PTY native-exit diagnostic passed the original4 tests, but produced no native
  event log: original module interception did not observe the ESM-loaded CJS
  entry. That diagnostic is inconclusive for native callback causality. Corrected
  observer explicitly loads the exact installed module and emits readiness
  markers; one new diagnostic is planned, no unchanged retry-until-green.

Evidence root `b5fix-ev-20261116`, reports and observers outside the checkout.
No production runtime change yet. No test timeout/assertion/workload reduction,
dependency changes, power-policy changes, commits, pushes or PR/release actions.

## Subsequent findings / changes (supersede pending entries above)

- The fixed AST comparison retained1460 identical keys across all54 surfaces,
  but reference803.953ms versus visitor890.211ms showed no speed benefit. The
  proposed visitor/helper tests were **removed**, sources retained externally in
  `rejected-i18n-visitor`. Original AST logic and surface list restored; stricter
  explicit5000ms wall assertion retained. The complete CPU-heavy i18n file now
  joins the existing quiet-phase barrier, with all cases and original budget.
  This scheduling classification is not a historical-cause claim.
- Source scan **reproduced slow** at14832.663ms,595files,zero violations; enumeration
  103.772ms, serial reads14663.791ms, own-process CPU under1s. Cause localized to
  serial read latency, not attributed to antivirus/host hardware without evidence.
  Driver now overlaps at most8 fresh reads, retains exact extensions/patterns,
  hidden/untracked coverage, no cache, deterministic observation order and drains
  all started reads before rejecting. New deterministic tests verify concurrency
  bound, all-file coverage, and no rejection while other started reads remain.
  Typecheck and complete4-file scanner/i18n/scheduling/notifier batch35/35 PASS;
  real policy case366ms under unchanged5000ms. Candidate hash comparison pending.
- Corrected PTY observer emitted native code3 and agent code3; original4 cases
  passed, so the missing-code recurrence was not captured. Installed native code
  can forward an unavailable agent status on pipe close; app boundaries previously
  serialized undefined by omitting code entirely. Added fail-closed integer status
  validation at host/local/remote boundaries: unknown remains failure-1, not guessed
  0 or3. New protocol regressions retain every valid code and reject invalid values.
  This fixes malformed status propagation, **not proof of native race recovery**.
  Existing real PTY test still requires exact exit3. Runtime PTY source is now
  changed locally and requires targeted/build/full validation; none is waived.

No publication, CI, commit/push/PR or real-resource operation performed.

## Candidate verification plan

Scanner comparison confirmed595 identical files/hash
`110edd8ec03deb3b9923c99da3295399f2762cd899ee80ba7282686ff068ed1d`, zero violations,
candidate540.88ms versus baseline14832.663ms. Typecheck and PTY18/18 PASS; original
real exit3 assertion unchanged. Comparison magnitude may depend on cache/order.

Package/lock now prepare0.4.0-beta.5 locally; no dependency change. Release notes
explicitly retain unresolved causes and pending gates. Plan: one complete suite
on this changed candidate, original power plan, no native observer, unchanged
case workloads/assertions/deadlines except the explicitly authorized helper
termination/drain separation. Record all output and JSON, stop on failures;
build/pack/exact-artifact smoke only after assessment, not automatic publication.

## Full candidate run — PASS, not historical-cause closure

`b5cand-20261116`: typecheck PASS; complete suite **3306/3306 tests,304/304 files,
528.42s,exit0**. Node22/Windows, unchanged power scheme verified before/after,
isolated HOME/AppData/XDG/office/temp, no external native observer. Original
exit3 PTY assertion, launcher deadline, scanner and walkway budgets all retained.
Scanner policy368ms; i18n944ms; walkway five-batch timings
3.467/6.380/3.682/4.769/6.133ms. Scale test passed with existing diagnostics;
shutdown hook4536.893ms. Diagnostic final pending sampled-terminal prefixes
remain visible in the retained log and are not claimed as zero pending work.

README EN/IT now distinguish published beta.4 from local/unpublished beta.5,
document OpenCode Box workers and Chrome reference-browser limits. The separate
naming-worktree README work is preserved. Local README link validation and
package/lock version agreement PASS. An initially copied link to a migration
report absent from this checkout was caught and replaced with candidate notes.

Build/pack started after full PASS. No unchanged full retry, assertion reduction,
power-policy change, independent-QA claim, CI run or publication. Historical
3273/5 and3129/3 failures remain separate negative evidence; unexplained native,
launcher and timing causes/issue39/42 are not closed by this successful run.

## Build and exact package

Build PASS (client25.38s,93 license texts,server bundle). Existing warnings:
large chunks, mixed dynamic/static Rapier imports, plugin callback timings.
No chunk limit changed or warning suppressed. npm pack --ignore-scripts PASS:
102files,3307474bytes,unpacked10208973bytes; required CLI/legacy entry/README/
licenses/server files present and local/sensitive-path checks PASS.
Retained tarball `b5cand-20261116/droidsembly-0.4.0-beta.5.tgz`, SHA256
`1de494cbb8532a4b5f3fd8be4e545f6af3443fa0cb84591bf634828be37186f7`.
Exact-artifact installed demo smoke started with isolated profile/XDG/npm cache.
No real-office/provider actions or publication. Smoke outcome still pending.

Exact-artifact installed smoke subsequently **PASS,exit0**, same SHA256 verified
in `smoke-exit.json`: public version/help0.4.0-beta.5, legacy entry parity,
93 installed client license texts, pinned browser-tool CLI, loopback client/API,
demo persistence with2floors/11agents. Canonical isolated home selected despite
conflicting legacy aliases; no real-state file or shadowed legacy home created.
Successful smoke fixture removed by the runner; logs/tarball/evidence retained.
This is a local demo package gate, not real provider/Box/native-focus testing.
Local preparation gates now PASS; independent fresh-session QA and CI remain
pending. No commit, push, PR change, merge, release or installed-office update.

## Independent static review and follow-up

The preparation-time statements above about uncommitted work/no commit describe
their original phase. Candidate frozen in local commit0763672, then reviewed in
a fresh independent session (static review, not complete functional QA).
Review found P2: new launcher diagnostics called includes on nullable streams,
masking ENOENT diagnostics; P3: newly relative README doc links point outside the
packed whitelist. Follow-up normalizes diagnostic streams, adds an ENOENT/null
regression, and uses hosted links with a packaged-README link regression. No
runtime/dependency/deadline change. Old tarball remains retained, not overwritten;
README changes require a new artifact and smoke before claiming final-package
validation. PTY boundary injection coverage remains a disclosed review gap.
Independent follow-up review and targeted checks pending; no push/publication yet.

Follow-up static review approved: P2 closed, P3 source correction approved with
hosted URL reachability to check after push. Typecheck and11/11 targeted tests
PASS. New README tarball installed smoke PASS,exit0 (version/help,93license texts,
browser-tool CLI,isolated demo2floors/11agents); SHA256
`d3ab342c28034737c6f279a2b714d7add82d126ccf4a72b8f24c9a4eff49536c`, retained in
`b5review-20261116`, separately from original artifact. No runtime/dependency
change after the3306-test full run; only reviewed tests/README/documentation.
Follow-up commit and draft PR toward dev now planned under owner authorization;
no merge/publication/PC update. Independent functional QA and CI remain gates.
