# Test-only Box subprocess ownership

## Controlled mechanism

After the error-preservation PR #68 was integrated into `dev`, a bounded Windows probe used the same Git Bash launcher and **10000ms** process bound as the Box desk test. A nonce-owned synthetic Node child held its own empty working directory.

The parent returned `ETIMEDOUT` after **10024.1034ms**, status null/SIGTERM. The ready-marked child was still alive; removing only its empty cwd returned **EBUSY**. A private nonce-specific file signal stopped that owned child; no unrelated PID was terminated, and the original failed fixtures were not deleted. This reproduces how parent-only termination can lead to the observed cleanup failure. It does not prove the identity of the process holding the historical Git directory or why preparation originally exceeded its deadline.

## Narrow correction

The test-only `runFixtureProcess` owns its spawned tree. At the unchanged deadline it records `ETIMEDOUT` and terminates descendants **before** the root is lost: Windows `taskkill /PID <owned-root> /T /F`, or an owned detached process group on POSIX. It waits for close/termination before returning to fixture cleanup. Kill failures are retained with the original failure rather than interpreted as success. Normal stdout/stderr and verified exit codes remain available.

The first real-Git Box desk test now awaits this boundary instead of `spawnSync`. Its Git operations, assertions, **10000ms preparation bound**, **30000ms case bound** and cleanup retry options remain unchanged. An asynchronous fixture-cleanup counterpart preserves both body and cleanup failures. Production cloud execution, commands sent to real Boxes, test scheduling and power policy are unchanged. This does **not** turn a preparation timeout into a PASS or cure an unidentified slow Git operation.

Validation before PR: **10/10 targeted tests and typecheck PASS**, including a synthetic parent/child timeout under the original ten-second process bound, descendant termination, immediate Windows cwd removal without retries, nonzero exit/output preservation and both-error retention. POSIX assertions distinguish killed Linux zombies awaiting reaping from running children; the platform CI is recorded separately. No new complete local suite is claimed for this correction.

## Independent investigations and remaining release boundary

- One separate Git Trace2 diagnostic retained the real fixture workload and limits: both cases passed; clone **1.282695s**, three fetches **1.108325/1.061905/1.003408s**. Nested Git timings overlap and are not summed. No failing slow command was reproduced; the original ten-second preparation failure remains evidence.
- One offline npm publication-CLI diagnostic passed at **2208ms**, without real network/publication or a reproduced five-second case timeout. It is not a replacement for the preceding failed full run.
- A separate path CPU-profile attempt using the TypeScript loader exceeded the diagnostic tool's **120-second** bound without producing a profile or stage output. No Node process for that exact diagnostic remained on inspection. The limit was not increased; no unchanged profile retry or path-performance fix was claimed.

Beta.5 PR #67 remains draft/blocked. Historical #39/#42 and the earlier uninstrumented/instrumented full-suite failures remain open evidence. No release-candidate merge, promotion, tag, publication, real Box, paid AI, credentials or PC update is implied by this test-only lifecycle repair.
