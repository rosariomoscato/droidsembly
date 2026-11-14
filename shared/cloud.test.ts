import { describe, expect, it } from 'vitest';
import { boxCli, cloudSettings, DEFAULT_CLOUD, hostLabel, MAX_BOX_LIMIT } from './cloud.ts';

describe('cloudSettings', () => {
  it('starts with agents on this computer', () => {
    expect(DEFAULT_CLOUD.machineKind).toBe('local');
    expect(cloudSettings(DEFAULT_CLOUD, undefined)).toEqual(DEFAULT_CLOUD);
  });

  it('takes what is valid and keeps the rest', () => {
    expect(cloudSettings(DEFAULT_CLOUD, { machineKind: 'box', boxSize: 'large', boxLimit: 25.4 })).toEqual({ machineKind: 'box', boxSize: 'large', boxLimit: 25, pauseNewWork: false });
    expect(cloudSettings(DEFAULT_CLOUD, { machineKind: 'mars', boxSize: 'huge', boxLimit: -3 })).toEqual(DEFAULT_CLOUD);
    expect(cloudSettings(DEFAULT_CLOUD, { boxLimit: 1e9 }).boxLimit).toBe(MAX_BOX_LIMIT);
  });
  it('keeps an explicit work pause and rejects non-boolean pause changes', () => {
    const paused = cloudSettings(DEFAULT_CLOUD, { pauseNewWork: true });
    expect(paused.pauseNewWork).toBe(true);
    expect(cloudSettings(paused, { pauseNewWork: 'false' }).pauseNewWork).toBe(true);
    expect(cloudSettings(paused, { pauseNewWork: false }).pauseNewWork).toBe(false);
  });
});

describe('cloud agents', () => {
  it('run Claude Code, Codex or OpenCode', () => {
    expect(boxCli('claude')).toBe(true);
    expect(boxCli('codex')).toBe(true);
    expect(boxCli('opencode')).toBe(true);
  });

  it('say where they work', () => {
    expect(hostLabel('box')).toMatch(/Cloud/);
    expect(hostLabel('')).toBe('This computer');
  });
});
