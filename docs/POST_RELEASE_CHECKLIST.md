# Prossimi passi dopo la prima beta

Lista di lavoro concordata con il manager: un punto alla volta. Ordine iniziale conservato; **1 — Feedback, 3 — GitHub Sponsors e 4 — droidsembly.com completati**. Gli appunti successivi sono storici e possono descrivere stati superati; stabilità/prossima beta e OIDC restano da concordare, senza avvio automatico.

- [x] **1. Feedback — COMPLETATO:** PR #25 integrata su autorizzazione dopo CI verde Ubuntu/Windows/macOS Intel, merge `a8d4d31`. Issues abilitate e quattro moduli bug/proposte EN/IT verificati nel browser autenticato sul repository pubblico, poi confermati personalmente dal titolare: campi, indicatori obbligatori, checkbox privacy e collegamenti al sito presenti; disponibili anche issue libera e contatto privato. Nessuna issue fittizia o messaggio di contatto inviati; non provata la validazione server tramite invio. Vedi [verifica e attivazione feedback](FEEDBACK.md).
- [ ] **2. Stabilità e prossima beta:** definire priorità dai feedback e approfondire i problemi temporali storici. Fix Rapier/test integrato con PR #26 (`61af06f`), suite locale completa 2.647/2.647 e CI Ubuntu/Windows/macOS Intel verdi; questo non dimostra la risoluzione definitiva di tutti i fallimenti precedenti. Apple Silicon resta non verificato. Nessuna nuova beta autorizzata automaticamente. Vedi [verifiche e limiti](THROWSIM_VALIDATION.md).
- [x] **3. GitHub Sponsors — COMPLETATO:** profilo pubblico verificato; pulsante Sponsor e collegamenti README EN/IT integrati con PR #22, merge `0979bc128e28f13557d105cae8d00fc6db2dfa4d`.
- [x] **4. droidsembly.com — COMPLETATO:** sito IT/EN pubblicato su Vercel, progetto `droidsembly-site`, dominio acquistato dal manager e collegato: https://droidsembly.com . Sponsors/PayPal, demo, screenshot operativi e navigazione aggiornati. Web Analytics Hobby abilitato; invio pageview dopo consenso verificato HTTP 200, nessuna richiesta prima del consenso/dopo rifiuto. Resend: dominio verificato, DNS configurati, mittente `contatti@droidsembly.com`, chiave con solo invio sul dominio salvata come Secret in produzione. Test reale autorizzato: Resend Delivered e ricezione confermata dal manager con screenshot. Sorgenti salvati nel repository privato `rosariomoscato/droidsembly-site`, fuori dalla cartella temporanea, con ripristino da clone verificato. Conteggi dashboard Analytics e messaggio finale UI non verificati. Vedi [recupero e backup](RECOVERY.md).
- [ ] **5. Publisher OIDC:** configurare e validare in prossimità della prossima pubblicazione; la configurazione iniziale scade se non validata entro due giorni.

## Recupero e backup — stato corrente

Backup storico cifrato completato, ripristino di 54.533 file e copia cloud verificati secondo le ricevute private; non è uno snapshot degli ultimi aggiornamenti. Durante la revisione documentale i percorsi registrati degli archivi non risultavano disponibili: reperibilità attuale da riconfermare, senza dichiarare perso il cloud né effettuare nuovi ripristini. Vedi [RECOVERY](RECOVERY.md). Gli appunti sotto sono storici.

## PayPal per il futuro sito (punto 4)

Aggiornamento verifica punto 4: su autorizzazione del manager inviata una richiesta di prova dal modulo pubblico, identificata Test Droidsembly. Resend conferma Delivered verso ros.moscato@gmail.com; il titolare ha confermato la ricezione con screenshot. Nessun secondo invio dopo il redirect 308 intercettato dal runner browser.

Il manager ha fornito il link pubblico `https://paypal.me/rosmoscato` dopo aver aggiornato la foto. Usarlo come seconda opzione di sostegno volontario sul futuro sito, accanto a GitHub Sponsors. La lettura automatica restituisce la pagina PayPal.Me ma non espone i dettagli del destinatario: resta da verificare visivamente in una finestra privata che il link mostri il profilo corretto. Nessun pagamento di prova effettuato. Link registrato localmente, non ancora inserito nel sito o pubblicato nel repository.

Verifica visiva successivamente confermata dal manager: nome e foto corretti. Link pronto per l'integrazione nel futuro sito; nessuna transazione verificata. Il punto 4 resta aperto.

## Punto 3 — stato e prossima azione

Profilo approvato e pubblico: https://github.com/sponsors/rosariomoscato . Confermato dalla schermata del titolare, da `rosariomoscato.hasSponsorsListing = true` e dalla pagina pubblica raggiungibile con scelta dell'importo. La schermata segnala separatamente che l'account Stripe è in verifica: accrediti non verificati da questa attività.

PR #22 integrata su autorizzazione del manager. Verificati FUNDING e link EN/IT sul main pubblico; API GitHub conferma profilo Sponsors attivo e collegamento di finanziamento GitHub sul repository. Ultima schermata Payouts senza richieste di intervento visibili; nessun accredito effettivo verificato. Gli altri punti restano aperti. Questa spunta di completamento è per ora registrata localmente.

Aprire https://github.com/sponsors e scegliere **Get sponsored** per `rosariomoscato`, oppure riprendere l'eventuale domanda esistente. Il titolare completa personalmente contatti, scelta del metodo di accredito, informazioni bancarie/fiscali, termini e verifica 2FA GitHub. Successivamente compilare il profilo e richiedere l'approvazione quando previsto dal portale. Nessun dato bancario/fiscale o codice di autenticazione va registrato qui.

Fonte: https://docs.github.com/en/sponsors/receiving-sponsorships-through-github-sponsors/setting-up-github-sponsors-for-your-personal-account

### Testi proposti per il profilo

**Short bio — EN**

Maintainer of Droidsembly, a free, MIT-licensed fork of CubeFarm for coordinating AI coding agents through a visual office and mobile dashboard.

**Bio breve — IT**

Mantengo Droidsembly, fork gratuito e MIT di CubeFarm per coordinare agenti AI di programmazione attraverso un ufficio visuale e una dashboard mobile.

**Introduction — EN**

I maintain Droidsembly, building on CubeFarm by Leon van Zyl. Sponsorship helps me dedicate time to maintenance, documentation, accessibility, English/Italian support and testing across desktop and mobile.

Droidsembly remains free and MIT licensed. Sponsorship is entirely voluntary: it does not unlock features or additional agents and does not include AI-provider subscriptions or usage credits. Dependencies retain their own licenses and terms.

Thank you for supporting the project through feedback, contributions or sponsorship.

**Presentazione — IT**

Mantengo Droidsembly, basato su CubeFarm di Leon van Zyl. Il sostegno mi aiuta a dedicare tempo a manutenzione, documentazione, accessibilità, supporto inglese/italiano e verifiche su desktop e mobile.

Droidsembly resta gratuito e con licenza MIT. Il sostegno è interamente volontario: non sblocca funzionalità o agenti aggiuntivi e non include abbonamenti o crediti dei provider AI. Le dipendenze mantengono le proprie licenze e condizioni.

Grazie a chi sostiene il progetto con feedback, contributi o donazioni.

### Quando considerare completato il punto 3

- Profilo approvato e pagina pubblica effettivamente raggiungibile.
- Collegamento Sponsors verificato e inserito nei README EN/IT e in `.github/FUNDING.yml` tramite modifiche autorizzate.
- Nessun vantaggio a pagamento necessario per usare Droidsembly; eventuali livelli/importi scelti dal titolare. I livelli sono facoltativi.

Il punto 3 è completato per l'attivazione pubblica e i collegamenti del progetto. Gli altri quattro punti non vengono avviati automaticamente.
