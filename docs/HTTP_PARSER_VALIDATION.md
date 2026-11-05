# HTTP parser update — local validation / Verifica locale

## Scope

Focused update on a branch from `dev`, with no runtime route or parser-option changes: Express stays at 5.2.1; its locked `body-parser` moves from 2.3.0 to 2.4.0, and required `qs` resolution from 6.16.0 to 6.17.1. No new direct dependency, version bump, release, real-data or launcher change.

Reference: [GHSA-27r3-jxmh-p828](https://github.com/advisories/GHSA-27r3-jxmh-p828), late errors from a decompression stream after successful parsing. Linux libc metadata stripped incidentally by npm 10 was restored; comparison against the original lock confirms only the two intended package records changed.

The regression fixture starts disposable Express servers on loopback port 0; it never starts the office. It checks ordinary JSON for the existing 1/4/64 MiB limit settings, gzip/deflate/Brotli compatibility, malformed JSON/compression, decompressed-size rejection and subsequent health. For the advisory lifecycle, it captures the real decoder used by Express and injects a synthetic late error after a successful request. This deterministically tests cleanup/error handling without crashing a worker or sending hostile traffic to a real service; it is not a claim of end-to-end exploit reproduction against an office.

## Results — 5 November 2026

- Before dependency update: **9/12 passed, 3 failed**, precisely the late-error cases for gzip, deflate and Brotli.
- After dependency update: **12/12 passed**. The same 12 cases passed again in the full suite.
- Typecheck and build: passed; existing Rapier import/chunk warnings retained.
- Full suite, `npm.cmd test -- --maxWorkers=2` with default/JSON reporters: **2,657 passed, 2 failed, 2,659 total; 249/251 files passed; 642.41 seconds; exit code 1**.
- Failures: walkways median **10.0021 ms** against `<8 ms`, and indoor sun/moon transition timeout at **5 seconds** (reported duration 7,565 ms). No assertions or timeouts changed and no causal baseline comparison for these failures performed in this run.

The full suite is **not green**. Those client tests are unchanged and had failed historically, but this does not justify bypassing the failure or automatically applying an old documentation-only exception. This change is held separately until the timing work and renewed full validation permit review/integration. No permanent resolution of historical failures is claimed.

The lockfile controls source-checkout installs; published npm consumers resolve dependency ranges independently. This validation is not an audit of every existing public or real installation. The package has not been published. All installs/tests occurred in an independent temporary worktree, not the real installation's node_modules junction.

## Renewed validation with integrated temporal fixes

After the independent temporal changes passed full local and real Ubuntu/Windows/macOS Intel CI and merged into `dev` via PR29, this isolated HTTP worktree combined the same changes and repeated the complete suite with `--maxWorkers=2`. Result: **2,672 passed, 1 failed /2,673; 251/252 files passed; 514.39s; exit1**. All12HTTP tests and21indoor tests passed; notifier passed all9tests in this run.

The remaining failure is the unchanged `<8ms` walkway median: raw batches **[48.1010,18.5906,11.2086,38.9538,5.5469]ms**, median **18.5906ms**. The prior temporal-only suite's median6.2794ms and three targeted passes do not erase this failure or prove dependency causality. JSON timings show the scale test's body started after the walkway test ended; therefore no direct overlap with that test body is established. Concurrent worker startup/transforms or other host load are possible explanations, not proven causes.

Current `dev` was then merged normally into the validation branch (only the combined temporal evidence document added; focused diff remains HTTP test/lock/document only). The HTTP change remains **unpublished and unintegrated**. Next planned controlled validation is one full run with a single worker after MCP's active full suite completes, retaining every test, sample, threshold and timeout. Any serial result must be identified as such and the failed two-worker results retained; multi-OS/default-CI validation is still required before integration. No repeated retry-until-green loop or old exception is authorized.

## Controlled serial result and current-dev combination

The single planned serial run on the pre-MCP base completed **2,673/2,673 tests, 252/252 files, 852.29seconds, exit0** (`http-parser-temporal-serial-full-suite.json`). Walkway raw batches(ms) **[10.2085,8.2586,7.3178,6.5896,7.3132]**, median **7.3178**, still the strict `<8ms` five-batch median. No test, assertion, timeout, warmup or sample was removed/relaxed. All12HTTP tests passed. A temporary scale-test journal rename logged ENOENT despite the passing suite; no real journal/state involved. The serial result is not proof of the cause of earlier failures or a parallel/default-CI pass; those negative reports remain retained.

Current `dev` subsequently gained the independent MCP/Zod changes (PR31). This validation branch merged it normally, bringing actual runtime changes and patched SDK/Zod minimum ranges. A structural lock comparison against this new `dev` confirms only `body-parser` and `qs` package records differ; MCP SDK1.32.2, Zod4.6.7, root minimum ranges and all platform metadata are preserved. The focused branch diff remains HTTP test/lock/document only. MCP now uses1MiB by the already-integrated change: the parser fixture's4MiB case is a legacy compatibility probe, not a claim that the current MCP endpoint still permits4MiB or an attempt to restore that limit.

Because dependencies/runtime changed after the preceding serial run, a **new-combination validation**, not a retry of unchanged failing code, ran: independent `npm ci`, full suite with one worker, then build and installed-package smoke. Result: **2,687/2,687 tests,255/255files,872.81seconds,exit0**, report `http-current-dev-serial-full-suite.json`. All12HTTP and14newMCP regressions passed. Walkway raw batches(ms) **[6.2168,6.0430,6.9553,5.5228,7.8472]**, median **6.2168**, unchanged `<8ms` threshold. Typecheck/build and installed-package demo smoke also passed (CLI/help,93license texts,2floors/11agents,isolated persisted state). One passing CEO-runtime test logged a temporary-state renameENOENT; existing Rapier/Three/chunk warnings remain. This is serial local evidence only: default four-OS CI must still pass before integration, and prior negative two-worker results are not waived or erased. No release or real-installation/data changes.

## Italiano

Aggiornati soltanto `body-parser` e la sua dipendenza `qs` nel lockfile; conservati metadati piattaforma, parser e limiti applicativi. I tre test di errore tardivo falliscono prima e passano dopo la modifica; tutti i 12 test HTTP sono verdi. Typecheck/build passati, ma suite completa **2.657 passati e 2 falliti** in indoor/walkways: modifica mantenuta separata, nessun aggiramento dei controlli o pubblicazione. Nessun accesso all'ufficio reale; l'errore del decompressore è riprodotto in modo sintetico sul fixture isolato, non tramite un attacco a un servizio reale.

Rivalidazione successiva con le correzioni temporali: **2672passati/1fallito**, ancora walkways18,59ms contro<8ms. Conservati tutti i campioni e il risultato negativo; parser ancora non integrato. Prevista una singola verifica completa seriale controllata, senza eliminare test o rilassare limiti, seguita da CI multipiattaforma se soddisfacente.

La verifica seriale pianificata è poi passata**2673/2673**,mediana7,32ms. Dopo il riallineamento al nuovo dev con MCP/Zod, nuova combinazione verificata separatamente: **2687/2687test,255file,872,81s**,mediana6,22ms,build e smoke verdi. Condizioni seriali e precedenti fallimenti paralleli conservati; CI ordinaria sui quattro sistemi ancora richiesta prima dell'integrazione. Nessun ripristino del vecchio limite MCP4MiB, nessuna pubblicazione o modifica reale.
