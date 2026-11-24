# Droidsembly 0.5.0-beta.2 — published / pubblicata

**Published November 24, 2026 on npm `next`; `latest` remains `0.5.0-beta.1`.**
**Pubblicata il 24 novembre 2026 su npm `next`; `latest` resta `0.5.0-beta.1`.**

## Final publication status / Esito finale

- [GitHub prerelease](https://github.com/rosariomoscato/droidsembly/releases/tag/droidsembly-v0.5.0-beta.2).
- Immutable tag / tag immutabile: `droidsembly-v0.5.0-beta.2`.
- Source / sorgente: `0e125c1e1c003b417c50cdd9b9a752dc893cce89`.
- PR #111 and corrective PR #114 integrated in dev; authorized promotion #112
  merged in main. Fresh dev, promotion and [main CI](https://github.com/rosariomoscato/droidsembly/actions/runs/45346546724)
  passed all five environments, without bypass or unchanged failed-job retry.
- Final corrective local cycle: 330 files / 3655 passed tests / 5 existing
  skips, typecheck, build and isolated installed-package smoke.
- [Release 45348450586](https://github.com/rosariomoscato/droidsembly/actions/runs/45348450586)
  passed its three verification environments and published via npm OIDC,
  but **remains failed**: its five-minute post-publish availability check
  observed `version-not-visible` and stopped. Public smoke and GitHub release
  creation were skipped in that workflow.
- A later independent read-only check verified the canonical public tarball
  byte for byte against the exact pre-publish artifact, with matching gitHead,
  integrity and channels. The public tarball passed isolated demo smoke in
  135.56 s. The GitHub prerelease page was then completed with separate
  maintainer authorization. No republication, workflow rerun or tag movement.
- Public tarball: 3376678 bytes; SHA-256
  `af03da231f896b78f14ceec31010b7d5addd5b99a61c5863715acdc91de67e4d`.
- [Publication evidence and retained failure](https://github.com/rosariomoscato/droidsembly/issues/110#issuecomment-7125408524).

**IT:** La verifica successiva non cancella il timeout del workflow.
La pagina release è stata completata separatamente, non con un rilancio di
Release. `next` è beta.2; `latest` e installazione PC restano beta.1.
#39/#42 restano in monitoraggio e #109 irrisolta: nessun miglioramento FPS
dimostrato o soluzione universale dei timeout. Nessun aggiornamento reale,
deploy del sito o ulteriore rilascio è autorizzato da questo documento.

**EN:** The later verification does not erase the workflow failure.
`latest` and the PC installation remain beta.1. #39/#42 remain monitoring;
#109 remains unresolved. No proven FPS gain or universal timing fix.

## Preparation history / Cronologia della preparazione

The dated checkpoints below are retained as written at the time, including
negative results and then-pending gates. They do not describe the current
publication state, which is recorded above.
I checkpoint seguenti conservano esiti negativi e gate allora pendenti;
non sostituiscono l'esito finale riportato sopra.

## Pre-publication validation / Verifica prima del rilascio — 24 November

### Weather-cache corrective follow-up (#113)

Promotion PR #112 subsequently failed Windows/Node 22 in the cache-restart
weather test (`vi.waitFor` reading the saved cache). Its other four
environments passed; the failed job did not reach build/smoke. That result
remains retained and the promotion was not merged.

A controlled filesystem gate demonstrated three identical cache writes for
updates queued before the first save completed. The correction skips only
bytes already renamed successfully. It preserves later different updates and
does not suppress queued attempts after a failed rename. Fixture-owned writes
now settle before their folders are removed; failure logs/folders are retained.
The original restart assertion and all deadlines remain unchanged.

The correction passed a single complete local cycle: **330 files, 3655 tests
passed / 5 existing skips (3660 total)**, 594.45 s Vitest duration, plus
typecheck, build and isolated installed-package smoke. Three new regressions
cover duplicate writes, later changed data and a failed-rename retry.
This demonstrates avoidable queue I/O, not a proven universal explanation for
every historical timeout. Dedicated review/CI and fresh promotion checks are
still required; no merge, publication or PC update follows from this result.

### Earlier candidate checkpoints (retained)

Application-code CI checkpoint: `786508ce58c70d752c02511e49849f165d646f05`.
The [candidate CI](https://github.com/rosariomoscato/droidsembly/actions/runs/45217235928)
is **green across all five environments**: Ubuntu, Windows/Node 24,
Windows/Node 22, macOS Intel and native macOS ARM64. Typecheck, complete tests,
build and installed-package smoke passed. ARM64 initially could not acquire
a hosted runner; its final attempt executed and passed, without weakening
deadlines or substituting Intel. The earlier cancelled attempts are retained.
This checkpoint records that tested code. Subsequent fixture-observation and
documentation changes require their own PR CI; no npm publication is implied.

A final bounded local check passed all **30 tests** in the complete notifier,
walkways and scale files. Scanner: **0.603 s / 5 s**. Fifteen walks, five
batches: median **3.3856 ms / 8 ms**. Scale body: **50.329 s / 120 s**;
shutdown interval **2.673 s**; full teardown **3.059 s / 10 s**, no
persistence-warning assertion failure. No source or threshold change.

**Latest local pre-PR validation passed:** 330 files passed, 3652 tests passed
and 5 existing skips (3657 total), Vitest duration 595.81 s. Release identity,
typecheck, build and installed-package demo smoke also passed in one sequential
cycle, stopping on any failure with no acceptance retries.

`homeIntegration` now retains safe child phase and lifecycle observations on
failure, or when tracing is requested. No clock driver or deadline changed:
Node/tsx startup, config import and launcher import all remain inside the
original four-second budget. The new-home case completed in **0.831 s**;
child entry/config/launcher were observed at 541.78/610.57/620.05 ms after
Node's performance origin. All six original home scenarios passed. The
diagnostic distinguishes future startup/import/cleanup stalls; it is not a
causal fix for every historical timeout.

**Negative local evidence remains:** the preceding full local suite finished with
329 files passed / 1 failed; 3651 tests passed / 1 failed / 5 skipped.
The new-home integration probe exceeded its unchanged four-second deadline
and reported a cleanup error. A later isolated equivalent probe passed in
0.877 s with the correct home and no files created; this does not prove the
intermittence resolved. The new complete local cycle satisfies the local
pre-PR gate; external CI was not used to waive it. Review and PR CI remain
required before any integration, followed by separate release authorization.

Issue status is distinct from release authorization:
**#39 and #42 are open in monitoring**, not reproduced in the latest check;
**#109 remains open and unresolved**, without a new FPS measurement.
Keeping an issue open is not itself a new publication veto, but neither its
monitoring status nor this CI result authorizes bypassing remaining gates,
merging, publishing or updating the PC.

## 23 November follow-up / Checkpoint storico — blocked at that time

The local candidate now also contains bounded-yield source-policy reads and
streaming compression of the synthetic demo journal. The latter generated the
same 5375 lines / 10506922 JSON bytes for a 151-agent seeded comparison,
about 13% faster in two paired windows. This is not a graphics-FPS result.
Six complete deadline-sensitive test files join the existing serial phase;
no test deadline, assertion, scenario or retry setting was relaxed.

Scanner verification: 24/24 tests passed, including the unchanged five-second
policy budget. A subsequent targeted pass reported 12 files passed,
206 tests passed and 5 skipped. That pass included experimental Git changes
which are **not** retained in this candidate.

Final complete-suite attempt: stopped at the unchanged diagnostic outer bound
of 1500 seconds, without a final test summary. No failing tests appeared in
the captured output, but **this is not a successful suite result**.
A final Git-only check reported 2 failed / 3 passed / 41 filtered tests;
the seeded-origin regression and the original PR-author scenario timed out.
Both workspace source and test files were restored to the reviewed main
implementation. The discarded experiments remain in local diagnostics.

Build and package smoke were not reached. The retained final combination has
not passed a complete suite; no PR, publication or PC update is approved by
these results. Issues #39, #42 and #109 remain open.

## Initial failed checkpoint / Primo checkpoint negativo

One local Windows/Node 22 validation pass on the beta.2 metadata failed:
**322 test files passed, 8 failed; 3639 tests passed, 11 failed, 5 skipped**
(3655 total). Vitest duration: 1311.75 seconds. Identity validation and
typecheck passed; build and package smoke were not run because the sequence
stopped on the failed suite. No acceptance retry or threshold change.

Failures involve publication CLI, Box setup shell, MCP HTTP, independent clamp
acceptance, Git workspace fixtures, basketball simulation, notifier source scan
and the scale workload. Most report timeouts; Box setup also reports a failed
fixture-tree cleanup. Cause is not established. This result blocks the PR and
release; the earlier successful main CI does not supersede it.

## Italiano

### Scopo

Aggiornamento beta di affidabilità rispetto a `0.5.0-beta.1`.
Non è una soluzione alle prestazioni grafiche e non dichiara risolti tutti
i problemi intermittenti.

### Correzioni incluse nel codice candidato

- Un salvataggio terminale fallito resta selezionabile per un tentativo
  successivo, anziché essere considerato già salvato.
- Le modifiche durante una scrittura periodica lenta dello stato vengono
  accorpate, evitando una coda crescente di snapshot periodici.
- La chiusura ferma i timer di manutenzione registrati prima di attendere
  persistenza e rilascio delle sessioni.
- Le sessioni sintetiche della demo vengono fermate al rilascio dei CLI.
  Le scritture terminale periodiche non ancora iniziate vengono lasciate
  al salvataggio finale completo.
- Il recupero di un branch locale già esistente non richiede un fetch:
  può recuperare anche commit non pubblicati quando il remoto non è disponibile.
- La scansione di policy dei sorgenti usa letture fresche in piccoli blocchi,
  cedendo il controllo tra i blocchi; copertura e limite di cinque secondi
  restano invariati.
- Il diario sintetico della demo comprime ogni evento prima di clonarlo,
  evitando copie complete poi scartate, senza ridurre il giorno simulato.
- La cache meteo non riscrive byte identici già salvati e rinominati con
  successo; aggiornamenti diversi ed errori di rinomina non vengono scartati.

Queste correzioni riducono difetti specifici; non garantiscono assenza di perdita
dati in ogni condizione, shutdown sempre entro soglia o fluidità del 3D.

### Limiti noti

- [#39](https://github.com/rosariomoscato/droidsembly/issues/39):
  **in monitoraggio**. Scansione e percorsi entro soglia nell'ultima verifica,
  ma i precedenti rallentamenti intermittenti non sono dichiarati risolti.
- [#42](https://github.com/rosariomoscato/droidsembly/issues/42):
  **in monitoraggio**. Ultima prova Windows/Node 22: workload 50,329 s,
  shutdown 2,673 s e teardown completo 3,059 s, entro le soglie originali.
  I precedenti timeout di workload e shutdown restano evidenze negative.
- [#109](https://github.com/rosariomoscato/droidsembly/issues/109):
  **irrisolta**. FPS bassi osservati nel benchmark 3D. Nessuna ottimizzazione sperimentale
  integrata. Il confronto a scena congelata non prova un miglioramento
  dell'app completa. La verifica Chrome visibile è rimasta inconcludente
  per un blocco dell'automazione prima dell'ingresso.

### Verifica disponibile, non certificazione della futura release

Base funzionale verificata: `9e958c59ad40a059ea8ac31cd404435342780459`.
La [CI di questo commit](https://github.com/rosariomoscato/droidsembly/actions/runs/45120840136)
ha superato typecheck, test, build e smoke pacchetto sui cinque ambienti.
La precedente suite locale completa riportava 330 file / 3655 test passati.
Questi risultati non cancellano i follow-up negativi né verificano ancora
un artefatto npm beta.2, che non esiste alla data della preparazione.
La CI del candidato successivo `786508c`, riportata in apertura, verifica
anche bump, scansione a blocchi e diario incrementale. Non cancella il
fallimento dell'ultima suite locale completa né sostituisce la revisione.

## English

Reliability-focused beta candidate: failed terminal saves remain retryable,
periodic state writes are coalesced under slow I/O, maintenance timers stop
during shutdown, fake demo sessions stop on release, and existing local
branches can be recovered without fetching.

No experimental graphics optimization is included. Issues #39 and #42 remain
open in monitoring; #109 is still unresolved. Neither normal-use 3D smoothness
nor universal scale stability is established. Both the functional base and
candidate application code `786508c` have successful five-environment CI.
The subsequent local full suite, typecheck, build and smoke passed with safe
fixture observations. Review and PR CI remain pending; no beta.2 npm
publication or permanent resolution of historical intermittence is implied.

## Distribution proposal / Proposta distribuzione

Under the existing rules, `0.5.0-beta.2` targets npm **`next`** and remains a
GitHub prerelease. `latest` stays on beta.1. This is a proposal, not approval.
The beta.1-specific public-beta exception does not apply to beta.2.
No automatic PC update or channel alignment is included.
See [the preparation checklist](RELEASE_CHECKLIST_0.5.0-beta.2.md).
