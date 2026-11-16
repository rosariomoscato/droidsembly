# Beta.5 blockers — autonomous local follow-up

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
