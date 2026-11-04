# Recuperare Droidsembly

## App

Il repository https://github.com/rosariomoscato/droidsembly contiene il codice integrato su `main` e la cronologia. Clonarlo e seguire README.it.md per compilazione e avvio. La beta pubblicata è disponibile anche come `droidsembly@0.4.0-beta.1` su npm; la release GitHub registra commit e hash dell'artefatto.

## Sito

I sorgenti di https://droidsembly.com sono conservati nel repository privato `rosariomoscato/droidsembly-site`, accessibile al titolare. Include entrambi i Visual Book PDF, le immagini e la funzione contatti. README.md e RECOVERY.md di quel repository descrivono il collegamento al progetto Vercel esistente e la configurazione Resend. Una nuova clonazione è stata verificata con build e confronto byte per byte dei PDF e della funzione contatti.

## Dati personali e account

GitHub non conserva automaticamente lo stato degli uffici, i repository collegati con modifiche non pubblicate, i launcher personalizzati o le credenziali dei provider. Questi elementi richiedono un backup separato su una destinazione privata esterna al computer. Arrestare prima l'app e le sessioni per una copia coerente della home dati; non sovrascrivere la home originale durante le verifiche di ripristino.

Le chiavi del sito restano nei Secret Vercel, non nel codice. Per recuperare gli account usare i rispettivi metodi di recupero; se necessario rigenerare la chiave Resend e autenticare nuovamente GitHub CLI e provider AI.

## Backup storico completato e verificato

Il backup cifrato `droidsembly-recovery-20261101-212001.7z` è stato completato. Le ricevute private `droidsembly-backups/backup-current-result.json` e `droidsembly-backups/cloud-download-verification.json`, consultate per questo aggiornamento, registrano:

- archivio da **1.478.586.310 byte**;
- ripristino e confronto SHA256 verificati su **54.533 file**;
- verifica della copia cloud il **2 novembre 2026**, confrontando l'archivio scaricato dal titolare dal sito kDrive con quello già verificato;
- SHA256 coincidente: `6fb86b77859e98900df182175b0f7a803e0b200951633b69b0ce9e169c1c0d42`;
- originali conservati secondo la ricevuta (`originalDeleted=false`).

È un **backup storico del 1 novembre**, precedente agli ultimi aggiornamenti del sito e alle successive modifiche dell'app/documentazione: non è uno snapshot aggiornato di tutto. Git conserva i commit pubblicati successivamente; appunti, dati o modifiche non pubblicati dopo il backup richiedono una nuova copia privata, da autorizzare e pianificare separatamente.

**Reperibilità riconfermata il 4 novembre 2026:** i vecchi percorsi registrati inizialmente non risultavano disponibili; il titolare ha poi ritrovato l'archivio sul sito kDrive e lo ha scaricato nuovamente in una cartella privata separata. Sul file `.7z` definitivo, dimensione **1.478.586.310 byte** e SHA256 sono stati ricalcolati e coincidono con le ricevute originali. Nuova ricevuta privata: `droidsembly-backups/cloud-recheck-verification-20261104.json`; ricevute precedenti conservate. Copia cloud e download attuale riconfermati per questo archivio storico, senza decifratura, estrazione o nuova prova di ripristino. La password non è stata richiesta e l'assistente non ha effettuato accessi all'account cloud.

La password è privata: conservarla nel proprio gestore di password, separata dall'archivio; non inserirla in chat, Git o ricevute pubbliche. Non pubblicare il backup, manifest privati o credenziali. Provare ogni eventuale ripristino in una cartella isolata e confrontare le evidenze prima di sostituire dati; nessuna sovrascrittura dell'installazione reale senza autorizzazione.

## Stato tecnico successivo (4 novembre 2026)

La correzione separata del simulatore/test Rapier è integrata con PR #26 (`61af06f`): typecheck/build superati, tre esecuzioni mirate da 27 test verdi e suite locale completa da **2.647 test passati, 250 file, 478,99 secondi**. CI verde su Ubuntu, Windows e macOS Intel per il fix e per il successivo aggiornamento feedback della PR #25 (`a8d4d31`). Dettagli e limiti: [verifica throwSim](THROWSIM_VALIDATION.md) e [feedback](FEEDBACK.md).

Una suite verde non dimostra la risoluzione definitiva dei precedenti fallimenti temporali nei file non modificati. Apple Silicon non verificato; nessuna nuova release npm, configurazione OIDC o modifica dell'installazione reale effettuata da questi aggiornamenti documentali.

Per questa revisione documentale sono stati ripetuti typecheck, build e suite completa con due worker in un worktree isolato e con dipendenze indipendenti già disponibili: **2.647/2.647 test, 250/250 file, 380,59 secondi, exit code 0**. Nessuna nuova dipendenza o modifica a timeout/asserzioni. Successivamente sono stati riconfrontati dimensione e hash del nuovo download del backup; la prova di ripristino dei file non è stata ripetuta.

**English:** the encrypted historical backup was completed and restore/hash-verified for 54,533 files; the owner-downloaded cloud copy matched on 2 November 2026. On 4 November the owner found it on kDrive again and downloaded a fresh copy: its exact size and recalculated SHA256 match the original receipts. No decryption, extraction or repeated restore was performed. It still predates later app/site updates; keep the password private and verify any recovered data in isolation before replacing real data.

## Storico: verifiche della revisione documentale (1 novembre 2026)

Typecheck e build superati. La suite locale con `npm test -- --maxWorkers=2` ha concluso con 2.626 test superati e 6 falliti in 5 file (959,30 secondi): `walkways.test.ts` mediana 14,0729 ms rispetto al limite di 8 ms; `sky/indoor.test.ts` e `toys/throwSim.test.ts` timeout di 5 secondi; `server/scale.test.ts` timeout di 120 secondi; due test di `server/workspace.test.ts` timeout di 60 secondi, oltre al timeout di 10 secondi del relativo `afterAll`. Non è stato dimostrato che questi fallimenti siano preesistenti.

Il titolare aveva autorizzato esplicitamente l'apertura della sola PR documentale #23 nonostante quei fallimenti locali, subordinando il merge al superamento della CI GitHub. È una nota storica, non un'eccezione estesa ad altri lavori o una descrizione dell'ultima suite disponibile.
