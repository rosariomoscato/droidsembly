# State shutdown persistence / Persistenza stato in chiusura

## Journal close follow-up — local candidate, not accepted

After correcting the test gate type, typecheck and **37/37 tests across five files passed** (`journal-close-targeted-after-typed.json`, 40.33s): journal16, sample6, stateShutdown4, stateFile1, CEO-runtime10. No skips, threshold changes or warning suppression. This validates the focused local lifecycle candidate only, not the previous full-suite timing failures or all historical ENOENT causes. The original 12/14 baseline and failed typecheck are retained.

Deterministic original-runtime baseline `journal-close-contract-before.json` failed the two new close-boundary contracts, while all 12 existing journal tests passed. After completed close, an event plus tick increased lines 1→2 and writes 1→2; while final rename was gated, a late event plus tick increased lines 2→3 and writes 1→2. Thus close did not prevent late writers. This is a concrete lifecycle defect, not proof of the sole cause of historical ENOENT failures.

Local uncommitted follow-up marks the instance stopped before close drains its existing writes; record/tick ignore late events. start checks the boundary both before and after asynchronous pruning so a closed instance cannot rearm its timer or reopen a segment. Existing pre-close final flush, warning/error handling, file format, read/prune/sample APIs and new-instance restart remain unchanged. Two additional contracts cover start after close and close during gated startup pruning. Existing tests already exercise restarting via a new Journal instance. No timer budget relaxed or secret/data output added.

Typecheck and five-file focused validation now running; outcome not yet known. All earlier complete-suite failures remain blockers. No push, integration or release. Italiano: riprodotte nuove scritture durante/dopo chiusura; candidato locale blocca eventi/timer tardivi e riapertura dello stesso journal. Non prova la causa unica degli ENOENT; validazione ancora in corso.

First follow-up validation stopped at typecheck (TS2322): the test-only mocked prune gate returned Promise<void> rather than Promise<number>. No tests ran in that job. Corrected only the gate result to numeric zero; restarted typecheck/focused validation with a distinct report name `journal-close-targeted-after-typed.json`. Original failed job output retained; no runtime change or assertion relaxation for this correction.

## Reproduction and scope

Isolated candidate from dev5ef2f52. Original CEO-runtime/state-file/journal baseline passed23/23tests (`state-lifecycle-original-baseline.json`),without reproducing the earlier ENOENT. That earlier failure remains evidence,not disproved by a passing baseline.

Two deterministic new tests fail the original shutdown behavior (`state-shutdown-contract-before.json`): a settings change during releaseClis remains only in memory when shutdown returns (disk language en instead of it),and a callback after shutdown schedules a new1500ms save timer. No random delay,timeout change or filesystem removal while a test's own writes remain pending. This demonstrates a lifecycle defect that could allow stale writers to race a replacement or test teardown;it does NOT prove the sole root cause of every historical state/journal ENOENT.

## Candidate contract

- Enter a terminal stopping state before starting shutdown;save() no longer arms new delayed state writes while stopping or after shutdown.
- Preserve the original early state save and cleanup order,then await one final queued state save after resource release,also when cleanup rejects. Existing write-error warnings remain,not hidden.
- Concurrent/repeated shutdown calls share the same promise and first restart choice. A failed shutdown remains failed;repeated calls do not retry cleanup or rewrite a replacement office's state. The object is terminal,not restarted in place.
- Four focused tests cover the two reproduced cases,shared shutdown and final persistence on cleanup rejection without swallowing the cleanup failure. Only synthetic backend callbacks and isolated temporary state paths. Private writer access exists only for defensive fixture cleanup against the old behavior.

Not a guarantee against arbitrary external changes,multiple live independent instances writing one path,crash/power loss,write failures,or callbacks occurring after the final serialized snapshot. Late callbacks may still mutate the old in-memory object;they must not schedule state writes. No changes to serialization/file naming,deps,license,i18n,launcher or real data. Journal record/close lifecycle and background task cancellation remain separate investigations;this patch does not close all persistence work.

## Validation status

Four new contracts plus original23compatibility tests **passed27/27tests,4/4files**,no skips/filtering (`state-shutdown-targeted-after.json`);typecheck passed. This targeted run did not emit the earlier ENOENT,not proof that all rename failures are resolved. Complete serial suite/build/package smoke now running;ordinary four-OS CI required before integration. Original negative evidence retained;no full acceptance claimed yet.

## Complete-suite blocker (retained, not waived)

Full serial suite **failed:2,740passed/1failed of2,741;259/260files;1,092.29seconds;exit1** (`state-shutdown-full-suite.json`). All4new shutdown cases,CEO-runtime,state-file and journal cases passed. Failure is the unchanged source-policy scan:explicit elapsed assertion measured18,064.4087ms versus the preserved5,000ms limit. This confirms PR36's synchronous driver is not universally stable either;the explicit assertion correctly catches blocking that could evade an asynchronous timer. No causal baseline establishes that the shutdown change caused this scan delay.

The chained build/package smoke did NOT run. Candidate is held,not pushed or integrated;no retry-until-green,no timeout increase,no assertion/sample/coverage reduction. Walkway median6.2798ms passed unchanged<8ms with batches[5.5302,6.0141,7.4412,6.5051,6.2798]. Passing shutdown regressions do not make the complete result green or establish the historical ENOENT resolved. Further read-only I/O diagnostics may explain the scan stall,but must not be reported as unchanged-suite acceptance.

## Italiano

Riprodotti due difetti senza attese casuali: stato aggiornato durante il rilascio CLI non salvato al ritorno dello shutdown,e nuovo timer permesso dopo la chiusura. Modifica mirata con blocco dei timer,ultimo salvataggio atteso e shutdown condiviso/idempotente. Mirati27/27e typecheck passati,ma suite completa2740passati/1fallito:scansione sorgenti18secondi contro il limite invariato5secondi. Build/smoke non partiti;branch sospeso,nessuna integrazione. Non dimostra l'unica causa degli ENOENT precedenti né risolve tutto il ciclo journal;nessun rilascio o accesso ai dati reali.
