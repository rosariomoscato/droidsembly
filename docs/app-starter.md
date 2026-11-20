# New application planning (A5)

This feature is in the development sources, **not in the published beta.5**.
It applies only to **Something new → Create project**, with CEO intervention on.
Existing repositories and new projects with CEO intervention off keep their old
behavior. The initial folder, Git, README and remote repository are still created
by that explicit button; that does not mean the application has been built.

## Interview → review → approval → normal work

1. Open Chat in the phone, manager console or Pocket. Select the project's
   **New app plan** conversation, not the company-wide chat. An empty brief is OK.
2. Answer the CEO's focused questions. Requirements, users, ownership, data model,
   MVP/exclusions, stack alternatives and visual design are saved per project.
   Never paste credentials, connection strings, private records or database dumps.
3. Before recommending a database the CEO asks where workers, tests/previews and
   the deployed app will run, and about sample/existing data and transferability.
4. Read the **complete proposed plan**, including every task and dependency.
   **Modify plan** invalidates the old revision immediately. You can also answer
   with a requested change. An ordinary “yes” never authorizes publication.
5. Confirm you have read the plan and agreed the environments (including isolation
   of migrations/tests from production). For non-transferable local data, also
   explicitly confirm local workers and keeping the computer on.
6. Use **Approve plan and create issues**. It identifies the project, draft,
   revision and SHA-256 fingerprint you saw. Stale or duplicate approvals fail.

No project worker, Box, issue from the plan or preview is prepared before the
gate. Company chat, generic CEO tools, onboarding, periodic reviews and manual
issue creation do not bypass the hold. Other projects are unaffected. These are
application workflow checks, not new agent sandboxes, hooks or CLI permission rules.
Agents remain ordinary unsandboxed sessions under the manager's own setup.

Once all issues and dependencies are confirmed, normal build/QA/fix scheduling
takes over. Current auto-assign and auto-merge settings are respected, **not reset**.
With auto-assign on this may start paid AI work and use approved team Box resources.
Approval does not authorize paid accounts, database provisioning, deploys or
real-data transfers. The CEO plans; ordinary workers execute the approved tasks.

## Database and Box FAQ

- **SQLite needs local workers?** No. Each Box can have a separate SQLite file
  generated from synthetic seed data. Do not commit real database files.
- **Docker means local workers?** No. The plan must specify where Docker will be
  available and how each worker/test/preview gets an isolated database. Choosing
  Docker does not prove it is installed or running; workers must verify it.
- **Neon required?** No. It is one possible hosted Postgres recommendation.
  Use the stack and host that meet the agreed requirements.
- **Existing data cannot leave this PC?** Explain the constraint and explicitly
  choose local workers; the computer needs to remain available. Never silently
  route to Boxes. Host mismatches hold work; sessions/worktrees are not migrated.
- **Existing data with Box workers?** Propose approved anonymized copies or a
  safely reachable service, distinguishing read-only consultation from disposable
  development/migration databases. Never publicly expose a local database or use
  production as a shared test lab.
- **SQLite now, Postgres later?** This may need code changes and tested migrations,
  not just a new environment variable. Include that work in the plan when relevant.

## Restart, partial publishing and reconciliation

The transcript and plan are durable project state, not the last CLI conversation.
Claude SDK, local Claude Code and local OpenCode use the same conditional local
instructions without changing providers. Workers never receive this CEO skill.
No runtime download or global skill installation is involved. The resource is
original; see [provenance and reuse decision](app-starter-provenance.md).

The publisher uses the approved tasks directly; it does not ask an AI to rewrite
them. A ledger records pending → in-flight → confirmed, or unknown on ambiguous
failure. Each issue carries a stable HTML marker for that draft/revision/task.
Dependencies are resolved by confirmed task IDs before creating dependent issues.
Remote content and dependencies are checked before releasing normal scheduling.

- **Pause** stops subsequent actions; it cannot undo a GitHub request already in
  flight. Created issues and ledger entries are kept.
- **Cancel** leaves the project held and retains its issues; it does not delete
  remote issues or silently switch to the unguided workflow. Cancellation is final.
- An interrupted publisher restarts **paused**, never blindly publishing on boot.
  **Resume / reconcile** checks all GitHub issue states via paginated reads, not
  search-index timing, and continues only from confirmed/pending entries.
- A lost response can be reconciled if exactly one marker with matching approved
  title/body exists. Missing, duplicate or edited marked issues keep the project
  paused. Inspect the ledger and remote issues; do not blindly click “create again”
  or delete duplicates. This version does not offer an automatic override for
  unknown outcomes: manual resolution needs an explicit operator decision.
- This is **not absolute exactly-once**: GitHub creation and local persistence are
  not a distributed transaction. External edits/deletes after verification remain
  possible. Do not let a second office share the same state home.
- If the agreed worker host lacks resources or a compatible local CLI, setup
  waits with an explanation. Configure those resources and hire a compatible
  worker; there is no fallback to a different host.

Secret-paste checks are heuristic, not a guarantee that arbitrary free text
contains no secret. Do not supply real data. Demo and fake-backend tests validate
workflow, not real database isolation, Docker, cloud provider availability or deploys.
