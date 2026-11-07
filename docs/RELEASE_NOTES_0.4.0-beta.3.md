# Droidsembly 0.4.0-beta.3 — candidate / candidata

**Not published. / Non pubblicata.** Prepared from `dev` commit `b10b23b54038384e08bee552e1463c5dc9889b5c`; the same runtime tree was promoted into `main` as `f581a2623a22f41c81779792695551b1a6a77509`. This branch changes package/lock version, release documentation and the missing notification-test scheduling assignment with a regression; no production runtime, dependency or workflow changes. It does not authorize a merge, promotion, release tag, npm publication, dist-tag change, site deployment or real-installation update.

## Italiano

### Novità rispetto al pacchetto beta.2 pubblicato

- **Terminali:** le richieste periodiche sovrapposte condividono il batch attivo, anziché moltiplicare il limite di otto salvataggi concorrenti. Il salvataggio finale attende il batch in corso, conserva l'ultimo contenuto e include tutti i terminali; durante lo shutdown non partono nuovi batch periodici.
- **Anteprime PR:** la pulizia per inattività espone il completamento effettivo di arresto/rimozione. Il test attende tale completamento invece di una pausa fissa di 20 ms; una regressione verifica l'assenza di doppi stop.
- **Test:** dieci file completi sensibili ai tempi vengono eseguiti in una fase seriale dopo quella funzionale, includendo ora il controllo delle notifiche con limite I/O esplicito di cinque secondi, prima rimasto nel gruppo parallelo. Una nuova regressione ne vincola l'assegnazione. Conservati tutti i casi precedenti, carichi, campioni, soglie, isolamento e timeout originali. Lo scheduling da solo non era sufficiente per i vecchi problemi terminali: il candidato include anche le correzioni runtime dimostrate sopra.
- **OpenCode:** le nuove sessioni usano il profilo primario `droidsembly`. In ripresa resta disponibile un alias nascosto `cubefarm`, con modello/variante coerenti, senza rinominare ID o riscrivere sessioni, hook, percorsi e dati storici. Le sessioni storiche possono ancora visualizzare il nome precedente.
- **Italiano:** la conferma manuale della PR spiega l'unificazione dei commit e usa “Integrare la PR…”, “Integra unificando i commit” e “Annulla”. Comportamento del merge e testo inglese invariati.
- **Documentazione:** stato della pubblicazione beta.2 e verifica del tarball pubblico registrati in IT/EN.

### Verifiche precedenti e gate del nuovo pacchetto

Le correzioni sono state integrate tramite PR #51/#52, poi promosse con #49. Il candidato runtime combinato precedente aveva superato 2774 test in 265 file su Windows/Node22, typecheck, build e 93 testi di licenza. La CI della promozione #49 e quella post-merge MAIN hanno eseguito e superato Ubuntu, Windows Node24/Node22, macOS Intel e ARM nativo senza retry o deroghe.

Queste sono evidenze del codice precedente al cambio versione, **non una verifica già completata del tarball beta.3**. Prima della review di questa candidata servono una nuova suite completa, typecheck/build e controllo del tarball esatto installato in una cartella/home isolata, senza chiamate AI reali. La nuova CI della PR deve validare lo stesso commit proposto.

La prima suite locale della candidata beta.3 si è fermata con **2773 casi passati e uno fallito**: la scansione del codice browser ha impiegato 18,51 secondi contro i cinque consentiti, prima di build/pack. L'esito resta conservato e non viene sostituito da un retry invariato. Individuata l'omissione del file `server/notifier.test.ts` dall'elenco sensibile ai tempi, aggiunta una regressione fallita prima e passata dopo la correzione della configurazione. I 17 casi mirati di configurazione/notifiche passano, con scanner originale e controllo cinque secondi invariati; questo non sostituisce la nuova suite completa. Una singola misura diagnostica in quiete legge 586 file senza violazioni in circa 0,47 secondi: non prova la causa unica della variabilità osservata. Gli esiti completi del candidato corretto e del suo tarball vanno registrati separatamente.

La verifica successiva ha superato il controllo notifiche in 0,49 secondi, ma si è fermata su cinque casi workspace con errore Git `Filename too long`: il runner locale aveva annidato troppo la cartella TEMP. Una coppia diagnostica con identico comando e contenuto riproduce l'errore al percorso lungo e passa con la radice temporanea isolata più corta (212 caratteri proiettati invece di 260). Corretto soltanto il percorso del runner; nessuna modifica al Git globale, al codice workspace, ai casi, alle soglie o al carico. Anche questi fallimenti restano registrati e non sono presentati come successi del pacchetto.

### Rischi e compatibilità

- Issue #39/#42 ancora aperte: le correzioni eliminano difetti riprodotti ma i successivi risultati verdi non dimostrano risolta ogni instabilità intermittente o variante di shutdown.
- Il precedente fallimento del test CEO su Windows Node22 resta una causa non dimostrata risolta. Le PR diagnostiche #43/#50 sono state chiuse come **archiviate, non risolte e non integrate**; commit, log e fallimenti conservati.
- Nessun nuovo cap agenti. Il test di scala resta a 151 agenti; 150 non è una soglia sicura dimostrata.
- Compatibilità Node >=22, comando `droidsembly`, launcher, percorsi dati e sessioni storiche preservati. Nessuna migrazione automatica dei dati o modifica delle dipendenze per questa preparazione.
- Le avvertenze note della build su dimensione del chunk Office/import Rapier non sono dichiarate risolte da questa versione.

### Pubblicazione e aggiornamenti

Canale previsto `next`; `latest` non viene modificato. Al momento della preparazione il registry espone ancora beta.2 su `next` e beta.1 su `latest`, entrambe prerelease. Beta.3 non è pubblicata e non ha un tag.

Il tag immutabile `droidsembly-v0.4.0-beta.2` rimane sul commit `3292f5c78483ca37eae198de93faf5da1d5cdb11`. Non ripubblicare beta.2 o spostarne il tag. Per beta.3 occorrono approvazioni distinte di integrazione in `dev`, promozione in `main`, tag corrispondente e workflow Release manuale.

L'installazione reale non viene aggiornata dalla preparazione. Prima di un eventuale aggiornamento: identificare installazione e profilo effettivi, verificare un backup recuperabile, approvare una finestra di arresto e definire il ritorno al pacchetto/dati precedenti. Questa è una pianificazione, non un backup reale già eseguito né un rollback provato sul profilo reale.

## English

### Changes since published beta.2

- Coalesce overlapping periodic terminal-save requests into the active batch, preserving the eight-operation bound. Queue the final all-terminal save behind it and retain the latest screen; no new periodic batch starts during shutdown.
- Expose completion of idle PR preview cleanup; await the actual cleanup instead of a fixed 20 ms sleep and regress duplicate stops.
- Run ten complete timing-sensitive test files serially after functional tests, now including the notification source-policy test with its unchanged five-second I/O deadline. Add a regression for that previously missing assignment. Preserve previous cases, workloads, samples, budgets, isolation and timeouts. Scheduling alone did not fix the earlier terminal defects; the demonstrated runtime fixes are included.
- Use `droidsembly` for new OpenCode sessions, keeping a hidden `cubefarm` compatibility alias only on resume. Preserve IDs, model variants, hooks, paths and historical data; old sessions may retain the old label.
- Clarify Italian manual squash-merge wording and cancellation without changing merge behavior or English text.
- Record beta.2 publication and public-tarball verification in bilingual release documentation.

### Evidence and remaining gates

Previous combined runtime validation passed 2774 tests in 265 files on Windows/Node22, typecheck, build and 93 license texts. PR #51/#52 and promotion #49 were integrated with separate approvals; promotion/post-merge CI passed Ubuntu, Windows24/22 and Intel/ARM macOS without retries or exceptions. **Those results do not validate the new beta.3 versioned tarball.** Run this candidate's complete local gates, isolated exact-tarball installed smoke and ordinary PR CI before review.

The first local beta.3 suite passed 2773 cases and failed one: the browser-source scan took 18.51 seconds against the original five-second budget. Build/pack were not run. Preserve that result. A new configuration regression failed before and passed after assigning the entire notification test file to the existing quiet phase; 17 targeted cases pass with the original scanner/assertions/deadline unchanged. One quiet diagnostic read all 586 files without violations in about 0.47 seconds; this does not establish a unique root cause. Neither targeted checks nor the quiet diagnostic replace the corrected candidate's required complete validation.

The next run passed the notification scan in 0.49 seconds but failed five workspace cases with Git `Filename too long`: the local runner's TEMP root was excessively nested. A single diagnostic pair reproduced the failure at the long path and passed the identical Git command/content with a shorter isolated root (projected paths 212 instead of 260 characters). Only the external runner path was corrected; no global Git setting, workspace code, test case, budget or workload changed. Preserve these failed-run records separately from the next candidate validation.

Issues #39/#42 remain open. Historical failures, including the unresolved-cause CEO startup failure, remain evidence; diagnostic PRs #43/#50 were archived, not merged or claimed fixed. No new agent cap, dependency resolution changes, data migration or relaxed test thresholds. Node >=22 and existing command/launcher/data compatibility remain. Known chunk/Rapier build warnings are not claimed fixed.

### Scope and approvals

Beta.3 is an unpublished prerelease candidate intended for `next`, not a stable release. Existing public versions/channels and beta.2's immutable tag remain unchanged. Integration into `dev`, promotion to `main`, matching tag/manual Release publication and real-installation/data updates require separate approvals. Preparation neither updates production nor proves a production rollback; validate recoverable backup and rollback planning before any later real update.
