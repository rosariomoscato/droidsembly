# Distribuzione npm / npm releases

## Stato / Status

### Beta.5 candidata — non pubblicata / Beta.5 candidate — not published

**IT:** Preparazione di `0.4.0-beta.5` su **`next`**, mantenendo `latest` invariato. Le [note IT/EN](RELEASE_NOTES_0.4.0-beta.5.md) descrivono onboarding cloud, cancellazione verificata, sospensione dei nuovi lavori e correzione del ciclo di vita del fixture dei test. Le prove precedenti al cambio versione non certificano il nuovo tarball. Nessun tag, pubblicazione o aggiornamento PC è implicito nella preparazione.

**EN:** Preparing `0.4.0-beta.5` for **`next`**, leaving `latest` unchanged. [IT/EN notes](RELEASE_NOTES_0.4.0-beta.5.md) cover cloud onboarding, verified removal, new-work pause and the test-fixture lifecycle correction. Pre-version-change evidence does not certify the new tarball. Preparation implies no tag, publication or PC update.

Public channels checked November 14, 2026 / Canali pubblici verificati il 14 novembre 2026: `next=0.4.0-beta.4`, `latest=0.4.0-beta.1`. The candidate is not registry availability / La candidata non equivale a disponibilità sul registry.

### Beta.4 pubblicata e verificata / Beta.4 published and verified

**IT:** Dal 14 novembre 2026 `droidsembly@0.4.0-beta.4` è pubblicata su **`next`**; `latest` resta `0.4.0-beta.1`. La [Release 43610301565](https://github.com/rosariomoscato/droidsembly/actions/runs/43610301565) ha superato verifica Ubuntu/Windows/macOS Intel, pubblicazione OIDC, confronto del tarball canonico e dei canali e smoke del pacchetto pubblico. [Prerelease GitHub](https://github.com/rosariomoscato/droidsembly/releases/tag/droidsembly-v0.4.0-beta.4). Questa disponibilità non aggiorna le installazioni esistenti né autorizza lavori AI.

**EN:** Since November 14, 2026, `droidsembly@0.4.0-beta.4` is published on **`next`**; `latest` remains `0.4.0-beta.1`. [Release 43610301565](https://github.com/rosariomoscato/droidsembly/actions/runs/43610301565) passed Ubuntu/Windows/Intel macOS verification, OIDC publication, canonical tarball/channel checks and public-package smoke. [GitHub prerelease](https://github.com/rosariomoscato/droidsembly/releases/tag/droidsembly-v0.4.0-beta.4). Availability does not update existing installations or authorize AI work.

- Tag immutabile / Immutable tag: `droidsembly-v0.4.0-beta.4` → `09d2089c4e47db0f25f5784f0d336ae7e354b689`; il workflow corretto è eseguito da main `0dddfa3` / the corrected workflow runs from main `0dddfa3`.
- Artefatto pubblico / Public artifact: 99 files, 3,286,430 bytes; SHA256 `03bcfc018cfd562a6c38a34949cfb0e2a11338ad53e46459ab59669c19660e52`. Download indipendente e artefatti CI pre/post pubblicazione coincidenti / Independent download and CI pre/post-publication artifacts match.
- Il primo dispatch fu rifiutato HTTP 422 prima dei job per un contesto `runner.temp` non valido; PR #63/#64 hanno corretto il solo workflow, senza spostare il tag o ripubblicare. / The first dispatch was rejected HTTP 422 before jobs due to an invalid `runner.temp` context; PR #63/#64 corrected only the workflow, without moving the tag or republishing.
- [Avvio e aggiornamento controllato / Controlled startup and update](QUICKSTART_PC.md). Lo storico candidato seguente conserva fallimenti e limiti, non descrive la disponibilità attuale / The candidate history below preserves failures and limits, not current availability.

### Beta.4 candidata — non pubblicata / Beta.4 candidate — not published

**IT:** Preparazione autorizzata di `0.4.0-beta.4` su `next`, con `latest` invariato e aggiornamento PC rinviato. Le [note IT/EN](RELEASE_NOTES_0.4.0-beta.4.md) documentano OpenCode V2 nelle Box, il PASS QA ordinario del 14 novembre e i limiti rimasti. Le verifiche del nuovo pacchetto e la pubblicazione vanno confermate separatamente: questo stato non dichiara beta.4 già disponibile.

**EN:** Authorized preparation of `0.4.0-beta.4` for `next`, preserving `latest` and deferring the PC update. The [IT/EN notes](RELEASE_NOTES_0.4.0-beta.4.md) record OpenCode V2 Box workers, the November 14 ordinary QA PASS and remaining limits. New package validation/publication results must be confirmed separately; beta.4 is not yet claimed available.

Read-only public channel check on November 14, 2026 / Controllo pubblico in sola lettura del 14 novembre 2026: `next=0.4.0-beta.3`, `latest=0.4.0-beta.1`; GitHub beta.3 exists. Do not republish beta.3 or move its tag / Non ripubblicare beta.3 né spostarne il tag. Earlier beta.3 candidate text below is retained as historical preparation context / Il testo candidato beta.3 seguente è conservato come storico della preparazione.

**Validazione locale beta.4 / Beta.4 local validation:** dopo il primo fallimento conservato (3054 PASS/48 FAIL/10 non eseguiti), una nuova prova autorizzata in Bilanciato temporaneo ha superato installazione pulita, typecheck, 3112/3112 test, build e smoke del tarball esatto; piano originale ripristinato e verificato. / After the preserved first failure (3054 passed/48 failed/10 not run), a separately authorized temporary-Balanced run passed clean install, typecheck, 3112/3112 tests, build and exact-tarball installed smoke; the original power plan was restored and verified. Nessuna soglia modificata o causa unica degli errori precedenti dimostrata / No budget change or proven single cause for the earlier failures. CI/pubblicazione ancora da confermare, PC rinviato / CI/publication still to be confirmed; PC update deferred. See / Vedi le note beta.4.

### Beta.3 candidata — non pubblicata / Beta.3 candidate — not published

**IT:** `0.4.0-beta.3` è in preparazione su un branch isolato da `dev`, per distribuire separatamente le correzioni successive alla beta.2: salvataggi terminali, completamento pulizia anteprime, orchestrazione dei test, branding OpenCode e popup merge italiano. Vedi le [note della candidata IT/EN](RELEASE_NOTES_0.4.0-beta.3.md). Il solo cambio versione non attesta test, CI, pubblicazione o aggiornamento dell'installazione reale: gli esiti del nuovo candidato devono essere registrati separatamente. Dipendenze, carichi, soglie e timeout originali restano invariati.

**EN:** `0.4.0-beta.3` is being prepared on an isolated branch from `dev`, covering post-beta.2 terminal persistence, preview-cleanup completion, test scheduling, OpenCode branding and Italian merge-dialog improvements. See the [IT/EN candidate notes](RELEASE_NOTES_0.4.0-beta.3.md). A version change alone is not evidence of tests, CI, publication or a real-installation update: record this candidate's results separately. Dependency resolutions, original workloads, thresholds and timeouts remain unchanged.

**IT/EN:** Beta.3 **non pubblicata / not published**. Canali pubblici verificati il 7 novembre 2026 / public channels checked November 7, 2026: `next=0.4.0-beta.2`, `latest=0.4.0-beta.1`. Nessun tag beta.3 creato / no beta.3 tag created. Il tag beta.2 resta immutabile / beta.2's tag remains immutable. Merge, promozione, nuovo tag/pubblicazione, deploy e aggiornamento reale richiedono autorizzazioni distinte / integration, promotion, tagging/publication, deployment and real-installation updates require separate approvals.

### Beta.2 pubblicata e verificata / Beta.2 published and verified

**IT:** `droidsembly@0.4.0-beta.2` è pubblicata su `next` e il tarball pubblico è stato verificato il 6 novembre 2026. `latest` resta `0.4.0-beta.1`: `npm install droidsembly` seleziona beta.1, mentre `npm install droidsembly@next` seleziona beta.2. Questi comandi descrivono i canali, non autorizzano aggiornamenti delle installazioni reali. Le [note IT/EN](RELEASE_NOTES_0.4.0-beta.2.md) conservano i rischi accettati e non risolti delle issue [#39](https://github.com/rosariomoscato/droidsembly/issues/39) e [#42](https://github.com/rosariomoscato/droidsembly/issues/42). Nessun nuovo cap agenti è implementato.

**EN:** `droidsembly@0.4.0-beta.2` is published on `next`; its public tarball was verified on November 6, 2026. `latest` remains `0.4.0-beta.1`: `npm install droidsembly` selects beta.1, while `npm install droidsembly@next` selects beta.2. These commands describe channels, not authorization to update real installations. The [IT/EN notes](RELEASE_NOTES_0.4.0-beta.2.md) retain the accepted, unresolved risks in issues [#39](https://github.com/rosariomoscato/droidsembly/issues/39) and [#42](https://github.com/rosariomoscato/droidsembly/issues/42). No new agent cap is implemented.

- Tag annotato immutabile / Immutable annotated tag: `droidsembly-v0.4.0-beta.2` → `3292f5c78483ca37eae198de93faf5da1d5cdb11`.
- [Release 42100317893](https://github.com/rosariomoscato/droidsembly/actions/runs/42100317893): Ubuntu, Windows e macOS Intel eseguiti e passati; il publish ha ripetuto test/build/smoke e pubblicato tramite OIDC. / Ubuntu, Windows and Intel macOS actually ran and passed; publication repeated tests/build/smoke and used OIDC.
- [Prerelease GitHub](https://github.com/rosariomoscato/droidsembly/releases/tag/droidsembly-v0.4.0-beta.2) creata il 5 novembre 2026. Provenance firmata nel transparency log, indice `3700388924`. / GitHub prerelease created November 5, 2026; signed provenance recorded at transparency-log index `3700388924`.
- Tarball pubblico / Public tarball: 99 file/files; SHA1 `89984f6215a6539f7b756608096ac5de279d7811`, corrispondente al log publish / matching the publish log; SHA512 verificato contro il registry / checked against the registry.
- SHA256: `1d5c84af873a9d2b8bdd29f043142a16089e1707015be57dd8c0a0d5b16d2d61`.
- Smoke del tarball pubblico passato una volta: versione/help, 93 testi di licenza client, browser tool, HTTP e persistenza demo in installazione/home temporanee isolate (2 piani, 11 agenti; non il test di scala). / Public-tarball smoke passed once: version/help, 93 client license texts, browser tool, HTTP and demo persistence in isolated temporary installation/home (2 floors, 11 agents; not the scale test).

**IT:** I cinque tentativi della prima Release `42054859208` sono rimasti bloccati prima dell'esecuzione macOS, con publish saltato. Dopo il publish riuscito, il verificatore pubblico del 5 novembre ha ricevuto 404 per 15 controlli fino alle 20:28 UTC e si è fermato: nessun download o smoke allora. Il successo del 6 novembre è evidenza successiva, non cancella quel fallimento e non deriva da una ripubblicazione. Non ripubblicare beta.2, non spostare il tag e non rilanciare Release. La CI post-merge [42097779283](https://github.com/rosariomoscato/droidsembly/actions/runs/42097779283) non è interamente verde: quattro ambienti passati, ARM mai avviato per indisponibilità runner; il titolare ha autorizzato solo questa verifica mancante. I precedenti passaggi ARM PR/dev sono storici, non sostituiscono il job mancante. Nessun controllo ARM è stato eliminato e nessuna deroga copre test eseguiti e falliti.

**EN:** The first Release `42054859208` had five attempts blocked before macOS execution, with publication skipped. After successful publication, the November 5 public verifier received 404 for 15 checks through 20:28 UTC and stopped without downloading or smoke-testing. November 6 success is later evidence: it neither erases that failure nor follows a republication. Do not republish beta.2, move its tag or redispatch Release. Post-merge CI [42097779283](https://github.com/rosariomoscato/droidsembly/actions/runs/42097779283) is not entirely green: four environments passed; ARM never started because no runner was assigned. The owner authorized only this missing verification. Earlier PR/dev ARM passes are historical, not substitutes for the missing job. No ARM check was removed and no exception covers executed, failing tests.

### Storico beta.1 / Beta.1 history

**IT:** I paragrafi seguenti descrivono lo stato alla prima pubblicazione, non i dist-tag o lo stato OIDC attuali riportati sopra.

**EN:** The following paragraphs describe the initial publication state, not the current dist-tags or OIDC status reported above.

**IT:** Pubblicato e verificato [droidsembly@0.4.0-beta.1](https://www.npmjs.com/package/droidsembly), comando `droidsembly`, canale consigliato `next`, dal commit `803cb9eab25fc98a5312667f91b43fbd3a77fccc`. Prima pubblicazione effettuata con account `rosariomoscato` e verifica interattiva 2FA. Il publisher GitHub/OIDC resta da configurare e validare per una futura versione.

**EN:** [droidsembly@0.4.0-beta.1](https://www.npmjs.com/package/droidsembly) is published and verified, with command `droidsembly` and recommended channel `next`, from commit `803cb9eab25fc98a5312667f91b43fbd3a77fccc`. The initial publication used account `rosariomoscato` and interactive 2FA. GitHub/OIDC publishing still needs configuration and validation for a future version.

**IT:** Il registry punta sia `next` sia `latest` alla prima beta. La rimozione di `latest` è stata rifiutata con E400: non ripetere il tentativo né ripubblicare la versione. Documentare esplicitamente lo stato beta; una futura stabile aggiornerà `latest`. Durante l'elaborazione iniziale npm mostrava temporaneamente `0.0.0-stage`: attendere la disponibilità e verificare l'integrità, senza duplicare l'invio.

**EN:** The registry points both `next` and `latest` to the first beta. Removing `latest` was rejected with E400: do not retry removal or republish the version. Explicitly document beta status; a future stable release will update `latest`. During initial processing npm temporarily exposed `0.0.0-stage`: wait for availability and verify integrity rather than submitting again.

SHA256 del tarball pubblico verificato / verified public tarball SHA256:
`D0E7E4E72F1A9F824C7655B17EDCC67D7F247EABCD03538EB8557DF54CCD8BBA`.
Smoke del download pubblico superato: CLI, 93 testi di licenza client, browser tool, HTTP e demo isolata. / Public-download smoke passed: CLI, 93 client license texts, browser tool, HTTP and isolated demo.

## Compatibilità / Compatibility

- Il nuovo pacchetto espone soltanto `droidsembly`; nessun alias globale `cubefarm` che possa collidere con l'originale. / The new package exposes only `droidsembly`, avoiding a global alias collision with upstream.
- `bin/cubefarm.js`, `~/.cubefarm`, `SWARM_HOME`, porte e launcher esistenti sono conservati. / The internal entry file, default data path, environment variables, ports and existing launchers are preserved.
- Per installazioni affiancate usare home distinte; nessuna migrazione automatica. / Use separate homes for side-by-side installations; there is no automatic migration.
- I prerequisiti restano Node >=22, Git e, per lavoro reale, GitHub CLI e provider configurati. npm non installa automaticamente tutti gli strumenti esterni. / Node >=22, Git and, for real work, GitHub CLI and configured providers remain prerequisites; npm does not install every external tool.
- La CLI consulta `droidsembly/next` per le prerelease, `droidsembly/latest` per le stabili. Il passaggio beta → stabile avviene scegliendo esplicitamente il canale stabile dopo il suo rilascio. / The CLI checks `next` for prereleases and `latest` for stable versions. Users explicitly switch to the stable channel once released.

## Verifiche locali / Local checks

PowerShell, dalla copia di sviluppo / from the development checkout:

```powershell
npm.cmd run typecheck
npm.cmd test -- scripts/build-licenses.test.ts scripts/distribution.test.ts scripts/officeSteps.test.ts server/config.test.ts --maxWorkers=1
npm.cmd run build
npm.cmd pack --dry-run --ignore-scripts
$env:RELEASE_TAG = 'droidsembly-v0.4.0-beta.1'
node scripts/release-metadata.mjs
$env:SWARM_PORT = '0'
node scripts/smoke-package.mjs
```

Su macOS/Linux usare `npm` e la sintassi della shell per le variabili. La suite completa resta richiesta prima di una PR. / On macOS/Linux use `npm` and your shell's environment syntax. The full suite remains required before a PR.

Lo smoke installa il tarball effettivo in una cartella temporanea, controlla versione/help tramite il comando installato, verifica licenze e avvia solo la demo. `CI=1` disabilita il controllo degli aggiornamenti. Non usa l'ufficio reale né richieste AI. / The smoke installs the actual tarball in a temporary folder, checks the installed command's version/help and license files, and starts only a demo. `CI=1` disables update checks. It does not use the real office or make AI requests.

## Bootstrap e configurazione OIDC / Bootstrap and OIDC configuration

**IT:** Bootstrap e primo publish OIDC sono completati: beta.2 ha validato il trusted publisher con successo nella Release sopra collegata. Le istruzioni di configurazione e i riferimenti alla prima validazione qui sotto sono storici, utili per future riconfigurazioni; non richiedono di configurare nuovamente il publisher o ripubblicare una versione esistente.

**EN:** Bootstrap and the first OIDC publication are complete: beta.2 successfully validated the trusted publisher in the Release linked above. Configuration instructions and first-validation references below are historical guidance for future reconfiguration, not a request to configure the publisher again or republish an existing version.

Per verificare un artefatto già conservato, passarlo come argomento: `node scripts/smoke-package.mjs "percorso/droidsembly-0.4.0-beta.1.tgz"`. Non viene ricreato. / To validate a retained artifact without repacking it, pass its path as the script's argument.

1. Confermare la disponibilità del nome al momento del rilascio e accedere al proprio account npm con 2FA. Credenziali e codici restano al manager. / Confirm name availability at release time and sign in to the maintainer's npm account with 2FA. Credentials and codes stay with the maintainer.
2. Integrare la preparazione tramite PR verificata. Concordare separatamente il bootstrap del pacchetto nuovo: prima pubblicazione autenticata o procedura iniziale supportata da npm, prima di poter fare affidamento sul trusted publisher del pacchetto. / Merge the preparation through a verified PR. Separately agree on new-package bootstrap via authenticated first publication or npm's supported initial setup before relying on the package's trusted publisher.
3. Configurare OIDC per owner `rosariomoscato`, repository `droidsembly`, workflow `release.yml`, autorizzando la pubblicazione diretta `npm publish`. Node >=22.14.0 e npm >=11.5.1 sono richiesti per OIDC; il job usa Node 24 e npm 11. / Configure OIDC with those exact fields and allow direct `npm publish`; the job uses Node 24 and npm 11 to meet the OIDC requirements.
4. Configurare il publisher quando pronti: secondo le regole npm consultate, una nuova configurazione scade se non validata entro due giorni. / Configure the publisher when ready: current npm rules expire an unused new configuration after two days.

I controlli locali non pubblicano nulla. Ogni nuova pubblicazione richiede autorizzazione distinta. / Local checks perform no publication. Each new publication requires separate authorization.

Il bootstrap descritto ai punti 1–2 è già completato per questa beta. Configurare OIDC vicino alla prossima pubblicazione: la documentazione npm attuale richiede un primo publish riuscito entro due giorni. Campi GitHub: owner `rosariomoscato`, repository `droidsembly`, workflow `release.yml`, environment vuoto (il job non ne usa uno), consentire `npm publish`. Il workflow usa Node 24/npm 11 e `id-token: write`. Salvare la configurazione non ne prova il funzionamento; non ripubblicare la beta per validarla.

Bootstrap steps 1–2 above are complete for this beta. Configure OIDC close to the next publication: current npm documentation requires a first successful publish within two days. GitHub fields: owner `rosariomoscato`, repository `droidsembly`, workflow `release.yml`, environment empty (the job does not use one), allow `npm publish`. The workflow uses Node 24/npm 11 and `id-token: write`. Saving the configuration does not prove it works; do not republish this beta to validate it.

## Procedura storica per beta.1 / Historical beta.1 procedure

La beta npm esiste già. Per documentarla su GitHub, dopo autorizzazione creare il tag `droidsembly-v0.4.0-beta.1` sul commit esatto `803cb9eab25fc98a5312667f91b43fbd3a77fccc` e una release marcata **prerelease**, con note EN/IT. Non avviare il workflow Release per questa versione: tenterebbe un'altra pubblicazione npm. Il tag deve identificare il codice pubblicato, non un successivo commit di sola documentazione.

The npm beta already exists. To document it on GitHub, after authorization create tag `droidsembly-v0.4.0-beta.1` at exact commit `803cb9eab25fc98a5312667f91b43fbd3a77fccc` and a release marked **prerelease**, with EN/IT notes. Do not dispatch the Release workflow for this version: it would attempt another npm publication. The tag must identify the published code, not a later documentation-only commit.

## Release successive / Subsequent releases

La preparazione avviene su branch dedicati da `dev`, con PR verso `dev`. Solo dopo revisione e approvazione della release si apre la promozione `dev` → `main`; non pubblicare da feature branch o da `dev`. Nella transizione iniziale `main` include già modifiche successive alla beta npm: non è stato riportato indietro. Il tag della beta resta il riferimento esatto al codice pubblicato. Vedi [flusso dei branch](BRANCH_WORKFLOW.md).

Prepare changes on focused branches from `dev`, with PRs targeting `dev`. Only after release review and approval promote `dev` to `main`; never publish from a feature branch or `dev`. During the initial transition main already contains post-beta changes and is not reset; the beta tag remains the exact reference to published code.

1. PR verso `dev` con versione coerente fra package e lock e `publishConfig.tag`: `next` per `-beta.N`, `latest` per una versione stabile; poi promozione approvata `dev` → `main` con CI verde su tutti e tre i sistemi. / Review version/channel changes through a PR to dev, keeping package and lock consistent, then approve dev-to-main promotion with all three OS checks green.
2. Dopo autorizzazione, creare un tag `droidsembly-v<version>` sul commit approvato integrato in main. / After authorization, create the matching fork-specific tag on the approved commit merged into main.
3. Avviare manualmente **Actions → Release** su `main`, indicando quel tag. Il semplice push di un tag non pubblica nulla. / Manually dispatch Release on main with that tag; pushing a tag alone does not publish.
4. Il workflow verifica identità/tag, appartenenza alla storia di main e tutti e tre i sistemi operativi. Il job di pubblicazione ripete test/build/smoke sul codice del tag, pubblica sul canale previsto e crea la release GitHub. / The workflow validates identity/tag, main ancestry and all three operating systems. The publishing job repeats tests/build/smoke, publishes to the expected channel, then creates the GitHub release.
5. La prima release GitHub usa note esplicite; le successive confrontano soltanto tag `droidsembly-v*`. Nessun bump o push automatico su main. / The first GitHub release has explicit notes; subsequent notes use only fork-specific tags. There are no automatic bumps or pushes to main.

Se npm ha pubblicato ma la creazione della release GitHub fallisce, non ripubblicare la stessa versione: verificare lo stato del registry e completare solo il passaggio mancante con autorizzazione. Le coppie nome/versione già pubblicate non si riutilizzano. / If npm succeeds but GitHub release creation fails, do not republish the same version: inspect registry state and complete only the missing step with authorization. Published name/version pairs cannot be reused.

## Documentazione e attribuzioni / Documentation and attribution

I README EN/IT usano URL assoluti del fork per immagini e guide, così il tarball non deve includere documenti locali. MIT originale e avviso Sora OFL restano nel pacchetto. Prima della prima pubblicazione completare la verifica delle licenze delle dipendenze e dei componenti incorporati; la presenza di questi due avvisi non costituisce un audit completo. / EN/IT READMEs use absolute fork URLs for images and guides, keeping local documents out of the tarball. Original MIT and Sora OFL notices remain included. Complete the dependency and bundled-component license review before first publication; those two notices alone are not a complete audit.

Fonti / Sources: [npm trusted publishing](https://docs.npmjs.com/trusted-publishers), [public scoped packages](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages).

La build genera `dist/third-party-licenses.json` dai chunk client Vite e `dist/THIRD_PARTY_LICENSES.txt` con i testi originali e ulteriori avvisi dei pacchetti incorporati. I testi mancanti bloccano la build; le eccezioni sono copie upstream locali vincolate alla versione, documentate in [scripts/licenses](../scripts/licenses/README.md). Lo smoke controlla entrambi i file e i relativi contenuti nel pacchetto installato. Le dipendenze server restano esterne: SDK e binari Claude hanno termini Anthropic propri, non MIT.

The build generates `dist/third-party-licenses.json` from Vite client chunks and `dist/THIRD_PARTY_LICENSES.txt` with original texts and additional bundled-package notices. Missing texts fail the build; fallbacks are local, version-pinned upstream copies documented in [scripts/licenses](../scripts/licenses/README.md). The smoke checks both files and their contents in the installed package. Server dependencies remain external: Claude SDK and binaries have their own Anthropic terms, not MIT.
