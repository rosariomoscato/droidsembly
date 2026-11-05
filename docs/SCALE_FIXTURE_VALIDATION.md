# Scale fixture shutdown / Chiusura fixture di scala

## Evidence and scope

Independent test-only branch from accepted dev5ef2f52,not the held state-shutdown or telemetry candidate. Earlier instrumented full suite emitted journal ENOENT for the scale fixture after its test passed. Original scale afterAll reset fake timers and recursively removed home without awaiting office shutdown. This ordering allows pending journal writes to lose their directory;it is a concrete teardown gap,not proof of the cause of every recorded state/journal error.

Standalone original scale baseline passed1/1test,80,352msfile duration (`scale-teardown-original-baseline.json`),without reproducing ENOENT. Retain that observation and the earlier failure;do not describe the baseline as a deterministic ENOENT reproduction.

## Candidate

Keep the created office available to afterAll. A test-only helper awaits shutdown before removal;failed shutdown propagates and retains the directory for diagnosis. Three deterministic helper cases verify a blocked shutdown prevents removal,a rejected shutdown preserves the fixture,and removal errors propagate. These test the NEW helper contract,not a claimed old-helper regression.

Scale teardown restores ordinary logging before shutdown,forwards warnings rather than hiding them,and asserts no state/journal persistence warnings before removing files. A failed close/warning check retains the directory. Fake timers are cleared/reset and mocks restored even on cleanup failure. Gameplay logger suppression during measurement is unchanged.

No production-runtime changes,serialization/dependency changes or test exceptions. Original10floors/15agentsperfloor(151total),busy-agent assertions,5-second startup fake-time advancement,2-minute workload plus1-minute traffic sample,snapshot600,000byte budget,traffic80,000bytes/sec budget,and120-secondtest timeout are unchanged. No hook timeout increase. No real services or installation/data access.

This waits the existing accepted Swarm.shutdown contract;it does NOT claim full cancellation of every background operation or fix Journal.close semantics. Held state-shutdown changes remain separate. Scanner18second stall,walkway performance failure and skyLayout timeout also remain open.

## Validation status

First candidate run **failed its afterAll hook at the unchanged10,000ms hook limit**,despite4/4test assertions passing (scale1/helper3;`scale-teardown-targeted-after.json`). The chained typecheck did not run. This is a failed suite,not an accepted fix,and no hook timeout is increased. Fixture removal waits shutdown and therefore did not proceed past the blocked close. Investigate whether fake-clock timers or expensive/pending writes prevent shutdown completing;no cause proven yet.

Temporary phase logging localized the wait (`scale-teardown-phase-diagnostic.json`):typecheck passed,state save205.5ms,journal close4.0ms,then terminal save started with243pending fake timers and did not finish before the unchanged10-secondhook timeout. All4test assertions passed,but the suite FAILED again. AgentTerminal.save awaits flush(),which schedules xterm asynchronous parsing;the fake clock remains frozen during the awaited shutdown. This identifies the blocked shutdown phase,not every possible rename error cause.

Follow-up candidate drains timers already due at the same fake instant with advanceTimersByTimeAsync(0),clears future gameplay timers and restores real time BEFORE awaiting shutdown. Workload measurement has already ended;none of its sampling periods or assertions change. A new real-AgentTerminal test verifies a flush is pending with the clock frozen,zero-time advancement drains its text without changing Date.now,and a subsequent real-clock flush retains the text. Temporary phase spies are removed;diagnostic output/failures retained. Typecheck plus scale/helper5tests are running (`scale-teardown-live-clock-after.json`);no result claimed yet. No timeout increase or unrelated runtime change. Full suite/build/smoke and ordinary four-OS CI required before integration.

## Italiano

## Complete-suite result: candidate held

Ordinary-config serial suite **failed:2,741passed/1failed of2,742;259/260files;874.07seconds;exit1** (`scale-teardown-full-suite.json`). Scale test including awaited teardown passed (body63,969ms,file69,167ms),and all5helper tests passed. No scale journal ENOENT was observed in this execution;not proof of general persistence stability.

Failure is unchanged notifier source scan:explicit measured9,535.9273ms against the preserved5,000ms limit. No baseline establishes that scale teardown caused it (scanner ran before scale). The command stopped:build/smoke did NOT run. Walkway median3.4004ms passed unchanged<8ms with batches[5.4800,5.6281,3.4004,3.2756,3.2675];earlier walkway/sky failures remain recorded elsewhere.

Candidate held locally,not integrated,no timeout/assertion/coverage waiver or unchanged acceptance retry. Further filesystem tracing is diagnostic only,not a retroactive green result. State-shutdown candidate remains separately held;point2 incomplete and beta preparation not started.

## Parser continuation evidence and targeted result

Transition diagnostic again failed the unchanged10shook limit (`scale-teardown-transition-diagnostic.json`):zero-time drain7ms,real-clock restoration10ms,state208.6ms,journal0.84ms,first terminal flush started but never completed. Xterm's WriteBuffer yields parsing after12ms and schedules a continuation;discarding fake timers can strand that pending buffer even after real clocks return.

New deterministic real-xterm test forces this existing yield branch using a temporary performance.now spy. It proves zero-time advancement alone leaves a pending continuation;one further fake-clock tick drains both synthetic text chunks,and subsequent real-clock flush retains them. This spy is confined to the helper test,not the scale measurement or normal runtime.

Final candidate requests a flush of every existing scale terminal,waits for those promises while advancing fake time1ms at a time,under an added5secondbound within the unchanged10secondhook. All of this is AFTER the original measurement and its assertions. Then clears future gameplay timers,restores real clocks,awaits office shutdown,checks forwarded persistence warnings,and removes its own home. Parser errors and cleanup errors propagate;failed shutdown/warning checks retain the fixture. Test-only private runtime-map access enumerates terminals,not real installation data. Temporary phase wrappers removed;all negative reports retained.

Typecheck and all6targeted tests **passed** (scale1/helper5,2files;`scale-teardown-parser-drain-after.json`). Scale test body82,562ms,file88,837ms,teardown stayed inside the original10secondhook. Full ordinary-config serial suite/build/installed-package smoke are now running;not acceptance yet. Scanner stalls,walkway/sky timing failures and held state-shutdown candidate remain separate unresolved work.

## Live-clock attempt still blocked

The live-clock candidate passed typecheck and5test assertions,but scale afterAll again failed the unchanged10-secondlimit (`scale-teardown-live-clock-after.json`). The minimal real-xterm contract passed;this does not prove draining zero fake time suffices for all151agents,or that the clock transition preserves every pending parser task. No acceptance or unchanged-suite retry applied.

Added diagnostic-only markers before/after zero-time drain,clock restoration,state/journal/terminal save,and parser flush start/completion counts (no terminal text). A distinct instrumented scale execution is pending (`scale-teardown-transition-diagnostic.json`);its outcome cannot retroactively clear prior failures. No workload/assertion/timeout changes.

Correzione solo del teardown:attendere shutdown prima di eliminare la cartella,propagare errori e conservare il fixture se la chiusura/scrittura fallisce. Baseline singola passata,ma precedente ENOENT conservato. Carico,budget,numeroagenti e timeout invariati. Validazione in corso;nessuna integrazione o modifica all'installazione reale.
