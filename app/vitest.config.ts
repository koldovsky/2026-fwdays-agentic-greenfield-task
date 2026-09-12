import { defineConfig } from 'vitest/config'

// Unit tests live under src/. The Playwright E2E specs under e2e/ use the
// Playwright runner, not Vitest, so they are deliberately excluded here.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
})
