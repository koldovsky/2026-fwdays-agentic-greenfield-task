import { defineConfig, devices } from '@playwright/test';
import { join } from 'node:path';

// Plain Playwright config without @nx/playwright's nxE2EPreset: both the
// preset and @nx/devkit require nx's native module, which crashes under
// Playwright's ESM config loader (TypeError in nx/dist/src/native). The
// preset's defaults are inlined below instead.
const workspaceRoot = join(import.meta.dirname, '..');

// For CI, you may want to set BASE_URL to the deployed application.
const baseURL = process.env['BASE_URL'] || 'http://localhost:4200';

export default defineConfig({
  testDir: './src',
  outputDir: join(workspaceRoot, 'dist/.playwright/web-e2e/test-output'),
  reporter: [
    [
      'html',
      {
        outputFolder: join(
          workspaceRoot,
          'dist/.playwright/web-e2e/playwright-report',
        ),
        open: 'never',
      },
    ],
  ],
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  use: {
    baseURL,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },
  /* Full local stack: MySQL (docker compose) + API + web dev server. The
     web dev server proxies /api to :3000 (web/proxy.conf.json). */
  webServer: [
    {
      command:
        'sh -c "docker compose up -d --wait mysql && npx nx run api:serve"',
      url: 'http://localhost:3000/api/health',
      reuseExistingServer: true,
      cwd: workspaceRoot,
      timeout: 120_000,
    },
    {
      command: 'npx nx run web:serve',
      url: 'http://localhost:4200',
      reuseExistingServer: true,
      cwd: workspaceRoot,
    },
  ],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
