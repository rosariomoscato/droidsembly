import { describe, expect, it } from 'vitest';
import { prepareDeskScript } from './boxScripts.ts';

// Commands, not the word "checkout" in --no-checkout or a diagnostic sentence.
const destructive = /\bgit(?:\s+-C\s+(?:"[^"]*"|'[^']*'|\S+))?\s+(?:reset|clean|checkout)\b|--force|\brm\s+-|worktree prune|worktree add[^\n]* -B/;

describe('preserving Box desk preparation (generated script only,no real Box)', () => {
  it('never emits destructive checkout/reset/clean/rebuild operations for resume', () => {
    const script = prepareDeskScript('synthetic/repo', { defaultBranch: 'main', preserve: true }, 'swarm/issue-3-ada');
    expect(script).not.toMatch(destructive);
    expect(script).toContain('symbolic-ref --short -q HEAD');
    expect(script).toContain('--git-common-dir');
    expect(script).toContain('files left untouched');
    expect(script).toContain('refs/heads/$B'); expect(script).toContain('refs/remotes/origin/$B');
  });
  it('does not change ordinary fresh-task preparation', () => {
    const script = prepareDeskScript('synthetic/repo', { defaultBranch: 'main' }, 'swarm/issue-3-ada');
    expect(script).toContain('git reset -q --hard'); expect(script).not.toContain('interrupted branch');
    expect(script).toMatch(destructive);
  });
  it('detects real destructive commands,including an explicit git directory', () => {
    for (const command of ['git reset --hard HEAD', 'git -C "$W" clean -fd', 'git checkout --force -B task origin/main', 'rm -rf "$W"', 'git worktree add -B task "$W" origin/main']) expect(command).toMatch(destructive);
    expect('git clone --no-checkout origin "$R"').not.toMatch(destructive);
  });
  it('refuses preserving a QA/fix checkout and invalid branch input', () => {
    expect(() => prepareDeskScript('synthetic/repo', { defaultBranch: 'main', preserve: true, pr: 3 }, 'qa/pr-3')).toThrow();
    expect(() => prepareDeskScript('synthetic/repo', { defaultBranch: 'main', preserve: true }, 'branch;rm -rf /')).toThrow();
  });
});
