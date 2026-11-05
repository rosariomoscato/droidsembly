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

La candidata beta.2 e la PR di promozione hanno superato suite completa, typecheck, build e smoke del pacchetto installato su Ubuntu, Windows, macOS Intel e ARM nativo, con ulteriore Windows/Node22. Dopo il merge in `main` (`296b0ce`), la CI [42033638748](https://github.com/rosariomoscato/droidsembly/actions/runs/42033638748) ha però fallito su Windows/Node22 per il timeout di chiusura descritto nell'issue #42: le 2.762 asserzioni sono passate, ma il teardown non è terminato entro 10 s; build e smoke di quel job non sono stati eseguiti. Le successive verifiche diagnostiche sono passate senza riprodurlo: non sostituiscono il fallimento né ne dimostrano risolta la causa. La demo locale isolata ha ricevuto riscontro positivo e conservato la lingua dopo riavvio, senza riprodurre il carico di 151 agenti.

### Problema noto: rallentamenti intermittenti

[Issue #39](https://github.com/rosariomoscato/droidsembly/issues/39) resta aperta. In precedenti suite locali lo scanner del codice browser ha superato 5 secondi (fino a 19,6 s) e il calcolo di 15 percorsi ha misurato una mediana di 9,92 ms contro il limite di 8 ms. Le ultime verifiche del commit integrato sono passate, ma la causa della variabilità non è stata stabilita. Nessuna soglia, campione o asserzione è stata ridotta. Possibili verifiche intermittenti e, se il rallentamento dei percorsi si manifesta nell'app, piccoli scatti; nessuna perdita dati o fuga di segreti dimostrata da questi due fallimenti temporali. L'accettazione in `dev` è stata autorizzata mantenendo esplicito questo rischio.

### Rischio noto accettato per beta.2: shutdown sotto carico

[Issue #42](https://github.com/rosariomoscato/droidsembly/issues/42) resta **aperta e non risolta**. Nel test con 150 agenti operativi più il CEO (151 totali), lo shutdown del fixture ha superato il limite invariato di 10 s su Windows/Node22. Non è ancora stabilito se si tratti di lentezza delle scritture o di lavoro rimasto in attesa. Una chiusura o un riavvio reale potrebbe rallentare; se lo shutdown non completasse prima dell'uscita forzata prevista dal server a 15 s, le ultime scritture ancora pendenti potrebbero non terminare. È uno scenario possibile, **non una perdita dati osservata**. Non è dimostrato che il timeout del fixture si presenti nell'uso reale.

Il titolare ha accettato esplicitamente questa incertezza per beta.2, senza dichiarare risolto il problema o allentare test, campioni e timeout. Questa accettazione del rischio non autorizza automaticamente la pubblicazione.

Attività future: indagine approfondita sullo shutdown e valutazione di un eventuale tetto al numero di agenti, per esempio 150. **Nessun cap è implementato ora e 150 non è un limite dimostrato sicuro.** Andranno definiti inclusione del CEO, ambito per piano o intero ufficio e conteggio degli agenti attivi o totali, poi verificati sotto carico e tramite revisione. Il test esistente da 151 agenti non viene ridotto come espediente per passare la CI.

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

The beta.2 candidate and promotion PR passed full suites, typecheck, build and installed-package smoke on Ubuntu, Windows, Intel macOS and native ARM macOS, plus Windows/Node22. After merging into `main` (`296b0ce`), however, CI [42033638748](https://github.com/rosariomoscato/droidsembly/actions/runs/42033638748) failed Windows/Node22 on the shutdown timeout described in issue #42: all 2,762 assertions passed, but teardown did not complete within 10 s; that job's build and smoke did not run. Subsequent diagnostics passed without reproducing it: they do not replace the failure or establish its cause as fixed. The isolated local demo received positive user feedback and retained its language after restart, without reproducing the 151-agent workload.

### Known issue: intermittent timing failures

[Issue #39](https://github.com/rosariomoscato/droidsembly/issues/39) remains open. Earlier local complete suites exceeded the 5-second browser-source scan budget (up to 19.6 s) and measured a 9.92 ms median for 15 path plans against an 8 ms budget. Latest integrated-commit checks passed, but the variability's cause is unproven. No thresholds, samples or assertions were reduced. Possible intermittent validation failures and, if path-planning slowdowns also occur in application use, frame-time spikes; these timing failures do not demonstrate data loss or secret leakage. Integration into `dev` was explicitly accepted with this risk retained.

### Known risk accepted for beta.2: shutdown under load

[Issue #42](https://github.com/rosariomoscato/droidsembly/issues/42) remains **open and unresolved**. In the test with 150 workers plus the CEO (151 total), fixture shutdown exceeded the unchanged 10 s limit on Windows/Node22. Whether this represents slow writes or pending work stuck waiting is unproven. Application shutdown or restart could be slower; if it did not finish before the server's 15 s forced-exit deadline, the latest pending writes might not complete. This is a possible scenario, **not observed data loss**. The fixture timeout has not been demonstrated in real application use.

The owner explicitly accepted this uncertainty for beta.2 without claiming resolution or weakening tests, samples or timeouts. This risk acceptance does not automatically authorize publication.

Future work: investigate shutdown thoroughly and evaluate a possible agent capacity cap, for example 150. **No cap is implemented now, and 150 is not a demonstrated safe limit.** CEO inclusion, per-floor versus whole-office scope, and active versus total agents must be defined, then validated under load and reviewed. The existing 151-agent test is not reduced as a CI workaround.

## Release gates / Passaggi ancora richiesti

- Review and integrate this known-risk notes update through a PR to `dev`, then a separately approved promotion to `main`; earlier candidate integration does not include these later notes automatically.
- Review final IT/EN notes and the separate open risks #39 and #42; risk acceptance is not proof of resolution.
- Separate authorization for a version-matched tag and npm publication on `next`; beta.2 remains unpublished.
- Maintainer-approved publishing authentication/OIDC; do not request credentials or re-publish beta.1.
- Separate authorization for website or real-installation/data updates.
