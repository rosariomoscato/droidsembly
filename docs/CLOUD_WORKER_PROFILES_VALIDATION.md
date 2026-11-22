# Cloud worker profiles — verification

Branch: `feat/cloud-worker-profiles`, based on `dev` after PR #98.
Profile prompt/schema version: **1**. No npm version or license change.

## Scope verified

- Generic remains the default for existing and new workers.
- Review and Vercel profiles are cloud-only manual work configurations; they
  cannot take ordinary issue/QA/fix assignments automatically.
- Profile changes require a cleared, settled desk, retain the Box/login, and
  explicitly clear profile/report metadata in client patches.
- Review and preflight prepare a non-destructive task branch without dependency
  installation or project scripts. The actual SHA/branch/cleanliness is checked
  outside the AI session.
- Deployment requires compatible structured preflight output and exact-plan
  consent. Production and resource/cost consent are separate. The checkout and
  effective CLI/model/effort/runtime are rechecked, including after startup/auth
  waits.
- Stale/repeated consent, changed checkout/selection, stop/clear and empty or
  malformed reports cannot authorize another deployment.
- Deployment authentication failure does not automatically retry external work.
  Restart may reattach an existing CLI, but does not create a new profile session;
  the watchdog does not send profile follow-ups.
- Reports are read on demand, not included in full in world snapshots.
- Demo sessions explicitly describe their evidence and URLs as synthetic.

## Automated verification history

- Build/typecheck passed, with the existing large-chunk and Rapier dynamic-import
  warnings.
- Initial focused set: **109/109 passed**, 11 files.
- Later focused set covering the profile lifecycle, input/consent rules, generated
  preparation script, UI/Pocket actions and Italian coverage: **39/39 passed**,
  seven files. Further hardening includes a no-report regression.
- First full run: **3609 passed, 12 failed**, with two suite-level cleanup/hook
  failures. Failures included timeouts in CLI/exec/workspace/resume/scale and an
  Italian message missing from that run's loaded dictionary. No timeouts or
  assertions were relaxed; the later targeted Italian check passed.
- Second full run: **3621 passed, 1 failed**, 325 files. The only failure was the
  120-second body timeout in `server/scale.test.ts`; its shutdown/cleanup finished.
  This is not a passing scale result and does not establish the cause.
- Isolated candidate scale run also timed out at 120 seconds; cleanup finished.
- Control comparison: the **unchanged `dev` commit
  `3b8abe739ce2f33f36d8e9cd663be7ce9bd2c405`** was checked out in a separate
  temporary worktree and ran the same isolated scale command with the same
  installed dependencies (a directory junction, no installation). It also timed
  out at 120 seconds. This establishes that the timeout is reproducible without
  the profile changes in these local conditions; it does not prove equivalent
  performance or exclude all candidate regressions.

### Final result

With the implementation frozen and no demo/browser running,
`npm test -- --maxWorkers=2` passed: **325/325 files, 3624/3624 tests**,
727.57 seconds. This includes the final no-report, pre-launch checkout recheck
and Pocket action regressions, and the unchanged scale test/budgets.

The final build (including typecheck) also passed. Earlier failed runs remain
part of the evidence: this successful rerun is **not** a claim that the
intermittent timeouts are fixed or that their cause is established.

## Browser verification

Local compiled demo only, loopback port **4498**, preview base **9498**, isolated
homes under the approved session temporary directory:

- `ds-profiles-demo-20261121`
- `ds-profiles-final-demo-20261121`

The banners reported DEMO MODE and state paths inside these homes. All Box,
GitHub, authentication, AI and Vercel activity was synthetic. Demo processes were
stopped and the Playwright browser was closed afterwards.

Observed using the real UI:

- Cloud hiring exposes Generic (selected by default), Review and Deploy choices.
- The synthetic provider sign-in completes in the worker terminal.
- Preflight reaches awaiting approval without deploying.
- Cancelling the deployment confirmation leaves the plan awaiting approval.
- Approving a demo preview produces an explicitly synthetic deployment report.
- Production approval stays disabled until its separate checkbox is selected;
  no production deployment was executed.
- Clear desk invalidates consent. Changing Review/Deploy clears the previous
  report without reloading or recreating the Box.
- Switching back to Generic returns the worker to ordinary scheduling.
- Pocket runs a review and displays all four report sections.
- Pocket Setup/appearance preview works without first loading the 3D office.

Two supporting UI defects were found and addressed: early model/variant queries
while a Box was still setting up, and missing three.js object registration in
the standalone Pocket appearance preview. The final Pocket verification reported
**zero console errors** (one warning), unlike the earlier exploratory session.

Screenshots:

- [Hiring, English](screenshots/profiles-hiring-en.png)
- [Preview plan approval, English](screenshots/profiles-preview-approval-en.png)
- [Review report, Italian](screenshots/profiles-review-it.png)
- [Production consent, Italian](screenshots/profiles-production-consent-it.png)

### Manager-led demo follow-up (22 November 2026)

The manager exercised the isolated Italian demo: cloud profile selection, fake
OpenCode login, the four-section review report, same-Box profile changes,
preflight without deployment, cancelling and approving preview consent, the
separate production checkbox, and clearing the desk to revoke approval. All
external activity remained simulated; the demo was stopped afterwards.

The idle badge inherited light panel-heading text on a light grey background.
Status badges now explicitly use the existing dark ink colour. The focused
contrast/palette/HUD tests passed (25 tests), as did build/typecheck. Browser
computed styles confirmed dark `rgb(31, 29, 43)` text on `rgb(233, 236, 239)`
for the idle badge. No new screenshot was captured: the screenshot tool required
a visible desktop window.

Release-preparation revalidation of `2e7b720` on 22 November did **not** pass:
`npm test -- --maxWorkers=2` reported 323 passed / 3 failed files and
3622 passed / 7 failed tests (1028.06 seconds). Failures were six 15-second
timeouts in the real throwaway-Git cases in `resumeDesk.test.ts` and
`resumeReviewRegression.test.ts`, plus the five-second offline subprocess test
in `npmPublicationCli.test.ts`. No assertion mismatch was reported for those
seven cases; timeout cause remains unestablished. The earlier successful run
does not supersede this result. Publication is blocked pending investigation.

A separate, single-worker subprocess-timing diagnostic also failed: 15 tests
passed / 4 timed out, plus a cleanup-hook timeout (182.78 seconds). The observed
slow calls included Git worktree creation (11.877 seconds), a local Git push
(4.150 seconds), rev-parse (3.832 seconds), and an offline Node CLI (9.286
seconds). The observer itself adds I/O; these observations do not establish
the cause of the uninstrumented failures. A host CPU snapshot showed other
active applications and antivirus work, not proof of causation. No external
application was stopped and no antivirus settings were changed.

After closing the agent-owned browser tabs, the uninstrumented full suite with
one worker (`npm test -- --maxWorkers=1`) passed: **326 files, 3629 tests**,
1418.10 seconds. This validates the feature plus badge correction; it neither
erases the failed runs nor establishes their cause. Release checks remain
separate.

## Limits and assumptions

No real Upstash Box, coding-provider session, Vercel account, provisioning,
payments, DNS, migrations or production promotion was exercised. Generated Box
script checks and a fake backend are not real cloud validation.

The four review lenses implement the stated requirements; no separate review
skill URL was supplied. Deployment is inspired by the linked Deploy an App
workflow, not a runtime download of that skill.

The target is the remote default branch at task start, pinned to its observed
SHA. Arbitrary revision selection, automatic compatibility fixes, report
archiving and custom Box snapshots are not included.

The office implements explicit workflow/lifecycle gates, not a CLI sandbox or
provider-side permissions. Reported review/deployment evidence is still an agent
report, not independent certification. Existing CLI/account access remains the
manager's responsibility.

No live office, default profile/home, protected ports 4317/5317, global
installation, credentials, release channels or MIT license was changed. The
preexisting local `CLAUDE.md` edits are preserved and excluded from this work.
`test:e2e` was not run; interactive Playwright checks above are separate.
