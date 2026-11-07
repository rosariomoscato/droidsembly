import { configDefaults } from 'vitest/config';

// These complete files contain wall-clock budgets or CPU-heavy simulations with
// strict deadlines. Give them a quiet phase, rather than relaxing their tests.
export const timingSensitiveTests = [
  'server/scale.test.ts',
  'server/httpParser.test.ts',
  'server/notifier.test.ts',
  'client/src/world/appearance.test.ts',
  'client/src/world/face.test.ts',
  'client/src/world/walkways.test.ts',
  'client/src/ui/keyboards.test.ts',
  'client/src/world/events/director.test.ts',
  'client/src/world/sky/skyLayout.test.ts',
  'client/src/world/toys/npcAim.test.ts',
];

export const testSchedulingProjects = [
  {
    extends: true,
    test: {
      name: 'functional',
      include: ['{client,server,shared,scripts}/**/*.test.{ts,tsx}'],
      exclude: [...configDefaults.exclude, 'e2e/**', ...timingSensitiveTests],
      provide: { testPhase: 'functional' },
      sequence: { groupOrder: 0 },
    },
  },
  {
    extends: true,
    test: {
      name: 'timing-sensitive',
      include: timingSensitiveTests,
      exclude: [...configDefaults.exclude, 'e2e/**'],
      provide: { testPhase: 'timing-sensitive' },
      fileParallelism: false,
      maxWorkers: 1,
      sequence: { groupOrder: 1 },
    },
  },
];
