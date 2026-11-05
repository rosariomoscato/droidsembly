# Production dependency advisories / Avvisi delle dipendenze di produzione

## Scope and versions

Focused branch from `dev` commit7ef926a, independent worktree/dependencies. Only four lock records change; package.json, app routes, limits, tool schemas, versions, Release, MIT attribution, IT/EN and launcher/data behavior are untouched. All14Linuxlibc arrays incidentally removed by npm10 were restored; structural comparison verifies every other package record and root manifest unchanged.

| Package | Before | After | Dependency route |
| --- | --- | --- | --- |
| @hono/node-server | 2.1.1 | 2.1.6 | MCP SDK |
| hono | 4.13.9 | 4.13.16 | MCP SDK |
| fast-uri | 3.1.8 | 3.1.9 | AJV |
| ip-address | 10.7.2 | 10.7.6 | express-rate-limit |

No major upgrades, new direct dependencies or overrides; notably fast-uri remains3.x, despite4.x being available. Runtime ranges already permit these patches. This lock controls checkout installs, not independently resolved dependencies of every published consumer. No npm release or real installation/data/site modification.

## Advisory reachability and offline evidence

- GHSA-rmxm-3fg6-px4f and GHSA-5r4p-p66f-jhc7 concern a second decode in Hono's static middleware. The app uses Express and no direct Hono serveStatic import was found in server code; that observation is not proof about every transitive execution path. Regression fixtures exercise both actual Hono adapters using a fake file root/in-memory request dispatch: normal/private and encoded-private paths retain403, malformed `/%%37%30rivate/marker.txt` must not serve the private marker. Before patch both adapters returned200; after patch404. Ordinary percent-encoded spaces and Unicode remain served. The upstream fix deliberately rejects remaining percent signs by default; this potentially changes behavior for percent-containing static filenames. No opt-out or real app static-route behavior was changed here.
- Fast-uri GHSA-w74x-v6f9-j3xg,GHSA-xhq7-xmqj-769h,GHSA-wjr9-j795-jxcr,GHSA-333x-w4r6-6crp: test encoded schemes, relative-reference meaning, malformed authorities and schemeless suffix serialization; retain ordinary URL/URN behavior. No direct fast-uri call was found in server source; AJV consumes it transitively. These fixtures are library regressions, not demonstrated XSS/SSRF in the office.
- GHSA-rxp7-6hxx-x8q5: Address6 used a quadratic legacy zone regexp. Tests assert the deprecated regexp is not invoked, then reject100,000percent signs followed by each of four line terminators. The old version fails the mechanism assertion on512characters before the large input is attempted. No new timing threshold/timeout and no intentional long-running vulnerable ReDoS. Valid IPv4/IPv6/scopedIPv6 remain accepted. This verifies the changed mechanism, not a universal performance bound or proof that arbitrary body data reaches it in this app.

## Results and test-contract correction — 5 November 2026

- Fresh before audit: **4moderate production package entries**, seven underlying advisory records. Full initial22-case regression driver: **4passed/18failed**, before dependencies changed.
- Initial updated-driver run: **60/65passed,5failed**, including existing CEO/realMCP-handler compatibility. Five failures exposed two incorrectly specified expectations: resolve() now **throws on a malformed scheme** rather than returning a harmless value, and suffix serialization must be tested with a component whose scheme is omitted, not normalization of an already scheme-bearing raw string. Reviewed upstream commit39e6493c1356f30a0084171627eb266786e1620e and actual API behavior before correcting the fixture.
- The corrected five URI contracts were independently probed against unchanged fast-uri3.1.8 in another isolated worktree: **all five fail** (`production-deps-reviewed-uri-old-probes.json`). The discarded first updated-driver result remains retained (`production-deps-regressions-after.json`), not overwritten or disguised as a dependency defect.
- Corrected targeted driver: **65/65passed** (22dependency,39CEO,4actualMCPHTTP handler tests), report`production-deps-regressions-after-contract-review.json`. Final typecheck passed after making the fixture middleware async to match Hono's MiddlewareHandler type. No application code or preexisting assertions changed.
- Updated `npm audit --omit=dev --json`: **zero production entries**, report`production-deps-audit-after.json`. This is registry/lock evidence at a point in time, not proof of zero vulnerabilities or exposure in every deployed installation.
- Full local serial suite **failed**: **2,708passed,1failed/2,709;255/256files;657.56seconds;exit1**, report`production-deps-full-suite.json`. All22newdependency tests passed. Failure: unchanged notifier browser-secret scan exceeded5seconds (reported7,488ms). Walkway batches[3.3127,3.7368,4.2464,3.2587,3.2632]ms,median3.3127,original<8ms assertion passed. The chained build/smoke did **not** run because the command correctly stopped at the failing suite. No causal baseline comparison establishes why notifier timed out and no old exception is reused. This branch is held, not pushed/integrated; preexisting notifier failures are not a waiver. Build/smoke may be checked independently for packaging evidence, but cannot make this full-suite result green. Default four-OS CI and satisfactory full validation remain necessary.

This addresses only the production portion of the owner's new point1. Development dependency advisories (including concurrently/shell-quote and Vite/Vitest/source-map-js) remain for a later focused branch within point1. Do not call point1 complete or advance to temporal-flake investigation/beta preparation from this targeted result.

Separate packaging verification after the failed full suite: **build and installed-package demo smoke passed**, including CLI/help,93bundled license texts,2floors/11agents and isolated persisted demo state. Existing Rapier/chunk warnings and a build-timing advisory remained. This packaging result does **not** clear the notifier timeout or authorize integration; no old exception, assertion change or full-suite retry was applied.

## Italiano

Aggiornati soltanto quattro pacchetti transitivi nel lock, mantenendo versioni principali, manifest e metadati piattaforma. Audit di produzione da4voci moderate a0. Test offline riproducono difetti delle librerie, non attacchi dimostrati all'ufficio. Due aspettative iniziali URI erano errate: corrette dopo verifica del contratto, con risultati negativi e vecchie-versioni conservati;65test mirati e typecheck verdi. Suite completa**2708passati/1fallito**,timeout notifier invariato; build/smoke non eseguiti dalla catena interrotta. Modifica sospesa senza deroghe o ripetizioni fino al verde; resta la parte sviluppo del punto1, non sono iniziati i punti2/3. Nessun rilascio o accesso ai dati reali.
