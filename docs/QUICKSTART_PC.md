# Avvio e aggiornamento controllato / Controlled startup and update

## Italiano

### Da una copia sorgente già installata

Aprire un terminale nella propria cartella Droidsembly:

```powershell
node bin/cubefarm.js --version
npm.cmd start
```

Su macOS/Linux usare `npm start`. Lasciare il terminale aperto: l'indirizzo predefinito è `http://localhost:4317`; `Ctrl+C` ferma l'ufficio. Per non aprire il browser: `npm.cmd start -- --no-open`. Non avviare una seconda copia sullo stesso profilo per aggirare una porta occupata.

Se l'ufficio appare vuoto, **non ricollegare subito i repository**. Il profilo predefinito è `~/.cubefarm`; `SWARM_HOME` può indicarne un altro. Verificare prima il comando/collegamento originale e il percorso dati, senza aprire o condividere file di autenticazione. Non copiare o unire profili alla cieca: collegare nuovamente un repository o riprendere lavoro può avviare task AI e Box.

### Pacchetto npm

Il canale beta attuale è `next`; `latest` può essere precedente. Per scegliere esplicitamente una versione:

```powershell
npx droidsembly@0.4.0-beta.4 --version
```

Questo comando può scaricare il pacchetto; `--version` non avvia l'ufficio. Per usarlo realmente, confermare prima il profilo previsto. Non scambiare un download npm per l'aggiornamento di un checkout Git già presente.

### Prima di aggiornare

1. Fermare l'ufficio e verificare che agenti e anteprime non stiano lavorando. Chiudere la finestra del browser non arresta necessariamente il backend o le Box.
2. Identificare versione, cartella **e profilo dati effettivo**. Conservare un backup recuperabile del codice e delle dipendenze/build; per i dati occorre un backup separato del profilo corretto, a ufficio fermo e senza esporre credenziali.
3. Un checkout con modifiche o commit locali non va resettato/stashato automaticamente. Aggiornare solo con fast-forward o revisione esplicita; non toccare copie di lavoro separate.
4. Validare versione/build e una demo con home distinta prima dell'avvio reale. La demo non dimostra migrazione o rollback del profilo reale.
5. Conservare la versione precedente. Un rollback del codice non implica che eventuali modifiche ai dati siano reversibili.

## English

From an existing source checkout, run `node bin/cubefarm.js --version`, then `npm start` (`npm.cmd start` in PowerShell). Keep the terminal open; default URL is `http://localhost:4317`, and `Ctrl+C` stops the office. `npm start -- --no-open` avoids opening a browser. Do not bypass an occupied port by launching duplicate offices against the same profile.

If the office is unexpectedly empty, do not reconnect repositories immediately. Confirm the original launcher and data location: default `~/.cubefarm`, overridden by `SWARM_HOME`. Never inspect/share authentication files or blindly merge profiles. Reconnecting a repository or resuming work may start AI sessions and cloud resources.

`npx droidsembly@0.4.0-beta.4 --version` explicitly selects the published beta; it may download the package but does not start an office. An npm download does not update an existing source checkout. Before real startup, confirm the intended profile.

Before updating, stop active work, identify the actual code/data targets, retain recoverable code/dependency/build backups and a separate stopped-profile data backup when applicable. Never reset or stash user changes automatically. Use a reviewed fast-forward, validate a build and isolated demo, and retain rollback material. Demo success does not prove real-data migration or rollback, and a source rollback does not necessarily undo data changes. Closing a browser alone does not guarantee that the backend or Boxes stopped.
