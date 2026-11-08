# Public availability gate / Controllo disponibilità pubblica

## Italiano

`npm publish` può terminare con successo dopo l'accettazione dell'invio, prima che versione, canale e tarball siano accessibili. Durante beta.3 sono stati osservati circa 19 minuti tra accettazione e disponibilità dei metadati; per un breve intervallo i metadati erano disponibili ma l'URL canonico del tarball rispondeva ancora 404. La causa interna del ritardo npm resta sconosciuta. Il workflow precedente creava subito la release GitHub: il verde non attestava la disponibilità pubblica.

Il nuovo percorso Release, da usare solo su futuri tag approvati che includano gli script, separa questi stati:

1. Dopo gli stessi test/build, prepara un tarball e ne conserva manifest e integrità fuori dal checkout. Conferma che la versione sia ancora assente e fotografa i canali pubblici, incluso `latest`.
2. Esegue lo smoke esistente sul tarball esatto. Pubblica **una sola volta** con il comando normale dalla directory, preservando l'identità Git registrata da npm. Non modifica sorgenti fra pack e publish; il contenuto pubblico deve poi coincidere con il pack verificato.
3. Osserva soltanto endpoint pubblici in lettura: versione e commit attesi, integrità dichiarata, canale atteso, URL canonico del tarball, byte e dimensione esatti. Per una prerelease `latest` deve restare uguale alla fotografia iniziale. Nessuna credenziale o query per aggirare la cache viene usata.
4. Solo gli stati di disponibilità incompleta (404 o canale ancora precedente) vengono osservati ogni 30 secondi entro **cinque minuti complessivi**. Errori HTTP, cambio identità/integrità, URL esterni o modifica di `latest` fermano il controllo. Non vengono ripetuti test, build, pubblicazione o modifiche ai dist-tag. I timeout dei job esistenti restano 20 minuti e le assertion/soglie originali dei test non cambiano.
5. Quando tutti i controlli passano, conserva il tarball scaricato ed esegue su di esso lo smoke originale. **Solo allora** crea la prerelease/release GitHub. Artifacts e report di osservazione sono conservati anche in caso di fallimento tramite upload artifact.

### Se la verifica fallisce dopo l'invio

**Il pacchetto potrebbe essere già accettato, già pubblico o diventare pubblico successivamente.** Non ripubblicare la versione, non spostare tag, non rilanciare automaticamente Release e non forzare i canali. Conservare log/artifact `publication-<tag>`, `before.json`, `availability.json`, pack e tarball; verificare separatamente lo stato pubblico in sola lettura. L'assenza di release GitHub non significa assenza di pubblicazione npm.

Il budget di cinque minuti è una scelta conservativa, **non una garanzia che npm elabori ogni invio entro quel tempo**: un ritardo come quello della beta.3 farebbe fallire esplicitamente questo gate invece di produrre un verde prematuro. Una successiva conferma pubblica va registrata separatamente; l'eventuale creazione della release GitHub richiede una decisione dedicata senza ripetere l'invio npm.

Non usare il workflow Release per provare questi script. I test `scripts/npmPublication.test.ts` usano esclusivamente risposte sintetiche, byte fittizi e orologio simulato, senza chiamate npm reali, attese reali, AI o dati dell'ufficio. La nuova logica non è stata eseguita su una pubblicazione reale durante la sua preparazione. Vecchi tag beta.2/beta.3 restano immutabili e non vanno riutilizzati con questo workflow modificato.

## English

Accepted upload is not the same as public availability. The gate snapshots the unpublished identity and current channels, smokes the packed artifact, publishes exactly once, then uses unauthenticated read-only requests to verify version/commit, integrity, expected channel, unchanged `latest` for prereleases, and exact canonical tarball bytes. Only incomplete availability is observed at 30-second intervals within a fixed five-minute budget. Other HTTP/identity/integrity failures stop immediately. Existing job/test deadlines and assertions remain unchanged.

The downloaded public artifact must pass the original installed smoke before GitHub release creation. Evidence is uploaded even after failure. A failed post-publish gate does **not** undo publication or make rerunning Release safe: the upload may complete later. Never republish an existing version or change immutable tags. Inspect later availability separately and explicitly decide any remaining GitHub release action without another npm publish. A delay like beta.3's would deliberately fail this conservative gate, not be disguised as success. Offline synthetic tests are not evidence of a new live publication; this preparation does not authorize any tag, publication or real-office update.
