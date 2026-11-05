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

## Italiano

Aggiornati soltanto `body-parser` e la sua dipendenza `qs` nel lockfile; conservati metadati piattaforma, parser e limiti applicativi. I tre test di errore tardivo falliscono prima e passano dopo la modifica; tutti i 12 test HTTP sono verdi. Typecheck/build passati, ma suite completa **2.657 passati e 2 falliti** in indoor/walkways: modifica mantenuta separata, nessun aggiramento dei controlli o pubblicazione. Nessun accesso all'ufficio reale; l'errore del decompressore è riprodotto in modo sintetico sul fixture isolato, non tramite un attacco a un servizio reale.
