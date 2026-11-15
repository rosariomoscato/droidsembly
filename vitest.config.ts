import os from 'node:os';
import path from 'node:path';
import { defineConfig } from 'vitest/config';
import { testSchedulingProjects } from './scripts/testScheduling.ts';

// A developer's canonical aliases must never override this suite's isolated
// SWARM_HOME/ports. Individual alias tests supply their own explicit env maps.
for (const key of Object.keys(process.env)) if (key.startsWith('DROIDSEMBLY_')) delete process.env[key];

// Kept apart from vite.config.ts, whose root is client/, so tests in server/, shared/ and scripts/ are found too.
export default defineConfig({
  test: {
    root: '.',
    // Each project declares its own include: extending an include here would
    // concatenate it with the timing list and run files in both projects.
    environment: 'node',
    // Group order is a barrier: timing budgets never compete with functional files.
    projects: testSchedulingProjects,
    // Anything a test imports must never see the live office's state (~/.cubefarm) or its ports.
    // Previews tests probe ports: keep them clear of the live office's preview ranges (6300-6499).
    env: { SWARM_HOME: path.join(os.tmpdir(), `cubefarm-vitest-${process.pid}`), SWARM_PORT: '0', SWARM_PREVIEW_PORT: '9300' },
  },
});
