# Beta.2 preparation validation / Verifiche preparazione beta.2

## Scope and authorization / Ambito e autorizzazione

Owner authorized preparation of `0.4.0-beta.2` from `dev5e15a875037535c7c8d23836db216b73067daa1a`,with a protected PR to dev and package/CI checks. **Not publication authorization.** No main promotion,release tag,Release workflow,OIDC configuration,dist-tag change,website deployment or real-installation/data update.

Only package.json version and the two root package-lock versions change;deep structural comparison against the base after normalizing those version fields confirms dependencies/other metadata unchanged. publishConfig remains `next`. Added one distribution regression for beta.2's own tag,next channel,upgrade from beta.1 and rejection of the stale beta.1 tag. IT/EN notes explicitly retain open timing issue[#39](https://github.com/rosariomoscato/droidsembly/issues/39).

## Local evidence / Evidenze locali

- Fresh installation in a separate temporary worktree:354packages added,355audited,zero vulnerabilities at installation. No original-checkout node_modules junction used.
- Read-only release-metadata validator passed with the proposed matching tag,reporting0.4.0-beta.2/next. This does not create a tag.
- Typecheck and **36/36tests,four files**,6.85s passed:distribution5,build-licenses3,officeSteps19,config9 (`beta2-preparation-targeted.json`). No skips or weakened assertions.
- Production build passed;retained warnings for large chunks and ineffective Rapier dynamic import. No warning threshold changed.
- Actual packed/installed package smoke passed:version/help0.4.0-beta.2,93license texts,isolated demo state/workspaces/client. No real office,credentials or paid provider used.
- Pack dry run (`--ignore-scripts`,not publish):99files,3258784packedbytes,10037278unpackedbytes;MIT,Sora/OFL,clientlicense metadata/texts,CLI andserver entry present. No matched.env/node_modules/state/secrets/push paths. This filename check is not a universal content-secret audit.
- Read-only registry snapshot:beta.2 not published;next/latest still0.4.0-beta.1 (`beta2-registry-status.json`). Availability must be checked again at actual publication time.

Reports named above are retained session-local evidence,not public attachments. Base-commit full CI passes are historical,not a substitute for new candidate CI.

## Pending / Da completare

Fresh ordinary complete CI on this candidate is required:branchpolicy,Ubuntu,Windows,macOS Intel,macOS nativeARM and additionalWindows/Node22;typecheck/fullsuite/build/installedsmoke with log review. The preparation PR remains draft pending that evidence. Do not rerun unchanged failures until green or weaken the existing scanner/path/scale budgets.

After validation,review final IT/EN notes and known risk. Integration of this version-preparation PR and any main promotion/publication remain separate decisions;preparing beta.2 does not update the already published beta.1.

## Italiano

Preparazione isolata della candidata beta.2:versione/lock coerenti,dipendenze invariate,note IT/EN e issue39 ancora aperta. Typecheck,36test mirati,build,smoke installato e verifica contenuti del pacchetto superati;serve nuova CI completa sul commit della candidata. Nessuna pubblicazione,tag,promozione main,OIDC o modifica dell'installazione reale autorizzati/eseguiti.
