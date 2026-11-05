# Development dependency hardening / Dipendenze di sviluppo

## Scope

Independent branch from dev7ef926a; production dependency patch remains separate and held after a notifier timeout. No app code, existing tests/thresholds/timeouts, launcher, package version, Release workflow, MIT attribution or real installation/data changes.

Direct development minimum ranges raised in the existing caret style: concurrently^10.0.6,Vite^8.3.5,Vitest^5.0.3. Reviewed lock versions:

- concurrently10.0.5→10.0.6 and its exact dependency shell-quote1.9.0→1.12.0.
- Vite8.3.1→8.3.5; required updated PostCSS8.5.32/nanoid3.3.20 and Rolldown1.2.16/native-platform bindings/@oxc-project/types0.156.0.
- Vitest5.0.2→**5.0.3**, not the available5.1.0; @vitest/mocker/@vitest/spy5.0.3. why-is-node-running3.2.2→3.2.1 is required by the new exact upstream dependency, not an accidental unexplained downgrade.
- source-map-js1.2.1→1.2.2. Unrelated magic-string1.4.5 resolution was reverted to1.4.2 before final validation. All platform/libc metadata and production package records preserved; no new direct dependency or overrides. Caret ranges do not promise every future unlocked install resolves the same toolchain as this reviewed lock.

Npm10.9.8 initially crashed in Arborist peer resolution (`edgesOut`) before modifying manifest/lock. Used **npm11.21.2 via npm-exec cache only**, not a global update; no force/legacy-peer-deps or peer-check bypass. Final clean install is deliberately attempted using the original local npm10 `npm ci` to verify lock compatibility; outcome still pending.

## Offline regression evidence

17new tests use only temporary synthetic files and inspect generated strings/ASTs. Never execute quoted shell output or injected module code, never connect to external sites or a real office.

- shell-quote GHSA-pqg4-j6r4-53mv: all four line terminators after a comment token must throw TypeError; normal literal arguments round-trip without invoking a shell.
- source-map-js GHSA-68fv-2mgg-jv7q: reject invalid/excessive indexed offsets and accumulated nested offsets at construction time, before any amplification sink; normal indexed mapping retained. No huge old-map serialization or new timing budget.
- @vitest/mocker GHSA-qxg6-89mg-rqv8: parse the generated manual-mock module using the existing Rolldown parser and verify the attacker-shaped URL is a complete literal argument. No module evaluation or WebSocket attack. Windows redirect traversal GHSA-xp26-3454-mjgp is covered by the patched version/audit, **not** a dedicated reproduction here.
- Vite GHSA-9jrq-w75r-8gcw: transform trusted inline-module HTML with attacker-shaped raw path, ensuring generated proxy URL is not cross-origin. Text only, no browser/external request.
- Vite GHSA-vfpm-58rq-9qcg: denied synthetic .env markerUVWX must not leak its first four bytes in the Wasm transformation error. Config/env loading disabled; no real secret file accessed. Ordinary same-origin HTML transformation remains functional.
- Other editor/allowlist Vite advisories are addressed by the patched version and compatibility validation, **not** individually exploited in these fixtures. Do not claim comprehensive end-to-end exploit coverage or reachability of all public mocker/middleware options in this application.

Initial baseline report had14fail/3pass: two fixture errors needed correction before upgrades (TypeScript7package exposes version information, not compiler API; indexed mapping query at its boundary returnednull). Replaced the unavailable TypeScript parser with the already-installed Rolldown AST parser and queried the mapped indexed position at column1. Reviewed baseline then **4pass/13fail of17**, all remaining failures correspond to intended security contracts (`development-deps-regressions-before-reviewed.json`). Original diagnostic baseline retained, not overwritten.

Provisional updated install: **17/17passed**, report`development-deps-regressions-updated-provisional.json`. It is explicitly provisional because the unrelated magic-string lock revert still needed a clean node_modules refresh. Final chain running: original-npm clean install,17targeted tests,typecheck,complete serial suite,build,installed-package demo smoke, stopping on any failure. No final result or integration claimed yet.

## Audit and acceptance limits

Updated full lock audit: **4moderate entries only**, all in the **unchanged production tree** (@hono/node-server,hono,fast-uri,ip-address). Zero high/critical entries; targeted development entries no longer listed. Report`development-deps-audit-after.json`. This branch does not integrate or resolve the separately held production patch; nor does an audit prove universal absence of vulnerabilities in every installed/published copy.

Full satisfactory validation and ordinary four-OS CI remain necessary before dev integration. Point1 is not complete while its production portion is held. Point2 temporal-flake work and point3 beta preparation have not started; no main/npm/website/real-installation action.

## Clean-install full-suite outcome

Original local npm10 clean install **passed** with the npm11-generated lock; no peer-check bypass required. All17targeted tests and final typecheck passed. Complete serial suite then **failed:2,703passed/1failed of2,704;256/257files;647.97seconds;exit1** (`development-deps-full-suite.json`). All17new regressions passed in the full suite. The unchanged notifier browser-secret scan exceeded its5-second timeout (reported7,714ms). Walkways median3.4124ms passed<8ms, with all five samples retained in the report.

The command stopped at that failure: final build/smoke in that chain did not run. This branch is held locally, not integrated, with no retry-until-green, timeout change or prior exception. The same scan timed out on the independent production candidate; no dependency-causality proof is claimed. Point1 is now explicitly suspended pending investigation of the common validation blocker as point2; beta/release work has not begun. The dependency candidates remain separate from any temporal fix and must be revalidated later.

## Italiano

Aggiornamento mirato del solo toolchain di sviluppo, con Vitest bloccato nel lock alla patch5.0.3 e senza modifiche ai test esistenti. Corrette prima le due imprecisioni del fixture; baseline4passati/13falliti, poi17test mirati provvisori verdi. Audit ora senza voci alte/critiche; restano le4moderate di produzione, sospese su un altro branch. Npm11 usato soltanto dalla cache per un errore interno di npm10; installazione pulita finale e validazione completa ancora in corso. Nessun passaggio ai punti2/3 o modifica all'installazione reale.
