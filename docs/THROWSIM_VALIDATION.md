# Throw simulation cleanup and test validation

## Scope

The basketball simulation helper is used by `throwSim.test.ts` and `npcAim.test.ts`, not by the shipped client. This change does not alter game physics, data formats, launchers, dependencies, license notices or application UI.

`fly` previously returned on a basket before freeing its Rapier event queue. It now frees the queue in `finally` on success, failure and exceptions, and still frees the world if queue cleanup throws. Five regression cases cover baskets, misses, step errors, setup errors before queue creation and cleanup errors. Two of those cases failed against the original helper and all five passed after the fix.

The two tests that combined six distance/angle positions now use sequential `it.each(SPOTS)`. Every original charge sample and assertion remains. **The execution budget is now 5 seconds per scenario, rather than a single shared 5-second budget for six scenarios.** No timeout override, retry, skipped test, concurrent case or reduced physics sampling was introduced. This changes functional-test granularity; it does not make the simulation itself faster.

## Local verification — 2026-11-04

Validation used an isolated worktree based on `71004a7` with independently installed dependencies, on Windows x64 / Node v22.23.1. No additional libraries or tools were installed for this fix; no real office, data, provider calls or development-checkout dependency junction was used.

- Compared original and corrected helpers over 2,225 shots: all scoring samples, charge windows, `scored`/`touched` results and 300 seeded casual-player shots were identical.
- Explicit resource releases over those shots: original helper freed 2,225 worlds and 1,772 queues; corrected helper freed all 2,225 worlds and queues. No memory-byte measurement was made.
- The cleanup alone did **not** resolve timeouts: all three targeted runs before parameterization still failed. Those failures are not concealed by the subsequent results.
- Static comparison of complete assertion expressions, sweep arguments, positions and throw-speed restoration against the original test passed. No random seed, shot count, charge increment or threshold changed.
- After parameterization, three targeted runs of `throwSim`, resource regressions and `npcAim` passed **27/27 tests each** (15.25 s, 14.34 s and 14.34 s).
- `npm.cmd run typecheck`: passed.
- `npm.cmd run build`: passed, with the existing Rapier dynamic-import and chunk-size warnings; license texts included for 93 bundled client packages.
- Full `npm.cmd test -- --maxWorkers=2` with default/JSON reporters: **2,647 passed, zero failed or skipped, 250/250 files passed, 478.99 seconds, exit code 0**.
- The total increased from 2,632 to 2,647: five new resource regression cases and ten additional independently reported scenarios from parameterization. No test was removed.
- Whitespace checks passed for the changed files.

This single green full-suite run does **not** establish permanent resolution of historical timing failures in unchanged tests. `walkways`, `indoor`, `workspace` and `scale` passed this run without changes here; `indoor` took 4,801 ms against a 5,000 ms limit and remains close to its budget. Earlier baseline and cleanup-only runs also exhibited variable timeouts in basketball and NPC simulations. No controlled performance improvement is claimed.

## CI and integration limits

This report records local results, not CI success. macOS / Node 24 validation of this fix is still required. The runner substitution proposed separately in PR #25 is not included here: this branch retains the existing CI and release workflows and all branch protections. Creating this PR does not authorize merge, issue activation, npm publication, OIDC work or any update to a real installation.

## Italiano

Corretto il rilascio della coda eventi nel simulatore usato dai test, anche su canestro ed eccezione; aggiunti cinque test di regressione. I due gruppi di sei posizioni sono ora casi parametrizzati sequenziali: tutte le cariche, asserzioni e soglie restano identiche. Il budget passa da 5 secondi condivisi per sei scenari a **5 secondi per scenario**, senza aumentare il timeout configurato. Non è un'ottimizzazione della fisica.

Confronto su 2.225 tiri: esiti identici e tutte le risorse liberate dopo il fix. Tre prove mirate da 27 test, typecheck, build e suite completa locale verdi: **2.647 test, 250 file, 478,99 secondi**. Nessuna nuova libreria/tool installati per la correzione, nessun uso dell'installazione reale. Questo non dimostra la risoluzione definitiva dei problemi temporali storici nei file non modificati; CI macOS ancora da verificare. Merge, release e attivazione Issues restano separati.
