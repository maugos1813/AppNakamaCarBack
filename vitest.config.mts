import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    // Integration tests share one real test database — running test files in
    // parallel would truncate tables out from under each other.
    fileParallelism: false,
    // Every test hits a real Neon database over the network (by design — see
    // tests/setup.ts), including an occasional serverless cold-start. The
    // vitest defaults (5s/10s) are tuned for local/mocked work and were
    // timing out under normal latency, which then let the *next* hook start
    // while the timed-out one was still running in the background — a
    // resetDatabase() racing a still-in-flight fixture setup, not a real bug.
    testTimeout: 30000,
    hookTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['tests/**', 'src/lib/openapi/**', '**/*.d.ts', 'prisma/**'],
    },
  },
});
