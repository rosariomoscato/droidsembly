# Distribuzione npm / npm releases

## Stato / Status

### Candidata successiva / Next candidate

**IT:** `0.4.0-beta.2` è in preparazione tramite PR verso `dev`, canale previsto `next`: **non pubblicata**. Note e rischio temporale ancora aperto: [note IT/EN](RELEASE_NOTES_0.4.0-beta.2.md), [issue #39](https://github.com/rosariomoscato/droidsembly/issues/39). Nessuna autorizzazione implicita a promuovere `main`, creare tag, avviare Release/OIDC, cambiare dist-tag o aggiornare installazioni/dati. La beta.1 pubblicata descritta sotto resta invariata.

**EN:** `0.4.0-beta.2` is being prepared through a PR to `dev`, intended channel `next`: **not published**. See [IT/EN notes](RELEASE_NOTES_0.4.0-beta.2.md) and the unresolved timing investigation [#39](https://github.com/rosariomoscato/droidsembly/issues/39). This does not authorize main promotion, tags, Release/OIDC execution, dist-tag changes or installation/data updates. The published beta.1 described below remains unchanged.

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

## Bootstrap completato e OIDC futuro / Completed bootstrap and future OIDC

Per verificare un artefatto già conservato, passarlo come argomento: `node scripts/smoke-package.mjs "percorso/droidsembly-0.4.0-beta.1.tgz"`. Non viene ricreato. / To validate a retained artifact without repacking it, pass its path as the script's argument.

1. Confermare la disponibilità del nome al momento del rilascio e accedere al proprio account npm con 2FA. Credenziali e codici restano al manager. / Confirm name availability at release time and sign in to the maintainer's npm account with 2FA. Credentials and codes stay with the maintainer.
2. Integrare la preparazione tramite PR verificata. Concordare separatamente il bootstrap del pacchetto nuovo: prima pubblicazione autenticata o procedura iniziale supportata da npm, prima di poter fare affidamento sul trusted publisher del pacchetto. / Merge the preparation through a verified PR. Separately agree on new-package bootstrap via authenticated first publication or npm's supported initial setup before relying on the package's trusted publisher.
3. Configurare OIDC per owner `rosariomoscato`, repository `droidsembly`, workflow `release.yml`, autorizzando la pubblicazione diretta `npm publish`. Node >=22.14.0 e npm >=11.5.1 sono richiesti per OIDC; il job usa Node 24 e npm 11. / Configure OIDC with those exact fields and allow direct `npm publish`; the job uses Node 24 and npm 11 to meet the OIDC requirements.
4. Configurare il publisher quando pronti: secondo le regole npm consultate, una nuova configurazione scade se non validata entro due giorni. / Configure the publisher when ready: current npm rules expire an unused new configuration after two days.

I controlli locali non pubblicano nulla. Ogni nuova pubblicazione richiede autorizzazione distinta. / Local checks perform no publication. Each new publication requires separate authorization.

Il bootstrap descritto ai punti 1–2 è già completato per questa beta. Configurare OIDC vicino alla prossima pubblicazione: la documentazione npm attuale richiede un primo publish riuscito entro due giorni. Campi GitHub: owner `rosariomoscato`, repository `droidsembly`, workflow `release.yml`, environment vuoto (il job non ne usa uno), consentire `npm publish`. Il workflow usa Node 24/npm 11 e `id-token: write`. Salvare la configurazione non ne prova il funzionamento; non ripubblicare la beta per validarla.

Bootstrap steps 1–2 above are complete for this beta. Configure OIDC close to the next publication: current npm documentation requires a first successful publish within two days. GitHub fields: owner `rosariomoscato`, repository `droidsembly`, workflow `release.yml`, environment empty (the job does not use one), allow `npm publish`. The workflow uses Node 24/npm 11 and `id-token: write`. Saving the configuration does not prove it works; do not republish this beta to validate it.

## Prima release GitHub / First GitHub release

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
