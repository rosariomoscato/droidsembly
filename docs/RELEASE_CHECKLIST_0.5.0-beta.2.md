# Preparazione 0.5.0-beta.2 — non autorizza la pubblicazione

Checkpoint aggiornato: 24 novembre 2026. Esito: **CI del candidato verde sui
cinque ambienti, rischi classificati; non ancora pronta alla pubblicazione**.

## Stato attuale e gate residui

- [x] CI del candidato `786508ce58c70d752c02511e49849f165d646f05`
  [45217235928](https://github.com/rosariomoscato/droidsembly/actions/runs/45217235928)
  verde su Ubuntu, Windows/Node 24, Windows/Node 22, macOS Intel e ARM64 nativo:
  typecheck, suite completa, build e smoke pacchetto. I due tentativi ARM64
  senza runner restano conservati; il tentativo finale ha realmente eseguito
  i controlli. Nessun ambiente sostituito o deadline allentata.
- [x] Ultimo controllo locale mirato: 3 file / 30 test passati, senza modifiche.
  #39: scansione 603 ms, mediana percorsi 3,3856 ms.
  #42: workload 50,329 s, shutdown 2,673 s, teardown 3,059 s.
- [x] #39 e #42 aperte **in monitoraggio**, non riprodotte nell'ultima verifica.
  #109 aperta **irrisolta**, senza nuova misura FPS e senza patch grafica.
  Gli stati delle issue non costituiscono autorizzazione a rilasciare.
- [ ] Gate locale pre-PR ancora insoddisfatto: ultima suite completa locale
  329 file passati / 1 fallito, 3651 test passati / 1 fallito / 5 saltati.
  Fallimento `homeIntegration`, scenario nuovo ufficio, deadline figlio 4 s
  ed errore cleanup. Prova equivalente successiva 0,877 s, senza scritture:
  non cancella l'intermittenza. Build e smoke locali non raggiunti.
  Non aprire la PR usando la CI esterna come deroga implicita a questo gate.
- [ ] Revisione finale, PR verso `dev`, integrazioni autorizzate e controlli
  sul relativo commit. Nessuna PR aperta o pubblicazione eseguita.

Questa è una riclassificazione con aggiornamento documentale: non un nuovo
test del codice successivo al commit CI, né una chiusura tecnica delle issue.
Nessun nuovo ciclo di test è stato eseguito per questo solo aggiornamento.

## Preparazione del 23 novembre — cronologia conservata

**Follow-up: ancora bloccata.** Correzione scansione: 24/24 test passati.
Verifica delle aree interessate: 12 file passati, 206 test passati / 5 saltati,
ma includeva anche una candidata Git successivamente ritirata.
Suite completa finale interrotta al limite diagnostico di 1500 secondi,
senza riepilogo finale: non è verde e non dimostra quanti test siano terminati.
Ultimo controllo Git: 2 falliti / 3 passati / 41 filtrati, senza soglie modificate.
`server/workspace.ts` e `server/workspace.test.ts` ripristinati integralmente
alla base revisionata. La combinazione finale conservata non è stata
nuovamente sottoposta alla suite completa; build e smoke non raggiunti.

Conservate: scansione con yield a blocchi, compressione incrementale del
diario demo e classificazione di sei file completi nella fase seriale
esistente. Il confronto del diario a 151 agenti ha prodotto JSON identico
byte per byte, con circa il 13% di riduzione di tempo in quella prova.
Non è un risultato di FPS e non chiude #39, #42 o #109.

Evidenze aggiuntive locali: `scanner-candidate-tests.log`,
`journal-streaming-comparison.json`, `corrected-areas-tests.log`,
`corrected-final-validation.json`, `final-full-test.log`,
`final-git-scenarios.log`, `rejected-workspace-optimization.patch`.

### Checkpoint iniziale (conservato)

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
- [x] Delta beta.1 → base main: 16 file, 568 aggiunte / 57 rimozioni prima di queste due bozze e delle correzioni locali;
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
- [x] Nessuna suite aggiunta nella sola fase iniziale delle bozze Markdown;
  le verifiche successive delle correzioni sono riportate sopra.

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
