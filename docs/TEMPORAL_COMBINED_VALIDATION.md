# Combined temporal validation / Verifica temporale combinata

Local validation branch from `dev` combines the independently retained indoor assertion-driver and A* workspace commits. This is combined evidence, not a claim that either original-base branch alone had a green full suite. No HTTP/MCP dependency or CI runner changes included.

## 5 November 2026

`npm.cmd test -- --maxWorkers=2` with default/JSON reporters: **2,661/2,661 tests passed, 251/251 files, 537.42 seconds, exit 0**. Report retained outside the repository as `temporal-combined-full-suite.json`.

- All21indoor tests passed, whole file657ms. All10,000transition samples, thresholds and original5-second timeout retained.
- Walkways batches for15walks: **[8.3626,6.2794,5.9379,7.5540,5.9618]ms**, median **6.2794ms**, strict `<8ms` budget retained. All17walkways tests and4new workspace-reset tests passed. The first batch above8ms is preserved; acceptance is the original five-sample median, not every batch.
- All9notifier tests passed, including the browser-secret scan and push-device persistence. This does **not** erase prior failures or establish their cause: earlier full suite timed out in the browser scan, and a separate isolated run failed persistence (expected1device, saw2). No notifier source/test changes were made. Fixed30ms settling versus asynchronous disk writes remains an unproven source-level race hypothesis. Do not claim permanent notifier stability.
- An analysis test passed while logging ENOENT on a temporary state-file rename; retain this diagnostic. No real office state involved. Existing Rapier/Three deprecation messages remain.
- Build and installed-package demo smoke test for this exact combined source **passed**. The temporary install verified CLI version/help,93bundled client license texts, browser-tool availability, served client, isolated demo startup (2floors/11agents) and persisted demo state; no real state was created. CI/multi-OS review remains pending. No bypass of branch protections or old test exceptions; no main promotion/npm release.

Earlier branch-specific documents intentionally retain their failed/pending results. This later combined run supersedes only the statement that no green combined full-suite result existed, not those historical observations.

Italiano: suite completa combinata verde2661/2661; campioni/soglie/timeout conservati. Mediana walkways6,28ms. Notifier passa in questo giro, ma i fallimenti precedenti restano documentati e non dichiarati risolti. Build e smoke del pacchetto installato passati in demo isolata; CI ancora da verificare, nessuna integrazione o pubblicazione.
