# Droidsembly 0.4.0-beta.5 — candidate / candidata

**Not published / Non pubblicata.** Intended channel **`next`**; `latest` remains unchanged. Version preparation does not publish, update existing installations, migrate office data or authorize AI work. Public channels checked November 14, 2026: `next=0.4.0-beta.4`, `latest=0.4.0-beta.1`.

## Italiano

### Novità rispetto a beta.4

- **Onboarding cloud:** checklist italiano/inglese per Upstash, accesso GitHub ai repository previsti, scelta strumento/modello e login ufficiale nella Box. Una Box pronta o un account salvato non dimostrano quota AI disponibile. Nessuna copia dei file di autenticazione PC.
- **Cancellazione verificata:** una richiesta DELETE accettata non basta. Conferma solo dopo assenza della risorsa esatta e inventario riuscito senza quell’ID. Stato macchina incerto conservato; pulizia orfani limitata alle etichette applicazione/ufficio e con nuovo controllo della proprietà. La UI distingue eliminazioni confermate e non confermate.
- **Sospendi nuovi lavori cloud:** impostazione persistente, disattivata per default, con guardie su nuove assegnazioni e avvii AI, inclusi task in preparazione o attesa quota. Ripresa con conferma; quote e slot restano rispettati. CEO locale, lavoro locale e terminali già attivi non vengono interrotti.
- **Consumi senza false garanzie:** tariffe CPU indicative, costi ignoti e archiviazione residua espliciti. La pausa non è un tetto di spesa, non arresta la fatturazione né elimina automaticamente le Box. Login manuali possono ancora creare/riattivare risorse.
- **Documentazione:** stato beta.4 pubblicata e guida all’avvio/aggiornamento controllato con confini fra codice, profilo dati e rollback.
- **Fixture dei test cloud:** attesa delle attività di clone/sincronizzazione e delle pulizie figlie prima dello shutdown; home isolata, conservata se la chiusura fallisce. Nessuna modifica del runtime di produzione per silenziare il test runner.

### Evidenze e limiti

Prima del cambio versione: 80 test mirati e typecheck PASS; una suite locale completa con fixture corretto ha passato **3132/3132 test, 290 file, 487,73 s**, senza errore non gestito, Windows Node22.23.1 in Risparmio energia invariato. CI [43619831690](https://github.com/rosariomoscato/droidsembly/actions/runs/43619831690) verde su Ubuntu, Windows, macOS Intel/ARM64 e Windows Node22, con build e smoke installato. La demo finta ha verificato checklist, persistenza pausa e conferma ripresa; nessun nuovo test su Box/provider reali o fatturazione.

Lo storico conserva una precedente suite locale con 3130 test passati ma un errore RPC non gestito in teardown, quindi **fallita**. La regressione controllata riproduce la chiusura prima del log della pulizia con una barriera incompleta e passa con l’attesa delle attività figlie. Non prova la causa di ogni possibile errore RPC. Nessun retry invariato della suite, log nascosto, timeout aumentato, carico/assertion ridotto o piano energetico modificato. Vedi [resoconto operativo e diagnostico](BOX_DAILY_OPERATIONS_VALIDATION.md).

Queste evidenze precedono la versione beta.5: installazione pulita, suite/build, smoke del tarball esatto e nuova CI del candidato devono essere registrati separatamente. Non certificano ancora il pacchetto pubblico. Le issue storiche #39/#42 restano aperte: scanner, percorsi e scala sono passati senza riprodurre causalmente i vecchi problemi. Nessuna migrazione dati, nuovo limite agenti o aggiornamento dell’installazione PC. Node >=22, comando e percorsi dati restano compatibili.

## English

### Changes since beta.4

- IT/EN cloud onboarding checklist using existing Upstash/GitHub/model/sign-in controls. Machine readiness and saved metadata are not proof of provider authentication or available quota; never copy PC login files.
- Verified removal requires both exact resource absence and successful inventory absence. Preserve uncertain machine state; recheck orphan ownership and report confirmed/unconfirmed outcomes. Accepted DELETE is not confirmation.
- Persistent **Pause new cloud work**, off by default: block cloud assignments and new AI launches, including preparation/quota waits. Confirm before resuming; retain quota/session limits. Local CEO/work and active terminals are unaffected.
- Reference CPU rates and unknown billing are explicit. Not a spending cap, invoice or guarantee that charges stop; storage and manually created/woken Boxes remain possible.
- Published-beta.4 status and controlled PC startup/update/profile/rollback guidance.
- Test-only cloud fixture lifecycle correction: drain detached startup and child sweeps before shutdown; isolated home retained on cleanup failure. No production-runtime suppression or test-runner guard disabling.

### Validation boundaries

Before the version bump: targeted80PASS/typecheckPASS, one complete local run **3132/3132 tests, 290 files, 487.73s**, no unhandled error, unchanged Power saver on Windows Node22.23.1; all five platforms in CI43619831690 passed typecheck/tests/build/installed smoke. Fake-demo UI verified checklist and pause/resume, not real authentication, billing or cloud deletion.

Preserve the preceding failed full run: 3130 test bodies passed but one unhandled console RPC teardown rejection made the run fail. Controlled RED/GREEN coverage demonstrates the incomplete child-work barrier and its correction, not every possible RPC cause. No unchanged full retry, console/error suppression, relaxed budget/workload/assertion or power-policy change. New beta.5 candidate and exact public-artifact checks remain separate gates; the earlier tests do not certify a published beta.5 package. Historical #39/#42 remain open. No real installation update, automatic data migration or new agent-cap claim.
