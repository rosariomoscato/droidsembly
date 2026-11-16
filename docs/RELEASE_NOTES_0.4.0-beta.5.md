# Droidsembly 0.4.0-beta.5 — local candidate / candidata locale

**Not published. Local package gates passed; independent QA/CI pending. / Non pubblicata. Gate locali del pacchetto superati; QA indipendente/CI pendenti.**
Prepared locally from dev `93fdcc366a7d6644da8381856343ff825a0d3260` plus the
uncommitted changes documented in [the blocker worklog](BETA5_BLOCKERS_WORKLOG.md).
This is not the old PR #67 candidate and does not supersede its failed gates.

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

**Gate ancora aperti:** review indipendente e CI. Fallimenti storici conservati: candidato
precedente 3129 PASS/3 FAIL; diagnosi dev 3273 PASS/5 FAIL. Le cause del PTY e
launcher storici e altri timeout Git/npm/workspace non sono dichiarate risolte.
Issue #39/#42 non chiuse e nessuna rinuncia implicita ai rischi.

Solo prove sintetiche attuali: non certificano SDK Claude reale, login cloud,
ciclo completo Box o notifiche native/focus. Nessun aggiornamento del PC, dei
dati o dei provider. Nessun commit/push/merge/pubblicazione eseguito per questa
candidata; canale previsto `next`, senza modifica di `latest`.

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
demo persistence (2floors/11agents),without real state. **Independent review and
CI remain pending**. Historical failures remain
evidence, not retroactively green. Issues #39/#42 and unexplained native/launcher/
CLI timing failures are not declared resolved. No live provider/Box/PC update,
publication or channel changes are implied. Planned channel: `next`.
