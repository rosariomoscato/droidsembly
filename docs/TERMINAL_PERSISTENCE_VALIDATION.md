# Terminal save serialization / Serializzazione salvataggi terminali

## Current combined candidate — still draft

Combined complete ordinary serial validation **FAILED:2,744passed/2failed of2,746;258/261files;1,242.93seconds;exit1** (`terminal-scale-combined-full-suite.json`). Additionally the scale suite failed its afterAll hook at the unchanged10secondlimit even though its test-body assertions passed. Scanner measured19,623.7042ms versus5,000ms;walkway median9.9232ms versus8ms (raw[5.8686,9.9232,9.2723,12.4148,15.2079]). All4terminal persistence and5fixture helper assertions passed,but the combined suite is NOTGREEN. Chained build/smoke did NOT run. This failure supersedes any suggestion the14targeted passes were sufficient for acceptance;no timeout/budget/coverage exception is applied.

A later read-only host snapshot found no remaining candidate/Vitest node processes,CPU55percent and approximately9.7millionKBfree of31.4millionKBvisible memory (`post-combination-host-snapshot.json`). It does NOT measure conditions during failed tests or prove/exclude historical load as a cause. No process terminated or machine configuration changed. Candidate remains local/held;old-head CI cannot validate it,and draft38 must not be marked ready/merged.

Earlier isolated-candidate statements/results below are historical. Independent ordinary four-OS CI passed for draft head12afb7a,but its Intel logs also recorded scale journalENOENT. It was NOT merged or accepted on that evidence. The separately preserved scale teardown candidate was then merged normally into this local branch. Current scope combines the terminal queue with awaited scale fixture/parser drain and explicit rejection of state,journal AND terminal-save warnings;held Swarm shutdown changes and scanner telemetry remain excluded.

New-combination typecheck and14/14targeted tests passed,4/4files (`terminal-scale-combined-targeted.json`):original4terminal,persistence4,real scale1,fixture5. Scale body54,896ms,file60,009ms,inside the unchanged120secondtest/10secondhook limits. No persistence warning reported in this targeted run;not proof of universal resolution. Complete ordinary serial suite/build/package smoke are now running (`terminal-scale-combined-full-suite.json`). New combination is not yet pushed/CI-validated;old-head CI cannot validate it. All prior local failures and Intel journal error remain retained,not waived. Draft must stay blocked until satisfactory complete validation and fresh four-OS CI/log review.

Italiano:combinati localmente coda terminali e teardown atteso con controllo anche degli errori terminali;typecheck e14test mirati verdi. Suite completa/build/smoke in corso,nuovaCI ancora necessaria. Nessuna integrazione o dichiarazione di beta pronta.

## Evidence

Independent branch from accepted dev5ef2f52;no held state-shutdown/scale-teardown/scan telemetry changes. Two terminal `.ansi.tmp`→`.ansi` ENOENT errors occurred in the separate scale diagnostic during shutdown. Existing AgentTerminal.save used the same temporary path for overlapping saves with no queue. Periodic Swarm.saveTerminals and shutdown can both invoke it.

Controlled original-code baseline failed1/6tests (`terminal-persistence-before.json`):with first actual rename gated,a second save already calls flush (observed2calls vs expected1). Existing terminal4cases and the sequential error-recovery control passed. This demonstrates missing serialization;it does not prove every historical state/journal/terminal rename error has this cause. Synthetic files/screens only,real filesystem writes,no random timing delay. Rejection handlers attached before overlapping old calls;gates released and all started writes settled before own-temp cleanup.

## Candidate and limits

One queue per AgentTerminal serializes the complete flush/snapshot/mkdir/write/rename operation. Each save returns its own promise and propagates its failure;the internal queue catches only to let later saves proceed. Different terminals remain independent. Four persistence cases cover gated overlap/latest screen/no leftover tmp,later recovery,already-queued recovery and independent terminals. Original terminal compatibility tests remain.

File format/paths/temporary-file naming and dirty-flag behavior remain unchanged. Not a lock across different terminal instances/processes targeting one path,not crash-proof durability,not cancellation of writers on dispose,not a new persistence retry or a fix for all error swallowing in Swarm. Existing failed-save dirty handling remains outside this focused patch. No new dependencies,version/Release/launcher/i18n/license changes or real installation/data access.

## Validation status

First updated chain stopped at typecheck:the test cleanup variable was inferred as a one-element tuple from its initial promise,and could not later hold the two-save results. Tests did NOT run and no updated JSON result was produced. Corrected only the variable's explicit type to Promise<PromiseSettledResult<void>[]>,without changing gates/assertions/runtime behavior or compiler settings. Fresh typecheck and original4terminal+new4persistence tests running (`terminal-persistence-targeted-reviewed.json`);no outcome claimed yet. Full ordinary suite/build/installed-package smoke and actual four-OS CI required before integration. Earlier failing full suites and the held state/scale candidates remain unwaived. Scanner stalls and walkway/sky timing issues remain open;point2 not complete,beta not ready.

## Italiano

## Restart recovery

## Full-suite blocker and draft-review limits

Resumed ordinary serial suite **failed:2,740passed/1failed of2,741;259/260files;1,118.80seconds;exit1** (`terminal-persistence-full-suite-resumed.json`). All4terminal persistence cases and original4terminal cases passed. Unchanged notifier source-policy elapsed assertion measured11,751.878ms against5,000ms;case reported11,777ms. Build/smoke did NOT run in that stopped chain.

The original scale fixture also emitted journalENOENT on its temporary rename after its assertions passed. This branch deliberately does not include held scale-teardown/state-shutdown changes;no journal resolution claim. Walkway median5.8381ms passed unchanged<8ms,with all5samples[5.6200,5.6300,5.8600,5.8381,8.4467]retained. Earlier scanner/timing/persistence failures remain blocking evidence.

Candidate is for DRAFT review and independent ordinary four-OS CI evidence only,not accepted or merge-ready. A separate packaging check may establish build/installed-package compatibility,but cannot waive the failed complete local suite or journal diagnostic. Do not repeatedly rerun the unchanged suite until green,publish a beta or merge on this evidence alone.

The corrected targeted command was cancelled by a harness-server restart before producing its JSON report. Saved runtime/fixture changes and the explicit results type were verified intact;no install or completed baseline repeated. Resumed only the unfinished typecheck/targeted verification,with a distinct report `terminal-persistence-targeted-reviewed-resumed.json`. No cancellation is counted as a test pass or an application failure.

Resumed verification **passed typecheck and8/8tests,2/2files**:original4terminal compatibility cases plus4persistence cases,without skips/filtering. Full ordinary-config serial suite/build/installed-package smoke are now running (`terminal-persistence-full-suite.json`),stopping on failure. This targeted success does not waive historical scanner/time-budget or other held-candidate failures;ordinary four-OS CI still required before integration.

The full-suite job was subsequently cancelled by another harness restart before producing a complete JSON report. Source changes and installed dependencies were verified intact;only that unfinished full-suite/build/smoke chain resumed,using distinct `terminal-persistence-full-suite-resumed.json`. No completed install,targeted test or typecheck repeated,and no cancelled execution counted as acceptance.

Riprodotta l'assenza di serializzazione:secondo salvataggio già avviato mentre il primo rename è bloccato. Coda privata per terminale,salvataggi interi in ordine,errori visibili al chiamante e recupero delle operazioni successive. Nessuna promessa di durabilità o correzione di tutti gli ENOENT;validazione ancora in corso,nessuna integrazione o modifica ai dati reali.
