# Droidsembly 0.4.0-beta.5 — published on next / pubblicata su next

## Published status / Stato pubblicato — November 16, 2026

**IT:** Beta.5 è pubblicata su **`next`**; `latest` resta `0.4.0-beta.1`.
[Prerelease GitHub](https://github.com/rosariomoscato/droidsembly/releases/tag/droidsembly-v0.4.0-beta.5).
Tag immutabile `droidsembly-v0.4.0-beta.5` sul commit
`8e887aa63cc4eac22b791aab48c47882b01fe1ec`. Il tarball pubblico è stato confrontato
byte per byte con l'artefatto prepublish e ha superato lo smoke installato.

**EN:** Beta.5 is published on **`next`**, with `latest` unchanged at beta.1.
The immutable tag/commit above identifies the published source. Canonical public
bytes match the retained prepublish artifact and passed installed-package smoke.

- Artefatto pubblico / Public artifact: **102 files, 3303274 bytes**;
  SHA256 `a91432f04baab35efcef349bc781959a5935276372ade44fa6185f92d79052f2`.
- [PR #78](https://github.com/rosariomoscato/droidsembly/pull/78) promoted `dev`
  to `main`; postmerge [CI 43839844303](https://github.com/rosariomoscato/droidsembly/actions/runs/43839844303)
  passed all five OS/runtime jobs. The owner explicitly accepted the unresolved
  intermittent PowerShell timeout risk; this is not a causal-resolution claim.
- [Release 43843088684](https://github.com/rosariomoscato/droidsembly/actions/runs/43843088684)
  passed Ubuntu/Windows/macOS Intel verification, prepublish tests/build/exact
  smoke and OIDC npm publication. **The workflow remains failed:** its original
  five-minute availability bound expired before the version was visible.
  Public smoke and GitHub prerelease creation were skipped in that run.
- Later read-only checks first retained a canonical-tarball 404, then verified
  public availability, commit, integrity, unchanged `latest`, and identical
  canonical bytes. Installed public-tarball smoke **PASS**: version/help,
  93 license texts, browser-tool CLI, client/API and isolated demo persistence
  (2 floors/11 agents). Only the skipped GitHub prerelease step was completed.
  No republish, tag move, Release rerun or availability-budget increase occurred.
- Un aggiornamento PC Windows, autorizzato separatamente, ha poi superato demo
  isolata, arresto normale, backup del profilo fermo verificato tramite hash e
  avvio reale beta.5 sullo stesso profilo, preservando identità, impostazioni e
  byte delle credenziali. L'installazione precedente e il rollback sono conservati.
  / A separately authorized Windows PC update passed within that limited scope;
  publication itself never automatically updates existing installations.

**Limiti / Limits:** historical negative evidence remains retained. The native
PTY callback-loss cause, other historical timing failures, issues #39/#42 and
native notification focus are not declared resolved. PTY boundary injection used
native dependency stubs; no new real-provider/SDK/cloud-login or full Box-lifecycle
certification is implied. See [controlled PC updates](QUICKSTART_PC.md).

## Retained preparation history / Storico di preparazione conservato

The pending/blocked/unpublished statements below describe their original phase,
not current npm availability or PC installation. Earlier local tarball hashes
identify earlier artifacts, not the canonical public package above. No negative
result is erased or retroactively made green. / Gli stati pendenti seguenti sono
storici: non descrivono la disponibilità attuale né annullano i fallimenti.

**Promotion blocked / Promozione bloccata:** the subsequent dev-to-main
[PR #78](https://github.com/rosariomoscato/droidsembly/pull/78) CI
[43833575604](https://github.com/rosariomoscato/droidsembly/actions/runs/43833575604)
failed on Windows Node 24:3307 PASS/1 FAIL,304files,launcher PowerShell timeout
at the original4000ms deadline,no recognized milestones. The other four platform
jobs passed; Windows Node24 build/smoke did not run. Previous integration CI
remains separate evidence,not a pass for this promotion. No unchanged rerun,
deadline increase,main merge or publication. Startup diagnostics are being
extended; the cause remains unproven. / Diagnostica startup in preparazione,
causa ancora non dimostrata; nessuna promozione o pubblicazione eseguita.
Prepared locally from dev `93fdcc366a7d6644da8381856343ff825a0d3260` plus the
changes frozen in commit `0763672` and subsequent review corrections documented
in [the blocker worklog](BETA5_BLOCKERS_WORKLOG.md).
This is not the old PR #67 candidate and does not supersede its failed gates.

## Integration-phase record / Stato alla fase di integrazione

- [PR #76](https://github.com/rosariomoscato/droidsembly/pull/76) merged into
  `dev` as `1352bf6bb21eb2ae0f908db34bcf388aaf0558ba`. Tested/reviewed head:
  `8df6429a1caa8ce4f94221a5a30bca02cc43e806`.
- Independent static review and functional QA **PASS within the tested scope**:
  fresh scanner mutations/error drain; PTY host/remote/fallback boundary injection
  and reconnect with native dependency stubbed; native fixture timeout and
  exited-root/open-pipe guard. The successful new native experiment directly
  observed pipe data after root exit, retained the original 600 ms deadline,
  requested zero stale PID kills and verified nonce-owned descendant cleanup.
  Earlier failed/inconclusive harness attempts remain negative evidence.
- Pre-merge [CI 43825433481](https://github.com/rosariomoscato/droidsembly/actions/runs/43825433481)
  and post-merge [CI 43829688789](https://github.com/rosariomoscato/droidsembly/actions/runs/43829688789)
  **PASS**: Ubuntu, Windows Node 24/22, macOS Intel/native ARM64, including clean
  install, typecheck, full tests, build and installed demo package smoke.
- Old draft [PR #67](https://github.com/rosariomoscato/droidsembly/pull/67) closed
  as superseded, without deleting its branch or reclassifying its failed gate.
- **Still pending:** promotion PR/CI toward `main`, explicit merge and publication
  decisions, canonical public tarball/channel verification and public smoke.
  No npm publication, `latest` change or installed-PC update has occurred.

**IT:** QA e CI sopra completano i gate di integrazione nel perimetro indicato,
non dimostrano risolte le cause native/storiche né certificano provider/Box reali
o focus delle notifiche. Le evidenze locali sottostanti restano valide per gli
artefatti esatti indicati; le modifiche successive ai README richiedono una nuova
verifica del pacchetto finale. Nessuna pubblicazione o promozione implicita.

## Italiano

- Nuove Box: pausa e ripartenza; nomi/tag Droidsembly per nuove risorse, senza
  rinominare o ricreare quelle esistenti.
- OpenCode proposto per nuovi uffici, preservando le scelte esistenti.
- Alias `DROIDSEMBLY_*`, adozione della home legacy e compatibilità browser/
  protocolli durante la convivenza; doppia home richiede una scelta esplicita.
- Fixture: conservazione dell'errore primario, terminazione dell'albero e rifiuto
  di richieste su PID già usciti. Il timeout comando resta invariato; terminazione
  limitata a 5000 ms, poi drain a 1000 ms. Discendenti non verificati restano errore.
- Scanner policy: massimo otto letture fresche concorrenti, stessi file/regole,
  nessuna cache e attesa di tutti gli I/O iniziati anche in errore.
- Codice PTY mancante o invalido: errore esplicito `-1`, mai successo inventato.
  Questo non dimostra il recupero della causa nativa della perdita del codice.
- Diagnostica sicura del launcher estesa; controllo i18n completo nella fase
  quieta, con algoritmo/superfici e limite originale di cinque secondi conservati.

Verifiche mirate passate: helper e chiamanti 33/33, scanner/scheduling/notifier/
i18n 35/35, PTY 18/18, launcher sintetico 3/3 e typecheck. Lo scanner mantiene
lista/hash dei 595 file e zero violazioni (baseline 14833 ms, candidato 541 ms;
cache/ordine possono influenzare l'entità del confronto).

La candidata locale ha superato typecheck e suite completa: **3306/3306 test su
304 file, 528,42 secondi, exit 0**, con piano energetico invariato e home isolata.
Nessun retry invariato; è un nuovo run sulle modifiche, non una spiegazione
retroattiva dei fallimenti precedenti.

Build e creazione del tarball PASS: 102 file, 93 testi di licenza client;
SHA256 `1de494cbb8532a4b5f3fd8be4e545f6af3443fa0cb84591bf634828be37186f7`.
Avvisi del bundler su chunk grandi e import Rapier misti conservati, non soppressi.

Smoke installato del tarball esatto **PASS, exit 0**: versione/help beta.5,
compatibilità entry legacy, 93 testi di licenza, CLI browser tool, client/API e
persistenza della demo isolata con 2 piani/11 agenti; nessuno stato reale creato.

La review statica indipendente ha richiesto due correzioni: diagnostica launcher
con stream null e link README per il pacchetto installato. Le correzioni non
cambiano il runtime; il tarball sopra resta l'artefatto precedente conservato.
Follow-up approvato nella review statica; typecheck e 11/11 test mirati PASS.
Nuovo tarball con README corretti: smoke installato PASS, SHA256
`d3ab342c28034737c6f279a2b714d7add82d126ccf4a72b8f24c9a4eff49536c`.
Runtime e dipendenze invariati dopo il run completo; nessun nuovo full run dichiarato.

QA funzionale e CI di integrazione sono ora PASS nel perimetro riepilogato sopra.
**Gate ancora aperti:** promozione/CI verso `main` e decisione esplicita di rilascio,
verifica dell'artefatto pubblico e dei canali. Fallimenti storici conservati: candidato
precedente 3129 PASS/3 FAIL; diagnosi dev 3273 PASS/5 FAIL. Le cause del PTY e
launcher storici e altri timeout Git/npm/workspace non sono dichiarate risolte.
Issue #39/#42 non chiuse e nessuna rinuncia implicita ai rischi.

Solo prove sintetiche attuali: non certificano SDK Claude reale, login cloud,
ciclo completo Box o notifiche native/focus. Nessun aggiornamento del PC, dei
dati o dei provider. La fase locale precedeva commit e push; la candidata è ora
integrata in `dev` tramite la #76, non ancora promossa o pubblicata. Canale
previsto `next`, senza modifica di `latest`.

## English

This local candidate includes Box pause/resume, OpenCode defaults for new offices,
and compatible Droidsembly naming/environment/home/browser migration. Existing
resources and user choices are preserved; ambiguous dual homes require a choice.

Fixture cleanup retains primary failures and rejects known-exited PID requests;
original command deadlines remain, followed by bounded 5s termination and 1s pipe
drain. Unknown descendants remain failure. Policy scanning overlaps at most eight
fresh reads with identical coverage/rules and drains started I/O on error. Invalid
PTY status becomes explicit failure `-1`, not guessed success or proof of native
race recovery. Launcher diagnostics improve; full i18n coverage moves to the quiet
phase without changing its algorithm, surfaces or original five-second budget.

Targeted checks passed as recorded above. Full local candidate typecheck and
**3306/3306 tests across304 files passed in528.42s**, with unchanged power scheme
and isolated home. Build and102-file tarball preparation passed (SHA256 above);
bundler warnings remain visible. Exact installed tarball smoke **passed, exit0**:
version/help, legacy entry,93 license texts,browser-tool CLI,client/API and isolated
demo persistence (2floors/11agents),without real state. Independent review and
integration CI subsequently passed in the scope summarized above. Follow-up static review approved the nullable-stream and
hosted README-link corrections; typecheck and11/11 targeted tests passed. The
new README tarball also passed installed smoke (SHA256 d3ab342c28034737c6f279a2b714d7add82d126ccf4a72b8f24c9a4eff49536c).
Runtime/dependencies are unchanged since the full run. Historical failures remain
evidence, not retroactively green. Issues #39/#42 and unexplained native/launcher/
CLI timing failures are not declared resolved. No live provider/Box/PC update,
publication or channel changes are implied. Planned channel: `next`.
