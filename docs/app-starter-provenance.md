# A5 provenance and reuse decision

Checked 20 November 2026:

- Development base: `origin/dev`, fetched and independently checked with
  `git ls-remote`: `5d47c5029e31d73788fed271bf035ceea08467c1`.
- Dedicated branch: `feat/ceo-app-starter-20261120`. The original checkout's
  uncommitted `boxCli.ts`, `boxMachines.ts`, `swarm.ts` work is untouched.
- Conceptual reference: Leon van Zyl,
  <https://github.com/leonvanzyl/skills/tree/main/skills/apps/start-an-app>.
- Inspected upstream tree revision:
  `4204b6501704ba452424b7ed0eef64d08dd9fc84`, complete recursive tree (not truncated
  by the GitHub API). Start-app subtree `4ab26fd5826ee1eec6ae36736fa86ff5a960eb85`,
  references tree `90402decf21b1e2b703d41c5c9c2e9fafb1154d1`,
  SKILL blob `7668e1f8163131239c7179c386c2dc8de4310056`.
- README and SKILL contain no applicable redistribution license. No applicable
  license file found in the tree. Root LICENSE and GitHub license API: HTTP 404.
  This is **not proof of the absence of permission**, nor permission to copy.

The manager explicitly authorized an **original resource from the A5 requirements**
instead of a textual adaptation. `server/skills/ceo-app-starter.md` is that resource.
No upstream text or references are copied, translated, packaged or downloaded at
runtime. Attribution above identifies the conceptual reference, not a license
grant. Redistribution of upstream material remains unapproved and is not needed
by this implementation. The project's existing license applies to the new work.
