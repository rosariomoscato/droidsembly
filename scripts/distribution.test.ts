import { describe, expect, it } from 'vitest';
import { isNewer, releaseInfo, updateInfo } from '../bin/distribution.js';

describe('npm distribution channels', () => {
  it('keeps beta.2 on next with its own tag and recognizes an update from beta.1', () => {
    expect(releaseInfo('0.4.0-beta.2', 'droidsembly-v0.4.0-beta.2')).toEqual({ tag: 'droidsembly-v0.4.0-beta.2', channel: 'next' });
    expect(updateInfo('droidsembly', '0.4.0-beta.2').channel).toBe('next');
    expect(isNewer('0.4.0-beta.2', '0.4.0-beta.1')).toBe(true);
    expect(() => releaseInfo('0.4.0-beta.2', 'droidsembly-v0.4.0-beta.1')).toThrow();
  });

  it('keeps beta updates on next and stable updates on latest', () => {
    expect(updateInfo('droidsembly', '0.4.0-beta.1')).toEqual({
      channel: 'next', command: 'npx droidsembly@next', url: 'https://registry.npmjs.org/droidsembly/next',
    });
    expect(updateInfo('droidsembly', '0.4.0').command).toBe('npx droidsembly@latest');
    expect(updateInfo('@owner/app', '1.0.0').url).toBe('https://registry.npmjs.org/%40owner%2Fapp/latest');
  });

  it('orders beta numbers numerically and treats stable as newer than the same beta', () => {
    expect(isNewer('0.4.0-beta.10', '0.4.0-beta.2')).toBe(true);
    expect(isNewer('0.4.0-beta.2', '0.4.0-beta.10')).toBe(false);
    expect(isNewer('0.4.0', '0.4.0-beta.10')).toBe(true);
    expect(isNewer('0.4.0-beta.10', '0.4.0')).toBe(false);
    expect(isNewer('0.5.0-beta.1', '0.4.0')).toBe(true);
    expect(isNewer('0.4.0+build.2', '0.4.0+build.1')).toBe(false);
  });

  it('follows SemVer prerelease precedence and rejects malformed registry versions', () => {
    const ordered = ['1.0.0-alpha', '1.0.0-alpha.1', '1.0.0-alpha.beta', '1.0.0-beta', '1.0.0-beta.2', '1.0.0-beta.11', '1.0.0-rc.1', '1.0.0'];
    for (let i = 1; i < ordered.length; i++) expect(isNewer(ordered[i], ordered[i - 1])).toBe(true);
    for (const bad of ['garbage', '1.0', '01.0.0', '1.0.0-beta.01', '1.0.0-']) {
      expect(isNewer(bad, '0.4.0')).toBe(false);
      expect(() => updateInfo('droidsembly', bad)).toThrow();
    }
  });

  it('requires a fork-specific tag matching the package version', () => {
    expect(releaseInfo('0.4.0-beta.1', 'droidsembly-v0.4.0-beta.1')).toEqual({ tag: 'droidsembly-v0.4.0-beta.1', channel: 'next' });
    expect(releaseInfo('0.4.0', 'droidsembly-v0.4.0').channel).toBe('latest');
    expect(() => releaseInfo('0.4.0-beta.1', 'v0.4.0-beta.1')).toThrow();
    expect(() => releaseInfo('0.4.0-beta.1', 'droidsembly-v0.4.0')).toThrow();
    expect(() => releaseInfo('0.4.0-rc.1', 'droidsembly-v0.4.0-rc.1')).toThrow();
  });
});
