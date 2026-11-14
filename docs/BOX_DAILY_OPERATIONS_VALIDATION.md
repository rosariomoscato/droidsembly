# Daily Box operations — validation and unresolved diagnostics

## Scope / Perimetro

Candidate based on reviewed `dev` `f2ee1d3`, November 14, 2026. Guided setup, verified deletion and manual pause of new cloud work; see [cloud operations](cloud.md). Documentation publication-status changes remain independent in PR #65. No release, merge, real installation update, new real Box, paid AI or credential acquisition was performed for this candidate.

## Evidence / Evidenze

- Six fake-API deletion regression cases failed on the original implementation. The candidate requires exact `get(id) === null` and a successful inventory without that ID, keeps uncertain machine state, and rechecks ownership before orphan deletion.
- Final targeted run: **73/73 PASS**, six files, including Italian literal coverage, direct admission, preparation/launch races and scheduler pause/resume with quota retention. Earlier implementation failures (misplaced guard and untranslated Resume) were preserved and corrected before validation.
- Typecheck and production build **PASS**. Fake-demo UI in Italian verified onboarding and billing warnings, pause persistence via the normal API, and a resume confirmation that keeps the setting paused until accepted. Demo stopped and port released before full-suite timing tests. No real provider/billing/deletion or visual pixel assertion is claimed.
- One ordinary full local suite on Windows Node **22.23.1**, unchanged **Power saver** plan: **289 files / 3130 test bodies PASS**, **one unhandled error**, **exit 1**, 444.75s. This is a **failed run**, not a green suite.
- Error: `EnvironmentTeardownError: [vitest-worker]: Closing rpc while "onUserConsoleLog" was pending`, associated by Vitest with `server/cloudAgents.test.ts`; association does not prove the error originated there. That fixture constructs offices without explicit shutdown, a plausible lifecycle lead rather than a demonstrated cause of this RPC rejection.
- One bounded, separately scoped verbose diagnostic of `server/cloudAgents.test.ts`: **5/5 PASS**, 8.66s, no unhandled error. This does not erase the full-run failure or demonstrate a fix. No unchanged full-suite retry, timeout/load/assertion weakening or console/error suppression was used. The candidate remains draft pending investigation/review.

## Historical investigations / Indagini storiche

**#39 remains open.** The current full run passed the scanner and walkway assertions with their existing budgets and workload. Historical slow scans and five-batch walkway failures were not reproduced. No slow-case enumeration/read/CPU profile was captured, so no unique historical cause or causal correction is established. Test scheduling and source-policy driver were not changed here.

**#42 remains open.** The current scale file, including teardown, passed with the original 10-second hook, 151 agents, fake workload and persistence-warning checks. The historical Windows Node22 stall inside awaited shutdown was not reproduced; this run is not a causal explanation or a general bound on shutdown. Existing phase/prefix observability, clock driver and assertions remain unchanged. The new Vitest RPC teardown rejection is tracked separately in this report and must not be relabeled as the historical scale failure.

**IT:** Indagine delimitata completata, non risoluzione universale: i casi storici non si sono riprodotti; nessuna correzione arbitraria o chiusura delle issue. Il nuovo errore RPC resta un limite reale della validazione locale, anche se tutti i test e la diagnosi isolata passano. Una CI successiva verde non cancella questa evidenza.

Full original logs and issue snapshots are retained in the session evidence folder; they are not publicly downloadable attachments. No authentication files or transcripts are included.
