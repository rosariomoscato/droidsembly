# Droidsembly 0.4.0-beta.4 — published on next / pubblicata su next

**Published and verified November 14, 2026 / Pubblicata e verificata il 14 novembre 2026.** Channel **`next`**; `latest` remains beta.1. [Release](https://github.com/rosariomoscato/droidsembly/releases/tag/droidsembly-v0.4.0-beta.4), [successful publication workflow](https://github.com/rosariomoscato/droidsembly/actions/runs/43610301565). The immutable package commit is `09d2089c4e47db0f25f5784f0d336ae7e354b689`; canonical 99-file tarball SHA256 is `03bcfc018cfd562a6c38a34949cfb0e2a11338ad53e46459ab59669c19660e52`. Public artifact and channel verification and installed smoke passed. Publication does not update your PC automatically or migrate office data.

The preparation-time record below is preserved, including original failures and its then-pending release gates. “Not yet published” and “deferred” statements below describe that historical phase, not current registry availability. / Lo storico di preparazione seguente conserva fallimenti e verifiche allora pendenti: le indicazioni di pubblicazione non ancora avvenuta e rinvio riguardano quella fase, non lo stato attuale del registry.

Prepared from reviewed `dev` commit `86de37f96829250fd7537d148a8627e023a478d5`. Package preparation changed version/documentation only, not dependencies or runtime behavior. Existing installs require a separate controlled update; see [startup and update guidance](QUICKSTART_PC.md).

## Italiano

### Validazione locale: esito attuale e fallimento conservato

La prima validazione beta.4 del 14 novembre ha superato installazione pulita e typecheck, ma la suite completa si è fermata con **3054 PASS, 48 FAIL e 10 casi non eseguiti**, su 288 file (23 falliti). Il log riporta numerosi timeout di test/hook/processi, due budget temporali superati e un errore di pulizia `EBUSY`. Le cause non sono ancora stabilite; una rilevazione del carico successiva non dimostra il carico durante il run. Nessun retry invariato, timeout aumentato, assertion ridotta o caso rimosso. Build, tarball e smoke non furono eseguiti in quel run. Il PASS QA ordinario descritto sotto resta una prova distinta, non sostituisce questi controlli del pacchetto.

Un confronto diagnostico autorizzato ha rilevato un timeout di un carico CPU fisso in Risparmio energia e il completamento in 486 ms in Bilanciato, con identico limite di quattro secondi. Questo confronto non prova la causa unica dei 48 errori. Autorizzata una nuova validazione completa con il solo piano energetico temporaneamente diverso: **installazione pulita, typecheck, 3112/3112 test su 288 file (393,27 s), build e smoke installato PASS**. Nessuna modifica a codice runtime, dipendenze, casi, soglie, timeout o scheduling per ottenere il risultato. Piano originale ripristinato e verificato anche da watchdog indipendente.

Tarball locale esatto: 99 file, SHA256 `5c37d2b05a99801de106db1bc68016084fdf44f733433d5f1e9bed2b80365ee2`. Smoke: versione/help beta.4, 93 testi di licenza client, browser tool, HTTP client e persistenza della demo isolata (2 piani/11 agenti). Questa verifica locale non sostituisce la CI e la verifica canonica del futuro artefatto pubblico. Beta.4 non è ancora pubblicata; aggiornamento PC rinviato.

### Novità rispetto a beta.3

- **OpenCode V2 nelle Box Upstash:** worker sul normale adattatore terminale/tmux, CLI privata fissata a 2.2.6, login ufficiale e configurazione XDG della Box, connessioni e modelli consultabili per host. CEO e ufficio restano locali; nessuna copia dell'autenticazione PC nella Box.
- **Preparazione QA:** isolato lo script del worktree in una subshell, preservando `set -e` e gli exit code reali. Gli esiti mancanti/non verificati del comando sono errori cloud, non normali fallimenti Git; l'output apparentemente riuscito non viene trattato come successo. Errori di preparazione con codice verificato e redazione conservata. Nessun retry o aumento dei timeout.
- **Pubblicazione npm:** verifica del tarball canonico e dei canali prima della release GitHub; smoke dell'artefatto pubblico e conservazione delle evidenze. Nessuna ripubblicazione di versioni esistenti né modifica inattesa di `latest`.
- **Documentazione e diagnostica:** logo README leggibile nei diversi temi; osservabilità dello shutdown di scala e milestone sanitizzati del launcher PowerShell. La diagnostica non è una correzione dimostrata di ogni timeout o problema storico.

### Evidenze e limiti

Il 14 novembre 2026 il normale flusso **CEO locale → worker OpenCode nella Box → issue → commit/push → PR aperta → QA in sessione fresca** ha superato una prova autorizzata su un piccolo modulo sintetico. Il QA persistito riporta `testedSha` e `passedSha` uguali al commit corrente della PR, zero fallimenti di sessione, cinque verifiche PASS e una esclusione motivata per dipendenze/build/browser non applicabili a un modulo senza manifest o UI. I due file esatti consegnati hanno superato anche **10/10 test indipendenti**. La Box è stata eliminata con assenza verificata e watchdog concluso. Nessun merge della PR sintetica, observer SDK/Git, gate sintetico, retry manuale o fallback locale.

Il monitor esterno non ha riconosciuto subito il successo perché lo stream UI non espone gli SHA: il run è terminato alla scadenza originale. Il PASS è stato verificato separatamente sullo stato QA persistito e sulla PR. Il monitor è stato corretto e testato localmente dopo il run; non si dichiara un secondo test remoto. Report, errori precedenti e identificativi privati restano conservati fuori dal repository.

La correzione runtime precedente ha superato 3110 test locali; la successiva CI con diagnostica aggiuntiva è verde su Ubuntu, Windows Node 24/22 e macOS Intel/ARM64. Queste evidenze precedono il cambio versione: **non certificano ancora il tarball beta.4**, che richiede suite completa, build, smoke installato e nuova CI. Un precedente timeout Windows del launcher resta di causa sconosciuta, non cancellato dal run successivo verde.

Restano fuori dalla prova altri workload/provider, pausa/ripartenza della Box, fatturazione e cause interne del provider. Le permission rule non sono un sandbox OS. Issue #39/#42 e altre anomalie storiche non sono dichiarate risolte. Nessun nuovo limite agenti, migrazione dati o aggiornamento automatico della CLI OpenCode sul PC. Compatibilità Node >=22, comando `droidsembly` e percorsi dati esistenti preservati.

## English

### Local validation: current result and preserved failure

The first beta.4 validation on November 14 passed clean install and typecheck, then failed the complete suite: **3054 passed, 48 failed, 10 not run**, across 288 files (23 failed). Evidence includes many test/hook/subprocess timeouts, two exceeded timing budgets and an `EBUSY` cleanup failure. Causes remain unproven; a later load snapshot cannot establish conditions during the run. No unchanged retry, timeout increase, weakened assertion or removed case. Build, pack and installed smoke did not run then. The ordinary QA PASS below is separate evidence, not a replacement for package validation.

An authorized diagnostic comparison timed out fixed CPU work in Power Saver but completed it in 486 ms in Balanced, under the same four-second budget. This does not establish the sole cause of all 48 failures. A separately authorized complete validation changed only the temporary power plan: **clean install, typecheck, 3112/3112 tests across 288 files (393.27s), build and installed-package smoke PASS**. No runtime/dependency/test/workload/budget/timeout/scheduling change was made to obtain green. The original plan was restored and independently confirmed by a watchdog.

Exact local tarball: 99 files, SHA256 `5c37d2b05a99801de106db1bc68016084fdf44f733433d5f1e9bed2b80365ee2`. Smoke checked beta.4 version/help, 93 client license texts, the browser tool, HTTP client and isolated demo persistence (2 floors/11 agents). Local validation does not replace CI or future canonical public-artifact verification. Beta.4 remains unpublished; the PC update is deferred.

### Changes since beta.3

- OpenCode V2 Box workers use the ordinary terminal/tmux adapter, pinned private CLI 2.2.6, official Box-owned login/XDG state and host-scoped connection/model browsing. Office and CEO remain local; PC authentication is never copied into the Box.
- Scope worktree preparation to a subshell while preserving actual failures. Missing/unverified command completion is cloud trouble, not an ordinary Git failure. Retain redacted verified exit codes; never infer success from path output or add retries/deadline increases.
- Verify canonical public npm artifacts and expected channels before creating the GitHub release; smoke the downloaded package and retain publication evidence. Do not republish versions or unexpectedly change `latest`.
- Theme-safe README logo, scale-shutdown observation and sanitized PowerShell-launcher milestones. Observability is not proof that historical timing defects are fixed.

### Evidence and limits

On November 14, an authorized **ordinary local CEO → OpenCode Box worker → issue → commit/push → OPEN PR → fresh-session QA** passed on a small synthetic module. Persisted QA tested/passed commits match the independently checked PR head, with zero session failures, five passing checks and one justified non-applicable dependency/build/browser category. The exact delivered files independently passed **10/10 tests**. Box deletion, API absence and watchdog completion were confirmed. No synthetic gate, SDK/Git observer, manual retry, local fallback or PR merge was used.

The external monitor missed immediate success because the public UI omits QA commit fields; the original deadline stopped the run. PASS was separately established from persisted QA and the PR. The monitor was corrected and tested locally afterward, not rerun remotely. Private identifiers, credentials, transcripts and original failures are not published here.

The preceding runtime fix passed 3110 local tests; subsequent CI with diagnostic additions passed all platform jobs. **Those results do not validate the newly versioned beta.4 tarball.** Full candidate tests/build/installed-package smoke and new CI remain required. The earlier Windows launcher timeout remains unexplained despite later green CI.

This is not certification of every workload/provider, Box pause/resume, billing or provider internals. Rules are not an OS sandbox. Issues #39/#42 and other historical anomalies remain unresolved evidence; no agent-cap claim, automatic data migration or PC OpenCode upgrade. Node >=22, the existing CLI and data locations remain compatible. Publication targets `next`; `latest` and the real PC installation stay unchanged.
