import { defineConfig } from '@playwright/test'

// Headed only: Chrome extensions load unreliably headless (see
// docs/requirements.md §3). Screen recording is enabled on the manually
// launched persistent context in e2e/export.spec.ts (`recordVideo`) — the
// config-level `use.video` flag does not apply there. `test:e2e:demo` copies
// the recording to app/demo/ticket2md-export.webm for the homework demo.
export default defineConfig({
  testDir: './e2e',
  outputDir: 'test-results',
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    // Full artifact capture so a run can be handed off for analysis:
    // - video: the demo recording + a visual replay of the whole run
    // - trace: open with `npx playwright show-trace` (DOM snapshots, network, console)
    // - screenshot on failure: a PNG an agent can read directly from test-results/
    video: 'off',
    trace: 'on',
    screenshot: 'only-on-failure',
  },
})
