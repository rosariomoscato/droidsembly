# Preparazione 0.5.0-beta.2 — non autorizza la pubblicazione

Checkpoint: 23 novembre 2026. Esito: **delta verificato e note preparate;
non ancora pronta alla pubblicazione**.

## Esito finale della preparazione locale

**Bloccata prima della PR.** Un solo ciclo: identità e typecheck passati,
suite fallita (322 file passati / 8 falliti; 3639 test passati / 11 falliti /
5 saltati, totale 3655). Nessun retry; build e smoke successivi non eseguiti.
Il ciclo non ha modificato soglie, carico o assertion.

Fallimenti nei file `npmPublicationCli`, `boxSetupShell`, `mcpHttp`,
`openCodeGateOffice`, `workspace`, `throwSim`, `notifier` e `scale`.
Timeout prevalenti e un errore di cleanup dell'albero della fixture Box;
non attribuiti automaticamente al carico del PC o al bump di versione.
Vedere le note per il riepilogo. Log completi conservati nella directory
diagnostica locale `ds-release-diagnostic-20261122`, file
`beta-two-preparation-test.log` e `beta-two-preparation-validation.json`.

Tracking: [#110](https://github.com/rosariomoscato/droidsembly/issues/110).
Preparazione conservata su branch locale, senza PR, merge, tag o publish.
La prossima attività richiede diagnosi dei fallimenti, non un rilancio fino
al verde. Questa checklist non dichiara conclusa con successo la validazione.

## Delta verificato

- [x] Base npm beta.1: `f91b181759f2821cb4bdd62c1ccb47b727cec3b3`.
- [x] Base funzionale candidata: `9e958c59ad40a059ea8ac31cd404435342780459`;
  coincide con `origin/main` verificato in sola lettura.
- [x] Delta: 16 file, 568 aggiunte / 57 rimozioni prima di queste due bozze;
  quattro documenti, quattro file server di produzione e otto file test.
  Nessuna modifica client, dipendenze o workflow nel delta.
- [x] Correzioni di PR #106 e commit `31b458b`, documentazione PR #107,
  promozione tramite PR #108. Nessuna candidata grafica scartata reintegrata.
- [x] CI `45120840136` verificata nuovamente: verde su Ubuntu,
  Windows/Node 24, Windows/Node 22, macOS e macOS ARM64.
- [x] Fallimenti successivi preservati: #39, #42 e #109 restano aperte.
- [x] Registro npm: `latest` e `next` entrambi beta.1; GET della versione
  beta.2 restituisce 404. Nessun tag remoto beta.2 trovato.
  Sono osservazioni puntuali da ripetere prima del rilascio, non prenotazioni.
- [x] Nessuna nuova suite completa o benchmark ripetuto per queste bozze Markdown.

## Decisioni e passi ancora necessari

- [ ] Approvazione maintainer dell'esatto perimetro, versione **0.5.0-beta.2**
  e canale **next** proposto, accettando esplicitamente i limiti nelle note.
  L'autorizzazione attuale copre solo preparazione.
- [ ] PR di preparazione verso `dev`, con riferimento a un issue concordato,
  versione in `package.json` e nelle due identità di `package-lock.json`
  allineata, `publishConfig.tag` coerente con `next`.
- [x] Metadati locali allineati a `0.5.0-beta.2` / `next`; nessun tag creato.
- [ ] Riesaminare distribuzione e aggiornamenti: `bin/distribution.js`
  riserva l'eccezione `latest` a beta.1; il suo comando di aggiornamento resta
  quindi sul canale `latest`. Non presumere che beta.1 passi a beta.2 da sola.
  Non ampliare l'eccezione né spostare `latest` senza autorizzazione separata.
- [ ] Verificare identità con `scripts/release-metadata.mjs` e tag atteso
  `droidsembly-v0.5.0-beta.2`, senza creare il tag durante la preparazione.
- [ ] Un ciclo pre-PR di typecheck, test e build sul candidato effettivo;
  smoke pacchetto isolato. Non modificare soglie o carico per ottenere il verde;
  conservare eventuali fallimenti e fermarsi a valutarli.
- [ ] Revisione e CI della PR; integrazione e promozione `dev` → `main`
  solo con le autorizzazioni richieste, protezioni rispettate e controlli verdi.
- [ ] Registrare il nuovo SHA finale di main: non usare lo SHA della base
  funzionale come se includesse già bump e note.
- [ ] Autorizzazione esplicita per tag e dispatch del workflow Release
  esistente, legata a versione, canale e commit finale verificati.

## Solo dopo l'autorizzazione al rilascio

- [ ] Ricontrollare identità npm inedita, canali, tag assente e CI del commit.
- [ ] Creare un tag nuovo, mai spostare un tag esistente; usare soltanto
  `.github/workflows/release.yml` su main, input tag esatto.
- [ ] Rispettare verifica multipiattaforma, pack esatto, smoke e publish OIDC.
  Non pubblicare direttamente e non aggirare i gate.
- [ ] Verificare artefatto pubblico, integrità, gitHead, `next` e `latest`
  invariato. Conservare evidenze anche in caso di fallimento post-publish.
- [ ] Se la pubblicazione è già avvenuta, non ripubblicare o rilanciare
  ciecamente Release; distinguere disponibilità, canali e release GitHub.
- [ ] Non applicare a beta.2 l'allineamento speciale beta.1: nel workflow
  il passo finale relativo a beta.1 non viene eseguito per beta.2.

## PC e ufficio reale: fuori perimetro

Nessuna installazione, migrazione o avvio in modalità reale è autorizzato.
Un eventuale aggiornamento PC richiede decisione e piano separati, mantenendo
beta.1 e la riserva beta.6 finché non viene approvato diversamente.
Non usare l'ufficio reale come ambiente di verifica del candidato.
