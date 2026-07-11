import { defineConfig } from 'vitest/config'

// Frontend unit-test runner. Slice 003 introduced a minimal `node` runner for the
// pure keyboard-shortcut mapper. Slice 005 (Stats UI) adds component-render tests, so
// the environment is upgraded to `jsdom` (a superset of `node` for the pure logic
// tests — the pre-existing resolveShortcut.test.ts still passes) and `.test.tsx` files
// are included. `setupFiles` registers @testing-library/jest-dom matchers. Chart.js
// components are NOT rendered here (jsdom has no canvas); the chart tests exercise the
// pure data-transform layer instead (see src/pages/Stats/__tests__).
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['./vitest.setup.ts'],
  },
})
