/**
 * vitest.config.ts — KAREN Phase 2 (2026-05-02)
 * Vitest configuration per design §10 CI assertions.
 * Excludes the live-API integration test (garmin.client.test.ts) from the
 * unit test run — it requires real Garmin credentials and network access.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Only run unit tests; exclude the live-API integration test
    exclude: [
      '**/node_modules/**',
      '**/build/**',
      'src/client/garmin.client.test.ts', // live API — excluded from CI unit run
    ],
    include: [
      'tests/**/*.test.ts',
    ],
    globals: false,
  },
});
