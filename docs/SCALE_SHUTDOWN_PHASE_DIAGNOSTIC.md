# Issue42 diagnostic only / Solo diagnostica issue42

Publication remains blocked by[issue42](https://github.com/rosariomoscato/droidsembly/issues/42):main296b0ceCI42033638748 exceeded unchanged10s scaleafterAll onWindowsNode22,despite2762bodyassertionspassing. Failedjobbuild/smokedidnotrun. EarliergreenPR/localdemodoesnotwaivethisresult.

This candidate changes ONLY test instrumentation:pass-through begin/settled logs for state,journal,CLIrelease,terminalsave andpreviewstop;counts of existing per-terminal queue-prefix promises observed at teardown and settled by each boundary. Counts do not represent all later queued work or successful writes;underlying warningguard still rejects persistence errors. No paths,terminaltext orcredentialslogged. No production code,clock algorithm,assertion,sample,workload orbudgetchanges.

Local original-driver phase observation passedtypecheck8/8cases:state349ms,journal169ms,CLIs2ms,terminals3619ms,previews2ms,finalstate171ms,totalshutdown4350ms/teardown4974ms. This identifies the dominant phase in one passing local run,NOT the failedWindowsCIphase.

A separately preserved **unpublished/held** I/O-turn drain experiment(b4bd41b,branchfix/scale-shutdown-drain) passed14helpertests and21scale/compatibilitycases,but realteardown5075ms showed no materialgain over4974ms. Synthetic151-parser/nativeI/O-turn model improved696ms→16.5ms,but that was not actualfilesystem workload or rootcauseproof. CPU/spin risk unmeasured. Therefore the experimental helper is **excluded** from this diagnostic candidate,not shipped as a speculative fix.

Fresh ordinary fullCI on this diagnostic head is for collecting realenvironmentphase/queuecontext,not an unchanged retryuntilgreen. Ifitpasseswithoutreproducing,reportnonreproduction;doNOTclaimissue42fixedorautomaticallymerge/publish. Ifitfails,preserveallphaseboundaries/counts andmeasuretheunfinishedoperation beforecorrection. Original10shook/5sparser/full10×15office/snapshot/trafficbudgetsremainintact. Source/pathissue39alsoOPEN.

Italiano: misure interne dello shutdown sui runner,senza cambiare comportamento o limiti. Esperimento alternativo sospeso per assenza di miglioramento reale;non incluso. Qualsiasi CI verde qui non chiude automaticamente il blocco né autorizza pubblicazione/merge.
