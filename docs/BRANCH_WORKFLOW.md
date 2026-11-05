# Branch di sviluppo e pubblicazione / Development and release branches

## Italiano

### Struttura

```text
main                       integrazione delle release approvate
dev                        preparazione della prossima versione
fix/http-parser            esempio di branch creato da dev
feature/nome-intervento    altro esempio di branch creato da dev
```

I prefissi sono convenzioni, non sotto-cartelle o branch realmente annidati. I test della modifica viaggiano nello stesso branch del codice. Si usa sempre una copia di sviluppo isolata con dati/porte dedicati, mai l'installazione reale per provare un branch.

1. Aggiornare il riferimento remoto `dev` nella copia di sviluppo e creare da lì un branch mirato; non lavorare direttamente su `dev` o `main`.
2. Aprire la PR con **base `dev`**, riportando verifiche e ogni fallimento. Eseguire typecheck, suite e build; test offline, nessun provider AI reale.
3. Integrare in `dev` soltanto dopo controlli e approvazione del titolare. Niente auto-merge, force-push o aggiramento dei controlli.
4. Preparare versione, note e artefatto per la prossima pubblicazione tramite PR verso `dev`. Una release richiede decisione esplicita.
5. Aprire la promozione **`dev` → `main`** dello stesso repository. La CI esegue tutti e tre i sistemi e verifica l'origine del branch. Non inviare feature/fix direttamente a `main`; anche un hotfix passa da un branch da `dev` e dalla promozione concordata.
6. Dopo approvazione, integrare la promozione in `main`. Taggare il commit esatto approvato e invocare il workflow Release da `main` soltanto con autorizzazione separata. Commit, push e merge non pubblicano su npm.

### Protezioni e controlli

- `main` e `dev`: PR obbligatoria, check richiesti, branch aggiornato rispetto alla base, regole applicate anche all'amministratore; niente force-push o cancellazione.
- Check richiesti: `branch policy`, `check (ubuntu-latest)`, `check (windows-latest)`, `check (macos-latest)`.
- La policy verso `main` accetta soltanto `dev` di questo repository; un fork con un branch omonimo non basta. Verso `dev` sono consentite normali PR da branch dedicati, anche da fork.
- Non si impone una seconda persona approvatrice: il titolare è il solo maintainer e non può approvare formalmente le proprie PR. Restano PR/check obbligatori e approvazione esplicita nel processo, senza auto-merge. Le protezioni non sono un sistema di autorizzazione per l'app o un sandbox per gli agenti.
- CI su PR verso entrambi i branch, push su entrambi e avvio manuale. Tutti e tre i sistemi per promozioni verso `main`, push e avvii manuali; filtri esistenti per le PR ordinarie verso `dev`.
- macOS CI usa temporaneamente `macos-26-intel` con il nome storico del check; ciò non verifica Apple Silicon. Il workflow Release conserva la propria matrice e i propri gate: non avviarlo per provare i branch o per validare OIDC in anticipo.

### Transizione autorizzata

`dev` è creato dal `main` verificato `e8763d6dfa8928f0611524f2af48ec98da94c39a`, senza reset o riscrittura della cronologia. **In questa fase `main` non coincide con la beta npm `0.4.0-beta.1`**: contiene già modifiche successive, concordate prima della separazione. Il tag `droidsembly-v0.4.0-beta.1` resta il riferimento esatto al commit pubblicato `803cb9e`.

I nuovi sviluppi entrano in `dev`; `main` resta fermo fino alla prossima promozione di release approvata. L'obiettivo è allineare main e codice pubblicato dalla prossima release, non fingere che siano già identici. La configurazione CI e queste guide vengono proposte prima a `dev`; finché la PR di configurazione non è integrata, non dichiarare il nuovo workflow attivo sul branch. I check richiesti possono bloccare altre PR fino a quel passaggio iniziale.

`main` resta branch predefinito di GitHub: impostare esplicitamente la base `dev` quando si apre una PR. Nessuna modifica a launcher, dati o alla configurazione dell'ufficio reale. Il workflow Release esistente è già manuale, vincolato a `main`, tag e appartenenza alla sua cronologia; non viene eseguito né configurato OIDC da questa transizione.

Le modifiche delle guide sul branch `dev` non rendono immediatamente aggiornati i documenti mostrati sul `main` predefinito: è un effetto esplicito della transizione senza promozione anticipata. Per il lavoro di sviluppo consultare queste guide su `dev` dopo la loro integrazione.

## English

Use isolated development copies. Create focused feature/fix branches from `dev`, keep implementation and tests together, and target PRs at `dev`. Integrate only after checks and maintainer approval. Promote **this repository's `dev` to `main`** only for a reviewed release; direct feature/fix-to-main PRs fail the required branch-policy check. Tags and manual Release dispatch require separate authorization; pushes and merges publish nothing.

Both long-lived branches require PRs, up-to-date required checks (`branch policy` plus the three OS checks), enforcement for administrators, no force-push and no deletion. No extra approving reviewer is required for this single-maintainer project; explicit maintainer approval remains a process requirement and auto-merge is off. PRs to dev may use the existing client/docs OS filters; promotions to main, pushes to either branch and manual CI run all OS jobs. macOS CI is Intel, not Apple Silicon.

The transition starts dev at main commit `e8763d6` without resetting history. Main already contains changes after the npm beta and **does not yet match the published package**; `droidsembly-v0.4.0-beta.1` at `803cb9e` remains the exact published reference. Keep main frozen until the next approved release promotion. The new workflow/docs are first reviewed into dev; they are not active on dev until that configuration PR is merged. Required policy checks may block other PRs until then.

Main remains the GitHub default branch to preserve existing launcher behavior; explicitly choose dev as your PR base. Main's displayed guides remain historical until an approved promotion. Release is already manual, main-only and tag/ancestry-validated: no Release run, OIDC configuration, npm publish, production update or real-data operation is part of this change.
