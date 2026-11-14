# Box fixture: preserve preparation and cleanup errors

## Observed evidence — November 14, 2026

A single owner-authorized full-context diagnostic of beta.5 candidate `8400a6a` failed: **3129 PASS / 3 FAIL, 290 files, exit1, 652.56s**, unchanged Windows Node22 / Power saver. Original tests, loads, limits and scheduling were unchanged; an external selective observer recorded only synthetic-fixture process/cleanup metadata. Diagnostic overhead means this is not an uninstrumented acceptance run.

The Box QA fixture trace shows:

1. The **first development preparation**, before the QA reuse checks, called Bash with the original **10000ms** bound.
2. It returned after **10084.3042ms**, `error.code=ETIMEDOUT`, `status=null`, `signal=SIGTERM`.
3. The `expect(development.error).toBeUndefined()` assertion must fail on that returned error. The test then entered its `finally` cleanup.
4. Cleanup failed **200.9022ms** later with `EBUSY`/`rmdir`. JavaScript's `finally` replaced the primary assertion failure: the default test report exposed only cleanup trouble.

This demonstrates error masking in the fixture. It does **not** identify why Bash exceeded its deadline, which descendant or external process held the directory, or the sole cause of the preceding uninstrumented EBUSY. Parent-process CPU is not child CPU or a system-wide load/handle measurement. No live process was killed or directory-delete retry added during diagnosis; synthetic leftovers are retained.

## Narrow correction and regression

`withFixtureCleanupSync` preserves the original failure when cleanup succeeds, preserves cleanup-only failures, and throws an `AggregateError` containing **both original objects in causal order** when both fail. The primary error is also its `cause`. Cleanup still executes exactly once. A separate flag handles even a thrown `undefined` value.

Both real-Git Box desk test bodies keep their original operations/assertions and **10000ms subprocess / 30000ms first-case** limits. The original cleanup options/retry count remain unchanged. No production runtime, process-tree handling, scheduling, dependency or billing behavior is changed. No exception is converted to success.

Controlled regressions: naive `try/finally` **2 FAIL / 3 PASS**, retaining only cleanup; corrected helper plus the two real-Git script cases **7/7 PASS**. Typecheck **PASS**. Original failure logs are retained separately. These targeted passes prove preservation of failure evidence, **not correction of the preparation timeout or lock**. No new complete local suite is claimed for this narrow follow-up; ordinary PR CI is reported separately.

## Release remains blocked

In that diagnostic full run, the original statusline/workspace cases passed at **4659.4899ms / 44286.9719ms**, but their preceding uninstrumented timeouts remain failed evidence. Walkway median **8.0682ms** exceeded the original **8ms** budget over the unchanged five batches/15 walks; historical **#39 remains open**. An offline npm-publication CLI test also exceeded its original **5000ms** case bound; no real publication occurred. Scale issue **#42 remains open**; it is not relabeled as these errors.

The candidate's green five-platform CI does not waive these local failures. PR #67 stays draft; no release-candidate merge/promotion/tag/publication/PC update follows this error-reporting correction.

**IT:** È dimostrato che l’`EBUSY` della pulizia può nascondere il timeout precedente. La correzione conserva entrambi gli errori, senza aumentare limiti o dichiarare risolti rallentamenti e lock. La beta.5 resta bloccata: servono ulteriori prove causali o una decisione esplicita del titolare sui rischi, non retry fino al verde.
