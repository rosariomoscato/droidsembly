# Droidsembly 0.4.0-beta.2 — published / pubblicata

**Published on `next`; public tarball verified November 6, 2026. / Pubblicata su `next`; tarball pubblico verificato il 6 novembre 2026.** `latest` remains / resta `0.4.0-beta.1`. Immutable annotated tag / tag annotato immutabile `droidsembly-v0.4.0-beta.2`: `3292f5c78483ca37eae198de93faf5da1d5cdb11`. [GitHub prerelease](https://github.com/rosariomoscato/droidsembly/releases/tag/droidsembly-v0.4.0-beta.2). No authorization for another release, dist-tag changes, website deployment or real-installation/data updates. / Nessuna autorizzazione a un altro rilascio, cambi dist-tag, deploy del sito o aggiornamenti di installazione/dati reali.

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

### Pubblicazione e verifica pubblica

La [Release 42100317893](https://github.com/rosariomoscato/droidsembly/actions/runs/42100317893), avviata dal workflow aggiornato in `main` con checkout del tag immutato, ha eseguito e superato Ubuntu, Windows e macOS Intel; il publish ha ripetuto test/build/smoke e usato OIDC, con provenance firmata (transparency log `3700388924`). Le modifiche successive al tag riguardano solo il runner Release, non il codice pubblicato.

Il 6 novembre il tarball pubblico (99 file) ha superato identità/versione/gitHead, SHA1 contro registry e log publish, SHA512 contro registry e un unico smoke installato in isolamento: CLI/help, 93 testi di licenza, browser tool, HTTP e persistenza demo (2 piani, 11 agenti, non una verifica del carico di scala). SHA256: `1d5c84af873a9d2b8bdd29f043142a16089e1707015be57dd8c0a0d5b16d2d61`. Nessuna installazione reale o demo utente è stata aggiornata o riavviata.

Restano conservati i cinque tentativi della prima Release `42054859208` senza esecuzione macOS né publish, e il verificatore pubblico del 5 novembre fermatosi dopo 15 risposte 404 fino alle 20:28 UTC, senza download/smoke. La successiva disponibilità non li trasforma in successi: nessuna ripubblicazione. La CI post-merge [42097779283](https://github.com/rosariomoscato/droidsembly/actions/runs/42097779283) **non è interamente verde**: quattro ambienti passati, ARM mai avviato per indisponibilità runner. Il titolare ha autorizzato solo questa verifica mancante; precedenti passaggi ARM PR/dev restano storici, non sostitutivi. Nessun controllo ARM eliminato, nessuna deroga a test eseguiti e falliti.

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

### Publication and public validation

[Release 42100317893](https://github.com/rosariomoscato/droidsembly/actions/runs/42100317893), dispatched from the updated `main` workflow while checking out the unchanged tag, actually ran and passed Ubuntu, Windows and Intel macOS. Publication repeated tests/build/smoke and used OIDC with signed provenance (transparency log `3700388924`). Post-tag changes affect only the Release runner, not published code.

On November 6 the public tarball (99 files) passed identity/version/gitHead, SHA1 against registry and publish log, SHA512 against registry, and one isolated installed-package smoke: CLI/help, 93 license texts, browser tool, HTTP and demo persistence (2 floors, 11 agents, not scale-load validation). SHA256: `1d5c84af873a9d2b8bdd29f043142a16089e1707015be57dd8c0a0d5b16d2d61`. No real installation or user demo was updated or restarted.

Preserved failures include the first Release `42054859208`'s five attempts without macOS execution or publication, and the November 5 public verifier that stopped after 15 HTTP 404 responses through 20:28 UTC without download/smoke. Later availability does not turn them into successes: no republication occurred. Post-merge CI [42097779283](https://github.com/rosariomoscato/droidsembly/actions/runs/42097779283) is **not entirely green**: four environments passed; ARM never started because no runner was assigned. The owner authorized only this missing verification; earlier PR/dev ARM passes remain historical, not substitutes. No ARM check was removed and no exception covers executed, failing tests.

### Known issue: intermittent timing failures

[Issue #39](https://github.com/rosariomoscato/droidsembly/issues/39) remains open. Earlier local complete suites exceeded the 5-second browser-source scan budget (up to 19.6 s) and measured a 9.92 ms median for 15 path plans against an 8 ms budget. Latest integrated-commit checks passed, but the variability's cause is unproven. No thresholds, samples or assertions were reduced. Possible intermittent validation failures and, if path-planning slowdowns also occur in application use, frame-time spikes; these timing failures do not demonstrate data loss or secret leakage. Integration into `dev` was explicitly accepted with this risk retained.

### Known risk accepted for beta.2: shutdown under load

[Issue #42](https://github.com/rosariomoscato/droidsembly/issues/42) remains **open and unresolved**. In the test with 150 workers plus the CEO (151 total), fixture shutdown exceeded the unchanged 10 s limit on Windows/Node22. Whether this represents slow writes or pending work stuck waiting is unproven. Application shutdown or restart could be slower; if it did not finish before the server's 15 s forced-exit deadline, the latest pending writes might not complete. This is a possible scenario, **not observed data loss**. The fixture timeout has not been demonstrated in real application use.

The owner explicitly accepted this uncertainty for beta.2 without claiming resolution or weakening tests, samples or timeouts. This risk acceptance does not automatically authorize publication.

Future work: investigate shutdown thoroughly and evaluate a possible agent capacity cap, for example 150. **No cap is implemented now, and 150 is not a demonstrated safe limit.** CEO inclusion, per-floor versus whole-office scope, and active versus total agents must be defined, then validated under load and reviewed. The existing 151-agent test is not reduced as a CI workaround.

## Stato dei passaggi e autorizzazioni future / Completed steps and future authorizations

- Note sui rischi integrate in `main` con PR #45; runner Release Intel integrato tramite PR #46/#47. / Risk notes merged into `main` via PR #45; Intel Release runner integrated via PR #46/#47.
- Tag e pubblicazione beta.2 autorizzati ed eseguiti; OIDC e tarball pubblico verificati. Non ripubblicare beta.1 o beta.2, non spostare il tag. / Beta.2 tag and publication authorized and completed; OIDC and public tarball verified. Do not republish beta.1 or beta.2 or move the tag.
- Issue #39/#42 ancora aperte e accettate per beta.2, non risolte; PR #43 resta draft diagnostica, non un fix. Esperimento I/O-turn drain escluso: nessun miglioramento materiale dimostrato. / Issues #39/#42 remain open and accepted for beta.2, not fixed; PR #43 remains a diagnostic draft, not a fix. The I/O-turn drain experiment is excluded: no material improvement demonstrated.
- Ogni merge/promozione, nuova pubblicazione, cambio dist-tag, deploy del sito o aggiornamento di installazione/dati reali richiede autorizzazione distinta. Non richiedere credenziali o codici. / Every merge/promotion, new publication, dist-tag change, site deployment or real-installation/data update requires separate authorization. Do not request credentials or codes.
