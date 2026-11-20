# Avvio e aggiornamento controllato / Controlled startup and update

## Italiano

**Candidata sorgente beta.6, non pubblicata:** un checkout di preparazione può
mostrare `0.4.0-beta.6`, mentre npm `next` resta beta.5. Non è un aggiornamento
del PC. La candidata aggiunge «Riprendi attività»: confermarla può avviare AI e
consumare quota anche con assegnazione automatica disabilitata; non usarla come
smoke su un profilo reale. Vedi [note e limiti](RELEASE_NOTES_0.4.0-beta.6.md).

Beta pubblica verificata il 16 novembre 2026: **0.4.0-beta.5 su `next`**; `latest`
resta beta.1. La pubblicazione non aggiorna da sola un ufficio già installato.
Un aggiornamento Windows separatamente autorizzato è stato verificato con
installazione beta.5 parallela, demo isolata, arresto normale dell'ufficio,
backup del profilo fermo controllato tramite hash e riavvio sullo stesso profilo.
Identità di repository/agenti e impostazioni precedenti sono state preservate;
le credenziali del profilo sono rimaste identiche. È una prova circoscritta, non
una garanzia per tutti i profili né un test di nuovi lavori AI o Box reali.

### Da una copia sorgente già installata

Aprire un terminale nella propria cartella Droidsembly:

```powershell
node bin/droidsembly.js --version
npm.cmd start
```

Su macOS/Linux usare `npm start`. Lasciare il terminale aperto: l'indirizzo predefinito è `http://localhost:4317`; `Ctrl+C` ferma l'ufficio. Per non aprire il browser: `npm.cmd start -- --no-open`. Non avviare una seconda copia sullo stesso profilo per aggirare una porta occupata.

Se l'ufficio appare vuoto, **non ricollegare subito i repository**. Beta.5 usa `~/.droidsembly` per un nuovo ufficio, ma adotta una home `~/.cubefarm` esistente senza rinominarla. `DROIDSEMBLY_HOME` prevale su `SWARM_HOME`; se entrambe le cartelle predefinite esistono occorre una scelta esplicita. Verificare prima il comando/collegamento originale e il percorso dati, senza aprire o condividere file di autenticazione. Non copiare o unire profili alla cieca: collegare nuovamente un repository o riprendere lavoro può avviare task AI e Box.

### Pacchetto npm

Il canale beta attuale è `next`; `latest` può essere precedente. Per scegliere esplicitamente una versione:

```powershell
npx.cmd droidsembly@0.4.0-beta.5 --version
```

Questo comando può scaricare il pacchetto; `--version` non avvia l'ufficio. Per usarlo realmente, confermare prima il profilo previsto. Non scambiare un download npm per l'aggiornamento di un checkout Git già presente.

Il nuovo campo `cloud.pauseNewWork=false` significa che la pausa manuale di
ammissione dei lavori cloud non è attiva; **non** abilita Box, assegnazione
automatica o nuovi task. Le altre impostazioni continuano a governare il lavoro.

### Prima di aggiornare

1. Fermare l'ufficio e verificare che agenti e anteprime non stiano lavorando. Chiudere la finestra del browser non arresta necessariamente il backend o le Box.
2. Identificare versione, cartella **e profilo dati effettivo**. Conservare un backup recuperabile del codice e delle dipendenze/build; per i dati occorre un backup separato del profilo corretto, a ufficio fermo e senza esporre credenziali.
3. Un checkout con modifiche o commit locali non va resettato/stashato automaticamente. Aggiornare solo con fast-forward o revisione esplicita; non toccare copie di lavoro separate.
4. Validare versione/build e una demo con home distinta prima dell'avvio reale. La demo non dimostra migrazione o rollback del profilo reale.
5. Conservare la versione precedente. Un rollback del codice non implica che eventuali modifiche ai dati siano reversibili.
6. Se il checkout contiene lavoro locale, preferire una copia installata separata
   e conservare l'originale. Fissare esplicitamente la home corretta nel launcher,
   senza creare una nuova home vuota. Non avviare la nuova copia prima che la
   vecchia abbia liberato la porta. Non usare terminazioni forzate alla cieca.

## English

**Source candidate beta.6, not published:** a preparation checkout may report
`0.4.0-beta.6` while npm `next` remains beta.5. This does not update a PC.
The candidate adds **Resume task**: confirming may start AI work and consume quota
even with automatic assignment disabled. Do not use it as a real-profile smoke
test. See [candidate notes and limits](RELEASE_NOTES_0.4.0-beta.6.md).

Verified public release: **0.4.0-beta.5 on `next`** (November 16, 2026); `latest`
remains beta.1. A separately authorized Windows update passed isolated demo,
graceful stop, hash-verified stopped-profile backup and real restart with the
same profile and existing identities/settings/credential bytes preserved.
This does not certify every profile, new AI work or real Box lifecycle.

From an existing source checkout, run `node bin/droidsembly.js --version`, then `npm start` (`npm.cmd start` in PowerShell). Older shortcuts using `bin/cubefarm.js` remain compatible. Keep the terminal open; default URL is `http://localhost:4317`, and `Ctrl+C` stops the office. `npm start -- --no-open` avoids opening a browser. Do not bypass an occupied port by launching duplicate offices against the same profile.

If the office is unexpectedly empty, do not reconnect repositories immediately. Confirm the original launcher and data location. Beta.5 uses `~/.droidsembly` for new offices, adopts an existing `~/.cubefarm`, and requires an explicit choice for ambiguous dual homes. `DROIDSEMBLY_HOME` takes precedence over `SWARM_HOME`. Never inspect/share authentication files or blindly merge profiles. Reconnecting a repository or resuming work may start AI sessions and cloud resources.

`npx droidsembly@0.4.0-beta.5 --version` (`npx.cmd` in PowerShell) explicitly selects the published beta; it may download the package but does not start an office. An npm download does not update an existing source checkout. Before real startup, confirm the intended profile. `cloud.pauseNewWork=false` means manual cloud-work admission pause is inactive; it does not enable Boxes, automatic assignment or new tasks.

Before updating, stop active work, identify the actual code/data targets, retain recoverable code/dependency/build backups and a separate stopped-profile data backup when applicable. Never reset or stash user changes automatically. Use a reviewed fast-forward, validate a build and isolated demo, and retain rollback material. Demo success does not prove real-data migration or rollback, and a source rollback does not necessarily undo data changes. Closing a browser alone does not guarantee that the backend or Boxes stopped.

For a dirty source checkout, prefer a separate pinned installation and retain the
original. Pin the intended profile explicitly and wait for the old office to
release its port. Do not use blind force termination or start a duplicate office.
