import { defineConfig } from 'vitest/config'

// Minimal frontend unit-test runner (introduced in slice 003 for FR-TIMER-05).
// Pure-logic units only: `node` environment, no jsdom / testing-library — the one
// thing under test here is the pure keyboard-shortcut mapper (src/pages/Timer/
// resolveShortcut.ts), which the Timer component then calls for real. `npm test`
// runs this and is wired into scripts/verify.* so gate-slice executes it.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
