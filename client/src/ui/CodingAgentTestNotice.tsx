import { T } from '../i18n';

/** Validation scope, not an error or a restriction on the selected coding agent. */
export function CodingAgentTestNotice() {
  return <p className="muted small"><T>OpenCode is the coding agent validated in manual testing for this version. Claude Code and Codex are available but have not yet been tested to the same extent.</T></p>;
}
