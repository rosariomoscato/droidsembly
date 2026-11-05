# Push delivery completion / Completamento invio push

## Candidate and limits

Based on dev092d9add, after independently validated dependency integration. Previously notify() returned void while delivery and expired-device persistence continued asynchronously; tests guessed completion using30ms sleeps. This does not establish a runtime data-loss bug. Candidate returns Promise<void> for this call's immediate deliveries, retaining synchronous dispatch and timer arming. Existing callers may continue ignoring the return. Disabled/rate-limited calls resolve without waiting for future scheduled summaries. Disk failures retain existing handling; this is not graceful shutdown, guaranteed durability or new retry handling.

The existing encryption, channel, memory, restart and key assertions remain. Fixed sleeps are replaced by awaiting actual immediate completion. New transport/rename gates verify the promise stays pending while external delivery or the persisted expired-device removal is blocked. The disk test checks memory already empty but old file still containing the device, then releases rename and verifies restart with unchanged keys. Only synthetic temporary roots and fake transports are used; gates are released and started writes settled before fixture cleanup.

## Evidence and blocking failures

- Unchanged baseline:8/9passed, source scan timed out5043ms (`push-persistence-original-baseline.json`); existing push case passed. PR33's earlier improvement is not universally stable under current conditions.
- Two new completion contracts fail old API because it returns undefined (`push-completion-contract-before.json`). Other9tests filtered only for this diagnostic; no acceptance exemption.
- Candidate notifier run:10/11passed, same source scan timed out5036ms (`push-completion-targeted-after.json`). No passing full result claimed; chained typecheck did not run after that failure.
- Independent typecheck initially found test-only Promise.withResolvers unavailable under the existing lib target; replaced with a small deferred helper, with no target/config change.
- Final typecheck passed; selected behavior group6/6passed, other5tests filtered (`push-completion-contract-after.json`). These include both controlled contracts and original encrypted-push/restart, burst, disabled-channel and invalid-channel cases. This filtered run is diagnostic, NOT acceptance of the full file or suite.

The independent scan-blocker follow-up PR36 passed ordinary four-OS CI and merged into dev9f7fc76932dd273dcea6082e9626a73ad3adad4d. This candidate normally merged that base without dependency changes or conflicts. New-combination typecheck and complete local serial suite **passed2,737/2,737tests,259/259files,1,124.20seconds** (`push-completion-combined-full-suite.json`). All11notifier tests passed,source scan683ms under both explicit and asynchronous5-second limits. Walkway batches[6.4919,5.5971,7.9515,5.1622,5.8283]ms,median5.8283ms,unchanged<8ms. Build and installed-package demo smoke passed,includingCLI/help,93license texts,isolated persisted2floor/11agent demo. Existing Rapier/Three/chunk warnings remain. This run did not emit the prior state-rename ENOENT,which is NOT proof of resolution; the separately retained failure still requires investigation.

Ordinary four-OS CI remains necessary before integration. No timeout, budget, sample or existing assertion relaxed; no release/real-installation changes. Separate temporary state/journal rename diagnostics and arbitrary-load path timing remain unresolved.

## Italiano

La modifica permette di attendere il completamento dell'invio immediato e del salvataggio già previsto per i dispositivi scaduti, senza attendere riepiloghi futuri. Eliminate attese fisse nei test, conservate verifiche di cifratura/riavvio/chiavi. Dopo l'integrazione separata PR36 e l'aggiornamento della base,passano2737/2737test,typecheck,build e smoke. Fallimenti precedenti conservati; CI ancora necessaria. ENOENT e altri problemi temporali restano aperti: nessuna promessa di durabilità o correzione completa del ciclo di chiusura.
