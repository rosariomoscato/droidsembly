# Droidsembly 0.4.0-beta.2 — candidate / candidata

**Not published. / Non pubblicata.** Preparation from accepted `dev` commit `5e15a875037535c7c8d23836db216b73067daa1a`. Version/channel preparation is not authorization to promote `main`, create a release tag, dispatch publication, update the website or replace an existing installation.

## Italiano

### Correzioni principali

- Salvataggi dello stesso terminale serializzati per evitare sovrapposizioni sul file temporaneo; terminali indipendenti salvati con parallelismo limitato per singolo batch.
- Chiusura dell'ufficio con ultimo salvataggio dello stato atteso e blocco dei nuovi timer di salvataggio dell'istanza in chiusura.
- Journal protetto dagli eventi tardivi e dalla riattivazione dopo la chiusura, mantenendo il drenaggio delle scritture accettate.
- Completamento delle notifiche immediate osservabile fino alla conclusione del trasporto e della persistenza associata.
- Aggiornamenti di sicurezza delle dipendenze e regressioni per parser HTTP, input MCP e strumenti di sviluppo. L'audit del commit integrato precedente rilevava zero vulnerabilità: è una fotografia, non una garanzia futura.
- Miglioramenti di verifica del teardown e riuso di workspace A* completamente azzerati tra ricerche, senza memorizzare percorsi precedenti.

### Compatibilità e verifiche

Rimangono Node >=22, comando `droidsembly`, canale beta `next`, launcher, percorsi dati e formati di persistenza esistenti. Nessuna migrazione automatica. Attribuzioni MIT originali, avvisi Sora/OFL e testi delle licenze delle dipendenze conservati. Interfaccia IT/EN e controlli di accessibilità mantenuti.

Il commit di partenza ha superato suite completa, typecheck, build e smoke del pacchetto installato su Ubuntu, Windows, macOS Intel e ARM nativo, con ulteriore Windows/Node22. La candidata con la nuova versione richiede verifiche proprie prima dell'approvazione: i risultati del commit precedente non la sostituiscono.

### Problema noto: rallentamenti intermittenti

[Issue #39](https://github.com/rosariomoscato/droidsembly/issues/39) resta aperta. In precedenti suite locali lo scanner del codice browser ha superato 5 secondi (fino a 19,6 s) e il calcolo di 15 percorsi ha misurato una mediana di 9,92 ms contro il limite di 8 ms. Le ultime verifiche del commit integrato sono passate, ma la causa della variabilità non è stata stabilita. Nessuna soglia, campione o asserzione è stata ridotta. Possibili verifiche intermittenti e, se il rallentamento dei percorsi si manifesta nell'app, piccoli scatti; nessuna perdita dati o fuga di segreti dimostrata da questi due fallimenti temporali. L'accettazione in `dev` è stata autorizzata mantenendo esplicito questo rischio.

## English

### Main fixes

- Serialize complete saves of each terminal to prevent overlapping temporary-file writes; save independent terminals with bounded concurrency per batch.
- Await the final office-state save during shutdown and prevent the stopping instance from arming new state-save timers.
- Stop journal event recording and startup reactivation at the close boundary while draining accepted writes.
- Expose immediate-notification completion through transport and related persistence.
- Patch dependency security issues with HTTP-parser, MCP-input and development-tool regressions. The preceding integrated commit's audit reported zero vulnerabilities: a snapshot, not a future guarantee.
- Improve fixture teardown validation and reuse fully reset A* workspaces without caching prior routes.

### Compatibility and validation

Node >=22, the `droidsembly` command, beta channel `next`, existing launchers, data paths and persistence formats remain unchanged. No automatic migration. Original MIT attribution, Sora/OFL notices and dependency license texts are retained. Italian/English UI and accessibility checks remain in place.

The base commit passed full suites, typecheck, build and installed-package smoke on Ubuntu, Windows, Intel macOS and native ARM macOS, plus Windows/Node22. This newly versioned candidate requires its own validation before approval; base-commit results are not a substitute.

### Known issue: intermittent timing failures

[Issue #39](https://github.com/rosariomoscato/droidsembly/issues/39) remains open. Earlier local complete suites exceeded the 5-second browser-source scan budget (up to 19.6 s) and measured a 9.92 ms median for 15 path plans against an 8 ms budget. Latest integrated-commit checks passed, but the variability's cause is unproven. No thresholds, samples or assertions were reduced. Possible intermittent validation failures and, if path-planning slowdowns also occur in application use, frame-time spikes; these timing failures do not demonstrate data loss or secret leakage. Integration into `dev` was explicitly accepted with this risk retained.

## Release gates / Passaggi ancora richiesti

- Candidate PR to `dev`, complete CI and installed-package verification.
- Review final IT/EN notes and the open timing risk.
- Separate authorization for `dev` → `main`, version-matched tag and npm publication on `next`.
- Maintainer-approved publishing authentication/OIDC; do not request credentials or re-publish beta.1.
- Separate authorization for website or real-installation/data updates.
