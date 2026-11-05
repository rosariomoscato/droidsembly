# Indoor temporal assertions / Asserzioni temporali indoor

Local branch from `dev`. No runtime lighting change, timeout adjustment, threshold relaxation or sample removal.

The same 10,000 transitions at `1e-4` intervals still check all five scalar deltas (`<0.02`), all three channels of four colors (`<=3`), and every direction jump (`>0.01`) against both adjacent key intensities (`<0.01`). The test now evaluates these predicates directly and constructs Vitest matcher diagnostics only on failure, avoiding roughly 170,000 successful matcher constructions. Negated success predicates retain rejection of NaN scalar/intensity values; RGB conversion and direction-jump arithmetic are unchanged.

Ten additional tests inject exact scalar-boundary failures in either direction, NaN/infinite scalar values, changes in every color channel in both directions, and lit handovers on either side. Inclusive color boundaries and dark handovers are also accepted. They protect the optimized assertion driver rather than altering production behavior.

5 November 2026: **21/21 targeted tests passed**, 850 ms for the complete file; typecheck passed. Earlier unchanged full-suite evidence recorded a 5-second timeout for the temporal test. These are different runs, not a controlled benchmark or a claim of a specific speedup. A new full suite is running; do not infer it is green from the targeted result.

Full suite completed: **2,655 passed, 2 failed / 2,657; 248/250 files passed; 548.20 seconds; exit 1**. All 21 indoor tests passed in 701 ms. Remaining failures: unchanged walkways median **9.9279 ms** versus `<8 ms`; unchanged notifier browser-secret scan exceeded the 5-second timeout (reported 12,080 ms). The suite also logged an ENOENT during a temporary CEO state rename although that test passed; no real office state was involved. No failures are waived and this branch is not ready for integration.

One isolated notifier rerun preserved separately as `notifier-isolated-after-indoor.json`: browser-secret scan passed in 1,503 ms, but the push-device persistence test failed (expected 1 device after reload, received 2). This is **not** a clean notifier rerun and does not establish the timeout cause. No notifier code/tests or timeout modified.

Italiano: conservati tutti i campioni, confronti e limiti; ridotto soltanto il costo dei matcher quando le condizioni sono valide. Le nuove prove verificano il rilevamento degli errori sintetici. I 21 test indoor passano anche nella suite completa, ma questa resta rossa per walkways e notifier. Il rilancio isolato di notifier fallisce in un altro controllo di persistenza: nessuna eccezione o integrazione.
