import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Each suite loads the statewide dataset; limit concurrent copies in CI.
    maxWorkers: 2,
    // Bulk checks now inspect more than 30,000 generated HTML pages.
    testTimeout: 30_000,
  },
});
