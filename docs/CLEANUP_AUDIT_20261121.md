# Pulizia conservativa — 21 novembre 2026

Base: `origin/dev` dopo il rilascio di `0.4.0-beta.6`.

## Rimosso

- Dipendenza di sviluppo `concurrently`: nessun utilizzo nei comandi npm,
  nei sorgenti o negli script. Il launcher avvia e supervisiona direttamente
  i processi tramite Node.
- Il lockfile perde 19 pacchetti, incluso `concurrently`, non più necessari
  dopo questa rimozione. Nessuna versione, integrità o metadato dei pacchetti
  mantenuti cambia.
- Nei README inglese e italiano, indicazioni superate di beta.5 pubblicata
  e beta.6 ancora candidata; sostituite con la release effettiva.

`shell-quote@1.12.0`, prima transitiva di `concurrently`, resta come dipendenza
di sviluppo diretta: `scripts/developmentDependencies.test.ts` ne verifica
la gestione sicura dei commenti. Non è codice inutilizzato.

## Conservato intenzionalmente

- `bin/cubefarm.js`, variabili `SWARM_*`, migrazioni e launcher legacy:
  compatibilità documentata con installazioni e dati esistenti.
- Test, fixture e report di validazione: non sono codice di produzione,
  ma servono a verificare regressioni e conservare la storia delle prove.
- Screenshot precedenti: restano evidenza storica per la documentazione;
  la nuova galleria README usa soltanto le catture beta.6.
- `dist/`, `dist-server/`, dipendenze locali e installazioni dell'utente:
  non sono file sorgente tracciati da ripulire in questa modifica.
- La modifica preesistente a `CLAUDE.md`: lasciata intatta.

Non sono stati rimossi moduli applicativi sulla sola base di una ricerca
testuale: caricamenti dinamici, entry point dei worker e percorsi opzionali
richiedono verifiche dedicate. Questa è una prima pulizia verificata, non
una dichiarazione che l'intera codebase sia priva di codice morto.

## Verifiche

- Lockfile rigenerato offline, con script di installazione disabilitati.
  Ripristinati i metadati `libc` omessi dalla versione locale di npm.
- Confronto strutturale con il lockfile originale: soltanto i 19 pacchetti
  rimossi e la dichiarazione diretta di `shell-quote`.
- Verificati i 24 riferimenti locali a file e immagini nei due README.
- Screenshot dal pacchetto beta.6 pubblico in demo isolata, senza AI o
  scritture GitHub; server demo fermato dopo le catture.

Le verifiche locali usano il `node_modules` preesistente, condiviso tramite
junction: non è stato modificato o ripulito. Non costituiscono un nuovo
collaudo di installazione pulita su tre sistemi operativi.

Prima suite completa: typecheck passato; 3587/3595 test passati, con 8 test
falliti in 6 file. Un errore riguarda i link README e il filtro del test
di distribuzione ancora fermo alle release beta.4/beta.5; corretti i link
ospitati e aggiornato il controllo alla beta.6, mantenendo le verifiche.
Gli altri fallimenti includono timeout e un errore di stato/timer nello
starter; non sono dichiarati risolti o attribuiti alla sola macchina.
La sequenza si è fermata prima della build. Riesecuzione mirata separata
dalla suite completa, con un solo worker e senza aumentare i timeout.

Riesecuzione mirata: **144/144 test passati in 7/7 file**, inclusi tutti
i file falliti e i test delle dipendenze di sviluppo. Questo risultato
non sostituisce quello della prima suite completa.

Verifica finale con un solo worker: **build e typecheck passati**;
**3594/3595 test passati in 320/321 file**. Resta un timeout di 60 secondi
in `server/workspace.test.ts`, nel caso `prepareDesk` per la correzione
di una PR con branch già aperto sulla scrivania dell'autore (#199).
La precedente riesecuzione mirata di questo file era passata: il timeout
resta aperto e non è attribuito con certezza all'ambiente.
La build segnala chunk grandi e un import dinamico Rapier inefficace;
nessuna soglia o configurazione è stata cambiata per nascondere gli avvisi.
Non si dichiara la suite completa verde.
