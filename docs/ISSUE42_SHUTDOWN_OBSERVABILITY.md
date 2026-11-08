# Issue #42 — minimal ordinary-CI diagnostic, not a fix

## Italiano

L'issue #42 resta aperta: nello storico Windows/Node22 il teardown del test di scala superò il limite originale di10secondi durante `await shutdown`. La successiva diagnostica PR43 non riprodusse il caso. Un confronto locale prestabilito fra batch precedente e attuale, mantenendo151agenti e tutte le assertion, ha completato i teardown in4,30s e5,15s: **nessun timeout riprodotto, nessun miglioramento del tempo totale dimostrato**. Nel confronto dettagliato il picco di chiamate `terminal.save` pendenti osservate era16→8; non è un conteggio delle scritture fisiche e non dimostra la causa storica.

Questa variante è soltanto una sonda più leggera, destinata alla CI ordinaria dopo review separata. Non include il replay del vecchio codice, né intercetta `terminal.save/flush/snapshot` o le API filesystem. Il runtime di produzione, le dipendenze, il carico, il clock driver, il drain, il rifiuto degli avvisi di persistenza e il limite10s restano invariati.

### Cosa viene registrato

- Dopo la misura originale del carico, osservazioni pass-through delle fasi stato/journal/rilascioCLI/batchterminali/anteprime. Le chiamate mantengono argomenti e promise originali, risultati ed errori; nessuna nuova attesa viene inserita nella catena del chiamante.
- Un campione iniziale, checkpoint nativi ogni2secondi e un campione finale dei prefissi correnti della coda terminale. Lo stesso prefisso per lo stesso terminale viene osservato una sola volta; un prefisso cambiato è una nuova osservazione.
- Conteggi osservati di inizio/risoluzione/rifiuto, prefissi ancora pendenti e loro età, durata delle fasi osservate, CPU del processo ed utilizzo descrittivo del loop. I checkpoint stampano la fase incompleta anche se un hook scaduto non raggiunge `finally`.
- Nessun contenuto terminale, credenziale o percorso di un ufficio reale viene aggiunto ai log. Il timer diagnostico è `unref` e viene disattivato in `finally`; non serve parser/timer fittizi e non cambia il loro avanzamento.

### Limiti di interpretazione

Un prefisso risolto non è una prova autonoma di salvataggio riuscito: il runtime può aver gestito un errore prima della promise osservata. Più campioni dello stesso terminale non corrispondono a più terminali o ad un conteggio globale delle scritture. Il lavoro non ancora accodato non è coperto dal prefisso corrente. Le durate parallele si sovrappongono e non vanno sommate come tempo trascorso. Il callback reale può essere ritardato da un loop occupato: l'assenza di un checkpoint non dimostra assenza di attività.

Inoltre, una promise appena campionata può essere già risolta ma il relativo handler di osservazione non essere ancora stato eseguito: `active`/`pending` descrivono **osservazioni non ancora notificate**, non un'introspezione sincrona dello stato interno delle promise. Per interpretare uno stallo confrontare campioni successivi, età e fase attesa; non dedurre151salvataggi bloccati dal solo campione iniziale o finale.

La sonda aggiunge handler, allocazioni e log, quindi può perturbare la temporizzazione: non è a overhead zero né una prova di bounded shutdown in produzione. I test di contratto verificano identità delle promise/risultati, propagazione degli errori, ordine della coda e deduplicazione dei campioni. Non sostituiscono una riproduzione lenta genuina.

Se una CI fallisce, conservare log completi, ultima fase/campioni e SHA esatto; non rilanciare invariato fino al verde, non aumentare timeout o ridurre casi/carichi. Se passa, registrare **mancata riproduzione**, non risoluzione. Nessuna esecuzione aggiuntiva di Release o aggiornamento reale è richiesta da questa diagnostica. L'issue #39 è distinta e non viene risolta da questi cambiamenti.

## English

Diagnostic only; #42 remains unresolved. Instrument coarse shutdown phases and sample current terminal queue-prefix promises during ordinary validation. Preserve original result/promise identities, errors, workload, timer driver and deadlines; no per-terminal-operation or filesystem interception. Prefix observations are not physical-write counts, global-work completion or persistence-success assertions. Real checkpoints can be delayed by a busy loop, and telemetry itself can perturb timing. Preserve genuine failures and exact commit/log context; never repeat unchanged runs until green or infer resolution from a passing run. No production fix, release or real-office update is included.
