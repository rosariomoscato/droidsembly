# Client secret-policy scan stability / Stabilità del controllo sorgenti client

## Scope

Focused test-only branch from unchanged `dev`7ef926a, not either dependency candidate. No dependency/runtime/launcher/data/i18n/license/Release change. The original notifier policy remains: inspect the same case-sensitive `.ts/.tsx/.js/.html/.json/.webmanifest` paths under client/, including hidden/untracked files, reject the same `secrets.json`, `push.json` and relative single-quoted server-import regexp, require more than20files, keep the default5-second timeout. No sampled/subset scan or source-content caching.

The new helper uses recursive Dirent enumeration and reads at most8files concurrently, then directly checks the unchanged non-global regexp. Matcher diagnostics are aggregated as violating file paths instead of constructing one successful matcher per complete file string. All reads in a started batch settle before a read error is rethrown; missing roots/read failures fail closed. These changes jointly reduce driver cost; the evidence does not isolate which part contributed how much.

Future symbolic links cause an explicit failure rather than silently excluding linked source or traversing external trees. This is a deliberately stricter test-tree policy, not exact equivalence for linked trees; the actual current client tree contains no links. There is no global asynchronous I/O or Vitest timeout/configuration adjustment.

## Evidence — 5 November 2026

- Both separately prepared dependency candidates had the unchanged notifier browser-secret scan timeout: production2708pass/1fail (scan7,488ms), development2703pass/1fail (scan7,714ms). They remain held; this does not authorize dismissing those failures.
- An initial coarse enumeration/read diagnostic timed out30seconds while other setup was active, yielding no final timing data. It is not a controlled benchmark or proof of root cause. A separate Dirent-only diagnostic counted635entries/612files/0symlinks in177.4ms, also during setup; not used as an acceptance bound.
- After setup jobs completed, the **unmodified notifier test** on this original-dependency branch reproduced the failure: **8/9passed,1timeout**, scan7,270ms, report`notifier-policy-original-baseline.json`.
- New helper fault/equivalence tests9/9passed, including all four forbidden forms, exact legacy extension selection with hidden/untracked fixture files, multiple batch boundaries, fresh reads, missing roots/read errors and own-fixture junction rejection. Original protected-field rules were not relaxed.
- Updated notifier9/9 + helper9/9: **18/18passed**, actual client scan320ms, report`notifier-policy-updated.json`; typecheck passed. This paired observation is not a randomized performance guarantee or proof of permanent stability.
- Independent actual-tree coverage comparison confirms **the same586paths**, no violations, filename-list SHA256`0c576cc84f13ea387bd2f86c6e8fc0c6e87827af17069001d54c9707ba3c4046`, report`notifier-policy-file-coverage.json`. The list was compared against the original recursive string-enumeration/extension filter, not a git-tracked subset. No source contents are copied into diagnostic evidence.
- Full serial suite **passed2,696/2,696tests,256/256files,635.71seconds,exit0** (`notifier-policy-full-suite.json`); all9notifier tests passed (whole file702ms) and all9new coverage tests passed. Walkway batches[3.9211,3.7000,3.3066,4.3295,3.3747]ms,median3.7000,original<8ms unchanged. Typecheck/build and installed-package demo smoke also passed: CLI/help,93license texts,2floors/11agents,isolated persisted demo state. Existing Rapier/Three/chunk warnings remain. Ordinary four-OS CI still required before integration. No previous exception, timeout increase or retry-until-green policy.

This subtask addresses only the common scan-timeout blocker. It does **not** claim to fix the separate earlier push-device persistence race, temporary state/journal rename warnings, or arbitrary-load walkway timing. Point1 dependency candidates must later be revalidated with this change if accepted; point3 beta/release preparation has not started.

## Italiano

Controllo di sicurezza conservato su tutti gli stessi586file reali, senza aumentare i5secondi. Nuovo driver con Dirent, letture asincrone limitate a8 e diagnostica dei file in violazione; errori di lettura e link falliscono in modo esplicito. Baseline invariata riproduce il timeout; dopo la modifica passano18test mirati e typecheck, scansione320ms. Suite completa ora verde**2696/2696**,build e smoke passati; CI ancora da verificare. Conservate prove di equivalenza/copertura e tutti i fallimenti precedenti; nessuna risoluzione dichiarata per le altre instabilità o integrazione delle dipendenze sospese.
