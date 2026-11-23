# Droidsembly 0.5.0-beta.2 — draft / bozza

**Not released. Preparation only, 23 November 2026.**
**Non pubblicata. Solo preparazione, 23 novembre 2026.**

The published package and PC installation remain `0.5.0-beta.1`.
This document does not authorize publication, tags, channel changes or a PC update.
Candidate package metadata is `0.5.0-beta.2`, targeting `next`; this is not
evidence of publication.

## Latest follow-up / Ultimo follow-up — still blocked

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
  tempi intermittenti di scansione/percorso non dichiarati risolti.
- [#42](https://github.com/rosariomoscato/droidsembly/issues/42):
  rischio scala ancora aperto. Nell'ultimo follow-up limitato Windows/Node 22,
  il workload ha superato 120 secondi, mentre la chiusura è durata circa 6,99 s.
- [#109](https://github.com/rosariomoscato/droidsembly/issues/109):
  FPS bassi osservati nel benchmark 3D. Nessuna ottimizzazione sperimentale
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

## English

Reliability-focused beta candidate: failed terminal saves remain retryable,
periodic state writes are coalesced under slow I/O, maintenance timers stop
during shutdown, fake demo sessions stop on release, and existing local
branches can be recovered without fetching.

No experimental graphics optimization is included. Issues #39, #42 and #109
remain open; neither normal-use 3D smoothness nor general scale stability is
established. The successful five-environment CI applies to the functional base
commit above, not an unpublished beta.2 artifact.

## Distribution proposal / Proposta distribuzione

Under the existing rules, `0.5.0-beta.2` targets npm **`next`** and remains a
GitHub prerelease. `latest` stays on beta.1. This is a proposal, not approval.
The beta.1-specific public-beta exception does not apply to beta.2.
No automatic PC update or channel alignment is included.
See [the preparation checklist](RELEASE_CHECKLIST_0.5.0-beta.2.md).
