import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, inject, it } from 'vitest';
import { testSchedulingProjects, timingSensitiveTests } from './testScheduling.ts';

declare module 'vitest' {
  export interface ProvidedContext {
    testPhase: string;
  }
}

describe('test resource scheduling', () => {
  it('runs this configuration test only in the functional project', () => {
    expect(inject('testPhase')).toBe('functional');
  });

  it('assigns every selected complete file to the quiet phase exactly once', () => {
    expect(new Set(timingSensitiveTests).size).toBe(timingSensitiveTests.length);
    for (const file of timingSensitiveTests) expect(fs.existsSync(file), file).toBe(true);
    const [functional, timing] = testSchedulingProjects;
    expect(functional.test.exclude).toEqual(expect.arrayContaining(timingSensitiveTests));
    expect(timing.test.include).toEqual(timingSensitiveTests);
    expect(functional.extends).toBe(true);
    expect(timing.extends).toBe(true);
  });

  it('retains every test file without overlap between the two phases', () => {
    const files = ['client', 'server', 'shared', 'scripts'].flatMap((root) =>
      (fs.readdirSync(root, { recursive: true }) as string[])
        .filter((file) => /\.test\.tsx?$/.test(file))
        .map((file) => path.join(root, file).replaceAll('\\', '/')),
    );
    const timing = files.filter((file) => timingSensitiveTests.includes(file));
    const functional = files.filter((file) => !timingSensitiveTests.includes(file));
    expect(timing.sort()).toEqual([...timingSensitiveTests].sort());
    expect(new Set([...functional, ...timing]).size).toBe(files.length);
    expect(functional.length + timing.length).toBe(files.length);
  });

  it('runs timing-sensitive files alone, after the functional phase', () => {
    const [functional, timing] = testSchedulingProjects;
    expect(timing.test.sequence.groupOrder).toBeGreaterThan(functional.test.sequence.groupOrder);
    expect(timing.test.fileParallelism).toBe(false);
    expect(timing.test.maxWorkers).toBe(1);
  });

  it('keeps the notification source-policy scan with its strict I/O deadline in the quiet phase', () => {
    expect(timingSensitiveTests).toContain('server/notifier.test.ts');
  });

  it('keeps the protected launcher subprocess with its original deadline in the quiet phase', () => {
    expect(timingSensitiveTests).toContain('scripts/opencodeGateLauncher.test.ts');
  });

  it('does not override timeouts, retries, sampling, isolation or the functional worker count', () => {
    for (const project of testSchedulingProjects) {
      for (const key of ['testTimeout', 'hookTimeout', 'retry', 'isolate', 'testNamePattern', 'passWithNoTests']) {
        expect(project.test).not.toHaveProperty(key);
      }
    }
    expect(testSchedulingProjects[0].test).not.toHaveProperty('maxWorkers');
    expect(testSchedulingProjects[0].test).not.toHaveProperty('fileParallelism');
  });
});
