# Contribuire a Droidsembly

[English](CONTRIBUTING.md) · **Italiano**

Droidsembly è un fork di [CubeFarm di Leon van Zyl](https://github.com/leonvanzyl/cubefarm), mantenuto da [Rosario Moscato](https://github.com/rosariomoscato). Sono benvenuti contributi al codice, documentazione, traduzioni, accessibilità e usabilità desktop/mobile.

## Segnalazioni e proposte

Usa i [moduli per issue in italiano o inglese](https://github.com/rosariomoscato/droidsembly/issues/new/choose). Cerca prima nelle issue esistenti e inserisci un solo problema o proposta per issue. Per un bug indica versione installata, ambiente, passaggi per riprodurlo, risultato atteso e ottenuto. Se nessun modulo è adatto, puoi aprire un'issue libera.

Le issue sono pubbliche: rimuovi credenziali, informazioni di progetti privati e dati personali da testo, log e screenshot; non allegare file completi di stato/configurazione. Per dettagli sensibili o sospette vulnerabilità usa prima il modulo contatti sul [sito](https://droidsembly.com), senza credenziali né dettagli pubblici di sfruttamento. Se GitHub Issues non è disponibile, il modulo contatti è anche il canale alternativo per i feedback. Non occorre avviare agenti a pagamento o modificare dati reali per segnalare un problema.

Prima di una modifica sostanziale, apri una discussione tramite issue per concordare l'ambito. Per una proposta descrivi il problema che vuoi risolvere e il comportamento desiderato.

## Preparare l'ambiente

Segui il [README italiano](README.it.md#installa-questo-fork) per requisiti, compilazione e demo isolata. Usa un checkout di sviluppo separato, una cartella `SWARM_HOME` dedicata e porte libere. La demo usa GitHub e agenti simulati; non richiede richieste AI reali.

La [guida tecnica inglese](CONTRIBUTING.md#run-it-from-source) descrive launcher e sviluppo con ricaricamento automatico. I launcher possono aggiornare il proprio checkout: leggine il funzionamento prima di usarli. Gli agenti che lavorano sul repository devono seguire anche [CLAUDE.md](CLAUDE.md); i suoi esempi npm storici si riferiscono al pacchetto upstream `cubefarm`, non a Droidsembly.

## Pull request e verifiche

- Apri PR mirate verso `main` di questo fork, descrivendo cosa cambia e perché.
- Mantieni la copertura inglese/italiana, l'accessibilità e la compatibilità desktop/mobile.
- Riporta i controlli eseguiti e gli eventuali fallimenti. Per modifiche visive allega screenshot ottenuti in demo isolata.
- Prima di una PR esegui `npm run typecheck`, `npm test` e `npm run build`; in PowerShell usa `npm.cmd`.
- I test devono essere offline, senza provider AI o repository reali e senza usare la home dati dell'installazione personale. I test e2e sono facoltativi: eseguili solo quando richiesti dall'issue.

La beta pubblicata ha CI superata, ma due precedenti fallimenti locali (timeout indoor e budget prestazionale walkways) restano da risolvere. Consulta le [note della release](https://github.com/rosariomoscato/droidsembly/releases/tag/droidsembly-v0.4.0-beta.1); non considerare una CI verde come prova della loro risoluzione.

Dettagli su test, browser degli agenti e struttura del codice: [Testing](CONTRIBUTING.md#testing) e [Architecture](CONTRIBUTING.md#architecture).

## Release

La prima beta `droidsembly@0.4.0-beta.1` è [pubblicata su npm](https://www.npmjs.com/package/droidsembly). Il canale consigliato è `next`; il comando pubblico è `droidsembly`. Il file interno `bin/cubefarm.js` resta per compatibilità.

La configurazione OIDC per le prossime pubblicazioni è ancora da completare e validare. Tag, pubblicazione npm ed esecuzione del workflow di release richiedono autorizzazione esplicita del maintainer. Vedi la [guida alle release](docs/NPM_RELEASE.md).

## Licenza e attribuzioni

Il codice del progetto è distribuito con [licenza MIT](LICENSE). Conserva l'attribuzione originale a Leon van Zyl e le licenze dei componenti di terze parti. [Crediti nel README](README.it.md#crediti-e-licenza).
