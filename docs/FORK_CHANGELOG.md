# Registro delle modifiche del fork

Questo documento raccoglie le personalizzazioni di [rosariomoscato/cubefarm](https://github.com/rosariomoscato/cubefarm) rispetto al [progetto originale](https://github.com/leonvanzyl/cubefarm). Non sostituisce la cronologia Git e non elenca le funzionalità già presenti upstream.

## Come aggiornare il registro

- Aggiungere le nuove voci in ordine cronologico inverso, raggruppate per data (`AAAA-MM-GG`).
- Per ogni voce indicare **feature**, **tipo** e una **breve descrizione**. Aggiungere commit o PR quando disponibili.
- Registrare modifiche effettivamente realizzate; tenere separate le proposte non ancora implementate.
- Specificare lo stato di integrazione: un commit locale o su un branch non implica che la funzionalità sia già su `main` o pubblicata su npm.
- Documentare verifiche e limitazioni rilevanti senza inserire credenziali, log privati o percorsi personali.

## Punto di partenza

| Riferimento | Dettaglio |
| --- | --- |
| Progetto originale | `leonvanzyl/cubefarm` |
| Fork personalizzato | `rosariomoscato/cubefarm` |
| Baseline precedente alle nostre modifiche | `157efde` — 2026-10-22, «Find and fix the freezes while walking around a floor; record hitches (#306)» |
| Prima modifica del fork documentata | 2026-10-30 |

La data della prima modifica è ricavata dalla cronologia Git; non viene usata come attestazione della data di creazione del fork su GitHub.

## 2026-11-15

### Pausa automatica Box e isolamento shell del setup — candidata

**Cloud / correzione:** controllata la pausa sia alla liberazione del task sia alla chiusura della CLI, compresi task completati lasciati sulla scrivania. Cleanup remota prima della notifica di chiusura; finalizzazione dei risultati protetta; richieste duplicate accorpate e nuovo lavoro serializzato con pausa in corso. Una callback obsoleta non cancella il record della CLI successiva. Errori di pausa segnalati senza esporre il corpo della risposta provider.

**Setup / correzione:** shell figlia `sh -c` con quoting sicuro, senza modificare verifiche, revisione marker, timeout o obbligo di exit zero. Diagnostica distingue codice di uscita e presenza marker. Probe remoti autorizzati hanno riprodotto exit 1 con `set -e` nel cmd diretto ed exit 0/1 corretti nella shell esplicita. La prova reale successiva ha completato lavoro e QA OpenCode e confermato la stessa Box paused dopo Clear desk, mediante sola lettura del provider.

**Test e limiti:** nuova copertura lifecycle, scadenza CLI a cinque minuti con clock simulato e script setup in shell locale reale con tool inerti. Il percorso dei cinque minuti non è ancora collaudato con una nuova attesa reale sul provider. Conservati i fallimenti precedenti: due regressioni inizialmente rosse, verifica estesa iniziale con 229 pass / 3 timeout / 10 test saltati per timeout di hook; successiva prova della candidata con 67 pass / 2 assertion su richieste duplicate / un timeout shell con errore cleanup albero 255. Quest'ultima ha motivato deduplica anche a livello agente; non è una prova della causa del timeout shell. Le verifiche beta.4 separate erano passate (234 test prima della diagnostica, 87 dopo correzione setup); non sostituiscono la verifica finale su dev. Esiti finali da aggiornare prima dell'integrazione. Nessuna release o promozione a main prevista da questa modifica. Dettagli funzionali e limiti in [CLOUD_IDLE_PAUSE_VALIDATION.md](CLOUD_IDLE_PAUSE_VALIDATION.md).

## 2026-11-01

### GitHub Sponsors pubblico — collegamenti preparati

Commit, push e apertura PR sul solo fork successivamente autorizzati dal manager. Branch dedicato docs/activate-github-sponsors da main `c62f181`; inclusa la checklist dei cinque punti, con il solo punto 3 in corso. Merge separato; note pregresse e documenti locali esclusi.

Schermata del manager conferma profilo Sponsors approvato/pubblico e Stripe ancora in verifica. Ricontrollati API hasSponsorsListing=true e pagina pubblica https://github.com/sponsors/rosariomoscato raggiungibile con scelta importo. Preparati localmente .github/FUNDING.yml e link reali nei README EN/IT, mantenendo sostegno volontario senza sblocchi. Aggiornato punto 3 nella checklist: profilo attivo, integrazione dei collegamenti ancora da autorizzare, accrediti non verificati. Nessun pagamento, modifica ai livelli, commit/push/PR o deploy eseguito in questa fase; altri quattro punti non avviati.

### Documentazione post-pubblicazione e preparazione release GitHub

Su richiesta di proseguire autonomamente preparate modifiche locali su `docs/published-npm-beta`, creato da origin/main `803cb9e`. README EN/IT aggiornati con disponibilità npm, comandi next/versione esatta, natura beta anche del dist-tag latest e compatibilità dati. Guida npm aggiornata con bootstrap completato, hash pubblico verificato, gestione dell'elaborazione iniziale e procedura separata per documentare la prima beta su GitHub senza ripubblicarla. Note release EN/IT preparate in Temp/opencode/droidsembly-beta1-release-notes.md; nessuna release GitHub presente al controllo.

Documentazione npm OIDC ricontrollata: primo publish necessario entro due giorni dalla creazione del publisher, quindi configurazione da coordinare con la prossima versione. Campi verificati contro release.yml: owner rosariomoscato, repository droidsembly, filename release.yml, nessun environment, permesso npm publish; workflow Node 24/npm 11 e id-token write. Configurazione remota non effettuata. Controlli di coerenza comandi EN/IT, stato pubblicazione, commit/hash e diff check superati. Modifiche solo documentali, nessun test runtime ripetuto. Commit/push/PR di documentazione e tag/release GitHub restano da autorizzare specificamente; documenti e note preesistenti preservati, nessuna nuova pubblicazione npm o deploy.

### Correzione locale avvisi delle librerie client

Smoke concluso con successo sull'esatto tarball corretto: comando installato versione/help, testi di licenza dei 93 pacchetti, browser tool, client HTTP e persistenza della demo isolata verificati (2 piani, 11 agenti simulati). Processo e cartella temporanei ripuliti. Artefatto conservato per revisione; prima di una pubblicazione occorrono integrazione autorizzata e nuova build pulita dal commit approvato.

Su autorizzazione del manager aggiunta generazione nativa Vite dell'inventario dai chunk emessi e completamento offline con `scripts/build-licenses.mjs`: testi per 93 pacchetti incorporati, ulteriori LICENSE/COPYING/NOTICE, output JSON e testo leggibile bilingue inclusi tramite allowlist dist. Per rapier3d-compat 0.19.2, react-three/fiber 9.8.1 e react-three/rapier 2.2.0 aggiunti testi upstream integrali e URL al gitHead npm esatto, vincolati alla versione. Confronto remoto dei tre testi superato (normalizzati solo terminatori di riga/fine file). Nessuna nuova dipendenza o modifica al lockfile. MIT originale conservata; termini Anthropic distinti. Guida release e documentazione tecnica EN/IT aggiornate.

Verifica su worktree temporaneo da `53f01c8` con sole modifiche locali copiate e junction alle dipendenze indipendenti della precedente build pulita, non all'installazione reale. Typecheck/build superati con consueti avvisi; 7 test mirati passati (3 nuovi per NOTICE separato, rifiuto di fallback obsoleto dopo cambio versione e accettazione del nuovo testo upstream; 4 distribuzione). Sintassi JS e diff check superati. Asset client e build server byte-identici al candidato precedente. Tarball locale corretto in Temp/opencode/droidsembly-license-artifact: 98 file, 3.255.673 byte compressi; SHA256 `25250122B23D322201896749035D140556F960F228B1F1E7140F262C1A23CAE6`. Ispezione dopo estrazione: tutti i 93 testi e gli ulteriori avvisi presenti; contenuti precedenti invariati salvo script build in package.json; percorsi di documenti/config locali assenti. Smoke aggiornato per controllare testi installati e accettare un tarball conservato, superato su questo hash. Fallimenti storici non dichiarati risolti. Note e documenti preesistenti preservati.

Commit, push e apertura PR sul solo fork autorizzati esplicitamente dal manager. Creato `fix/bundled-client-license-notices` da `origin/main` a `53f01c8`. Suite globale con un worker nel worktree di verifica: 2.630 test passati e 2 falliti, 247/249 file passati, durata 970,57 s. Fallimenti: indoor oltre il timeout di 5 s e walkways a 13,08 ms contro <8 ms; nessun errore di teardown riportato in questa esecuzione. Sono gli stessi due test già falliti nei controlli precedenti anche sulla baseline, non dichiarati risolti. Nessuna soglia o asserzione modificata. PR in bozza in attesa della CI. Merge, tag, pubblicazione npm e deploy richiedono autorizzazioni separate. Nessuna richiesta AI reale.

### Preparazione locale npm — Droidsembly beta

**Distribuzione / CLI**, autorizzata dal manager dopo conferma dell'account npm `rosariomoscato`. Creato `feat/npm-droidsembly-beta` da `origin/main` a `377fd68`, conservando note e documenti locali. Package/lock preparati come `droidsembly@0.4.0-beta.1`, solo bin pubblico `droidsembly`, accesso pubblico e canale `next`. Conservati MIT/autore originali, dipendenze e relative risoluzioni, entry point `bin/cubefarm.js`, launcher, home dati e porte predefinite.

CLI aggiornata nei messaggi e nei suggerimenti, confronto SemVer comprese beta numerate e metadati build; ricerca aggiornamenti sul pacchetto del fork e sul canale corrispondente. Chiarita la natura specifica per Claude dei controlli di login. Smoke aggiornato per installare il tarball effettivo in una directory temporanea, verificare bin/versione/help/avvisi di licenza e avviare solo demo con home isolata, porta loopback libera e controllo update disabilitato. README EN/IT aggiornati allo stato non ancora pubblicato e URL assoluti per guide/immagini; nuova guida bilingue `docs/NPM_RELEASE.md` e CONTRIBUTING allineato.

Workflow release preparato con solo avvio manuale sul fork/main, tag `droidsembly-v<version>` già esistente, convalida package/lock/canale e appartenenza del commit alla storia di main; verifiche su tre OS prima del job OIDC. Nessun bump/push automatico su main; note prima release separate dai tag upstream. Bootstrap npm e configurazione del trusted publisher restano operazioni remote da autorizzare.

Verifiche: typecheck/build superati con consueti avvisi Rapier/chunk; 32 test mirati passati su tre file (versioni/canali, compatibilità launcher e configurazione). Validatore release passato con tag corretto e rifiuto dei due tag errati provati; dipendenze del lock confrontate con HEAD e invariate; comandi EN/IT equivalenti e 54 URL di file verificati contro il checkout. Sintassi JavaScript, YAML con chiavi univoche, trigger manuale, matrice OS, dipendenza publish/OIDC e `git diff --check` superati. Parser YAML inizialmente non disponibile (anche Python assente): installato solo lo strumento `yaml` in Temp/opencode, nessuna dipendenza di progetto aggiunta. Workflow release remoto non eseguito. Nessun fallimento storico locale dichiarato risolto.

Suite globale con un worker: 2.627 test passati, 2 falliti, 246/248 file passati, durata 944,67 s, più un errore Vitest `EnvironmentTeardownError` (RPC console pendente) segnalato durante proposals. Fallimenti: indoor oltre il timeout di 5 s e walkways a 10,92 ms contro <8 ms. Ripetizione mirata indoor/walkways/proposals sul branch: 32 passati/2 falliti, walkways 9,50 ms; proposals passato senza errore di teardown. Confronto sequenziale in worktree temporaneo sulla baseline `377fd68`, con le stesse dipendenze e un worker: stessi 32 passati/2 falliti, indoor timeout e walkways 8,94 ms. Evidenza di riproduzione dei due fallimenti anche sulla baseline, non di suite globale verde né di risoluzione del teardown. PR da presentare in bozza con esiti espliciti; nessuna soglia o asserzione modificata.

Primo smoke del tarball installato: versione/help del comando `droidsembly` e avvio HTTP demo riusciti, poi controllo di persistenza fallito perché verificava il file prima del salvataggio differito. Verificato in `server/swarm.ts` il debounce di 1.500 ms; corretto solo il collaudo per attendere entro un termine limitato un JSON persistito valido e confrontarne gli ID dei repository con la demo servita. Rimosse dall'ambiente del solo smoke le variabili di scala demo ereditate, per rendere deterministico il nome del file atteso. Nessuna modifica al salvataggio applicativo o ai suoi tempi. Ripetizione dello smoke superata: tarball installato, comando versione/help `0.4.0-beta.1`, demo su porta loopback temporanea 65296, due piani e undici agenti simulati, client servito e stato persistito nella home isolata verificati; processo e cartella temporanea rimossi dal collaudo. Il primo tentativo resta registrato come fallito. Questa verifica locale Windows non sostituisce la futura CI multi-OS o la prova del workflow OIDC.

Commit, push e apertura PR sul solo fork autorizzati dal manager dopo il completamento dello smoke. Pubblicazione npm, tag, merge e deploy richiedono autorizzazione separata. Nessuna richiesta AI reale; installazione reale non toccata.

### Presentazione pubblica Droidsembly — README EN/IT e metadati

**Documentazione / metadati.** README inglese riscritto e versione italiana aggiunta con logo, screenshot demo esistenti, funzionalità, installazione dai sorgenti, avvio demo/reale con dati separati, aggiornamenti e distinzione fra PWA e backend. Droidsembly è presentato come gratuito e open source MIT con sostegno volontario; `droidsembly.com` è in arrivo e GitHub Sponsors è previsto, senza link di pagamento ancora attivi. Conservate attribuzioni a CubeFarm e Leon van Zyl.

Descrizione, homepage, repository e issue del pacchetto puntano al fork; guida contributi aggiornata con clone corretto e stato del workflow release ereditato. Nome tecnico `cubefarm`, versione `0.3.20`, licenza, autore originale, dipendenze e lockfile invariati. Nessuna modifica funzionale, a launcher o percorsi dati esistenti.

Verifiche documentali superate: 58 riferimenti locali a file/asset, comandi EN/IT equivalenti, `npm.cmd` negli esempi PowerShell, coerenza package/lock e `git diff --check`. Typecheck e build client/server superati, con avvisi Rapier/chunk. Suite completa standard: 2.620 test passati e 5 falliti su 2.625, 242 file passati su 247, durata 413,11 s. Fallimenti: timeout scale (120 s), indoor e throwSim (5 s); budget walkways (20,26 ms contro <8 ms); notifier con 2 dispositivi persistiti invece di 1. Ripetizione completa `npm.cmd test -- --maxWorkers=1`: tutti i 2.625 test e 247 file superati in 716,52 s, senza modifiche a test, soglie o configurazione. Il successo sequenziale non dimostra la risoluzione delle anomalie del run standard né dei fallimenti storici locali. Screenshot demo preesistenti ispezionati; nessun nuovo test browser o richiesta AI reale.

Commit, push e apertura PR sul solo fork autorizzati dal manager; merge e deploy richiedono autorizzazione separata. Documenti locali e precedenti note di merge/deploy esclusi dalla pubblicazione.

### Palette unificata dei popup — sviluppo locale

Estesa e verificata esplicitamente la schermata Pocket «Dispositivo e notifiche»: intestazione petrolio, pulsanti ciano, checkbox/radio/slider petrolio e focus dei campi coordinato. Accento condiviso nel corpo dei pannelli anche quando il contenitore eredita un colore precedente. Smoke finale con input touch emulato passato, catture notifiche e accessibilità in italiano a 360 px ispezionate; typecheck/build ripassati. Preferenze notifiche e accessibilità non modificate.

**UI / stile**, branch `style/unified-popup-palette`: palette condivisa petrolio `#17485c`, avorio `#faf8f5`, ciano `#65d8ef` e fondo tenue `#dceef2` per tutti i pannelli modali, conferme annidate, documenti di assunzione/rimozione, controlli del telefono, notifiche e guida. Intestazioni dei pannelli uniformate anche fuori dalla console; azioni principali ciano, azioni distruttive petrolio con testo avorio, focus coordinato. Indicatori di stato e colori identificativi dei progetti conservati. Conferme scorrevoli in altezza e pulsanti a capo su schermi stretti.

Typecheck/build client e server superati; smoke demo EN/IT a 1280/820/360 pixel passato, con nuove catture delle conferme desktop/mobile e verifica visiva della versione a 360 px. Ultima build ripassata dopo l’allineamento di notifiche e guida. Nessuna richiesta AI reale. Modifiche locali non pubblicate né installate; documenti e note preesistenti conservati.

### Utilizzo AI multi-provider — implementazione locale completata

**Feature / scheduler, telemetria e UI**, branch `feat/multi-provider-usage`, non pubblicato. Completato il collegamento Claude SDK/terminale, Codex locale/cloud e OpenCode V2 per CEO e agenti. Scoperta dai provider/connessioni effettivamente osservati, contatori deduplicati, storico persistente, valori ignoti distinti da zero e costi distinti dalla quota. Metadati consentiti senza contenuti delle conversazioni o credenziali; identificatori account opachi per host/strumento.

Gate persistenti per risorsa: avvisi rallentano nuovi issue, limiti bloccanti trattengono anche QA/fix/CEO, sessioni già avviate continuano. Condivisione fra strumenti solo tramite etichetta confermata; ripresa della sola quota selezionata, finestre multiple e associazioni conservative. Correzioni dell'autore in attesa della quota senza cambio automatico provider. Cancellazione degli avvii differiti quando il task viene cancellato. Aggiornamenti contatori coalescenti ogni cinque secondi, segnali di controllo immediati. Scheda comune EN/IT nel Centro di controllo e Pocket; HUD, Kanban e impostazioni aggiornati. Dettagli e limiti delle fonti in `docs/AI_USAGE.md`.

Verifica finale locale: build client/server e typecheck superati; 186 test mirati su 16 file passati, poi ulteriore test di cancellazione aggiunto e tutti i 7 test scheduling ripassati. Scala passata in isolamento con budget originali (snapshot 600.000 byte, traffico 80.000 byte/s). Ripetizione sequenziale delle anomalie: 139 test passati e un fallimento `walkways` (8,20 ms contro <8 ms); tutti i 44 test workspace passati. Nessuna soglia o timeout modificati. Smoke demo finale EN/IT a 1280/820/360 pixel passato: isolamento quote, ripresa selettiva, dati ignoti e agenti inattivi; automazioni off, heartbeat CEO zero, scaling approve. Demo chiusa al termine.

**Suite globale non dichiarata verde:** run intermedio 2.594 passati / 29 falliti, 227/247 file passati, 867,69 s; eseguito in parte insieme ad altre verifiche. Le aspettative obsolete ops/navigation sono state aggiornate e verificate. I rerun sopra classificano le anomalie senza attribuirle automaticamente alla baseline; resta il fallimento prestazionale walkways. I quattro fallimenti storici non sono dichiarati risolti. Nessuna richiesta AI reale, commit, push, PR o installazione reale; documenti e modifiche locali preesistenti conservati.

### Utilizzo AI multi-provider — primo avanzamento (storico)

Branch dedicato `feat/multi-provider-usage` da origin/main, nella sola copia di sviluppo. Prima implementazione della raccolta OpenCode V2: il plugin inoltra esclusivamente identità messaggio/sessione, provider/modello effettivo, timestamp, token e costo riportato. Nessun elenco fisso di provider, contenuto dei messaggi, credenziali o impostazioni provider nel payload di utilizzo. Le osservazioni ripetute vengono deduplicate e quelle aggiornate sostituite; i provider dei messaggi storici non vengono ricavati dal modello corrente. Un errore del callback di telemetria non trasforma una risposta completata in un fallimento del lavoro.

Callback collegato sia agli agenti sia al CEO, storico persistito e ultime 200 osservazioni esposte nello snapshot/WebSocket. Dettaglio espandibile EN/IT nel Centro di controllo, con valori mancanti distinti da zero, token separati e costo riportato distinto dalla quota residua. La sezione e i controlli Claude preesistenti restano tali perché lo scheduler non è ancora stato migrato. Prototipo separato del motore di quota: isolamento per strumento/provider/account/modalità, condivisione solo esplicita, pacing dei nuovi issue, blocco locale di QA/fix/CEO e ripresa della sola finestra selezionata; non ancora collegato allo scheduler o a un'API di configurazione.

Ricerca sul contratto ufficiale V2: `experimental.usage.limits` espone quote OpenCode Go e budget del workspace Console, non una lettura universale degli abbonamenti dei provider collegati. Non usato come quota generica. Restano da completare raccolta Claude/Codex normalizzata, scoperta delle connessioni e degli eventuali segnali quota disponibili, raggruppamento operativo, collegamento scheduler, riepilogo sessioni/freschezza e collaudo demo desktop/mobile. Questa voce documenta un avanzamento parziale, non una funzionalità pronta per il rilascio.

Verifiche locali: typecheck e build client/server superati; 33 test mirati passati in `aiUsage.test.ts`, `opencodePlugin.test.ts` e `pacing.test.ts`, usando esclusivamente fixture e callback fittizi. Consueti avvisi build Rapier/chunk. Nessuna richiesta AI, pubblicazione, commit, push, PR o installazione reale. I quattro fallimenti storici della suite globale non sono dichiarati risolti. Documentazione locale preesistente conservata.

### Droidsembly: marchio approvato integrato nella copia di sviluppo

**Seguito CI PR #15:** il job Ubuntu del run `41289028805` ha superato 244 file di test (2.604 test passati, 2 saltati) e poi fallito nello smoke del pacchetto, che cercava ancora `<title>cubefarm</title>`. Aggiornata l’aspettativa al titolo Droidsembly; allineata anche l’aspettativa E2E sul prefisso dei nuovi download fotografici. Nessuna modifica alla logica dell’app, alle soglie o ai test saltati. Il risultato Ubuntu non dichiara risolti i fallimenti storici locali. Correzione da validare nuovamente in CI.

La ripetizione della demo ha superato le asserzioni, incluso titolo browser, e scritto il report in `Temp/opencode/droidsembly-qa-EG6PZn`; il comando è poi scaduto durante la chiusura dopo 240 s, quindi non è riportato come esecuzione interamente riuscita. Verificata successivamente l’assenza di listener demo sulla porta 4419. Lo smoke del pacchetto completo sarà verificato dal nuovo run CI; la suite E2E fotografica non è stata rieseguita localmente per la sola aspettativa del prefisso.

**Pubblicazione autorizzata:** dopo approvazione delle schermate e prova interattiva il manager ha autorizzato commit, push e apertura PR sul solo fork `rosariomoscato/cubefarm`. Merge e aggiornamento reale richiedono autorizzazioni separate. La nota locale del precedente deploy PR #14 e i documenti `PerChatGPT.md` e `docs/STACK_E_ARCHITETTURA.md` restano esclusi dal commit.

**Esito prova interattiva:** il manager ha provato la demo e confermato che la resa va bene. Fermato soltanto il server demo PID `11876`, dopo confronto di ora di avvio, comando e proprietario della porta; confermata porta 4419 libera. Conservati dati temporanei e profilo Chrome. Commit, push e PR ancora da autorizzare.

**Prova interattiva prima della pubblicazione:** su richiesta del manager avviata demo separata a `http://127.0.0.1:4419/?pocket=0`, con Chrome in profilo dedicato. Home temporanea `Temp/opencode/droidsembly-user-demo-20261101-092202`, PID server `11876` registrato in `process.json`. Verificati backend demo, azienda Soot & Stars, due agenti fittizi, automazioni disabilitate, revisioni CEO a zero e cambi team su approvazione. Demo lasciata attiva per la prova utente, da fermare al termine controllando PID e identità del processo. App reale e preferenze audio personali non modificate.

**Approvazione visiva finale:** il manager ha esaminato e approvato le schermate dell’ingresso italiano, del wizard mobile, della modalità touch e della lobby. Ricontrollati stato Git, destinazione origin e diff (nessun errore `git diff --check`); pubblicazione ancora da autorizzare separatamente.

Approvata dal manager la revisione 02 e autorizzata l’implementazione. Ricostruzione robot-cubo arrotondata con dettaglio laterale allineato; loghi SVG chiaro/scuro con Sora incorporato, font locali con licenza OFL, favicon semplificate, PNG PWA/Apple/maskable e badge monocromatico. Componenti condivisi per marchio statico e assemblaggio singolo di circa 2,2 s, senza audio, con rispetto del movimento ridotto di sistema/app. Sostituiti simboli e diciture di prodotto in ingresso, wizard, touch, console, lobby, screensaver, foto, news/cartelloni e arcade; aggiornati titolo browser, nome PWA e notifiche. Nome prodotto coerente anche nei testi generati lato server e nei prompt, senza cambiare istruzioni operative. Precaching dei nuovi asset e font. Nome aziendale, payoff lobby, identificativi tecnici, storage, dati e launcher conservati.

**Verifiche:** TypeScript/build finali superati; **124 test mirati passati su 13 file**. Demo isolata Chrome/Playwright, porta 4419 verificata libera, nessuna AI reale: ingresso EN/IT desktop/mobile, wizard stretto, touch smartphone/tablet, lobby 3D, animazione singola e movimento ridotto, font e dimensioni export, cache icona, assenza di errori pagina e overflow interno delle schede. Corretto il pulsante italiano del wizard ritagliato su viewport stretta. Soot & Stars conservato; automazioni false, revisioni CEO a zero, cambi team su approvazione, agenti inattivi. Demo finale fermata, artefatti in `Temp/opencode/droidsembly-qa-A22EYG`; inventario, limiti e dettagli in `docs/branding/README.md`.

**Suite globale intermedia non verde:** 2.598 passati / 8 falliti (236/244 file), circa 660 s. Due aspettative obsolete del nome aggiornate e poi passate; CEO runtime e notifier passati nella ripetizione mirata. Restano nel report timeout scale/indoor/throwSim e budget walkways. Run su codice intermedio, in parte concorrente con altre verifiche: non validazione finale né attribuzione automatica alla baseline. I quattro fallimenti storici non sono dichiarati risolti. Nessun commit/push/PR o aggiornamento reale; preservati nota deploy PR #14 e documenti locali preesistenti.

### Droidsembly: inventario del marchio e prima bozza da approvare

Revisione grafica 02 su richiesta del manager: allineati cerchio e lineette del dettaglio laterale secondo la prospettiva; arrotondati gli spigoli e aggiunti volume alle facce, riflesso al visore e sfumature all’antenna. Modifiche limitate alla tavola, ancora in approvazione.

Verificato che i branch precedenti sono già integrati in main con PR #14 (`925f32a`); creato il branch locale `feat/droidsembly-branding`. Preservati nota di deploy e documenti locali preesistenti. Aggiunti `docs/branding/INVENTORY.md` e tavola offline `docs/branding/preview.html`: ricostruzione vettoriale dal riferimento PDF allegato, varianti chiare/scure, icone e proposta di assemblaggio singolo con movimento ridotto statico. Colori indicativi e font temporaneo esplicitati. Asset e rinomina visibile non ancora integrati nell’app, in attesa di approvazione grafica. Nessun commit/push, modifica all’installazione reale o richiesta AI di collaudo.

### Catalogo decorazioni coordinato alla palette finale

Modifiche su `style/cyan-decoration-catalogue`: intestazione petrolio, pannello avorio, selezione piano e pulsanti acquisto ciano. Colore progetto conservato nel piccolo numero del piano, senza colorare tutta la scheda. Nessuna modifica a prezzi, monete, disponibilità o logica di acquisto. Commit, push e apertura PR sul solo fork autorizzati dal manager; merge e aggiornamento reale richiedono conferma distinta.

TypeScript e build client/server superati. Demo isolata: catalogo IT/EN a 1280/390/820 px, colori verificati e nessun overflow interno o errore pagina; impostazioni e progressi confrontati prima/dopo e conservati, nessun acquisto effettuato. Primo click intercettato dal canvas 3D; ripetizione riuscita tramite apertura da tastiera. Screenshot in `docs/screenshots/cyan-catalogue/`. Suite globale non ripetuta; fallimenti storici invariati. Nessun deploy per questo seguito; conservati i documenti locali preesistenti, esclusi dalla pubblicazione.

### Guida in italiano allo stack e all’architettura

Creato localmente `docs/STACK_E_ARCHITETTURA.md`, con abstract, indice, capitoli, glossario e diagrammi Mermaid. Descrive client 3D/Pocket, server, runtime AI, GitHub, persistenza, preview, audio, ambienti e limiti di sicurezza, distinguendo capacità del prodotto e configurazione reale. Documento basato su codice e documentazione del fork fino alla PR #13. Il documento resta locale ed escluso dalla PR del catalogo: questa voce ne registra soltanto la preparazione. Nessun cambiamento al runtime, nessun test operativo o deploy.

### PR #13 integrata e nuova musica nell’app reale

Merge e aggiornamento reale autorizzati dal manager. [PR #13](https://github.com/rosariomoscato/cubefarm/pull/13) integrata nel solo fork con merge `5a2a883`; CI [41252744916](https://github.com/rosariomoscato/cubefarm/actions/runs/41252744916) superata su Ubuntu, Windows/macOS saltati dal workflow.

Backup `futuristic-score-20261101-PR13` nella home reale: bundle Git verificato, build precedente, launcher e dati copiati a server fermo (esclusi backup precedenti e junction). Nessun agente in lavoro/preparazione al controllo iniziale. Checkout reale aggiornato in fast-forward da `e8b890e` a `5a2a883`, TypeScript e build client/server superati, riavvio tramite launcher originale.

Verificati HTTP/HTTPS 200 e nuovo asset client. Confronto UTF-8: impostazioni, identità agenti, messaggi precedenti, colori progetto e automazioni conservati; launcher invariato. Preferenze audio del browser non modificate; nessuna richiesta AI di collaudo. Nota di deploy locale nella copia di sviluppo; le precedenti attese di autorizzazione descrivono le fasi storiche.

### Sottofondo adattivo electronic ambient: prima versione locale

**Allineamento iniziale:** app reale su PR #12 (`e8b890e`), checkout reale pulito e nessuna PR aperta nel fork. Nuovo branch `feat/futuristic-soundtrack` da `origin/main`; conservati nota locale del deploy e `PerChatGPT.md`. Allegati nella chat restano una proposta discussa, non un lavoro implementato o in corso.

- Frasi armoniche di otto battute anziché quattro, accordi aperti/add9/sospesi e variante più scura per la tensione. Calmo con piccoli arpeggi, impegnato con sequenza pulsante variata tra battute, tensione con ostinato basso, notte rarefatta. Tempo diurno 72 BPM e notturno 54 BPM.
- Timbro delle note acute dedicato al solo sottofondo: onda triangolare morbida con lieve componente sinusoidale all’ottava superiore. Firma merge aggiornata con salita sospesa e risoluzione maggiore. Pad e basso riutilizzano il sintetizzatore esistente.
- Regole degli stati, transizioni sulle battute, attenuazione sotto voce/avvisi, precedenza del jukebox, controlli audio e repertorio jukebox conservati. Nessun servizio esterno o richiesta AI.
- 116 test mirati superati (scoreMood, musicMix, audioPrefs, jukeboxSongs); TypeScript e build client/server superati. Render Web Audio offline nella demo isolata: otto battute di ogni stato e due segnali merge, senza errori pagina; picchi rispettivamente circa 0.053/0.045/0.039/0.026 e 0.063/0.076, tutti sotto il limite esistente 0.1, non modificato. Impostazioni demo confrontate e conservate.
- Anteprime WAV locali in `Temp/opencode/futuristic-score-audio`, amplificate di un fattore fisso 4 per ascolto (i controlli picco usano il segnale originale). Anteprime ottenute dal probe offline, prima del filtro finale e del volume utente; non equivalgono al mix completo dell’ufficio. Valutazione musicale all’ascolto del manager ancora da completare. Suite globale non ripetuta; quattro fallimenti storici invariati.

**Approvazione e pubblicazione:** il manager ha ascoltato e approvato le anteprime dei quattro stati, richiedendo un sottofondo discreto, e autorizzato commit, push e PR sul solo fork. App reale ancora alla PR #12; merge e aggiornamento reale da autorizzare separatamente.

**Mix in demo:** confermati volume predefinito soundtrack 30%, coefficiente di attenuazione voce/avvisi pari a -10 dB, precedenza del jukebox (sottofondo silente quando udibile), ripresa dopo spegnimento del jukebox, silenzio aprendo il telefono, ripresa alla chiusura e silenzio con M. Il controllo iniziale è stato interrotto dal riavvio dell’harness; i successivi timeout aspettavano erroneamente il sottofondo mentre il jukebox aveva precedenza. Corretto lo script di prova, controllo concluso regolarmente. Nessuna modifica al mix operativo necessaria.

### PR #12 integrata e payoff aggiornato nell’app reale

Merge e aggiornamento reale autorizzati dal manager. [PR #12](https://github.com/rosariomoscato/cubefarm/pull/12) integrata nel solo fork con merge `e8b890e`; CI [41250167132](https://github.com/rosariomoscato/cubefarm/actions/runs/41250167132) superata su Ubuntu, Windows/macOS saltati dal workflow.

Backup `company-tagline-20261031-PR12` nella home reale: bundle Git verificato, build precedente, launcher e dati copiati a server fermo (esclusi backup precedenti e junction). Nessun agente in lavoro/preparazione al controllo iniziale. Checkout reale aggiornato in fast-forward da `8d8b80c` a `e8b890e`, TypeScript e build client/server superati, riavvio tramite launcher originale.

Verificati HTTP/HTTPS 200, nuovo client e presenza di `Small droids. Serious software.` nell’asset Office servito. Confronto UTF-8: impostazioni, identità agenti, messaggi precedenti, colori progetto e automazioni conservati; launcher invariato. Nessuna richiesta AI di collaudo. Nota di deploy locale nella copia di sviluppo; le precedenti attese di autorizzazione descrivono le fasi storiche.

## 2026-10-31

### Nuovo payoff sotto il nome aziendale

Su richiesta del manager, sostituito il sottotitolo dell’insegna aziendale nella lobby con `Small droids. Serious software.`. Autorizzati commit, push e apertura PR sul solo fork `rosariomoscato/cubefarm` per `style/company-tagline`; merge e aggiornamento reale richiedono conferma distinta. App reale ancora alla PR #11. Nessuna modifica a dati o logiche.

### PR #11 integrata e installazione reale aggiornata

**Autorizzazione:** merge e aggiornamento reale approvati dal manager. [PR #11](https://github.com/rosariomoscato/cubefarm/pull/11) integrata nel solo fork con merge `8d8b80c`; CI [41249035218](https://github.com/rosariomoscato/cubefarm/actions/runs/41249035218) superata su Ubuntu, job Windows/macOS saltati dal workflow.

**Aggiornamento:** backup `soft-accents-20261031-PR11` nella home reale, con bundle Git verificato, build precedente, launcher e dati copiati a server fermo (esclusi backup precedenti e junction). Nessun agente in lavoro/preparazione prima dell’arresto. Checkout reale aggiornato in fast-forward da `182fbbe` a `8d8b80c`; TypeScript e build client/server superati, riavvio tramite launcher originale.

**Verifiche:** HTTP/HTTPS 200 e nuovo asset client confermato. Confronto UTF-8: impostazioni, identità agenti, messaggi precedenti, colori salvati dei progetti e automazioni conservati; assegnazione/merge automatici spenti, revisioni CEO a zero, cambi team su approvazione. Launcher invariato. Nessuna richiesta AI inviata dal collaudo. Nota di deploy registrata localmente nella copia di sviluppo; le note sottostanti sull’attesa di autorizzazione descrivono le fasi precedenti.

### Accenti di progetto più delicati nel piano 3D

**Autorizzazione:** il manager ha approvato commit, push e apertura PR sul solo fork `rosariomoscato/cubefarm` per `feat/soft-project-accents`, dalla PR #10 integrata. Merge e aggiornamento reale richiedono autorizzazione distinta.

- Colore del progetto attenuato nella sola resa 3D, mescolando 55% del colore originale e 45% di grigio neutro. Applicato a fascia parete, dettagli scrivanie/monitor, luci colorate delle postazioni e dello schermo app, pulsanti ascensore e decorazioni che seguono il progetto.
- Fascia decorativa delle pareti ufficio dimezzata in altezza, senza cambiare pareti, percorsi o collisioni. Insegna progetto su fondo petrolio, con piccolo indicatore nel colore attenuato e testi conservati.
- Pavimento neutro, colori salvati, interfacce 2D, robot, indicatori semantici e colori vivaci dei festeggiamenti merge preservati.
- TypeScript e build client/server superati. Demo separata con progetto arancione: screenshot di giorno/sera, insegna e postazioni verificati; impostazioni, colore progetto e automazioni confrontati prima/dopo e conservati. Nessun errore console/pagina, script concluso regolarmente. Nessuna operazione AI o modifica a progetti reali; suite globale non ripetuta, quattro fallimenti storici invariati.

**Evidenze:** [piano di giorno](screenshots/soft-project-accents/office-day.png), [insegna progetto](screenshots/soft-project-accents/project-sign.png), [postazioni](screenshots/soft-project-accents/workstations.png), [piano di sera](screenshots/soft-project-accents/office-evening.png).

### PR #10 integrata e installazione reale aggiornata

**Autorizzazione:** merge e aggiornamento reale approvati esplicitamente dal manager. [PR #10](https://github.com/rosariomoscato/cubefarm/pull/10) integrata nel solo fork con merge `182fbbe`; CI [41246324848](https://github.com/rosariomoscato/cubefarm/actions/runs/41246324848) superata su Ubuntu, job Windows/macOS saltati dal workflow.

**Aggiornamento:** backup `cyan-panels-20261031-PR10` nella home reale, con bundle Git verificato, build precedente, launcher e dati copiati a server fermo (esclusi backup precedenti e junction). Checkout reale aggiornato in fast-forward da `59bad4e` a `182fbbe`; TypeScript e build client/server superati, riavvio tramite launcher originale.

**Verifiche:** HTTP/HTTPS 200 e nuovo asset client confermato. Impostazioni, identità degli agenti e tutti i messaggi precedenti conservati; automazioni dei repository disabilitate, launcher invariato. Il confronto iniziale dei messaggi in PowerShell aveva una differenza di decodifica UTF-8; ricontrollati con Node e UTF-8 esplicito. Nel frattempo è arrivato un nuovo messaggio manager: verificata la conservazione dello storico senza richiedere l’assenza di nuovi messaggi. Nessuna richiesta AI inviata dal collaudo. Nota di deploy registrata localmente nella copia di sviluppo; le note sottostanti sull’attesa di autorizzazione descrivono le fasi precedenti.

### Console Manager e Kanban coordinati

**Autorizzazione:** approvati commit, push e PR sul solo fork per `feat/cyan-manager-kanban`, includendo la successiva richiesta di coordinare anche la chat CEO. Merge e aggiornamento reale richiedono conferma distinta.

- Chat CEO coordinata in telefono 3D e pocket: messaggi manager azzurri, risposte avorio, sfondo grigio-blu chiaro, invio ciano e navigazione telefono petrolio/grafite. Preservati gli indicatori semantici e le funzioni voce/invio.
- Collaudo chat IT/EN a 1440, 390 e 820 px superato, con messaggi fittizi predisposti nella sola fixture demo e compilazione di una bozza senza invio. Colori verificati, nessun overflow interno o errore pagina, messaggi e impostazioni confrontati prima/dopo. Build client/server e TypeScript superati. [Chat smartphone IT](screenshots/cyan-panels/chat-it-390.png), [telefono desktop IT](screenshots/cyan-panels/chat-it-1440.png).

- Intestazioni petrolio e testo avorio, accenti ciano per schede e controlli, superfici avorio. Console Manager e Kanban condividono una classe CSS circoscritta; aggiornato anche il Kanban incorporato nella modalità pocket.
- Il colore del repository resta come piccolo segno accanto al titolo Kanban e nei dettagli delle schede progetto. Conservati i colori semantici delle colonne e degli avvisi, campi, interazioni, dati e automazioni.
- TypeScript e build client/server superati. Demo isolata: apertura Console Manager e navigazione di tutte le schede, apertura Kanban in IT/EN; verificati header petrolio e accento ciano del Kanban pocket a 390/820 px, senza overflow della pagina né errori JavaScript. Script concluso regolarmente, lingua ripristinata e impostazioni/automazioni dei progetti confrontate e conservate. Nessuna richiesta AI o modifica a progetti reali; suite globale non ripetuta e quattro fallimenti storici invariati.
- Screenshot: [Console Manager IT](screenshots/cyan-panels/manager-it.png), [Kanban IT](screenshots/cyan-panels/kanban-it.png), [Kanban smartphone](screenshots/cyan-panels/kanban-it-390.png); equivalenti EN e tablet nella stessa cartella.

### PR #9 integrata e aggiornamento reale autorizzato

**Autorizzazione:** merge e aggiornamento reale approvati dal manager dopo la pubblicazione della PR. [PR #9](https://github.com/rosariomoscato/cubefarm/pull/9) integrata nel solo fork con merge `59bad4e`; CI [41244390457](https://github.com/rosariomoscato/cubefarm/actions/runs/41244390457) superata su Ubuntu, job Windows/macOS saltati dal workflow.

**Aggiornamento:** backup `cyan-office-20261031-PR9` nella home reale, con bundle Git verificato, build precedente, launcher e dati copiati a server fermo (esclusi backup precedenti e junction). Checkout reale avanzato in fast-forward da `a97b7ec` a `59bad4e`; TypeScript e build client/server superati. Riavvio tramite launcher originale. Le note precedenti sull’attesa di autorizzazione descrivono le fasi storiche.

**Verifica reale:** HTTP e HTTPS 200, nuovo asset client confermato; impostazioni e identità agenti confrontate prima/dopo e conservate, assegnazione e merge automatici disabilitati, launcher invariato e checkout reale pulito. Le prime due richieste erano arrivate prima della disponibilità del servizio; verifica successiva superata. Nessuna operazione AI sui progetti reali. Nota di deploy registrata localmente nella copia di sviluppo.

### Ingresso e configurazione iniziale coordinati

**Autorizzazione:** il manager ha approvato commit, push e apertura PR sul solo fork `rosariomoscato/cubefarm` per il branch `feat/cyan-office-ui`, comprendente palette ufficio/pocket e ingresso/configurazione iniziale. Merge e aggiornamento reale richiedono conferma successiva. Le note di stato locale sottostanti descrivono la fase di sviluppo precedente.

- Ingresso e wizard con sfondo petrolio/grafite, pannello avorio e pulsanti principali ciano con testo scuro leggibile. Coordinati i passaggi azienda/responsabile, CEO, primo progetto e riepilogo.
- Ritratto decorativo CEO robot; preservati campi, opzioni, testi EN/IT e logiche di salvataggio.
- Corretto l’overflow del passaggio CEO a 390 px: ritratto sopra i campi e padding adattato sugli schermi stretti.
- TypeScript e build client/server superati. Collaudo browser nella sola demo isolata superato in IT/EN a 1280, 390 e 820 px: ingresso e navigazione azienda/CEO/progetto/riepilogo, nessun overflow interno o errore pagina; script concluso regolarmente. POST setup simulato, nessun progetto collegato e impostazioni temporanee della demo ripristinate. I primi tentativi avevano rilevato il passaggio automatico a pocket nell’automazione e l’overflow CEO, poi corretti rispettivamente nell’URL di prova e nel CSS.
- Suite globale non ripetuta: i quattro fallimenti storici restano documentati.

**Evidenze:** [ingresso desktop](screenshots/cyan-office-ui/start-it-1280.png), [azienda smartphone](screenshots/cyan-office-ui/setup-company-it-390.png), [CEO smartphone](screenshots/cyan-office-ui/setup-ceo-it-390.png), [primo progetto tablet](screenshots/cyan-office-ui/setup-project-it-820.png). Screenshot equivalenti EN nella stessa cartella.

### Palette coordinata: pavimento neutro, insegna petrolio e modalità touch ciano

**Stato:** modifiche locali sul nuovo branch `feat/cyan-office-ui`, dalla PR #8 integrata. Nessun aggiornamento dell’app reale per questo seguito.

- Fasce sotto le postazioni in grigio-blu neutro, indipendenti dal colore del repository; i colori identificativi salvati e i piccoli dettagli delle postazioni restano invariati.
- Pannello con il nome aziendale su fondo blu petrolio, con testo e nome personale invariati.
- Modalità tascabile con intestazione petrolio, superfici chiare, navigazione grafite e accenti ciano; override CSS limitato alla modalità pocket. Preservati colori semantici di stato/avviso e colori identificativi dei progetti.
- Modifiche solo a colori e CSS, senza logiche operative, layout funzionale o dati. TypeScript e build client/server superati al secondo tentativo; il primo comando era scaduto dopo 240 s. Nessuna nuova suite globale o modifica alle soglie dei test.
- Demo isolata: verifiche IT/EN a 390 e 820 px, navigazione tra schede, assenza di overflow orizzontale e mancato caricamento dei chunk 3D in pocket. Screenshot di pavimento e insegna verificati. Controlli conclusi con esito positivo, senza errori pagina (pocket) o console (3D); entrambi gli script sono poi scaduti nella fase di chiusura del browser. Un tentativo precedente 3D era scaduto sul pulsante di ingresso; ripetizione riuscita con maggiore attesa nell’automazione.

**Evidenze:** [pocket IT smartphone](screenshots/cyan-office-ui/pocket-it-390.png), [pocket IT tablet](screenshots/cyan-office-ui/pocket-it-820.png), [pocket EN smartphone](screenshots/cyan-office-ui/pocket-en-390.png), [pocket EN tablet](screenshots/cyan-office-ui/pocket-en-820.png), [pavimento](screenshots/cyan-office-ui/office-day.png), [insegna aziendale](screenshots/cyan-office-ui/lobby-day.png). Solo dati fittizi.

### PR #8 integrata e installazione reale aggiornata

**Autorizzazioni:** push e PR, merge e aggiornamento dell’app reale approvati separatamente dal manager dopo la prova visiva. [PR #8](https://github.com/rosariomoscato/cubefarm/pull/8) integrata nel solo fork con merge `a97b7ec`; CI della PR [41236497503](https://github.com/rosariomoscato/cubefarm/actions/runs/41236497503) superata su Ubuntu, Windows e macOS.

**Aggiornamento reale:** checkout pulito su `main`, avanzato in fast-forward da `760c3e2` ad `a97b7ec`. Prima dell’aggiornamento: backup locale del codice (bundle Git verificato), build precedente, launcher e home dati, esclusi i backup precedenti e i collegamenti junction. Copia dei dati effettuata a server fermo. Nessuna installazione di dipendenze necessaria; TypeScript e build client/server superati nell’installazione reale.

**Riavvio e verifica:** usato il launcher esistente, senza modificarlo. Confermati risposta HTTP 200 sul servizio locale e sull’indirizzo HTTPS privato, con il nuovo asset client servito. Impostazioni e identità degli agenti confrontate prima/dopo e invariate; nessun agente in lavoro/preparazione, assegnazione e merge automatici disabilitati, revisioni CEO a zero e aggiornamenti automatici spenti. Checkout reale pulito dopo la build. La prima richiesta di verifica era arrivata prima che il server fosse pronto; la verifica successiva è riuscita. Nessuna prova operativa AI sui progetti reali. I fallimenti storici locali restano documentati; la CI verde della PR è una verifica distinta.

### Ufficio cartoon futuristico: restyling esclusivamente estetico

**Stato:** modifiche locali su `feat/robot-agents`, successive al commit `96b3881` di agenti e cane robot. Ispirazione all’Identity Book approvata dal manager; nessun push, PR, merge o aggiornamento dell’ufficio reale.

- **Finiture:** palette avorio/grafite, pavimento a pannelli ceramici con giunti discreti, infissi scuri, cornici superiori con luce ambra e inserti ciano. Scrivanie, sedute, reception, postazione manager, tavolini, scaffali e banconi coordinati; divani arancio con cuscini avorio/grafite e vasi chiari. Conservati i colori identificativi dei progetti nei dettagli delle postazioni e nelle corsie.
- **Solo presentazione:** dimensioni e posizioni degli arredi esistenti, aperture, collisioni, percorsi, bersagli e azioni di interazione conservati. Nessuna modifica a server, store, workflow, animazioni degli agenti/cane, impostazioni o dati. Gli inserti luminosi condividono geometria e materiali, non hanno collider né raycast e non aggiungono luci reali, animazioni o timer. Il ciclo giorno/notte e il sistema di illuminazione esistente restano quelli precedenti; cambiano le finiture visibili delle lampade. Nessun nuovo testo o marchio applicato.
- **Verifiche:** 77 test passati su sei file (`layout`, `doors`, `batch`, `whiteboard`, `robotParts`, `robotDogParts`); TypeScript e build client/server superati con i consueti avvisi bundle/Rapier. Diff revisionato per limitare le modifiche a colori, texture e decorazioni. Suite globale non ripetuta: i quattro fallimenti storici non sono dichiarati risolti.
- **Demo isolata:** Chrome/Playwright con soli agenti fittizi, automazioni disabilitate, nessuna sessione AI. Verificate viste ufficio/lobby, giorno/sera, apertura Kanban e console manager con E, movimento WASD, disponibilità di un percorso, apertura ascensore e viaggio alla lobby, modalità tascabile a 390 px senza overflow. Impostazioni identiche prima/dopo e nessun errore console nel percorso finale. Corretti nello script di prova l’attesa del pulsante di ingresso e la mira sul telaio dell’ascensore aperto; nessuna correzione alla logica dell’app per far passare il collaudo.

**Evidenze:** [ufficio diurno](screenshots/office-finish/office-day.png), [postazioni](screenshots/office-finish/office-workstations.png), [zona relax](screenshots/office-finish/office-lounge.png), [ufficio serale](screenshots/office-finish/office-evening.png), [lobby](screenshots/office-finish/lobby-day.png), [interazione Kanban](screenshots/office-finish/kanban-interaction.png), [console manager](screenshots/office-finish/manager-interaction.png). Solo dati della demo. Questi controlli mirati non certificano ogni interazione né l’assenza di un costo di rendering delle decorazioni aggiuntive; non è stato eseguito un benchmark prestazionale.

**Chiusura del restyling:** demo fermata, `git diff --check` superato e checkout dell’app reale verificato su `main` con working tree pulito. Restyling e rifinitura del soffitto approvati dal manager e salvati in un commit locale dedicato sullo stesso branch; nessun push o aggiornamento dell’app reale.

**Rifinitura del soffitto su richiesta del manager:** quattro fasce longitudinali grafite, linee ciano/ambra alternate e piccoli segmenti luminosi interrompono l’uniformità del soffitto in ufficio e lobby. Elementi statici aderenti alla superficie, distanziati dalle lampade esistenti; nessuna modifica a logiche o illuminazione dinamica. Build TypeScript/client/server superata e controllo visivo diurno/serale nella demo riuscito senza errori console; screenshot aggiornati. I 77 test sopra precedono questa rifinitura puramente decorativa.

### Cane robot: implementazione del disegno approvato

**Stato:** implementazione salvata in un commit locale sul medesimo branch `feat/robot-agents`, insieme agli agenti robot, su approvazione del manager. Nessun push, PR, merge o aggiornamento dell’app reale.

- **Estetica 3D:** cucciolo con testa maggiorata, scocca avorio, visiera lucida, occhi LED ciano con battito e chiusura durante il sonno, musetto, lingua, orecchie rame articolate, zampe meccaniche e coda segmentata. Geometrie condivise e rendering instanziato coerenti con gli agenti robot; bersaglio delle carezze adeguato al nuovo ingombro.
- **Compatibilità:** nome corrente conservato, senza rinomina automatica. Riutilizzati snodi, fisica, comportamento, trasporto della palla e suoni esistenti.
- **Verifiche:** 54 test passati su sei file (`robotDogParts`, `dogRig`, `dogBrain`, `dogPlaces`, `dogTravel`, `batch`), inclusi geometrie finite, ancoraggi e occhi davanti alla visiera. TypeScript e build client/server superati. Suite globale non ripetuta; i quattro fallimenti storici restano non dichiarati risolti.
- **Collaudo:** Chrome/Playwright nella sola demo isolata con agenti fittizi. Percorso finale completo riuscito: richiamo, carezze, inseguimento, presa, trasporto, restituzione e riposo, senza errori console. Verificati nome invariato, automazioni disabilitate e nessuna sessione AI. I tentativi intermedi di fotografia avevano inquadrature obsolete e un timeout sul riporto; corretto lo script di cattura congelando la scena e attendendo un nuovo frame. Il percorso finale è passato senza modificare comportamento o modalità foto dell’app; la causa del timeout intermedio non è accertata.

**Evidenze:** [cane robot](screenshots/robot-dog/robot-dog-awake.png), [carezze](screenshots/robot-dog/robot-dog-petted.png), [trasporto della palla](screenshots/robot-dog/robot-dog-fetch.png), [riposo](screenshots/robot-dog/robot-dog-sleep.png). La palla da spiaggia esistente copre parte del musetto durante il trasporto.

**Chiusura:** demo fermata dopo i controlli; `git diff --check` superato. Checkout reale verificato su `main` con working tree pulito.

### Agenti robot: prima implementazione del design approvato

**Stato:** modifiche locali sul branch dedicato `feat/robot-agents`, dalla baseline `760c3e2` (PR #7 integrata). Nessuna pubblicazione, PR, merge o distribuzione all’app reale. Il nome Droidsembly è stato scelto dal manager, ma il cambio di marchio resta un lavoro successivo.

| Feature | Tipo | Breve descrizione |
| --- | --- | --- |
| Personaggi robot | Estetica 3D | Scocca avorio arrotondata, testa maggiorata, visiera scura lucida, occhi LED ciano, antenna, giunti grafite e mani meccaniche. Componenti geometrici condivisi e disegno instanziato, compresi gli schermi espressivi. |
| Varianti estetiche | Personalizzazione | Moduli codice/arancio, pianificazione/ciano e ispezione/viola, più coordinamento per il CEO; emblemi e accessori affiancano i colori. Occhiali, cuffie, cappellini e rinforzi della scocca. La lente d’ispezione è riposta sul fianco, per lasciare libere le mani durante le interazioni. I moduli **non assegnano ruoli operativi**. |
| Compatibilità | Animazioni/dati | Conservati snodi di spalle, mani, anche e ginocchia, espressioni e battito delle palpebre. Adeguate al nuovo ingombro etichette, fumetti, accessori stagionali e anteprima. Nessuna migrazione dei dati: i precedenti campi umani restano salvati, ma non sono disegnati; gli indici colore esistenti vengono interpretati nella palette robot. Identità, nomi e configurazioni AI restano separati dall’aspetto. |
| Editor e schede | UX/EN/IT | Controlli coerenti con i robot, etichette accessibili e traduzioni dei nuovi moduli. Anteprima completa fino ai piedi e rispetto del movimento ridotto. Ritratti canvas robotici, aggiornati quando cambia lo stile; nessuna dipendenza Three.js aggiunta al percorso tascabile. |

**Verifiche locali:** 67 test passati su nove file (`robotParts`, `appearance`, `face`, `batch`, `people`, `typing`, `fidgets`, copertura i18n, `shared/looks`), con un solo worker. Inclusi integrità dei dati legacy, accessori compatibili, valori accettati dal server, geometrie finite, occhi chiusi e tutte le espressioni davanti alla visiera. Un primo run parallelo aveva un timeout di 5 s nel test preesistente del battito delle palpebre; la ripetizione sequenziale è passata senza modifiche a soglie o asserzioni. TypeScript e build client/server superati, con i consueti avvisi bundle/Rapier. Non è stata ripetuta la suite globale: i quattro fallimenti locali già documentati prima del merge della PR #7 **non sono dichiarati risolti**.

**Collaudo visivo:** Chrome locale tramite Playwright su demo isolata, dati fittizi e backend `--demo`; il browser integrato aveva restituito 502 sulla demo loopback, quindi il collaudo è stato eseguito dal browser locale. Verificati postura in piedi, camminata, ritorno alle sedie, espressioni, editor di tutte e tre le varianti, scelta di occhiali/cappellino, EN/IT e modalità tascabile a 390 px senza overflow della pagina né caricamento dei chunk 3D. Nessun errore console nel passaggio conclusivo. Il primo tentativo di inquadratura risentiva dell’orario serale (personaggi nascosti dal normale fine giornata): gli screenshot finali usano l’orologio diurno di QA. Alcuni selettori di collaudo sono stati corretti prima del passaggio conclusivo; nessuna azione AI è stata usata per preparare le scene.

**Isolamento:** verificati tramite lo stato della sola demo assegnazione automatica e merge automatico disabilitati, revisioni CEO a zero, aggiornamenti automatici disabilitati, modifiche del team su approvazione e nessuna sessione avviata. Rete, Tailscale, launcher, porte e dati dell’ufficio reale non modificati. I controlli mirati non costituiscono un benchmark prestazionale né un collaudo end-to-end di ogni gioco/interazione o costume stagionale.

**Chiusura del collaudo:** build finale e ripetizione completa del percorso visivo superate; verificato anche l’aggiornamento immediato del [ritratto nella scheda carriera](screenshots/robot-agents/robot-portrait.png) al cambio degli occhiali, con ripristino dello stile fittizio. Lingua della demo ripristinata in italiano e demo fermata dopo i controlli. Le modifiche restano locali sul branch dedicato, in attesa della revisione visiva del manager.

**Evidenze:** [team robot nell’ufficio](screenshots/robot-agents/robot-team-3d.png), [camminata](screenshots/robot-agents/robot-walking.png), [espressioni](screenshots/robot-agents/robot-expressions.png), [postazioni](screenshots/robot-agents/robot-seated.png), editor [codice](screenshots/robot-agents/robot-editor-0-it.png), [pianificazione](screenshots/robot-agents/robot-editor-1-it.png), [ispezione](screenshots/robot-agents/robot-editor-2-it.png), [accessori](screenshots/robot-agents/robot-accessories-it.png), [editor EN](screenshots/robot-agents/robot-editor-en.png), pocket [IT](screenshots/robot-agents/robot-pocket-it.png) / [EN](screenshots/robot-agents/robot-pocket-en.png). Solo nomi e contenuti della demo.

### Accesso da telefono: guida HTTPS e verifica delle anteprime

**Stato:** implementazione sul nuovo branch `feat/phone-access-guide`, separato dalla PR #6 già integrata. Nessun merge, rilascio, aggiornamento dell’ufficio reale o cambiamento alla rete dell’utente.

| Feature | Tipo | Breve descrizione |
| --- | --- | --- |
| Accesso da telefono | Funzionalità | Scheda EN/IT nelle impostazioni della console e della modalità tascabile, raggiungibile anche dal visualizzatore delle app. Distingue uso locale, HTTPS con supporto del browser, HTTP remoto e contesti non supportati. Sul visualizzatore sostituisce l’iframe non supportato con istruzioni, senza fermare l’app. |
| Configurazione guidata | Sicurezza/UX | Percorsi manuali Tailscale Serve e proxy HTTPS personale. Evidenzia che cifratura e autorizzazione sono diverse, richiede accesso privato o autenticazione su tutte le rotte e non propone Funnel, aperture pubbliche o disattivazione della sicurezza del browser. Nessun comando viene eseguito dalla funzione. |
| Porta effettiva | Diagnostica | Endpoint GET di sola lettura ricava porta e ambito di ascolto dal socket del server, non da Host o header forwarded. Genera un comando solo con porta numerica valida e ascolto compatibile con il proxy IPv4 loopback; non modifica SWARM_HOST o il campo dei link delle notifiche. |
| Verifica CSS/JavaScript | Diagnostica | Il service worker effettivo deve caricare risorse sintetiche con percorsi assoluti, senza avviare progetti o AI. Rotte diagnostiche esatte sul mount virtuale 0, mai inoltrate ad altre porte. Risultati verificati per origine, iframe e nonce; timeout, fallimento e ripetizione espliciti. Non è una certificazione di autenticazione, compatibilità di tutte le app o WebSocket/HMR. |
| Documentazione | Guida | [Accesso da telefono](phone-access.md), limiti del gateway e chiarimento del campo notifiche. Nessuna richiesta a URL arbitrari da parte del server: l’indirizzo HTTPS inserito serve solo per una navigazione esplicita nel browser. |

**Verifiche:** **50 test mirati passati su otto file**, inclusi classificazione dei contesti, porta effettiva, indirizzi/valori non validi, rotte e metodi diagnostici, CSS/JS sintetici, fallback inglese e separazione client/server. TypeScript e build finale client/server superati, inclusa l’integrazione nelle impostazioni tascabili e la rifinitura mobile; consueti avvisi bundle/Rapier, soglie invariate. Prova finale Edge/Playwright superata nella sola demo: service worker reale e controllo positivo su loopback sicuro, errore di stile calcolato simulato, messaggi falsificati rifiutati per origine/finestra, timeout e ripetizione; HTTP remoto simulato con sola risoluzione DNS temporanea del browser, senza flag che disattivano la sicurezza. Guida raggiungibile anche nelle impostazioni tascabili; iframe e link alla nuova scheda non proposti sul visualizzatore remoto non supportato. Nessun errore console, nessun overflow interno della scheda né ritaglio rispetto al contenitore a 390 px in EN/IT. Le prime prove richiedevano correzioni dei selettori e del metodo di simulazione del guasto CSS; la prima asserzione sulla sola larghezza interna non rilevava il ritaglio del contenitore ed è stata estesa, con impaginazione corretta e ripetizione finale riuscita. Lingua e passo della visita guidata della sola demo ripristinati; demo fermata dopo il collaudo. Suite completa locale in background, con fallimenti già emersi in workspace, simulazioni 3D, scala, eventi e percorsi: non è verde, dettaglio finale ancora da registrare; non si attribuiscono tutti i fallimenti alla baseline senza confronto conclusivo.

**Evidenze:** [guida mobile IT](screenshots/phone-access/phone-access-guide-it-mobile.png), [avviso HTTP remoto IT](screenshots/phone-access/phone-access-http-warning-it.png), solo dati fittizi della demo. Nessun certificato o indirizzo privato dell’utente è incluso.

**Esito della suite completa locale:** conclusa in circa 2.122 s con **2.587 test passati, 12 falliti; 236 file passati su 242**. Sei timeout in `server/workspace.test.ts` (60 s), più il suo hook di pulizia finale (10 s); timeout in `server/scale.test.ts` (120 s), due casi `throwSim.test.ts`, un caso `indoor.test.ts` e uno `director.test.ts` (5 s); budget del percorso in `walkways.test.ts` superato (circa 14,82 ms contro 8 ms). Tutti i test nuovi sono passati. Il run era stato avviato prima dell’ultima integrazione tascabile/rifinitura CSS, poi verificate con i 50 test mirati finali, build e browser: non viene presentato come suite verde sull’intero albero finale. I file dei test falliti non sono stati modificati e alcune classi di timeout erano già note; manca però un confronto conclusivo per attribuire ogni caso alla baseline. Nessuna soglia, asserzione o configurazione CI è stata allentata. Nessuna PR aperta sulla base di questo esito; il collaudo manuale della demo non sostituisce la verifica globale.

**Confronto successivo con `main`:** esecuzioni sequenziali con le stesse dipendenze, un solo worker, senza demo/build/browser di collaudo concorrenti. Baseline `95fecf4` in un worktree temporaneo separato, branch `cfb2546`. Su **entrambi passano tutti i 51 test selezionati**: 45 nei cinque file scala/simulazioni/luce/eventi/percorsi (circa 89 s su main, 92 s sul branch) e i sei casi Git/worktree prima falliti (circa 109 s su main, 178 s sul branch), con pulizia finale riuscita. Gli altri 38 casi del file workspace sono intenzionalmente esclusi da questo confronto mirato, non dalla suite globale. Nessuno dei fallimenti iniziali si è ripresentato: non è evidenza di una regressione riproducibile del branch, ma neppure una validazione globale o una prova conclusiva della causa. Successiva ripetizione completa sul codice finale, senza attività di collaudo concorrenti, da verificare prima della PR.

**Seconda suite completa sul codice finale `4408736`:** conclusa in circa 1.338 s, senza demo/build/browser di collaudo concorrenti, con **2.595 test passati e 4 falliti; 238 file passati su 242**. Rimangono timeout in `indoor.test.ts` e nella finestra di carica di `throwSim.test.ts` (5 s), budget percorsi in `walkways.test.ts` superato (circa 11,24 ms contro 8 ms), e un’asserzione in `previews.test.ts` sulla rimozione della worktree dopo inattività. Quest’ultima attende soltanto 20 ms mentre la pulizia comprende lavoro asincrono e una verifica TCP; il file e il comportamento di pulizia non sono stati modificati dal branch. Nel successivo confronto mirato **tutti i 13 test di `previews.test.ts` passano sia su main sia sul branch**. Sommando i due confronti, tutti i **64 test selezionati passano su entrambi**; nessuna regressione riproducibile individuata, senza prova conclusiva della causa dei fallimenti globali. Tutti i test nuovi passati; workspace e relativo hook di pulizia ora superati. La suite globale resta **non verde**, senza aumenti di soglie, esclusioni o eliminazione di asserzioni. Nessuna ulteriore ripetizione globale automatica prevista prima di discutere l’esito con il manager.

**Prova manuale del manager:** confermati controllo CSS/JavaScript positivo sul PC, rifiuto dell’indirizzo HTTP e accettazione dell’origine HTTPS di prova; passaggi Tailscale/proxy e cambio lingua confermati provvisoriamente. Non sono stati eseguiti i comandi né configurato un accesso HTTPS reale. La demo usata per questi controlli è stata fermata prima del confronto dei test; l’ufficio reale resta invariato.

**Limiti intenzionali:** Tailscale, certificati, proxy, autenticazione e regole di rete vanno configurati dall’utente sul proprio computer. Nessuna nuova configurazione HTTPS reale è stata applicata per il collaudo: la prova positiva usa il contesto sicuro standard del loopback. L’installazione reale resta sul codice già integrato dalla PR #6 e non riceve questa funzione finché non viene approvata separatamente.

### PR #6: conclusione del collaudo guidato

**Stato:** collaudo delle superfici previste concluso; [PR #6](https://github.com/rosariomoscato/cubefarm/pull/6) ancora aperta, senza merge né aggiornamento dell’ufficio reale. Questa voce aggiorna gli stati provvisori delle verifiche sotto, conservati come cronologia.

- **CI:** [41205092554](https://github.com/rosariomoscato/cubefarm/actions/runs/41205092554) superata sul codice `7cc8df6`, inclusa la correzione della fixture del frigorifero e i suggerimenti del caffè. Questa registrazione finale modifica soltanto la documentazione.
- **Prove manuali del manager nella demo:** confermati decorazioni (acquisto, collocazione, raccolta, ripristino e scatola), dardi/ricarica, ping-pong, frigorifero/consumo, caffè corretto, telescopio e sdraio. Confermati ripresa di Cubetris e Cable Snake dopo chiusura del telefono, e cambio English/Italiano su giochi, fotografia, frigorifero e caffè con nomi invariati. La ripresa dei giochi non è un test di persistenza dopo ricarica della pagina.
- **Video:** ultimo test manuale con telecamera libera ferma, ufficio non congelato e scheda in primo piano riuscito: circa 10 s e movimento visibile nel file. Anche orbita e telecamera libera in movimento erano state confermate. Il precedente blocco non si è ripresentato nel nuovo controllo; nessuna modifica al registratore e nessuna causa accertata. Restano documentati i WebM vuoti osservati nell’automazione headless, senza generalizzarli al browser interattivo.
- **Limiti:** non si dichiara tradotta ogni stringa dell’applicazione; restano testi dinamici 3D, alcune viste/azioni delle schede e messaggi demo/server non coperti. Nessuna nuova suite completa locale: le verifiche complete remote sono distinte dai timeout locali storici. Il collaudo concluso non autorizza merge, pubblicazioni o aggiornamento del servizio reale.

### PR #6: correzione dei suggerimenti del frigorifero dopo prova manuale

**Stato:** correzione sullo stesso branch della [PR #6](https://github.com/rosariomoscato/cubefarm/pull/6), nessun merge né aggiornamento dell’ufficio reale.

**Aggiornamento della prova guidata:** il manager ha confermato il frigorifero dopo la correzione, oltre a telescopio e sdraio sulla terrazza.

**Caffè pronto:** la successiva prova del manager ha individuato il suggerimento `Take coffee` ancora inglese. Aggiunti `Prendi il caffè`, il ritiro della tazza non pronta e i due avvisi della macchina (tazza mancante/caffè pronto), senza cambiare preparazione o consumo. Verifica aggiornata: **72 test passati su otto file**, inclusi navigazione, frigorifero, caffè, consumo e notifier; TypeScript e build client/server superati. Primo comando build scaduto dopo il completamento del client, ripetizione completa riuscita senza modifiche alle soglie. Prova finale Edge/Playwright nella demo superata: ritiro tazza, preparazione tramite probe QA esistenti, suggerimento del caffè pronto EN/IT senza ricarica, avviso italiano, ritiro con E e tre sorsi disponibili. Nessun errore console, lingua ripristinata. I primi tentativi perdevano la mira durante la cattura del mouse; prova ripetuta dopo aver liberato il mouse, senza cambiare l’applicazione.

**Correzione del test CI:** [41203904948](https://github.com/rosariomoscato/cubefarm/actions/runs/41203904948) è fallito sui tre sistemi esclusivamente in `navigationText.test.ts`: il test generico costruiva l’azione `fridge` senza `op`, mentre i suggerimenti di apertura/chiusura sono riconosciuti solo con `op: 'door'`. Fixture aggiornata con l’azione corretta, senza cambiare codice applicativo, aspettative di traduzione o controlli sui testi personali. Ripetizione locale: **63 test passati su sette file**, prima dell’aggiunta del seguito sul caffè; nuova CI da verificare.

- **Localizzazione:** la prova del manager ha individuato i suggerimenti 3D `Grab…` ancora inglesi. Tradotti apertura/chiusura del frigorifero, presa/scorte esaurite dei prodotti e avvisi di mani occupate, consumo prioritario e rifornimento. Il tasto indicato nell’avviso segue la configurazione dei comandi. Solo formati canonici corrispondenti all’azione e al prodotto vengono tradotti; etichette personali dei pranzi e formati sconosciuti restano letterali.
- **Verifica:** **60 test passati su sei file**, incluse tutte le otto categorie di prodotti disponibili/esauriti, fallback inglese, azioni/etichette non corrispondenti, contenuti personali, frigorifero/consumo e notifier. TypeScript e build superati con i consueti avvisi. Prova Edge/Playwright nella sola demo: apertura con E, suggerimento della pizza con cambio EN/IT senza ricarica, presa, avviso “uno alla volta”, consumo con E di cibo e bevanda e conteggi decrescenti in EN/IT; nessun errore console. Presa della bevanda e tentativo a mani occupate tramite probe QA esistente; nessuna modifica al comportamento per facilitare il test. Lingua ripristinata.
- **Esiti manuali riferiti dal manager sul quarto blocco:** acquisto/collocazione della pianta, raccolta/ripristino/comandi della scatola, dardi/ricarica e ping-pong confermati funzionanti durante la guida. Video con orbita confermato riproducibile; anche telecamera libera in movimento confermata con file di circa 2,3 MB. Un precedente video con telecamera libera ferma si bloccava poco dopo l’inizio: resta da chiarire; nessuna correzione del registratore o dichiarazione di completa risoluzione.
- **CI precedente:** il quarto blocco `2ee7645` ha superato [41201052701](https://github.com/rosariomoscato/cubefarm/actions/runs/41201052701). La presente correzione richiede la propria CI dopo il push. Restano i residui e i limiti video descritti sotto; nessuna nuova suite completa locale.

### PR #6: fotografia, giochi, catalogo, carriere e HUD specializzati

**Stato:** quarto blocco sul branch della [PR #6](https://github.com/rosariomoscato/cubefarm/pull/6), senza merge né aggiornamento dell’ufficio reale.

| Feature | Tipo | Breve descrizione |
| --- | --- | --- |
| Fotografia | Localizzazione | Pannello, filtri, galleria, controlli foto/clip/replay istantaneo e messaggi generati. Le note mantengono il testo inglese originale per i consumatori esistenti e affiancano metadati strutturati per il cambio lingua; nomi dei file, didascalie esportate ed errori tecnici restano letterali. |
| Giochi | Localizzazione | Menu, controlli accessibili e testi canvas di Cubetris, Cable Snake e Desk Pet. I riquadri dei messaggi adattano il corpo del testo alla larghezza disponibile; nessuna modifica alle meccaniche o ai formati di salvataggio. Il cucciolo traduce solo frasi canoniche, saluto col nome corrente e promozioni note; messaggi storici e personalizzati restano invariati. |
| Catalogo e carriere | Localizzazione | Nomi e descrizioni delle decorazioni/trofei integrati, scatola, spazi di collocazione, monete, schede e tabella delle carriere, anzianità, gradi e risultati. Titoli delle PR, nomi degli agenti, dettagli storici e ID sono preservati. |
| HUD specializzati | Localizzazione | Indicazioni per cibo, bevande, decorazioni e schede trasportate, dardi/ricarica, terrazza e ping-pong. I messaggi di ping-pong sono isolati in una funzione pura, con inglese predefinito invariato. |
| Evidenze | Verifica | [Cubetris IT](screenshots/italian-ui/specialized-cubetris-it.png), [foto mobile IT](screenshots/italian-ui/specialized-photo-it-mobile.png), [carriere IT](screenshots/italian-ui/specialized-careers-it.png), solo demo con identità fittizie. |

**Verifiche del quarto blocco:** **108 test passati su 12 file**, inclusi giochi, fotografia pura, gradi/rami delle carriere in EN/IT, tutti i motivi dei punti nel ping-pong, frasi del cucciolo, preservazione di nomi/file/errori e controllo notifier client/server. TypeScript e build client/server superati, con i consueti avvisi bundle/Rapier e nessun cambio alle soglie. Edge/Playwright nella demo isolata: menu/canvas EN/IT, avvio e pausa dei due giochi, ripresa dopo chiusura del telefono, apertura/cura del cucciolo, foto PNG a dimensioni corrette, galleria e cambio lingua della nota già visibile, catalogo, tabella e scheda carriera con titoli PR invariati. Nessun errore console nel passaggio finale senza registrazione video; nessun overflow orizzontale nelle viste foto/cucciolo a 390 px in EN/IT. Lingua della demo ripristinata; salvataggi del cucciolo e preferenze cambiati soltanto nel browser temporaneo. Acquisto/collocazione delle decorazioni e interazioni 3D degli HUD non esercitati end-to-end in questo blocco.

**Limite video emerso durante la prova:** Edge headless ha prodotto clip WebM di zero byte sia a 1 s sia a 4 s, con errore `ERR_REQUEST_RANGE_NOT_SATISFIABLE` nell’anteprima blob. I messaggi di salvataggio cambiano lingua, ma ciò **non valida l’export video**. Nessun confronto conclusivo con la baseline: non viene attribuito con certezza all’ambiente o a un difetto preesistente. Nessuna modifica al registratore per aggirare il problema; resta da verificare separatamente in browser interattivo. I tentativi browser hanno inoltre richiesto correzioni dei selettori e una ripetizione dopo timeout; il passaggio finale è distinto dai tentativi falliti.

**CI:** il terzo blocco `df67d0e` ha superato [41198204965](https://github.com/rosariomoscato/cubefarm/actions/runs/41198204965). Il quarto richiede la propria CI dopo il push; nessuna nuova suite completa locale, con i limiti storici conservati sotto.

**Residui:** alcune indicazioni dinamiche 3D/bersagli, viste e azioni delle schede e messaggi demo/server non coperti; identificatori tecnici e contenuti dell’utente intenzionalmente letterali. Il controllo delle chiavi esplicite non rileva ogni stringa inglese non marcata: nessuna dichiarazione di traduzione completa dell’applicazione.

### PR #6: guida, comandi e indicatori principali

**Stato:** terzo blocco sul branch della [PR #6](https://github.com/rosariomoscato/cubefarm/pull/6), senza merge né aggiornamento dell’ufficio reale.

| Feature | Tipo | Breve descrizione |
| --- | --- | --- |
| Guida estesa | Localizzazione | Tradotti i 33 paragrafi di aiuto, titoli, pulsanti e impostazioni audio, chiacchiere, giorno/notte e grafica. I paragrafi inglesi originali restano nel JSX; quelli italiani reinseriscono esplicitamente gli stessi tasti, enfasi e pulsanti. Test di corrispondenza uno-a-uno dei controlli e fallback sicuro se cambia la struttura. Nessuna sostituzione DOM o traduzione dei rapporti prestazioni. |
| Comandi | Localizzazione | Etichette delle azioni, sensibilità, gamepad, istruzioni, conflitti, riassegnazione e ripristino. I messaggi di riassegnazione già visibili seguono il cambio lingua. Codici e nomi dei tasti restano tecnici; nessuna modifica alle regole di assegnazione. |
| HUD e navigazione | Localizzazione | Stato connessione/riproduzione, riepiloghi dei piani, sessioni, telefono, avvisi di utilizzo, indicazioni principali, panoramica/edificio, elenco di agenti e visitatori ed espressioni. Tradotti solo prompt statici verificati per tipo di interazione: titoli di schede, nomi, output e formati sconosciuti restano letterali. |
| Evidenze | Verifica | [Guida IT](screenshots/italian-ui/guide-it.png), [comandi mobile IT](screenshots/italian-ui/controls-it-mobile.png), [comandi mobile EN](screenshots/italian-ui/controls-en-mobile.png), solo demo con identità fittizie. |

**Verifiche del terzo blocco:** **126 test passati su 14 file**, inclusi controlli i18n, separazione client/server del notifier, comandi, testi della diagnostica, visitatori e preservazione dei contenuti; TypeScript e build superati. Edge/Playwright nella demo isolata: guida e comandi IT/EN, cambio lingua senza ricaricare il messaggio di riassegnazione, assegnazione di un tasto, scambio per conflitto, ripristino e panoramica/edificio superati. Nessun errore console né overflow orizzontale nelle viste guida/comandi a 390 px; prova anche a 1440 px. La lingua della demo è ripristinata al termine; le preferenze dei tasti sono state modificate solo nel browser temporaneo di test. Nessuna nuova suite completa locale; i timeout del primo blocco rimangono documentati. La build conserva gli avvisi su dimensione dei bundle/import di Rapier, senza cambiare soglie o configurazione.

**Stato CI precedente:** [41194674870](https://github.com/rosariomoscato/cubefarm/actions/runs/41194674870) superata su `d1215c8`, dopo lo spostamento del test nel server. Non valida questo terzo blocco, che richiede una nuova CI sul proprio head.

**Copertura ancora residua:** HUD specializzati degli oggetti in mano e dei minigiochi, alcune indicazioni dinamiche 3D (bersagli, nomi e messaggi tecnici preservati), fotografia, giochi, catalogo/carriere, alcune viste delle schede e messaggi demo/server. Non si dichiara completa la localizzazione dell’applicazione. La demo resta aperta sulla 4431; il servizio reale sulla 4423 e i suoi dati non sono modificati.

### PR #6: centro di controllo e riepilogo della giornata

**Stato:** secondo blocco sullo stesso branch della [PR #6](https://github.com/rosariomoscato/cubefarm/pull/6), senza merge né aggiornamento dell’ufficio reale.

| Feature | Tipo | Breve descrizione |
| --- | --- | --- |
| Centro di controllo | Localizzazione | Tradotti spiegazioni sull’utilizzo, comandi, conferme, diagnostica, titoli e descrizioni delle metriche. Allarmi e segnalazioni watchdog vengono tradotti solo se corrispondono ai formati noti; nomi, dettagli diagnostici e formati sconosciuti restano letterali. |
| Riepilogo della giornata | Localizzazione | Nome italiano di Time-lapse; tradotti scheda, riepiloghi, velocità, intervalli di assenza, date, controlli di riproduzione e messaggi di caricamento/errore. Le etichette registrate nel diario restano inalterate. Nessun cambiamento a registrazione, permessi delle azioni o riproduzione. |
| Regressioni | Verifica | Copertura AST estesa alle due viste e alle etichette fornite da dati (metriche, rimedi, velocità). Test contro i messaggi canonici del watchdog per tutti i sei tipi, durate, nomi con placeholder/caratteri speciali, fallback inglese e dettagli tecnici letterali. |

**Verifiche di questo blocco:** 52 test passati su sei file; TypeScript e build superati. Prova Edge/Playwright nella sola demo isolata: entrambe le schede in IT/EN, pausa, avanzamento con tastiera, cambio velocità e ritorno al tempo reale superati, senza errori console. Primo tentativo di interazione fermato dalla cattura del mouse del canvas; ripetuto liberando il mouse, senza modificare l’app o forzare i clic. La demo resta disponibile sulla 4431 per il test del manager. La lingua della demo è stata ripristinata dopo la prova. Nessuna nuova esecuzione completa locale: i tre timeout del primo blocco restano documentati sotto; la precedente CI verde non valida questo nuovo codice.

**Residui:** guida estesa, controlli, HUD/3D, fotografia, giochi/catalogo/carriere, alcune viste delle schede e messaggi tecnici/demo restituiti dal server. Non si dichiara completa la traduzione dell’applicazione.

**Correzione CI del secondo blocco:** il [run 41193990605](https://github.com/rosariomoscato/cubefarm/actions/runs/41193990605) è fallito nei test sui tre sistemi: il nuovo test di localizzazione importava il watchdog server dalla cartella client, e il controllo di separazione client/server in `server/notifier.test.ts` lo rifiutava correttamente. Test spostato in `server/operationText.test.ts`, senza modifiche al codice applicativo o al controllo di sicurezza. Ripetizione locale: **29 test passati su quattro file**, incluso il controllo notifier, e TypeScript superato. Nuova CI da verificare; il primo run fallito non viene attribuito ai timeout preesistenti.

### Traduzione italiana: console, impostazioni e flusso operativo

**Stato:** primo blocco pubblicato sul branch `feat/complete-italian-ui` e nella [PR #6 del fork](https://github.com/rosariomoscato/cubefarm/pull/6), non ancora integrato in `main`. Il manager ha autorizzato esplicitamente l’apertura della PR nonostante i tre timeout locali riportati sotto, con tutti i limiti dichiarati e senza merge. Nessun rilascio npm o aggiornamento dell’ufficio reale.

| Feature | Tipo | Breve descrizione |
| --- | --- | --- |
| Console e progetti | Localizzazione | Tradotti testi descrittivi, conferme e campi della console manager, collegamento/creazione dei progetti, configurazione degli agenti e lista dei piani. Il selettore EN/IT esistente è mantenuto. |
| Kanban e anteprime | Localizzazione | Tradotti comandi, colonne, conferme di merge/chiusura/rinvio, stati delle anteprime e pannello QA. Titoli, descrizioni, rapporti QA, comandi, modelli, branch e output dei processi non vengono tradotti. |
| Impostazioni | Localizzazione | Coperti testi e controlli per accessibilità, profilo, cloud, notifiche, voce, meteo e festività, incluse etichette accessibili, placeholder e valori descrittivi dei cataloghi. Nessun cambiamento alle automazioni o ai segreti. |
| Telefono e modalità tascabile | Localizzazione | Tradotti riepiloghi aziendali, richieste sul team, avvisi, campi di chat, stato degli agenti e conferme delle approvazioni. Nomi e contenuti del manager/CEO sono conservati letteralmente. |
| Visita guidata e stati dinamici | Localizzazione | Tradotti i nove passaggi della visita guidata, le relative azioni, i riepiloghi dell’aggiornamento e le note generate dal Kanban/QA. Dettagli tecnici e note preesistenti restano letterali; nessun cambiamento alle decisioni del flusso di lavoro. |
| Regressioni | Verifica | Aggiunto controllo AST delle chiavi esplicitamente marcate nelle superfici coperte, controllo dei cataloghi condivisi e casi di conservazione letterale di nomi, titoli e identificatori. Rimane il test globale sui placeholder del dizionario. |

**Copertura residua del primo blocco:** guida estesa, controlli, HUD e testi 3D, centro di controllo, time-lapse, fotografia, giochi/catalogo/carriere e alcune viste delle schede. Centro di controllo e time-lapse sono affrontati nel secondo blocco descritto sopra. Il fallback inglese resta attivo; la presenza di una chiave nel dizionario non implica che tutte le relative viste la usino.

**Verifiche intermedie:** gruppi mirati da 21 e poi 62 test superati; build/TypeScript successivamente superati dopo la correzione di due errori nei dati dei nuovi test. Prima prova browser su demo isolata superata in Edge headless: cambio EN/IT su impostazioni desktop e modalità tascabile, modulo nuova issue e nessun overflow orizzontale nella schermata mobile verificata; nessun errore console rilevato. Il browser integrato non ha risposto ai comandi di apertura/navigazione; la prova è stata quindi eseguita direttamente con Playwright e il browser già installato, senza nuove installazioni.

**Limiti della suite completa:** la prima esecuzione ha superato il limite del comando dopo timeout nelle simulazioni 3D. La seconda, con due worker, è terminata con 2.549 test passati e 16 falliti su 234 file (224 passati, 10 falliti): timeout/soglie di prestazione 3D, scala, Git/workspace, test asincroni del server e due controlli della copertura i18n. Questa esecuzione è partita prima della conclusione delle modifiche; le chiavi segnalate dai controlli i18n sono presenti nell’albero finale, ma un run durante l’evoluzione dei sorgenti non può validare l’albero finale. I gruppi mirati successivi non sostituiscono una suite completa. Nessuna soglia o configurazione dei test modificata; gli esiti successivi sono riportati sotto. Non si dichiara la suite completa superata.

**Verifica sequenziale dell’albero finale:** 62 test passati su sei file, build/TypeScript superati e prova Edge/Playwright EN/IT superata. Verificati impostazioni a 390 px e 1.440 px, modulo issue del Kanban e testo della visita guidata, senza creazione di issue o avvio di agenti reali. Nessun errore console e nessun overflow orizzontale nella schermata mobile verificata. [Screenshot desktop IT](screenshots/italian-ui/desktop-it-settings.png), [desktop EN](screenshots/italian-ui/desktop-en-settings.png), [mobile IT](screenshots/italian-ui/pocket-it-settings.png), [mobile EN](screenshots/italian-ui/pocket-en-settings.png). Solo demo con percorsi fittizi nelle immagini. Demo arrestata; ufficio reale ancora attivo, senza incarichi e con automazioni disattivate.

**Confronto con il main invariato:** lo stesso ambiente ha riprodotto la soglia di prestazione dei percorsi e i timeout di simulazioni eventi, luce e lanci anche sul main (`20c3897`); il gruppo di sette file sul main è terminato con 71 test passati e cinque falliti, incluso un ulteriore timeout nel controllo dei sorgenti delle notifiche. Questo dimostra la riproducibilità di alcuni problemi sulla baseline, non la causa di tutti i fallimenti.

**Suite completa finale locale:** run sull’implementazione congelata `efcfcf151500d1695be8760a71866907176063d3`, con un solo worker e senza modificare i sorgenti durante l’esecuzione: **2.563 test passati, tre timeout; 231 file passati su 234**, durata circa 979 secondi. Timeout in `server/workspace.test.ts` (worktree PR già aperto sulla postazione dell’autore, 60 secondi), `client/src/world/toys/throwSim.test.ts` e `client/src/world/sky/indoor.test.ts` (5 secondi). I due timeout 3D sono stati riprodotti sulla baseline; quello workspace non è stato confrontato isolatamente con il main. Tutti i nuovi controlli i18n sono passati. La suite locale non è dichiarata verde e nessuna soglia è stata allentata.

**CI remota sullo stesso commit:** [run manuale 41190512044](https://github.com/rosariomoscato/cubefarm/actions/runs/41190512044) completato con successo su **Ubuntu, Windows e macOS**, inclusi TypeScript, suite completa, build e smoke test del pacchetto. Windows: **2.566 test passati**; Ubuntu e macOS: **2.564 passati e due saltati**; tutti i **234 file di test passati** su ciascun sistema. Il successo CI non viene presentato come esito positivo della suite su questo PC. Branch e PR pubblicati solo sul fork; merge non autorizzato. Le successive modifiche documentali non cambiano il codice dell’implementazione verificata; la CI della PR sul suo head è un controllo distinto dal run manuale qui citato.

### PR #5 integrata: consolidamento dipendenze e rifiniture del manager

**Riferimenti e stato:** [PR #5 del fork](https://github.com/rosariomoscato/cubefarm/pull/5), integrata con conferma esplicita del manager; merge commit `7b93a118bdbc24d071e4f48d892efa3bbe8a4e6c`. Checkout locale riportato su `main` e aggiornato in fast-forward, branch di lavoro conservati. Nessun incarico AI, modifica al progetto di prova o rilascio npm in questa operazione.

**Verifiche:** revisione mirata finale senza blocchi individuati (autovalutazione, non approvazione indipendente). [CI della PR, run 41146304695](https://github.com/rosariomoscato/cubefarm/actions/runs/41146304695), superata su Ubuntu, Windows e macOS per TypeScript, test, build e smoke test del pacchetto. Gli alberi Git del merge e della revisione verificata `cdee7b1` hanno lo stesso hash: `453c17f323f39f964bcc0fd479bc0bdfb497f60f`. Nessuna nuova esecuzione completa locale dei test viene implicata da questo confronto. La CI successiva su `main` è distinta e monitorata separatamente.

**Limiti storici conservati:** le instabilità locali, i limiti della diagnosi npm e il riuso della coda sviluppatore non vengono nascosti dal merge. I riferimenti sottostanti a modifiche solo locali, pubblicazione/merge non autorizzati e verifica remota in attesa descrivono le fasi precedenti, ora superate dalla conferma e dalla CI riportate qui.

### Consolidamento autorizzato e prova completa su un progetto reale

**Decisione del manager:** autorizzati push del branch `fix/manager-requested-refinements` e apertura di un’unica PR verso il `main` di `rosariomoscato/cubefarm`, comprendente `962ce11` (dipendenze/watchdog) e `4ac28f4` (richieste esplicite dopo QA positivo). Nessun merge o rilascio npm autorizzato. Le restrizioni di pubblicazione nelle sezioni sottostanti descrivono lo stato precedente.

**Validazione manuale completata:** dopo il riavvio dell’ufficio, la richiesta di rifinitura della [PR #13 di space-monsters](https://github.com/rosariomoscato/space-monsters/pull/13) è stata accettata tramite l’API manager, marcata `managerRequested` e affidata ad Ada sulla stessa PR. Terminata la modifica, il QA è passato al round 2 con esito positivo; il controllo dello stato ha confermato il ritorno a `passed`, senza errore dell’agente e con merge automatico ancora disattivato. Il manager ha approvato la nuova anteprima e ha eseguito il merge dall’app. GitHub ha confermato il merge `21e3bdac7a18df5ba819be01f309cd791a76cdb5`. Verificato così il ciclo issue → sviluppo → QA → rifinitura richiesta dal manager → nuovo QA → approvazione visiva → merge manuale nell’app, senza modifica manuale dello stato.

**Limiti conservati:** il secondo QA è stato svolto da Ada in una sessione separata; non è una revisione di un diverso autore umano. I rapporti del progetto dichiarano sette test, lint, typecheck, build e controlli desktop/320px nelle due lingue superati; i controlli remoti disponibili erano Vercel/preview, non una CI GitHub completa del progetto. Il difetto mobile preesistente dell’overlay iniziale è rimasto fuori ambito. Per CubeFarm restano i 207 test mirati su 14 file e build/TypeScript passati; le instabilità iniziali sono riportate sotto. La CI indipendente della nuova PR è ancora da verificare. Nessuna ulteriore richiesta AI a CEO o agenti per questo consolidamento documentale e pubblicazione.

### Richieste esplicite del manager dopo un QA positivo

**Stato:** modifiche sul branch locale `fix/manager-requested-refinements`, che include anche la correzione dipendenze/watchdog `962ce11` ancora non integrata nel main. Nessun push o merge autorizzato per questo seguito. Preparazione della correzione autorizzata dal manager; nessun nuovo incarico AI avviato per applicare la rifinitura.

| Feature | Tipo | Breve descrizione |
| --- | --- | --- |
| Richiedi modifiche dopo QA | Flusso | Nel Kanban, una PR pronta al merge offre il comando EN/IT «Request changes / Richiedi modifiche». Il dialogo richiede una nota (massimo 1.000 caratteri) e avverte dell’avvio di lavoro AI. Il percorso manager può rinviare una PR con stato `passed`; i tool di triage del CEO mantengono le restrizioni precedenti. Restano i rifiuti per PR chiuse/mergeate, sconosciute, in QA o già in correzione. |
| Richiesta distinta da un fallimento QA | Tracciamento | Il motivo `manager` identifica il lavoro aggiuntivo senza sostituire riepilogo, controlli, link al rapporto o SHA del precedente QA. Lo stato interno `failed` è riutilizzato esclusivamente come coda sviluppatore, non come nuovo verdetto; scheda e badge distinguono le modifiche richieste dal manager. Le istruzioni al developer, al QA successivo e alla ripresa dopo riavvio non dichiarano che il precedente QA sia fallito. |
| Nuovi commit e nuovo QA | Verifica | La richiesta conserva separatamente l’head corrente (`requestedSha`). Un semplice rerun di controlli o l’assenza di nuovi commit non soddisfa una richiesta di rifinitura. Dopo il push il lavoro torna al QA, non direttamente al merge, anche se il vecchio commit aveva superato tutti i controlli. Il retest esplicito non consuma il budget dei round richiesti dal QA. Anche il recupero dei vecchi budget non considera sufficiente un pass storico per una richiesta ancora pendente. |
| Test e build | Verifica | Gruppo finale: **207 test passati su 14 file**, incluse convalida del rinvio, conservazione del motivo manager nei successivi rinvii, esiti delle correzioni, prompt QA, recupero al riavvio, proprietà delle PR, merge gate, watchdog, dipendenze, schede, i18n, analisi e CEO. Build e TypeScript superati, soglie invariate. Verifica manuale del nuovo comando e del ciclo completo manager → developer → nuovo QA ancora da eseguire dopo il riavvio. |

**Contesto della richiesta:** la PR di prova aveva superato QA, ma il manager preferisce tre celle di punteggio allineate all’HUD anziché una riga discorsiva. I criteri completi sono stati pubblicati sulla stessa PR. I tentativi di rinvio con il server precedente sono stati rifiutati dalla convalida (nota troppo lunga, poi stato `passed` non ammesso), senza nuovi incarichi. Nessuna manipolazione manuale dello stato dell’ufficio per aggirare la regola.

**Limiti delle verifiche:** il primo gruppo esteso ha avuto timeout ed errori `ENOENT` nello stato temporaneo dei test. Un successivo run analisi/CEO ha rilevato un salvataggio lingua inatteso; il test isolato è passato. Un checkout temporaneo del precedente main e il branch corrente hanno poi entrambi superato i due file, e il gruppo finale completo è passato. Non è dimostrata la causa dell’instabilità; gli esiti iniziali non vengono cancellati dal risultato finale. Il checkout diagnostico temporaneo e il suo collegamento alle dipendenze sono stati rimossi senza toccare le dipendenze originali. Restano i consueti avvisi di build sui bundle e su Rapier.

**Prova installazione precedente:** l’installazione reale isolata, senza avvio di Ada, è infine riuscita in 408 secondi e ha scritto il marker coerente con package e lockfile. Il successivo incarico sulla prima issue è partito; questo non garantisce prestazioni future del registry. Il workflow della vecchia factory resta disabilitato e il merge automatico del progetto resta spento.

## 2026-10-30

### Preparazione dipendenze: watchdog coordinato e attesa visibile

**Stato:** correzione sul nuovo branch locale `fix/dependency-install-watchdog`, non integrata nel `main` e non pubblicata. Indagine e sviluppo autorizzati dal manager senza nuove richieste AI, riavvio dell’ufficio o riassegnazione automatica dell’issue di prova.

| Feature | Tipo | Breve descrizione |
| --- | --- | --- |
| Timeout coordinati per fase | Correzione | Il watchdog distingue una preparazione Git bloccata dall’installazione dipendenze in attesa o in esecuzione. Quando il runtime segnala `Installing dependencies`, l’installatore mantiene la responsabilità del proprio timeout; il watchdog non rimette il lavoro in coda dopo i primi 10 minuti. Invariati il timeout locale npm di 15 minuti, il limite delle installazioni simultanee e i controlli sugli altri stati. Il segnale è del runtime, non persistito nello stato dell’agente. |
| Installazione meno silenziosa | Diagnostica | Ogni minuto di esecuzione locale di npm, il log riceve un avviso con il tempo trascorso e il timeout. Il messaggio è generato dall’ufficio, non inoltra output npm potenzialmente sensibile e non pretende di attestare progresso dei download. Il timer viene rimosso sia al successo sia al fallimento; l’attesa in coda non è conteggiata come esecuzione npm. Le note di preparazione sono riportate anche nel terminale già esistente dell’agente. |
| Regressioni isolate | Verifica | 71 test passati su otto file: watchdog, dipendenze, nuova integrazione installazione/watchdog, analisi, CEO, terminale, OpenCode runner e macchine cloud. Le sessioni simulate dimostrano che il lavoro resta in preparazione oltre 10 minuti durante l’installazione e parte una sola volta dopo la sua conclusione, sia in caso di successo sia di fallimento. Confermati gli invariati controlli sulle preparazioni senza installazione e sulle sessioni silenziose, e la pulizia dei timer di avanzamento. Build e TypeScript superati; nessuna modifica alle soglie dei test. |

**Causa osservata nella prima issue reale:** preparazione rimessa in coda dal watchdog a 10 minuti; successivo timeout di npm a 15 minuti, senza marker di installazione completata. Nel log npm sono presenti numerosi fetch mancanti dalla cache con tempi da circa due minuti fino a oltre 14 minuti e un tentativo `ECONNRESET`. Non risultavano nuove esecuzioni della precedente factory; l’issue era priva dell’etichetta `ready` che ne attivava il dispatch. Il workflow di collegamento è stato poi disabilitato su autorizzazione esplicita, senza eliminare repository o segreti.

**Limiti:** un successivo `npm ping` al registry ufficiale è riuscito in circa un secondo, ma non dimostra che i download siano tornati veloci né separa gli effetti di rete, cache, disco o carico locale. Nessuna nuova installazione reale, cambio di registry/proxy, pulizia cache o modifica antivirus effettuati. Il problema ambientale dei download lenti non è dichiarato risolto. La nuova correzione server richiede un riavvio prima della prova manuale; l’issue resta da riassegnare soltanto con il manager. Restano gli avvisi preesistenti di build su bundle e import Rapier. La prima versione del nuovo test d’integrazione non isolava il ritardo simulato della preparazione macchina: corretto il mock, poi superato il gruppo completo riportato sopra.

### PR #4 integrata: correzioni OpenCode e risultati Markdown

**Riferimenti e stato:** [PR #4 del fork](https://github.com/rosariomoscato/cubefarm/pull/4) integrata con conferma esplicita del manager; merge commit `acf7c0ba022ef8fcd4fd8cc50eddd3cd258b972b`. Checkout locale riportato sul `main` e aggiornato in fast-forward. I branch di lavoro sono conservati; nessuna pubblicazione npm, nessuna modifica al progetto di prova e nessuna nuova richiesta AI.

**Verifiche:** revisione mirata del diff senza problemi bloccanti individuati (autovalutazione, non approvazione indipendente); [CI della PR, run 41134350240](https://github.com/rosariomoscato/cubefarm/actions/runs/41134350240), superata su Ubuntu, Windows e macOS per TypeScript, test, build e smoke test del pacchetto. Il confronto Git tra l’albero del merge e la revisione CI `1d7b153` non mostra differenze. I precedenti 148 test locali e le conferme manuali del manager restano descritti sotto; nessuna nuova esecuzione locale completa è implicata dal confronto degli alberi.

**Documentazione e limiti:** questa voce aggiorna solo lo stato di integrazione. Restano validi i limiti sugli estratti delle analisi precedenti, sulla conservazione dei log e sull’assenza di sandbox. Le sezioni sottostanti che indicano branch locale, merge non autorizzato o CI in attesa sono registrazioni storiche. La CI successiva su `main` è distinta dalla CI della PR e viene monitorata separatamente.

### Autorizzazione alla PR delle correzioni OpenCode e della vista Markdown

**Decisione del manager:** autorizzati push del branch `fix/opencode-first-run-terminal` e apertura di una PR esclusivamente su `rosariomoscato/cubefarm`, verso il `main` del fork, per la CI su Ubuntu, Windows e macOS. Nessun merge o rilascio npm autorizzato.

**Contenuto:** correzioni del commit `fa4e3fa` (cartella iniziale del CEO e risposta persistente del terminale), presentazione e conservazione del risultato Markdown del commit `232931d`. Il manager ha confermato la visualizzazione corretta anche dopo il riavvio. Verifiche locali: 148 test su 12 file, build e TypeScript superati; CI remota delle nuove modifiche ancora da verificare. Le restrizioni di pubblicazione nelle sezioni sottostanti descrivono gli stati precedenti.

### Analisi reale verificata e risultato Markdown separato dal terminale

**Stato:** seguito locale sul branch `fix/opencode-first-run-terminal`, dopo il commit `fa4e3fa`; nessun push, PR o merge di queste correzioni. Il manager ha verificato manualmente il catalogo OpenCode dopo il riavvio e la permanenza della risposta del CEO dopo il completamento e il cambio scheda. La prova successiva di analisi è stata autorizzata separatamente.

| Feature | Tipo | Breve descrizione |
| --- | --- | --- |
| Prima analisi manuale reale | Verifica | Risposta italiana su un repository del manager con OpenCode e GPT-6.1 Terra. Al controllo successivo: checkout Git pulito; agente in stato `done`, senza errori, branch, issue o PR associati; nessuna issue/PR restituita dalla ricerca GitHub, su tutti gli stati, degli elementi aggiornati nell’intervallo della prova. Assegnazione e merge automatici ancora disattivati, revisioni del CEO a zero e coda vuota. |
| Risultato leggibile | Interfaccia | Le analisi concluse mostrano la risposta in un riquadro Markdown, usando il renderer sicuro già presente (HTML non eseguito, protocolli pericolosi disabilitati, immagini remote non caricate). Terminale e log tecnico restano disponibili in una sezione richiudibile, montata solo quando viene aperta. Nuove etichette EN/IT. Nessuna modifica al layout dei terminali durante il lavoro o degli altri task. |
| Risposta integrale delle nuove analisi | Persistenza | Al completamento riuscito, il Markdown completo è conservato come voce `reply` nel log persistente e distribuito tramite il watch esistente, non nei normali snapshot. Non è limitato all’anteprima tecnica di 30 righe; resta soggetto alla normale conservazione del log. La vista seleziona solo la risposta dell’ultima richiesta, senza confondere risultati degli strumenti o follow-up precedenti. |
| Compatibilità con analisi precedenti | Interfaccia | Quando esiste solo la vecchia anteprima tecnica, questa è resa come Markdown e indicata esplicitamente come **estratto**, senza ricostruire o inventare le righe mancanti. L’output originale resta nel terminale. Nessuna nuova richiesta AI o modifica dello stato dell’ufficio per recuperarlo. |
| Regressioni e browser | Verifica | 148 test passati in 12 file (nuova presentazione/estrazione, analisi, CEO, catalogo, terminale, runner, plugin, i18n e journal); build e TypeScript superati. Nel browser dell’ufficio esistente verificati l’estratto salvato, quattro intestazioni, una tabella, etichette italiane, terminale tecnico inizialmente smontato e successivamente apribile senza perdere il risultato. Nessuna nuova generazione AI durante sviluppo o verifica della vista. |

**Limiti della verifica di sola lettura:** non era stato registrato un confronto prima/dopo della prova, quindi il checkout pulito e le tracce disponibili non escludono modifiche temporanee poi annullate o operazioni non registrate. Le regole dell’analisi sono istruzioni, non una sandbox. Il salvataggio integrale è stato verificato con sessioni simulate e lettura dello stato isolato su disco, non ripetendo l’analisi reale. Le nuove modifiche server richiedono un riavvio dell’ufficio per le analisi future; la vista client è stata verificata riutilizzando i log già disponibili. I primi tentativi paralleli di test/typecheck hanno raggiunto il timeout del comando; le verifiche successive, eseguite separatamente, sono passate. Restano gli avvisi preesistenti di build su bundle e import Rapier.

### Correzioni locali: primo catalogo OpenCode e risposta del CEO nel terminale

**Stato:** modifiche sul branch locale `fix/opencode-first-run-terminal`, non integrate nel `main`, non pubblicate su npm. Merge rinviato alla conclusione dei test e alla conferma del manager.

| Feature | Tipo | Breve descrizione |
| --- | --- | --- |
| Catalogo prima del primo incarico | Correzione | La lettura dei modelli del CEO crea prima la sua cartella dedicata, in modo idempotente. OpenCode non riceve più una posizione inesistente (HTTP 404). Nessun avvio del CEO, generazione AI o creazione di checkout; le posizioni dei repository non vengono create implicitamente. |
| Risposta finale persistente nel terminale | Correzione | Quando una sessione OpenCode viene chiusa, la risposta finale passa dallo schermo alternativo interattivo allo scrollback normale, che può riadattarsi alle dimensioni del riquadro. I caratteri di controllo della risposta sono rimossi. Le sessioni mantenute attive conservano il loro schermo interattivo. |
| Regressioni isolate | Verifica | 30 test passati in quattro file: `ceoRuntime`, `opencodeModels`, `terminal`, `cliRunnerOpenCode`. Coperti creazione della cartella prima del catalogo, letture ripetute senza sessioni, chiusura del CEO, ridimensionamento, replay dello snapshot e rimozione dei controlli terminale. Nessuna nuova richiesta AI reale. |
| Verifica estesa | Verifica | 91 test passati su sette file, includendo anche `cliRunner`, `clis` e `opencodePlugin`. Build di produzione e TypeScript superati; `git diff --check` senza errori. Restano gli avvisi di build già presenti sui bundle e sull’import di Rapier. Nessun nuovo run CI remoto avviato per queste correzioni. |

**Diagnosi e limiti:** nel primo ufficio reale il CEO ha risposto in italiano con OpenCode e il modello scelto dal manager. La risposta è rimasta salvata nel telefono. La diagnostica senza generazione ha trovato il testo nello snapshot del terminale; un riquadro più basso può tagliare le prime righe dello schermo alternativo dopo che la CLI si è chiusa e non può più ridisegnarlo. La correzione conserva il risultato in formato testuale, non promette di mantenere intatto ogni dettaglio grafico della TUI. La verifica manuale delle correzioni sul nuovo processo resta da completare; l’ufficio già in esecuzione non è stato riavviato o modificato per applicarle.

**CI precedente chiusa:** il [run su main 41088218071](https://github.com/rosariomoscato/cubefarm/actions/runs/41088218071), commit `e6c17c9`, è infine passato su Ubuntu, Windows e macOS. I primi due tentativi macOS non avevano ottenuto un runner hosted per limiti di capacità ARM64; il tentativo successivo ha eseguito tutti i passaggi con successo, senza modifiche a codice, workflow, soglie o timeout. Questo esito riguarda il main precedente, non le nuove correzioni locali.

### Integrazione EN/IT nel main del fork e verifica successiva

**Riferimenti e stato:** [PR #3 del fork](https://github.com/rosariomoscato/cubefarm/pull/3), integrata con autorizzazione esplicita del manager; merge commit `2a5200de7ebb63b639c0dcfb6cb028659c74dd99`. Checkout locale aggiornato in fast-forward sul `main` del fork. Nessuna cancellazione del branch di lavoro, nessun aggiornamento dell’installazione globale e nessuna pubblicazione npm.

| Feature | Tipo | Breve descrizione |
| --- | --- | --- |
| CI indipendente superata | Verifica | [Run 41084777570](https://github.com/rosariomoscato/cubefarm/actions/runs/41084777570) sulla revisione `fa9d3e2`: 230 file superati su ogni sistema. Windows: 2.536 test passati; Ubuntu/macOS: 2.534 passati e 2 test riservati a Windows saltati. TypeScript, build e smoke test demo del pacchetto superati su tutti e tre i sistemi, inclusa la soglia invariata degli 8 ms. |
| Revisione finale e merge | Integrazione | Revisione mirata senza blocchi individuati, uscita dalla bozza e successiva autorizzazione separata al merge. Nessuna modifica al pathfinding o alle soglie dei test. |
| Verifica del main integrato | Verifica | Confronto Git senza differenze tra l’albero del merge e la revisione passata in CI; nuova build/TypeScript e 129 test mirati su 12 file superati. |
| Nuova demo isolata | Verifica | Controllati cambio EN/IT, preferenza italiana dopo reload, navigazione Pocket, dettatura simulata che conserva la bozza senza invio automatico, interruzione con Esc e risposta italiana del CEO demo. Nessun errore console rilevato; demo e scheda diagnostica arrestate al termine. Nessuna cattura del microfono o richiesta AI/ElevenLabs reale da parte dell’agente. |

**Limiti conservati:** la localizzazione è iniziale e non integrale. La dettatura hardware in Chrome è stata verificata dall’utente; il controllo browser successivo al merge usa riconoscimento simulato. Il risultato positivo della CI non cancella i fallimenti prestazionali locali né dimostra che il solo piano energetico fosse la causa. Le sezioni precedenti/sottostanti mantengono gli stati storici di bozza, sospensione e indagine.

**Aggiornamento documentale:** README e report allineati allo stato integrato, senza ulteriori cambiamenti al codice applicativo. La CI sul `main` documentale, quando disponibile, è separata dal run della PR riportato sopra.

### PR in bozza per verifica CI indipendente

**Decisione del manager:** autorizzati il push di `feat/english-italian` e l’apertura di una **PR in bozza esclusivamente su `rosariomoscato/cubefarm`**, per eseguire la CI su runner separati. Nessun merge o rilascio autorizzato. Le precedenti note di sospensione del push descrivono lo stato storico prima di questa decisione.

**Contenuto:** localizzazione EN/IT e rifinitura della dettatura del commit `3d438ce`, validazione raggruppata del commit `353fe8e`, indagine prestazionale e tentativi ambientali documentati. Aggiunta una schermata del wizard italiano ottenuta nella demo isolata, senza credenziali o contenuti privati.

**Verifiche e limiti da dichiarare nella PR:** 2.535 test locali passati su 2.536, con un solo budget prestazionale fallito anche sul `main` del fork; 129 regressioni mirate e build/TypeScript superati; conferme manuali dell’utente sulla dettatura Chrome. Nessuna soglia allentata, nessuna modifica al pathfinding. La CI esistente prevede Node 24 e controlli Ubuntu, Windows e macOS per queste modifiche, inclusi test, build e smoke test del pacchetto in demo. L’esito remoto resta da verificare: l’apertura della bozza non equivale a CI superata.

### Tentativo di prova controllata con piano Bilanciato

**Autorizzazione:** l’utente ha richiesto la prova controllata. Attivato temporaneamente il piano Windows Bilanciato, verificata l’attivazione e ripristinato/verificato il precedente Risparmio di energia al termine di ciascun tentativo.

**Esito:** prerequisito di basso carico non raggiunto. Dopo l’assestamento, quattro finestre di cinque secondi hanno misurato medie CPU di circa 55,0%, 38,7%, 75,1% e 44,0%, con picco del 95,1%; il criterio diagnostico richiedeva due finestre consecutive al massimo al 30%. Nessun test dei percorsi avviato sotto queste condizioni: il risultato non viene presentato come prova controllata riuscita né come nuovo fallimento del codice.

**Ricontrollo dopo «pronto»:** osservato ancora circa 64% di carico iniziale; uno snapshot dei contatori Windows mostra attività in WSL, Brave e OpenCode. Un ulteriore controllo temporaneo su Bilanciato ha registrato circa 99,6% medio negli ultimi cinque secondi: nessun test avviato, nessun processo fermato, piano iniziale ripristinato. Non si attribuisce causalmente l’aumento al piano energetico; resta necessario ridurre in sicurezza le attività in background.

**Dopo lo spegnimento di Docker segnalato dall’utente:** ripetuto il protocollo invariato su Bilanciato. Medie delle quattro finestre: circa 32,0%, 29,1%, 53,5% e 53,3%. Mancano due finestre consecutive sotto il criterio di basso carico: nessun test avviato, piano Risparmio di energia ripristinato e worktree temporaneo rimosso. Nessuna chiusura automatica di altri processi né nuova dichiarazione di suite verde; una macchina/CI separata o una diagnosi del carico residuo richiedono la prossima decisione del manager.

**Stato:** nessuna modifica a codice, soglia degli 8 ms o dipendenze; nessuna chiusura di programmi/uffici dell’utente, nessuna chiamata AI, commit, push o PR. Necessaria collaborazione dell’utente per ridurre solo le attività non essenziali prima di ripetere il controllo. Dettagli e ripristino in `docs/pathfinding-investigation.md`.

### Indagine sul budget prestazionale dei percorsi

| Feature | Tipo | Breve descrizione |
| --- | --- | --- |
| Confronto ripetuto branch/baseline | Diagnosi | Sei esecuzioni fresche del test originale: successi e fallimenti su entrambi i checkout. Verificati identità dei 14 moduli runtime, bundle diagnostico identico byte per byte e stessi percorsi restituiti. Nessuna evidenza di regressione del pathfinding introdotta da EN/IT. |
| Condizioni della macchina | Diagnosi | Rilevati piano Windows Risparmio di energia e carico CPU elevato durante le misure. Sono fattori rilevanti per il budget assoluto di 8 ms, non una dimostrazione causale isolata; nessuna impostazione di sistema cambiata. |
| Profilo e conteggio del lavoro | Diagnosi | Profilazione della versione originale e contatori in una sola copia temporanea: costi concentrati in pianificazione e visibilità; 2,592 MB di buffer nuovi e 496 controlli di segmento per 15 percorsi, dei quali 6 già rettilinei. Nessuna ottimizzazione applicata. |

**Stato:** indagine documentata in `docs/pathfinding-investigation.md`; codice applicativo, test, soglie e dipendenze invariati. Strumenti e misure grezze solo nella cartella temporanea approvata. Nessun push, PR o modifica all’ufficio dell’utente. La scelta tra prova ambientale controllata, ottimizzazione separata e revisione metodologica del benchmark resta al manager; il precedente fallimento della suite non viene cancellato da un retry riuscito.

### Verifica completa EN/IT suddivisa in gruppi

**Riferimento:** commit funzionale `3d438ce`, branch `feat/english-italian`, confronto con `main` del fork a `7c9c148`.

| Feature | Tipo | Breve descrizione |
| --- | --- | --- |
| Copertura dell’intera suite | Verifica | Eseguiti tutti i 230 file di test in quattro gruppi, confrontando i report JSON con l’inventario Git: nessuna omissione o duplicazione. Risultato: 2.535 test passati e 1 fallito su 2.536. Workspace (44 test) e scala superati senza allentare soglie o timeout. |
| Confronto del fallimento prestazionale | Diagnosi | Il budget di 8 ms del percorso fallisce anche in un worktree pulito del `main` del fork: circa 8,913 ms, contro 13,469 ms nel file eseguito da solo sul branch. Nessuna modifica ai file coinvolti; non si dichiara comunque verde la suite del branch. |
| Dettatura verificata dall’utente | Verifica manuale | Confermati in Chrome dettatura normale, conservazione della bozza e interruzione con Esc, senza necessità di inviare messaggi. |

**Stato:** push e apertura PR sospesi perché rimane un test prestazionale fallito, riprodotto anche sulla baseline. Nessun merge, pubblicazione npm, richiesta AI reale o modifica all’installazione globale. Worktree diagnostico separato; nessun cambiamento al codice applicativo durante questa verifica. Comandi, conteggi e limiti in `docs/validation-english-italian.md`.

Questa esecuzione completa per gruppi sostituisce l’incertezza sulla copertura della precedente prova interrotta, non ne cancella la cronologia né risolve il budget prestazionale.

### Rifinitura della dettatura e compatibilità dei browser

| Feature | Tipo | Breve descrizione |
| --- | --- | --- |
| Avvio del microfono bloccato | Correzione | Il timeout già presente di circa 10 secondi ora mostra un errore invece di annullare silenziosamente l’ascolto. Mantiene la bozza, libera l’attenuazione audio e permette di riprovare. |
| Errori senza evento finale | Robustezza | Gli errori di riconoscimento vengono mostrati anche se il browser non emette `onend`; le callback tardive dopo l’annullamento non riattivano la sessione. |
| Stati e messaggi EN/IT | Localizzazione | Tradotti avvio, ascolto, trascrizione, tooltip, etichette accessibili, errori e istruzioni principali della dettatura. |
| Compatibilità verificata | Documentazione | L’utente ha confermato la dettatura italiana in Chrome e segnalato l’avvio giallo senza trascrizione in Brave. Nessun blocco per nome del browser né passaggio automatico a servizi a pagamento; documentata l’alternativa Windows + H. |

**Stato:** consolidata insieme alla prima localizzazione nel commit locale che introduce questa voce, sul branch `feat/english-italian`, come autorizzato dall’utente. Nessun push o pubblicazione.

**Verifiche:** **129 test mirati e di regressione superati su 12 file**, inclusi timeout, riprova, callback tardive, errori senza `onend`, conservazione della bozza, normale trascrizione simulata, voce, dettatura, vivavoce e localizzazione. TypeScript e build superati. Nel browser, su una demo separata: simulato riconoscimento che non parte, errore italiano dopo circa 10 secondi, bozza conservata e riprova con trascrizione simulata senza invio automatico; nessun errore console. Demo di verifica arrestata senza toccare quella dell’utente. Nessuna cattura del microfono o chiamata AI/ElevenLabs reale da parte dell’agente.

**Suite completa finale non conclusa:** il comando con un worker è stato interrotto al limite esterno di 20 minuti; durante la prova sono comparsi un timeout nel test di scala (`server/scale.test.ts`) e un superamento della soglia temporale del percorso (`client/src/world/walkways.test.ts`). Entrambi i file rieseguiti separatamente sono passati (**18 test su 2 file**), senza modificare soglie o timeout dei test. Non si dichiara quindi superata la suite completa dello stato finale; il precedente risultato completo sotto resta riferito alla versione provata allora.

### Prima localizzazione inglese/italiano

**Stato:** modifiche consolidate nel commit locale sul nuovo branch `feat/english-italian`, basato sul `main` del fork dopo PR #2. Nessun push, pubblicazione npm o modifica all’installazione globale.

| Feature | Tipo | Breve descrizione |
| --- | --- | --- |
| Lingua dell’ufficio | Nuova funzionalità | Scelta English/Italiano salvata sul server, condivisa tra dispositivi, disponibile all’avvio, nel wizard, nelle impostazioni della console e in Pocket. Vecchi uffici e valori non supportati ricadono sull’inglese. |
| Interfaccia principale | Localizzazione | Dizionario centralizzato con fallback inglese e interpolazione; tradotti navigazione, wizard e controlli principali di chat, CEO, progetti, modelli e analisi. Nessuna riscrittura del DOM o traduzione dei contenuti dell’utente. |
| Comunicazione CEO e analisi | Integrazione | Istruzioni di risposta nella lingua scelta, anche nei messaggi a un CEO attivo e nei follow-up di analisi. Codice, issue, PR e brief QA del repository restano in inglese. |
| Voce e dettatura | Integrazione | Locale dell’ufficio per il riconoscimento nel browser, preferenza per voci compatibili, campione italiano e hint lingua ElevenLabs. Richieste/cache inglesi retrocompatibili e clip già salvate invariate. |
| Demo e regressioni | Verifica | Chat di stato e analisi demo italiane; test su fallback, interpolazione, migrazione, persistenza, istruzioni, scelta delle voci e payload ElevenLabs senza richieste reali. |

**Verifiche:** TypeScript e build superati (restano gli avvisi già noti su Rapier e dimensioni dei chunk); suite completa avviata durante la lavorazione: **2.527 test superati su 228 file**. Le ultime aggiunte ai test, successive all’avvio della suite, sono state validate con **58 test mirati superati su 5 file**, inclusi payload HTTP ElevenLabs simulati, cache tra lingue, placeholder, migrazione e persistenza. `git diff --check` senza errori di whitespace. Nel browser: wizard italiano, cambio EN↔IT, preferenza dopo reload, console/impostazioni, navigazione Pocket e risposta italiana del CEO demo; nessun errore console rilevato. Demo isolata arrestata al termine. Nessuna richiesta AI o ElevenLabs reale.

**Limiti:** prima copertura, non traduzione integrale; pannelli secondari, descrizioni avanzate, notifiche, errori, log, etichette 3D e alcuni script demo restano inglesi. La lingua dei modelli è istruita, non imposta tecnicamente. Voci italiane dipendenti da dispositivo/provider. Dettagli in `docs/languages.md`.

### Integrazione delle modifiche precedenti

I commit `8adf85b` e `6365848` sono stati integrati nel `main` del fork tramite [PR #2](https://github.com/rosariomoscato/cubefarm/pull/2), merge `7c9c148`. CI superata su Ubuntu, macOS e Windows. Le note seguenti conservano lo stato storico alla registrazione iniziale; nessuna pubblicazione npm del fork.

### Registro del fork e README

| Feature | Tipo | Breve descrizione |
| --- | --- | --- |
| Registro storico del fork | Documentazione | Introdotto `docs/FORK_CHANGELOG.md`, con date, feature, descrizioni, riferimenti, verifiche e modello per le prossime voci. |
| README del fork | Documentazione | Esplicitati supporto OpenCode V2, varianti, Analisi e onboarding opzionale; distinto l'avvio da sorgente del fork dal pacchetto npm originale. |

**Riferimento:** commit documentale successivo a `8adf85b` sul branch `feat/opencode-ceo`; non ancora pubblicato né integrato nel `main` del fork.

### Integrazione OpenCode V2 e analisi manuale

**Riferimento:** commit `8adf85b`, branch `feat/opencode-ceo`. Alla registrazione iniziale: commit locale, non ancora pubblicato né integrato nel `main` del fork.

| Feature | Tipo | Breve descrizione |
| --- | --- | --- |
| OpenCode per il CEO | Nuova funzionalità | Il CEO può usare Claude Code oppure OpenCode V2 nel runtime **Real terminals**. Claude resta il predefinito; il runtime Agent SDK resta Claude-only. |
| Aggiornamento V2 per i membri del team | Compatibilità | Configurazione, plugin e collegamenti MCP migrati alle API V2 per tutti gli agenti OpenCode, non solo per il CEO. |
| Controllo della versione OpenCode | Validazione | Verifica durante il rilevamento, nella scelta/creazione degli agenti e prima di ogni nuovo processo. V1, major non supportate e versioni non verificabili vengono rifiutate; nessun aggiornamento automatico di OpenCode. |
| Launcher OpenCode su Windows | Correzione | Risoluzione dello shim `.cmd` dell'app desktop verso l'eseguibile reale, anche con spazi nel percorso. |
| Servizi OpenCode separati | Isolamento | Ogni terminale usa `--standalone`, separando istruzioni, configurazione e callback dal servizio OpenCode condiviso del manager. Non è una sandbox. |
| Strumenti dell'ufficio per il CEO | Integrazione | Collegamento MCP di sessione per consultare e gestire l'ufficio; supporto alla configurazione MCP V2 anche per il browser. |
| Completamento dei turni | Correzione | Gestione dell'envelope `event.data` e degli eventi nativi `session.execution.*`, con deduplicazione delle notifiche e gestione di errori/interruzioni. Risolto il caso di risposta pronta nel terminale ma stato ancora su **Working**. |
| Selettore dei modelli disponibili | Nuova funzionalità | **Browse OpenCode models** offre ricerca, filtro per provider, varianti, ripristino del predefinito e inserimento manuale. Disponibile per CEO, team, nuove assunzioni, approvazioni e impostazioni generali. |
| Catalogo modelli in sola lettura | Privacy / prestazioni | Inventario dipendente dal progetto, cache di 30 secondi e aggiornamento esplicito. Al browser arrivano solo metadati di selezione, non impostazioni, header o credenziali dei provider. La lettura non genera richieste AI. |
| Varianti di ragionamento OpenCode | Interfaccia | Il controllo effort seleziona le varianti supportate dal modello e salva `provider/model#variant`; non mostra più il vecchio effort di Claude come se fosse attivo su OpenCode. |
| Cambio modello nelle chat riprese | Correzione | Modello e variante scelti vengono applicati al prossimo incarico, incluse le chat riprese da inattive. Un terminale inattivo viene ricreato se la selezione cambia. |
| Modalità Analisi | Nuova funzionalità | Un membro locale può leggere e spiegare il repository senza issue, worktree di sviluppo, installazione delle dipendenze o pipeline PR. Nessun sollecito automatico per commit, push o PR. |
| Follow-up e ripartenza delle analisi | Ciclo di vita | L'agente resta riservato ai messaggi manuali fino a **Clear desk** o a un nuovo incarico esplicito. Nessun riavvio automatico dell'analisi interrotta e nessun nudge automatico del watchdog. |
| Onboarding del CEO opzionale | Controllo manuale | È possibile collegare un progetto saltando sia lo studio iniziale del CEO sia la pianificazione dal brief. Le revisioni periodiche hanno un'impostazione separata. |
| Controlli prima del collegamento | Controllo manuale | Assegnazione automatica delle issue e merge automatico possono essere disattivati prima di collegare il repository. |
| Test e documentazione | Verifica | Aggiunti test di regressione per V2, catalogo, varianti, ripresa delle chat, analisi e onboarding opzionale; aggiornate le guide del fork. |

**Verifiche effettuate:**

- Suite completa locale: **2.517 test superati su 227 file**, con `npm.cmd test -- --maxWorkers=1 --testTimeout=15000`.
- TypeScript e build: `npm.cmd run build` riuscito. Restano avvisi di bundling relativi a Rapier e alla dimensione dei chunk, non errori di compilazione.
- Prova reale del CEO con OpenCode **2.2.1**: strumenti MCP, risposta nella chat, completamento automatico e ripresa della conversazione.
- Prova reale di un membro del team con **GPT-6.1 Sol, variante medium**: analisi riuscita con soli strumenti `read`, `glob` e `grep`, nessuna modifica al checkout e nessuna issue o PR creata.
- Prove eseguite in un ufficio isolato, mantenendo intatta l'installazione globale originale.

**Limiti attuali:** OpenCode e Analisi non sono supportati sulle macchine cloud; le regole di sola lettura sono istruzioni per l'agente, non un blocco tecnico delle scritture. Il test reale del membro del team riguarda l'analisi, non un ciclo completo implementazione → PR → QA → merge. La CI del branch OpenCode non è ancora stata eseguita su GitHub.

### Ottimizzazione del pathfinding del roomba

| Feature | Tipo | Breve descrizione |
| --- | --- | --- |
| Collisioni lungo i segmenti | Prestazioni | Il controllo del percorso considera prima solo gli ostacoli vicini al segmento, evitando di ripetere verifiche su tutti i mobili a ogni campionamento. |
| Heap del pathfinding | Prestazioni | Ridotte le allocazioni temporanee negli inserimenti e nelle estrazioni dell'heap, mantenendo il comportamento del percorso. |
| Test del percorso | Verifica | Aggiunte verifiche di regressione; mantenute le soglie prestazionali, inclusa quella degli 8 ms. Test locali e CI su Ubuntu, macOS e Windows superati. |

**Riferimenti:** commit `f6e9f97`; [PR #1 del fork](https://github.com/rosariomoscato/cubefarm/pull/1), integrata nel `main` del fork con merge commit `86a22b8`.

## Modello per le prossime voci

```markdown
## AAAA-MM-GG

### Titolo del cambiamento

| Feature | Tipo | Breve descrizione |
| --- | --- | --- |
| Nome della feature | Nuova funzionalità / Correzione / Prestazioni / Documentazione | Cosa cambia e per chi. |

**Riferimenti e stato:** commit/PR, branch, integrazione o pubblicazione.
**Verifiche:** test o prove realmente eseguiti.
**Limiti:** eventuali limitazioni o aspetti ancora da validare.
```
