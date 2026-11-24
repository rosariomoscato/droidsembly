# Droidsembly 0.5.0-beta.2 — draft / bozza

**Not released. Preparation only, updated 24 November 2026.**
**Non pubblicata. Solo preparazione, aggiornata al 24 novembre 2026.**

The published package and PC installation remain `0.5.0-beta.1`.
This document does not authorize publication, tags, channel changes or a PC update.
Candidate package metadata is `0.5.0-beta.2`, targeting `next`; this is not
evidence of publication.

## Current validation / Verifica attuale — 24 November

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
