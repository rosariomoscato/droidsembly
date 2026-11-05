# Source-policy I/O follow-up / Verifica I/O controllo sorgenti

## Why a follow-up is necessary

PR33's Dirent/async-batch implementation passed its recorded full validation and four-OS CI, but did not guarantee stability under every host condition. Later unchanged dev092d9ad baseline timed out at5043ms, and the separate push-completion candidate at5036ms. Reports `push-persistence-original-baseline.json` and `push-completion-targeted-after.json` retain both failures. Neither is waived by earlier successes. Push completion remains on a held independent branch; this branch contains no push-runtime changes.

## Investigation and candidate

Read-only phase probe of the existing async driver:586files,4,211,915bytes,enumeration74.3ms,total7320.7ms,aggregate regexp work28.1ms,max single read151.6ms (`scan-io-original-phase-probe.json`). A subsequent synchronous Dirent/read probe took596.7ms,including enumeration127.7ms (`scan-io-sync-phase-probe.json`). Order/cache effects are uncontrolled; these figures suggest I/O driver overhead, not proof of a particular OS/root cause or a guarantee under arbitrary load.

Candidate preserves Dirent enumeration but reads one file at a time synchronously. This helper is test-only,not a server request-path change. Its Promise API and error rejection remain; no read remains outstanding after completion/failure. It deliberately blocks the test worker while scanning. The notifier test now also asserts measured elapsed time<5000ms so blocking synchronous work cannot hide behind the asynchronous timeout. The original default5-second timeout stays in place. No timing budget, sample or assertion is relaxed.

Same extension regexp,forbidden regexp,actual hidden/untracked files,no content cache/no git-index subset,files.length>20,aggregated violations and fail-closed symlink/read-error policies. Existing9fault/equivalence unit cases are unchanged. Independent comparison confirms exactly the legacy586paths,zero violations,filename-list SHA256 `0c576cc84f13ea387bd2f86c6e8fc0c6e87827af17069001d54c9707ba3c4046` (`scan-io-file-coverage.json`). This proves path coverage on this tree,not general performance stability.

## Validation status

Independent clean npm ci passed354packages. All notifier9+helper9tests **passed18/18**,no filtering or skips (`scan-io-targeted-after.json`); source scan663ms passed the explicit elapsed<5000ms assertion. Typecheck also passed. This is targeted evidence,not a guarantee of universal host-load stability. Complete serial suite/build/installed-package smoke are now running; ordinary Ubuntu/Windows/macOS Intel/native ARM CI still required before integration. Historical negative evidence and PR33 validation document remain unchanged. No release,version,dependency,launcher,MIT attribution,i18n or real installation/data changes.

## Full local outcome and unresolved diagnostic

Complete local serial suite **passed2,735/2,735tests,259/259files,949.19seconds** (`scan-io-full-suite.json`). Source scan870ms passed both explicit<5000ms and the unchanged timeout. Walkway batches[7.7846,6.7686,5.8687,5.5266,5.4815]ms,median5.8687ms,original<8ms assertion passed. Build/typecheck and installed-package demo smoke passed:CLI/help,93bundled license texts,2floors/11agents,isolated persisted demo state. Ordinary four-OS CI still required.

The run also emitted **could not save the state: ENOENT renaming state.json.tmp→state.json**, during the CEO-runtime switch test. This is retained evidence of the separately open temporary-write/lifecycle issue,not dismissed as harmless and not fixed by this scanner-only branch. Test assertions passing does not certify successful persistence in that case or complete point2. Existing Rapier/Three/chunk warnings remain. No unchanged-code retries or test exceptions applied.

## Italiano

Il driver precedente torna a scadere: conservati i fallimenti,nessuna deroga. Variante solo per i test,con Dirent e letture sincrone una alla volta,stessi586file e regole. Aggiunta anche misura esplicita<5secondi,oltre al timeout invariato,per non aggirare il limite bloccando il timer. Suite2735/2735,build/smoke verdi,CI ancora necessaria. Rimane aperto l'errore ENOENT sul salvataggio dello stato osservato nella suite; questa modifica non lo risolve. La modifica push resta separata e sospesa.
