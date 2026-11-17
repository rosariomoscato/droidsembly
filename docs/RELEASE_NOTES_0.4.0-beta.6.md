# Droidsembly 0.4.0-beta.6 — candidata / candidate

## Italiano

### Stato e identità

**Non pubblicata.** Preparazione per il canale `next`, non una stabile.
Al controllo del 17 novembre 2026 npm pubblica beta.5 su `next` e beta.1 su
`latest`; beta.6 e il suo tag non esistono ancora. Beta.5 resta immutabile sul tag
`droidsembly-v0.4.0-beta.5`, commit `8e887aa63cc4eac22b791aab48c47882b01fe1ec`.
Base aggiornata: dev `e56a5728d4f5a1f923c5a1ed6cb6d8649c14d1c9`, che include
la diagnostica timeout #87. Le funzionalità precedenti erano già promosse in
main `bebdfc78f8955b7ec93d437c01878f7cf60dcd0f`; la diagnostica #87 non è ancora
in main. Il vecchio head candidato `eea21c2e2de296f8d51849741b627d92a4b97094`
e le sue prove restano conservati. L'aggiornamento incorpora dev senza riscrivere
la storia; non è un retry invariato o una correzione causale di PowerShell.
Il delta di preparazione cambia solo versione coerente package/lock e documenti:
nessuna dipendenza, runtime, soglia, assertion, worker o workflow modificato.

### Novità rispetto alla beta.5 pubblicata

- **Riprendi attività** per issue interrotte prima di creare la sessione:
  riusa agente, issue e branch preparato, preservando commit, index e file locali.
  Rifiuta target obsoleti, occupati o incompatibili e non resetta checkout estranei.
- Cancellazione degli avvii superati e recupero dei desk legacy rinominati, senza
  adottare il worktree di un altro agente.
- Gli exit status CLI Box malformati non vengono più interpretati come successo.
- Hardening dei **test** launcher: processi asincroni con proprietà e cleanup
  espliciti, deadline originale comprensiva dello spawn e gestione del late close;
  diagnostica safe caricata in CI solo in caso di errore. Non è un fix dimostrato
  della causa storica degli avvii PowerShell lenti o senza output.

**Attenzione:** confermare la ripresa può avviare AI e consumare quota anche con
assegnazione automatica disabilitata. Non equivale a una demo o a un test gratuito.
La ripresa locale ha copertura sintetica e Git temporaneo reale; i controlli degli
script cloud non costituiscono una nuova validazione su Box/provider reali.

### Evidenze e limiti da conservare

- CI della **nuova base dev** post-merge #87:
  [44196557526](https://github.com/rosariomoscato/droidsembly/actions/runs/44196557526),
  attempt1 **SUCCESS sui cinque ambienti**, incluso ARM64 nativo realmente
  eseguito con typecheck, suite, build e smoke. Windows:3479/3479 test PASS
  in312 file; ARM64:3476 PASS/3 skip previsti. Non è la CI della candidata aggiornata.
- CI del **vecchio head candidato** eea21c2, PR86:
  [44180780366](https://github.com/rosariomoscato/droidsembly/actions/runs/44180780366),
  attempt1 FAILURE:WindowsNode24 ha realmente fallito il test PowerShell
  ETIMEDOUT4000ms,3467/3468 test PASS;ARM64 senza runner/zero step.
  Quel FAIL non è annullato dai verdi della diagnostica né dallo smoke locale.
  La nuova diagnostica distingue timer/late-close per eventuali nuovi errori,
  non classifica retroattivamente il vecchio caso e non ne dimostra la causa.
- CI della base main post-merge #85:
  [44096757487](https://github.com/rosariomoscato/droidsembly/actions/runs/44096757487),
  attempt1: Ubuntu, macOS Intel, Windows Node22/24 PASS con typecheck, suite,
  build e smoke. **FAILURE complessivo**: ARM64 cancellato senza runner,
  zero step; annotazioni GitHub confermano limiti di capacità hosted.
- CI propria della promozione #85:
  [44093238053](https://github.com/rosariomoscato/droidsembly/actions/runs/44093238053),
  distinta, anch'essa quattro ambienti PASS / ARM64 non eseguito.
- Mirati launcher precedenti: 42/42 PASS, due regressioni deadline RED sulla
  baseline e PASS sul candidato. Non sono nuove esecuzioni beta.6.
- **Full locale ancora NON-PASS/incompleta:** mantenuti tutti i moduli, concorrenza,
  assertion e limiti 15s/240s; il caso resumeDesk branch-held ha attraversato la
  deadline durante lo snapshot finale. Le assertion finali di preservazione non
  sono state completate. Il successivo isolato 7/7 PASS non sostituisce la full.
- FAIL storico main #81:
  [44068325618](https://github.com/rosariomoscato/droidsembly/actions/runs/44068325618),
  PowerShell ETIMEDOUT a4008ms con output vuoti; causa non dimostrata.
- Restano aperte le indagini [#39](https://github.com/rosariomoscato/droidsembly/issues/39)
  scanner/pathfinding, [#42](https://github.com/rosariomoscato/droidsembly/issues/42)
  shutdown Windows e i rischi PowerShell/PTY/readiness. Verdi successivi non ne
  dimostrano la causa né la risoluzione. Nessun nuovo cap agenti o Codex CEO.

La candidata richiede **propri esiti** di metadati, typecheck, build, tarball
esatto/smoke, CI e review: queste note non li anticipano come PASS.
Gli esiti e il tarball del vecchio head sono fotografie precedenti, non
certificazione dei nuovi byte. Il consenso attuale copre aggiornamento e una
sola CI propria della nuova candidata, non merge o pubblicazione.
Non viene ripetuta la full locale invariata né avviato un retry ARM64 automatico.
I due gap sono stati accettati separatamente per dev e main, **non ancora per
pubblicare questa release**. Anche il consenso ai rischi beta.5 non si trasferisce.
Un nuovo FAIL eseguito della candidata va valutato a sé, non coperto da quei gap.

### Consegna separata

Preparazione non significa merge, tag o pubblicazione. Prima di pubblicare servono
review della candidata esatta, decisione release-specifica sui limiti, integrazione
approvata in main, tag nuovo immutabile e autorizzazione al workflow Release.
Quel workflow verifica tre sistemi e poi pubblica automaticamente; non usarlo
come semplice prova. `latest` non va modificato implicitamente.
L'aggiornamento PC richiede un mandato distinto, installazione isolata verificata,
arresto controllato e backup recuperabile del profilo fermo. Non avviare due
uffici sulla stessa home e non sovrascrivere dati recenti per un rollback.
Vedi [pubblicazione](NPM_RELEASE.md), [PC](QUICKSTART_PC.md) e
[boundary test launcher](LAUNCHER_PROBE_PROCESS_BOUNDARY.md).

## English

### Status and identity

**Not published.** Candidate for `next`, not a stable release. On November 17, 2026,
npm still serves beta.5 on `next` and beta.1 on `latest`; beta.6 and its tag do
not yet exist. Beta.5's tag and artifact remain immutable at commit
`8e887aa63cc4eac22b791aab48c47882b01fe1ec`.
Updated base: dev `e56a5728d4f5a1f923c5a1ed6cb6d8649c14d1c9`, including PR87's
timeout-provenance diagnostics. Earlier functional changes are already in main
`bebdfc78f8955b7ec93d437c01878f7cf60dcd0f`, but PR87 is not yet in main.
Old candidate head `eea21c2e2de296f8d51849741b627d92a4b97094` and its evidence
are retained. Refresh merges dev without rewriting history; it is neither an
unchanged retry nor a demonstrated causal PowerShell fix.
Preparation changes only consistent package/lock versions and documentation,
not dependencies, runtime, thresholds, assertions, workers or workflows.

### Changes since published beta.5

- **Resume task** recovers an issue interrupted before its coding session,
  preserving the same agent, issue, prepared branch, commits, index and files.
  Stale, busy or incompatible targets are refused, not reset.
- Cancelled startups cannot later start a replacement task; renamed legacy
  desks are recovered without adopting another agent's worktree.
- Malformed Box CLI exit statuses are no longer treated as success.
- Launcher **test** hardening: owned asynchronous processes, awaited cleanup,
  original deadline including spawn and late-close handling, and safe failure-only
  CI diagnostics. This is not a demonstrated cure for historical PowerShell startup.

Confirming resume may start AI work and consume quota even with automatic
assignment disabled. Local recovery has synthetic and real throwaway-Git coverage;
cloud script checks are not new real Box/provider validation.

### Evidence, gaps and delivery boundaries

New base dev post-merge87 CI44196557526 attempt1 **passed all five environments**,
including actually executed native ARM64 typecheck/tests/build/smoke.
Windows passed3479/3479tests in312files;ARM64 passed3476 with3expected platform
skips. This is base validation,not the refreshed candidate's own CI.

Old candidate eea21c2 PR86 CI44180780366 attempt1 remains FAILURE:a real Windows
Node24 PowerShell ETIMEDOUT4000ms,3467/3468testsPASS,plus ARM64 no runner/zero
steps. Diagnostic greens and the local smoke do not erase it. The new schema can
distinguish timer/late-close on future failures,not classify that old case or
prove its cause. Previous tarballs/checks certify only their old snapshots.

Main post-merge #85 CI44096757487 attempt1 passed Ubuntu, macOS Intel and Windows
Node22/24 typecheck/full tests/build/smoke, but concluded **FAILURE** overall:
ARM64 was cancelled with no runner and zero steps; hosted capacity annotations
confirm no test ran there. PR85 CI44093238053 is distinct with the same four-pass /
ARM64-unexecuted outcome. Earlier launcher focused checks passed42/42, with two
deadline regressions RED on baseline and PASS on the candidate; not new beta.6 runs.

The local full suite remains **NON-PASS/incomplete**, retaining all modules,
concurrency, assertions and15s/240s bounds. The resumeDesk branch-held case crossed
the deadline in its final preservation snapshot; final assertions did not finish.
An isolated7/7PASS does not replace full-load certification. Main81 CI44068325618's
real PowerShell ETIMEDOUT4008ms with empty output remains unexplained.
Issues #39/#42 and PowerShell/PTY/readiness risks remain open; subsequent greens
prove neither their historical cause nor resolution. No Codex CEO or new agent cap.

This candidate needs its **own** metadata/typecheck/build/exact-tarball smoke,
CI and review results. None is predeclared PASS here. No unchanged local full
rerun or automatic ARM64 retry is part of preparation. Dev/main gap acceptance
does not authorize publication; beta.5 risk acceptance does not transfer either.
New executed candidate failures require separate assessment.
Current consent covers the refresh and one own CI of the updated candidate,
not merge or publication.

Preparation is not merge, tagging, publication or installation. Publication needs
exact-candidate review, release-specific gap/risk decisions, approved main integration,
a new immutable tag and explicit Release authorization. Release checks three OSes
and then automatically publishes; it is not verify-only. Keep `latest` unchanged.
PC updates require separate approval, isolated package validation, graceful stop,
recoverable stopped-profile backup and preserved rollback material. Never run two
offices on one home or overwrite newer profile data blindly.
