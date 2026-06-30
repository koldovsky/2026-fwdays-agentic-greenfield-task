import { defineConfig } from 'vitest/config';

// Pure logic in @honeydo/shared must stay 100% unit-tested (TC-PURE-01, TC-TEST-01).
// Coverage is scoped to executable modules; type-only contracts and the barrel
// re-export carry no runtime logic and are excluded.
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts', 'src/contracts.ts'],
      thresholds: {
        statements: 100,
        branches: 100,
        functions: 100,
        lines: 100,
      },
    },
  },
});
