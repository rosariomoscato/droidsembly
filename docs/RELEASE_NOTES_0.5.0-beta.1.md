# Droidsembly 0.5.0-beta.1

## Italiano

### Identità e distribuzione

Beta pubblica del fork MIT di [CubeFarm di Leon van Zyl](https://github.com/leonvanzyl/cubefarm).
Il salto alla 0.5 distingue l'evoluzione del fork: non è una dichiarazione di
stabilità o di equivalenza con una release upstream.

Il maintainer ha autorizzato **0.5.0-beta.1 su `latest`** e l'allineamento di
`next`, senza aggiornare l'ufficio reale. La preparazione di questi file non prova
la pubblicazione: verificarla su npm e nella release GitHub
`droidsembly-v0.5.0-beta.1`. La pipeline controlla main, tag, identità inedita,
CI multipiattaforma, integrità dell'artefatto e smoke del pacchetto pubblico.
Nessuna versione o tag esistente viene sovrascritto.

Per allineare `next` con OIDC il trusted publisher npm deve avere **Allow npm
dist-tag** abilitato (npm CLI >=11.21). L'allineamento avviene solo dopo verifica
e smoke dell'artefatto su `latest`, controllando che gli altri canali non cambino.
Se fallisce dopo il publish, **non ripubblicare e non rieseguire Release**:
la versione è già pubblicata; risolvere soltanto l'allineamento del canale.
La release GitHub resta marcata prerelease anche quando npm usa `latest`.

Installazione dopo pubblicazione: `npx droidsembly`, oppure
`npx droidsembly@0.5.0-beta.1`. In PowerShell usare `npx.cmd`.
Seguire la [procedura di aggiornamento controllato](QUICKSTART_PC.md) per uffici
esistenti; questi comandi non autorizzano una migrazione o un aggiornamento live.

### Novità rispetto alla 0.4.0-beta.6

- **Profili cloud manuali:** Worker generico (default), Review applicazione e
  Deploy Vercel. Review/Deploy non ricevono automaticamente issue, QA o fix.
- **Review:** feature, deriva dai requisiti approvati, sicurezza e SEO/GEO, con
  report ed evidenze dichiarate dall'agente, non una certificazione indipendente.
- **Deploy:** preflight separato dal deploy; approvazione del piano esatto,
  checkout verificato e consensi distinti per produzione e risorse/costi.
  Stop, cambio profilo e svuotamento postazione invalidano le approvazioni.
- **Stessa Box e login:** cambiare profilo non ricrea la macchina e non copia
  credenziali. Profili indipendenti da provider CLI, modello e ragionamento.
- **Accesso cloud:** notifiche quando un worker richiede il login, con apertura
  del suo terminale per il flusso ufficiale del provider.
- **Interfaccia:** selezione profili in desktop/Pocket, anteprima aspetto Pocket
  standalone corretta, query modelli non avviate prematuramente durante il setup
  Box e testo scuro esplicito sui badge di stato, incluso LIBERO.

Resta incluso il percorso CEO intervista → piano → approvazione → issue con
dipendenze, insieme a OpenCode V2, dashboard mobile, interfaccia italiana,
recupero issue interrotte e controlli utilizzo AI delle beta precedenti.

### Verifiche e limiti

La preparazione della distribuzione 0.5 ha superato 32 test mirati: canali,
identità/integrità npm, CLI offline e transizione controllata di `next`.
Questo esito non sostituisce suite completa, build o CI della release.

Prima suite completa della candidata 0.5, con un worker: **321 file passati /
5 falliti; 3626 test passati / 7 falliti**, 1562,18 secondi. Un fallimento era
un'aspettativa CLI ancora fissata a `@next`: aggiornata al canale del manifest,
senza cambiare il comportamento CLI. Restano tre timeout Git da 15 s, il
timeout scala da 120 s con ulteriore timeout cleanup da 10 s, il timeout della
CLI offline da 5 s e la mediana walkways 18,03 ms contro il limite invariato
di 8 ms. Nessuna di queste evidenze è considerata risolta dalla correzione
dell'aspettativa del canale. Build/typecheck della candidata sono passati.

Dopo la correzione dell'aspettativa CLI, verifica mirata dei cinque file
coinvolti con un worker: **5 file, 30 test passati**, 122,90 secondi.
Scala, recupero Git, walkways e CLI hanno rispettato le soglie in questa prova;
non dimostra la causa o la risoluzione dei precedenti fallimenti intermittenti.
La candidata corretta richiede una nuova suite completa.

La seconda suite completa della candidata corretta è **fallita**:
320 file passati / 6 falliti; **3616 test passati / 17 falliti**,
4733,49 secondi. Include 11 timeout workspace da 60 s e cleanup da 10 s,
timeout in skyLayout, OpenCode gate, Rapier e CLI offline, oltre al mancato
ingresso nella barriera del test di persistenza entro il tempo di attesa.
L'aspettativa CLI aggiornata non è più tra i fallimenti. Nessuna soglia,
assertion, carico di simulazione o piattaforma è stata ridotta. Ulteriori
suite complete sospese fino alla diagnosi mirata; pubblicazione bloccata.

La diagnosi successiva ha selezionato un caso workspace fallito e la barriera
di persistenza: **2 passati, 43 esclusi dal filtro diagnostico**, 43,08 secondi.
Non è una suite completa né una risoluzione dei 17 fallimenti. La traccia
temporanea, esterna al repository, ha osservato push Git locale 4,957 s e
clone locali 3,626/3,069 s; nessun errore Git riprodotto. L'osservazione aggiunge
I/O e non prova la causa dei rallentamenti. Nessuna modifica runtime o alle
soglie derivata da questa prova. Previsto confronto con CI manuale sul branch
candidato prima di aprire una PR; nessuna deroga ai controlli di rilascio.

La feature profili ha superato 3624 test locali prima della correzione contrasto;
il gruppo contrasto/palette/HUD ha superato 25 test e build/typecheck.
Il giro demo guidato con il manager ha verificato login fittizio, review,
cambio profilo, preflight, annullamento/approvazione anteprima, blocco produzione
e revoca del consenso. Demo arrestata al termine.

Questi esiti non sostituiscono i controlli del commit esatto di release.
La rivalidazione completa del branch feature `2e7b720` il 22 novembre è fallita:
3622 test passati / 7 timeout, in recupero Git e CLI offline di pubblicazione.
La pubblicazione resta bloccata durante l'indagine; non sono fallimenti
corretti o annullati dal precedente verde.
La successiva suite completa senza observer e con un worker è passata:
**326 file, 3629 test**, 1418,10 secondi. Non prova la causa dei timeout;
build, CI e verifiche del commit esatto della release restano distinte.
Restano documentati precedenti timeout intermittenti: nessun budget o test
indebolito e nessuna causa dichiarata risolta.

**Nessuna nuova validazione reale Upstash/Vercel**, provisioning, DNS, migrazione
o promozione produzione per i profili. Le attività demo sono sintetiche.
Le istruzioni agli agenti non costituiscono una sandbox; account, accessi e costi
restano sotto il controllo del manager. OpenCode è il percorso collaudato
manualmente; Claude Code/Codex non hanno lo stesso livello di prova manuale.

Dettagli: [profili](CLOUD_WORKER_PROFILES.md),
[verifiche profili](CLOUD_WORKER_PROFILES_VALIDATION.md),
[limiti Box](OPENCODE_BOX_VALIDATION.md).
Licenza MIT e attribuzioni originali conservate.

## English

This is a **public beta**, not a stable release. Droidsembly remains an MIT fork
of CubeFarm by Leon van Zyl. The 0.5 milestone distinguishes the fork's evolution.
The maintainer approved **0.5.0-beta.1 on `latest`** and alignment of `next`;
preparing these files is not evidence that publication has completed.

After publication, run `npx droidsembly`, or pin
`npx droidsembly@0.5.0-beta.1` (`npx.cmd` in PowerShell). Existing offices must
follow the controlled-update guidance; no live-office update is part of this release.

New since 0.4.0-beta.6: manual cloud application-review and Vercel-deployment
profiles, separate preflight/exact-plan approval and production/resource consent,
same-Box profile changes, cloud sign-in notifications, desktop/Pocket profile UI,
standalone Pocket appearance-preview fixes, deferred model queries during Box
setup and readable dark status-badge text.

The prior CEO app-planning, interrupted-issue recovery, OpenCode V2, AI-usage,
Italian UI and mobile features remain included. Generic workers remain the
default; manual profiles do not enter the automatic issue/QA/fix scheduler.

The manager-led isolated demo exercised fake sign-in, review, profile changes,
preflight, preview approval/cancellation, production gating and consent revocation.
Feature validation previously passed 3624 local tests; the badge/palette/HUD
group passed 25 tests and build/typecheck. Exact-release checks are separate.
The 22 November feature-branch revalidation failed (3622 passed, seven Git
recovery/offline-publication-CLI timeouts). Publication is blocked pending
investigation; the prior successful run does not erase that failure.
The subsequent uninstrumented single-worker full feature suite passed:
326 files / 3629 tests (1418.10 seconds). This does not establish timeout
causation or replace exact-release build, CI and artifact checks.
Historical intermittent timeouts remain documented, not declared solved.

No new real Upstash/Vercel deployment, provisioning, DNS, migration or production
promotion was validated for these profiles. Reports are agent evidence, not
independent certification, and agent instructions are not a security sandbox.
MIT licensing and original attribution are preserved.
