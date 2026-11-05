# Walkway planning workspaces / Buffer per la pianificazione

Branch from `dev`; no integration/publication. The final change reuses private full-grid A* scratch arrays (`Float32Array` costs, `Int32Array` predecessors, `Uint8Array` closed flags) per live Nav using a WeakMap. Every search fully resets all three arrays. No paths, collision answers, obstacle masks or previous search values are cached. Returned waypoints remain separately allocated. Grid-sized buffers are retained while their Nav is alive, rather than repeatedly allocated for each walk; weak keys permit collection with the grid. Planning is synchronous and has no caller callbacks/reentrancy.

The final code leaves segment collision sampling, A* parameters, radii, route smoothing and floating-point costs unchanged. The benchmark retains one warmup batch, fifteen walks per batch, five measured batches, and the strict median `<8 ms` assertion. It now logs all five raw batches before sorting, outside the measured region.

## Evidence — 5 November 2026

- Initial geometric broad-phase candidate: equivalence tests and existing functionality passed, but median9.0262ms failed budget. Profiling run also failed8.4827ms. Neither is counted as acceptance. A disposable inspector harness then captured `walkways-candidate.cpuprofile`; allocation lines in planPath dominated samples. The harness was removed after capture.
- A combined geometry/workspace experiment passed7.4124ms, but the geometry change was then completely removed to reduce scope. Its temporary sampler-equivalence test was also removed; evidence from that experiment remains in external reports.
- Original allocating algorithm restored for baseline in the same isolated worktree: batches **[12.2047,11.9703,12.2947,22.5088,11.8847] ms**, median12.2047ms, failed. Only an unused WeakMap declaration and benchmark logging differed from HEAD at baseline; no search execution changes.
- Final workspace-only candidate, three predeclared sequential runs, **all retained** (not retries until green):
  1. [6.0755,5.0193,3.5594,3.7496,4.6794], median **4.6794ms**.
  2. [5.8596,5.8464,4.2820,4.3965,5.4003], median **5.4003ms**.
  3. [6.6591,4.5200,6.2024,5.7273,5.1352], median **5.7273ms**.
- Each final run passed41/41 tests:17walkways,20roomba,4new workspace tests. Typecheck passed. Reports `walkways-workspace-only-1/2/3.json` and `walkways-original-baseline.json` retained externally. Sequential runs are useful evidence, not a randomized benchmark or a platform-wide performance guarantee.
- New regressions compare interleaved office/lobby searches with fresh workspaces, changing goals and player avoidance, multiple grids, blocked-grid mutation/unreachable search recovery, and independence of returned waypoints.
- Build/full-suite/multi-OS validation still pending. Indoor and notifier blockers elsewhere are not waived. A combined temporal validation may test both independent local commits; it must be identified as combined rather than falsely reported as standalone branch green.

## Italiano

Riutilizzati soltanto buffer privati di A*, azzerati integralmente a ogni ricerca; nessuna cache dei percorsi o modifica alle collisioni. Conservati tutti i campioni e la soglia<8ms. Tre esecuzioni prestabilite passano con mediane4,68/5,40/5,73ms e41test ciascuna; typecheck verde. L'esperimento geometrico precedente è stato ritirato e i suoi fallimenti conservati. Verifica completa/multipiattaforma ancora necessaria, nessuna integrazione o rilascio.
