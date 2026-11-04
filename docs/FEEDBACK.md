# Feedback — verifica e attivazione / review and activation

## Stato corrente — completato / Current status — complete

Su autorizzazione del titolare, PR #26 integrata in `main` con merge `61af06f` dopo CI verde sulle tre piattaforme; branch feedback aggiornato con `main` e nuova CI interamente verde sul commit `87fd4d4`. PR #25 successivamente integrata, ancora su autorizzazione, con merge `a8d4d31e131b88052f9950822f8232673ebb309c`. Nessun bypass, force-push o auto-merge. Copertura macOS Intel, non Apple Silicon.

Issues abilitate via impostazioni del solo repository pubblico; API conferma `has_issues=true`, Discussions lasciate disabilitate. Nel browser inizialmente mancava l'accesso: il titolare ha completato personalmente il login, senza condividere credenziali in chat. Verificati sul repository pubblico, nel browser autenticato:

- `/issues/new/choose`: quattro moduli EN/IT riconosciuti e apribili, opzione issue libera e contatto privato verso `https://droidsembly.com/`.
- `01-bug-en.yml` e `02-bug-it.yml`: titolo `[Bug]:`, versione, ambiente, modalità, riproduzione, atteso/ottenuto e prove facoltative; avvisi privacy e link al sito nella lingua pertinente.
- `03-feature-en.yml` e `04-feature-it.yml`: titolo `[Feature]:`, esigenza, proposta, alternative e compatibilità; gratuità/MIT, sostegno facoltativo e costi provider separati.
- Indicatori visivi dei campi obbligatori presenti; checkbox privacy effettivamente resa `required`, inizialmente non selezionata, in tutti e quattro i moduli. Nessun clic su Create: non è stata provata la validazione server o l'effettiva creazione di un'issue. Non si dichiara un audit completo di accessibilità o mobile.
- `gh issue list --state all` dopo la verifica restituisce lista vuota. Nessuna issue fittizia creata, nessun messaggio di contatto inviato, nessun accesso alla posta.
- Il titolare ha successivamente ripetuto personalmente la verifica guidata e confermato tutti e quattro i moduli, senza inviare issue di prova.

Il punto feedback è completato per predisposizione, pubblicazione, attivazione e verifica dei moduli. Questo aggiornamento documentale registra anche la conferma del titolare. Le sezioni successive conservano lo storico della preparazione, dei fallimenti e delle autorizzazioni: non sono lo stato corrente. Nessuna nuova release, modifica dell'installazione/dati reali o attività OIDC avviata; problemi temporali storici non dichiarati definitivamente risolti.

**English:** feedback setup is complete. PR #25 merged as `a8d4d31` after refreshed green Ubuntu/Windows/macOS Intel CI and explicit approval; Issues enabled, Discussions unchanged. All four public-repository forms were opened in an authenticated browser after the owner signed in personally. Fields, required markers, required privacy checkbox, language-specific website links, blank-issue and private-contact options were verified. The owner then independently confirmed all four forms in a guided check. No issue or contact message submitted, no server-side submission validation or comprehensive accessibility/mobile audit claimed. This documentation update records completion; the historical sections below are superseded by this status.

## Italiano

Verifica del 2026-11-04 sul solo repository pubblico `rosariomoscato/droidsembly`:

- GitHub API: `has_issues=false`, `has_discussions=false`. Le issue sono disabilitate: non è stato possibile inventariare le segnalazioni con `gh issue list`. Questo non prova l'assenza di feedback ricevuti altrove.
- Su `main` (`71004a7`) non esistono modelli per issue. README, CONTRIBUTING e metadati npm rimandano già alle issue del fork.
- Il modulo contatti del sito è il canale alternativo già disponibile, secondo la verifica precedente comunicata dal titolare; nessun nuovo invio o accesso alla posta è stato effettuato.

Preparati in `.github/ISSUE_TEMPLATE/` quattro moduli: bug EN/IT e proposte EN/IT, più configurazione con issue libere abilitate e collegamento al contatto privato. Nessuna etichetta o assegnazione automatica: non dipendono da label o collaboratori specifici.

I bug raccolgono versione installata, ambiente, modalità demo/reale, riproduzione, atteso/ottenuto e prove facoltative anonimizzate. Le proposte raccolgono esigenza, risultato desiderato, alternative e compatibilità. Non si richiedono credenziali, stato completo, richieste AI a pagamento o prove sull'ufficio reale.

### Prima di considerare completato il punto feedback

1. Revisionare e validare i file; rispettare i controlli locali previsti da `CONTRIBUTING.md` prima di aprire una PR. L'eccezione concessa alla PR #23 non si estende a questo lavoro.
2. Pubblicare le sole modifiche pertinenti tramite PR sul fork, senza push diretto su `main` né merge autonomo. Non includere documenti o appunti locali preesistenti.
3. Il titolare o un intervento autorizzato abilita **Settings → General → Features → Issues**. I moduli diventano disponibili quando sono nel branch predefinito e le issue sono abilitate.
4. Verificare `/issues/new/choose` e i quattro moduli su GitHub, anche i campi obbligatori e il collegamento al sito. Non inviare issue fittizie o messaggi di contatto senza autorizzazione. La validazione YAML locale non sostituisce questa verifica.
5. Solo dopo attivazione e verifica pubblica segnare completato il punto 1 nella checklist. Alla prima preparazione locale non erano stati effettuati commit, push, PR, attivazione o verifica del rendering GitHub; la successiva autorizzazione alla PR è riportata sotto.

I fallimenti locali dei test restano aperti e separati dalla raccolta feedback; nessuna nuova beta o configurazione OIDC è avviata da questa attività. Il recupero/backup è fuori ambito.

### Verifiche della preparazione locale

- Parsing dei cinque YAML con `yaml@2.8.1`, installato con script disabilitati in una cartella temporanea esterna al repository: superato, nessuna modifica a dipendenze o lockfile del progetto. Python non disponibile; nessuna installazione di Python effettuata.
- Controlli strutturali locali sui tipi di campo usati, ID univoci, stringhe/booleani, opzioni e checkbox privacy obbligatoria: superati. Parità dei campi EN/IT per bug e proposte: superata. Non si tratta di un validatore ufficiale GitHub.
- Collegamenti a file locali nelle guide modificate e controllo whitespace con `git diff --check`, inclusi i nuovi moduli e questo documento: superati.
- I quattro documenti locali protetti sono stati verificati identici byte per byte prima/dopo il cambio branch; nessuno è stato modificato da questa attività.
- Nessuna modifica al codice applicativo. Nella prima preparazione typecheck, build e suite applicativa non erano stati ripetuti; nella successiva verifica autorizzata sono stati eseguiti come riportato sotto. Nessuna PR aperta. I fallimenti locali restano aperti, anche se appunti storici citano un numero inferiore.

### Verifica applicativa autorizzata — 2026-11-04

Le dipendenze del checkout di sviluppo sono una junction verso l'installazione reale: per evitare scritture indirette, verifiche effettuate nel worktree detached `Temp/opencode/droidsembly-feedback-check-20261104`, da `71004a7`, con copia verificata dei soli nove file pertinenti e dipendenze indipendenti installate dal lockfile. Nessuna modifica alla junction o all'installazione reale.

- `npm.cmd ci`: completato; audit automatico segnala 14 vulnerabilità (7 moderate, 5 alte, 2 critiche). Nessun `npm audit fix` eseguito; gravità, applicabilità e rimedi non analizzati in questa attività documentale.
- `npm.cmd run typecheck`: superato.
- `npm.cmd run build`: superato, con avvisi su import Rapier e dimensione dei chunk; testi di licenza di 93 pacchetti client presenti.
- Suite completa con `npm.cmd test -- --maxWorkers=2` e reporter aggiuntivi default/JSON: **2.629 passati, 3 falliti su 2.632 test; 246 file passati, 3 falliti su 249; 552,70 secondi; exit code 1**.
- `client/src/world/walkways.test.ts`: mediana **10,4877 ms** contro limite `<8 ms`.
- `client/src/world/sky/indoor.test.ts`: timeout **5 secondi** nel test della transizione sole/luna.
- `client/src/world/toys/throwSim.test.ts`: timeout **5 secondi** nel test della finestra di carica da 3 a 5 metri.
- In questa esecuzione `server/workspace.test.ts` e `server/scale.test.ts` sono passati: non è prova della risoluzione dei precedenti timeout. Registrato anche un messaggio stderr `ENOENT` nel salvataggio di uno stato temporaneo di `ceoRuntime`, il cui file di test risulta passato.

Il report JSON e il log completo restano nella cartella temporanea di validazione e nell'output della sessione, non nel commit candidato. Nessuna soglia, timeout o asserzione modificata. Nessuna analisi causale o confronto baseline eseguiti; non si dichiara che i fallimenti siano risolti, innocui o causati dai moduli. Inizialmente commit, push e PR sospesi in attesa della decisione esplicita del titolare, senza estendere l'eccezione della PR #23.

### Eccezione autorizzata per questa PR documentale

Dopo aver ricevuto l'esito completo, il titolare ha autorizzato un'eccezione specifica per creare commit, pubblicare il branch e aprire la sola PR documentale dei moduli, dichiarando i tre fallimenti locali. Inclusi soltanto i cinque file dei moduli/configurazione, le due guide contributi, questa verifica e la voce feedback della checklist. Esclusi il changelog di lavoro e i tre documenti locali protetti non tracciati. Nessuna correzione applicativa o delle dipendenze inclusa.

Il merge resta subordinato a **CI verde e successiva approvazione del titolare**; non è autorizzato da questa eccezione. Attivazione delle Issues e verifica pubblica restano successive e separate. Il punto feedback non è ancora completato. Questa autorizzazione non si estende ad altre PR, release, installazione reale o attività OIDC.

Riferimenti ufficiali consultati: [configurazione dei modelli](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/configuring-issue-templates-for-your-repository), [schema dei moduli](https://docs.github.com/en/communities/using-templates-to-encourage-useful-issues-and-pull-requests/syntax-for-githubs-form-schema).

## English

On 2026-11-04, GitHub reported Issues and Discussions disabled for `rosariomoscato/droidsembly`; `main` (`71004a7`) had no issue templates, although existing contribution links and npm metadata already pointed to Issues. Issue inventory was unavailable, not evidence that no feedback exists elsewhere. The website contact form is the existing fallback based on the maintainer's earlier verification; no new submission or mailbox access was performed.

Four forms are prepared locally (bugs and feature requests, each in English and Italian), with blank issues allowed and a website contact link. They require no pre-existing labels or assignees. Reports should use redacted examples, never credentials, full state files, paid AI calls or changes to a real office.

Completion requires local validation and the contribution checks before a focused PR, reviewed integration into the default branch, authorized activation of **Settings → General → Features → Issues**, and public verification of the chooser and all four forms. Do not submit test issues/contact messages without authorization. Local YAML validation does not verify GitHub rendering. The previous exception for PR #23 does not apply here.

At the initial preparation, no commit, push, PR, remote activation or GitHub form rendering check had been performed. A subsequent, specific authorization to publish this documentation-only PR is recorded below. The feedback checklist item remains open. Known local test failures, next-beta work, OIDC and recovery documentation are separate tasks.

Local checks passed: YAML parsing with an isolated `yaml@2.8.1` installation (scripts disabled), structural checks for the field types used, EN/IT field parity, local documentation links and whitespace checks. These are not an official GitHub validator. Project dependencies/lockfile and the four protected local documents were not changed.

Subsequent authorized validation used a temporary detached worktree with independently installed dependencies, not the development checkout's dependency junction into the real installation. Typecheck and build passed; the full two-worker suite finished in 552.70 seconds with **2,629 passed and 3 failed tests** (249 files: 246 passed, 3 failed). Failures: walkways median 10.4877 ms against `<8 ms`, indoor lighting timeout at 5 seconds, basketball charge-window timeout at 5 seconds. Workspace and scale passed this time, which does not establish resolution of earlier timeouts. An `ENOENT` warning also appeared while saving temporary CEO-runtime state, although that test file passed. Installation audit reported 14 vulnerabilities (7 moderate, 5 high, 2 critical); no automatic fix or applicability analysis was performed. No test limits were changed and no causal/baseline analysis was performed.

After reviewing these results, the maintainer explicitly authorized a new exception for committing, pushing a feature branch and opening this documentation-only PR with all three failures disclosed. This does not reuse or extend the PR #23 exception. Only the five template/config files, two contribution guides, this review and the feedback checklist entry are included; pre-existing local notes and protected documents are excluded. Merge still requires green CI and subsequent maintainer approval. No merge, Issues activation, release, OIDC work or real-installation update is authorized by this exception.
