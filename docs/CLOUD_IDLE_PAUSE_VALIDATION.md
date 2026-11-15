# Cloud idle pause: behavior and validation

## Lifecycle

The office checks for an idle pause both when a task is cleared and when the
remote CLI record disappears. A completed task may remain on the desk for the
manager to read; it is not active work once its result has been finalized.

Remote CLI termination finishes its tmux cleanup before announcing record
removal. Result finalization waits for development-server cleanup. An agent is
not paused during finalization, active work, or its sign-in operation. Pause
requests are coalesced; the guard is checked again after the asynchronous Box
lookup. A new `ensure` waits for a pending pause before waking the same resource.
A late cleanup callback cannot erase a replacement CLI record.

Setup is executed in a safely quoted child `sh -c`, isolating `set -e` and
`exit` from the SDK's command shell. Success still requires **both exit code 0
and the setup marker**. Failure diagnostics include the code and marker state;
they do not turn success-looking stdout into a successful exit.

## Evidence from the November 2026 manual trial

- The original office left an agent's Box `idle` after its task and CLI were
  cleared. Direct provider inventory confirmed that this was not merely a stale
  UI counter. Manual SDK pause succeeded on that resource.
- With the first pause patch, setup after office restart failed twice; the
  diagnostic attempt established **exit 1 with the success marker present**.
- Authorized non-writing remote probes reproduced exit 1 from direct `cmd`
  containing `set -e` and `exit 0`. The corresponding explicit child-shell
  probes returned 0 for success and 1 for failure. This isolates the observed
  interaction, not the provider's internal implementation or all shell cases.
- After the setup-shell correction, a real OpenCode worker started, completed
  development and fresh-session QA. After the manager used **Clear desk** and
  closed the terminal, a read-only provider inventory confirmed **the same Box
  was paused**, without a manual pause command. The application patch was a
  reversible local beta.4 trial, not a published release.

## Automated coverage and limits

Regression tests cover either task/CLI completion order, merge reconciliation,
completed tasks retained on the desk, pending finalization, replacement CLI
records, concurrent new work, pause failures and pause/resume serialization.
A fake-clock runtime test exercises the existing **five-minute** CLI deadline
without Clear desk. Real local shell fixtures cover initial setup, marker reuse,
failed installation and failed version verification. Installers, Git and provider
boundaries in these fixtures are synthetic; they do not make cloud or AI calls.

The real manual trial establishes the Clear desk path only. Five-minute expiry
without Clear desk, long-term paused stability, overlapping work and all restart
scenarios have **not** been exhaustively validated against the provider. Earlier
local validation failures are retained in the change record; a passing focused
run or CI does not erase them. No timeout, assertion or production workload is
relaxed to obtain a passing result.

An additional instrumented CEO-fixture run observed clone work crossing test
teardowns after the fixture home was removed. The CEO runtime tests now track
their startup/clone/onboarding work, drain it before shutdown and home removal,
and retain the fixture on drain/shutdown failure. Original assertions and
timeouts are unchanged. This fixes the observed missing test barrier; the
unexpected-directory failure from the earlier full run was not itself reproduced
by the trace, so its exact cause is not claimed as proven.
