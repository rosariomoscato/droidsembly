# MCP/Zod hardening — local evidence / Verifica locale

Branch from `dev`; not released or integrated. Direct minimum versions become MCP SDK 1.32.2 and Zod 4.6.7, including package.json (not merely the lock). The lock's other package records and Linux libc metadata remain unchanged.

## Effective bounds

The Anthropic factory currently does not expose `maxToolInputElements`. No unsupported option is passed: `handleMcp` preserves session-token lookup first, then delegates to the extracted `handleOfficeMcp` handler in `mcpHttp.ts`. This applies an iterative guard **before** `office.serve()`, transport creation and SDK validation. It counts all own object keys and array slots across the entire parsed request (including unknown fields and batches), rejects more than 10,000, and limits container depth to 64. This is deliberately more conservative than a per-tool argument budget. No input recursion or giant flattened copy is required. The HTTP parser's MCP-only byte limit changes from 4 MiB to 1 MiB; hooks stay at 64 MiB and ordinary API JSON at 1 MiB.

The existing issue schema permits 120 title and 6,000 body characters, dependency lists at most 10 entries, and small tool envelopes. One MiB leaves ample headroom for those, including multibyte text. Arbitrarily large environment records/unknown fields are intentionally no longer accepted: this is a documented compatibility restriction, not an assertion that every former input is preserved.

This bounds individual validation work; it is not a rate limiter, concurrency limit or proof against all denial-of-service attacks. Byte parsing precedes token authentication as before; parser memory is bounded independently. Embedded Claude SDK tools are not exposed through this HTTP endpoint and this guard is not claimed to validate all provider-side traffic.

## Evidence — 5 November 2026

- 49/49 targeted tests passed: 39 existing CEO tests (including in-memory MCP discovery), seven budget tests, three disposable loopback HTTP parser/guard tests.
- Exact element/depth boundaries, nested aggregate counts, unknown fields/batches, prototype-like JSON keys, 20,000-level nesting without recursive stack overflow, immutable arguments, wide requests below byte limits, oversized strings and maximum issue text including multibyte characters covered.
- Typecheck passed after all source changes. Build passed before the final package-minimum edits and additional HTTP test fixture; repeat it during final validation.
- The HTTP fixture exercises the shared parser setting and guard, **not** the actual office/token router. Actual routing/authentication/error-response integration still needs regression coverage. No real provider/service, credentials or office data used.
- Subsequent handler coverage: **53/53 targeted tests passed**, report `mcp-handler-targeted.json`; typecheck passed. Four additional tests exercise the actual extracted handler, real Streamable HTTP transport and actual Anthropic office-tool factory over disposable loopback HTTP. They verify absent-session404 precedence even for excessive collections, no server construction/business callback on budget rejection, healthy subsequent discovery, stateless fresh-server behavior, legitimate preview_env calls, and SDK schema rejection before the business callback. The fixture uses a local valid/ended token map, **not** the private CLI session registry or real office startup. No provider calls. This supersedes the earlier absence of handler/error-response coverage, but is not a complete application end-to-end test.
- Build repeated after handler extraction and final minimum-version edits: passed, including client license texts and server bundle; existing Rapier import/chunk warnings remain.
- Full suite and multi-OS validation still pending; historical indoor/walkways failures are not waived.

References: GHSA-46jr-4wx8-v453 (SDK upgrade alone leaves its optional bound off), GHSA-mrhx-c7xc-m3w5 (Zod). No npm publication, main promotion, OIDC setup or real-installation modification.

## Italiano

Versioni minime aggiornate anche nel manifest; limite effettivo applicato prima della validazione SDK senza inventare opzioni del wrapper Anthropic. Limiti: 10.000 elementi totali, profondità 64, JSON MCP 1 MiB. Gli input estremi prima accettati vengono ora rifiutati intenzionalmente. Verdi ora53test mirati e typecheck, inclusi handler/trasporto reale con strumenti offline e mappa token fittizia. Mancano suite completa e verifica multipiattaforma; non è un test end-to-end dell'ufficio. Nessuna integrazione o pubblicazione.
