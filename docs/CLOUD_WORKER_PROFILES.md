# Cloud worker profiles

Cloud workers have a **Work profile**, independent of Claude Code, Codex or
OpenCode and the selected model:

- **Generic worker** (default, also for existing offices): the ordinary issue,
  QA and fix workflow.
- **Application review**: a manually started application-level review, separate
  from PR QA.
- **Vercel deployment**: a manually started preflight, followed by approval of
  its exact deployment plan.

These are changeable work configurations, not permanent agent roles. All workers
use the same Box preparation and their own coding-agent login. Droidsembly does
not create, clone or restore custom Upstash snapshots for these profiles.

## Choose a profile

In the manager's **Team → + Agent**, choose **Works on → Upstash Box**, then
**Work profile**. Hiring approvals offer the same choice. Generic remains the
default. Creating a worker provisions its machine as usual, **not** a review or
deployment.

An existing cloud worker's **Setup** has the same selector. Finish or stop their
work, wait for cleanup, then **Clear desk** before changing profile. This keeps
the same Box and its logins, but clears the old task/report and conversation.
Switch back to Generic before moving the worker to the local computer.

Review and Deploy workers do not take automatic issues, PR QA or fixes; direct
issue/QA assignment is refused too. Select Generic to return them to that pool.
They still count towards floor seats, team size and the account's Box limit.
Profiles are currently available only on Upstash Boxes; the CEO remains local.

## Start a manual task

Open the worker's terminal and use its profile panel:

1. Describe the task, scope and intended app. For deployment, name the intended
   Vercel account/team/project and whether it already exists.
2. Optionally supply approved requirements/a baseline and an application URL.
   Without a baseline, drift is explicitly unverified. URLs may not include
   credentials, query strings or fragments. **Never paste secrets here.**
3. For Vercel, choose Preview (default) or Production.
4. Confirm **Start profile task**. This wakes the Box and can consume AI quota.

The office prepares a fresh task branch from the **current remote default
branch**, records its actual Git SHA and checks that the worktree is clean.
Preparation does not install dependencies or run project scripts. Existing dirty,
foreign or conflicting worktrees are refused, not reset/cleaned/deleted; ignored
files are not deliberately removed. This is not an arbitrary branch/PR selector.

Profiles respect existing capacity, provider-quota, cloud-pause and coding-agent
authentication gates. They need their Box's own login just like generic workers.

## Application review

The versioned prompt asks for four lenses:

- Features/user journeys against the supplied requirements.
- Drift against the approved baseline, without inventing requirements.
- Security: authentication/authorization, exposure of secrets, dependencies and
  configuration.
- SEO/GEO: indexing, canonical URLs, metadata, structured data and clarity of
  content for search and AI discovery. No ranking/citation guarantees.

Each finding should include severity, evidence, impact and recommended
follow-up. The workflow is read-only by instruction: no source changes, project
scripts, dependency installation, automatic fixes, issue/PR publication or
invasive tests against production. Browser checks use existing reachable URLs.
Checks requiring a build, login, special test data or other access may therefore
remain blocked/not attempted; the report must say so.

No external review skill is installed or downloaded at runtime. The initial
checklist implements these four requested lenses; no separate review skill URL
was supplied.

## Vercel: preflight, then exact-plan approval

Preflight reads the stack and deployment requirements. It must not install tools,
build, link a Vercel project, log in, deploy, provision resources or write external
configuration. It returns a structured compatibility decision and a readable
plan: intended identity/project, existing vs new site, target, actions/resources,
environment **names** and secure sources, costs/unknown costs, irreversible
operations, human-only steps, verification and rollback.

Unsupported architecture, required source changes, missing intended identity or
unclear prerequisites block approval. A missing Vercel CLI or pending official
login may be planned as an explicit post-approval step. The implementation is
inspired by [Deploy an App](https://github.com/leonvanzyl/skills/tree/main/skills/apps/deploy-an-app),
but does not download or blindly execute that skill or provision its suggested
services automatically.

Only a successfully parsed compatible plan enables **Approve and deploy**.
Approval is bound to its task ID, profile version, full plan, request, actual
commit, coding-agent/model/effort/runtime selection and target. The server checks
the worktree's actual SHA, branch and cleanliness again before starting. Stale
or repeated approval, changed selection or a changed checkout cannot launch
another deployment.

- **Preview** cannot authorize production, domains or production aliases.
- **Production** requires a separate explicit checkbox for this plan. The prompt
  requires a verified preview before promoting an existing live application.
- Plans requiring any resource creation or potential new provider charges
  require a separate resource/cost acknowledgement.

The execution session is instructed to verify the real Vercel identity/project
before making changes, stop on differences from the approved plan, use official
CLI help, and obtain secrets only from approved secure sources. The Vercel login
belongs to this Box; coding-agent authentication is not Vercel authentication.
Human-only login can require interaction in that worker's terminal/browser.

Execution must not change application source/dependencies to fix compatibility,
silently broaden provisioning, copy `.env` wholesale, suppress build failures,
enable unapproved push-to-production, or delete existing resources on failure.
It should read back the real URL/commit from Vercel and report tested/failed/
blocked/unattempted checks, resources/actions/costs and rollback instructions.
Required source changes need a separate development task and a new preflight.

**These are instructions to an ordinary unsandboxed coding-agent CLI, not a
security boundary or tool-call enforcement.** Only the explicit start/approval
and lifecycle gates are implemented in the office. A reported compatibility
decision, security finding or deployment success is an agent report, not an
independent platform/audit certification. A human can also type directly into
the terminal; profile controls do not sandbox that terminal.

## Reports, stop and restart

The current report/plan is persisted with the worker and fetched only when its
panel opens or its state changes. Normal world snapshots contain small metadata,
not the request, report or plan. Report text is bounded to 24,000 characters;
oversized/incomplete preflight output fails closed. Previous replies follow
ordinary terminal-log retention; this is not an unlimited report archive.

Stop, interruption and Clear desk invalidate pending consent. Starting a new
task replaces the current report. Switching profile clears it. Ordinary message
follow-ups cannot approve or relaunch a profile task.

The watchdog does not send automatic profile prompts. After a restart, an
already-running CLI may be reattached; the office does not launch a fresh profile
session automatically. An interrupted deployment can have made external changes:
inspect Vercel/resources before running a new preflight. Loss of coding-provider
authentication during deployment is an error, not an automatic retry after
sign-in. These workflows have no automatic missing-PR retry.

Demo mode simulates review, preflight and deployment, including synthetic URLs
and explicit "not actually verified/deployed" reports. It never calls Vercel,
creates real Boxes, provisions services or consumes AI quota.
