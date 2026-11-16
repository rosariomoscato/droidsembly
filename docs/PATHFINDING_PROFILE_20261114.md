# Pathfinding investigation — no runtime change retained

## Scope and result / Perimetro ed esito

Owner-authorized follow-up from `dev` **d37f04c**, after PR #69's owned-fixture process-tree correction was merged with green five-platform CI. Postmerge CI **43627577121** also passed. This investigation concerns only the path part of **#39**, not Git/npm CLI timing or #42's historical scale shutdown.

**Result:** a usable CPU profile was captured. Two proposed optimizations failed to demonstrate a performance benefit and were removed. Navigation source, tests, search order, geometry, radii, workload and the strict **8ms** original median assertion are unchanged. No performance fix or historical root-cause resolution is claimed. Beta.5 PR #67 remains draft/blocked.

## Profiling method

The earlier TypeScript-loader/in-process-inspector attempt exceeded its 120-second tool bound without output. It remains failed evidence; the bound was not increased and that attempt was not repeated unchanged.

Instead, installed esbuild bundled the unchanged pure navigation into an external diagnostic artifact. Native Node CPU profiling then ran without the TypeScript loader or in-process inspector callback. The runner emitted import/warmup/measurement milestones and used the original **15 office pairs**, **15 warmup walks**, and **five measured batches**. Native timestamps limited analysis to the measured window, excluding imports and grid construction.

- Node22.23.1 / Windows; unchanged **Power saver** plan. No concurrent local build, demo or second benchmark was launched.
- Baseline bundle SHA256: `b57234479e71ae58c5bf18122be899780c2b296abbfa401ddd1d9c2220df457d`.
- **86 samples** in the measured window: `planPath`26, `segmentClear`20, `findPath`19, other frames21 (including GC3). Sampling/inlining prevent treating these as exact per-operation cost or a unique explanation of a historical slow run.
- Profiled batches: **[16.9030,14.4034,8.4796,9.2315,8.6483]ms**, median **9.2315ms**. Observer overhead and standalone startup make these diagnostic timings, not the original uninstrumented fixture gate.

## Rejected experiments — all results retained

1. **Reusable numeric A* heap:** preserve JS Float64 scores and former tie behavior, eliminate per-push pair allocation, no route cache. Exact reference ordering/growth/precision/reset checks plus existing navigation cases passed **44/44**. Standalone unprofiled five-batch median **14.9482ms**, versus unchanged baseline **14.1093ms**: no demonstrated speed benefit. Removed.
2. **Per-segment expanded obstacle bounds:** refresh every call, preserve all samples/tangencies/radii and mutable geometry, reuse only scratch storage. A deterministic work-count check on the old implementation read obstacle bounds139 times versus the proposed8; this does not itself establish speed. New mutation/geometry checks plus existing navigation cases passed **44/44**. Standalone median **26.7775ms**, not an improvement. Removed.

All three variants produced the same hash for the **15 benchmark routes**, `4b557d14b0a3b5503b2621d8217cc5366a7b521b81401331921dd5ab937e2657`. This is not an exhaustive bit-for-bit proof for every route. Proposed source/tests, original logs and profile artifacts are retained outside the repository, not delivered as runtime changes.

## Complete original-fixture comparison

Standalone startup does not reproduce the original test file's preceding all-route correctness cases and JIT history. One predeclared baseline/candidate comparison therefore ran the **complete original 17-case walkways file** sequentially in isolated worktrees. An output-only reporter saved the existing batch log; no cases, warmup, loads, clock or budgets changed.

| Variant | Original five batch times (ms) | Median | Cases |
|---|---|---|---|
| Unchanged baseline | 3.5381,4.4761,3.6475,3.3720,3.3354 | **3.5381** |17PASS|
| Expanded-bounds candidate | 3.5374,5.7160,6.3297,5.3800,8.0259 | **5.7160** |17PASS|

Both strict median assertions passed; that is not a reason to keep the slower observed candidate. A single pair is not a statistical estimate of host variance or a proven universal regression. There was **no demonstrated benefit**, so the change was rejected rather than tuned/repeated until green.

## Boundaries and next evidence

No complete suite was rerun to force green, no timeout/assertion/load reduction or power-policy change was made, and no user work or real installation was modified. Final navigation code was compared to the reviewed baseline with no diff. This report-only change needs no new runtime build claim.

Historical #39 remains **OPEN**: later isolated passes do not erase the full-context median8.0682ms failure or the earlier scanner/path failures. The profile identifies current work, not the sole cause of those historical failures. A useful next experiment would need a falsifiable structural hypothesis or slow-case profile, not more unchanged full suites. #42 and the release's Git/npm CLI failures remain separate. No publication, new real Box, paid AI, credentials or automatic risk acceptance.

**IT:** Profilo ottenuto, ma nessuna ottimizzazione trattenuta: entrambe le proposte non hanno mostrato benefici. Anche un test verde non giustifica codice più lento. Codice originale e soglia di8ms conservati; #39 aperta e beta.5 ancora bloccata. Le evidenze negative restano disponibili, senza dichiarare risolta la causa storica.
