import { describe, expect, it } from 'vitest';
import { profileDeskScript } from './boxScripts.ts';

describe('non-destructive profile worktree preparation', () => {
  it('checks ownership and a clean tree and never resets or removes existing files', () => {
    const script = profileDeskScript('demo-co/app', 'main', 'swarm/profile-123');
    expect(script).toContain('git-common-dir');
    expect(script).toContain('rev-parse --show-toplevel');
    expect(script).toContain('status --porcelain=v1 --untracked-files=normal');
    expect(script).toContain('--no-overwrite-ignore');
    expect(script).toContain('worktree add -q -b "$B" "$W"');
    expect(script).toContain('test ! -e "$W"');
    expect(script).not.toMatch(/\b(rm|reset|clean|npm|npx)\b/);
    expect(script).not.toContain('--force');
  });

  it('refuses shell injection in repository or branch names', () => {
    expect(() => profileDeskScript('demo-co/app;echo stolen', 'main', 'swarm/profile-1')).toThrow();
    expect(() => profileDeskScript('demo-co/app', 'main;whoami', 'swarm/profile-1')).toThrow();
    expect(() => profileDeskScript('demo-co/app', 'main', 'bad branch')).toThrow();
  });
});
