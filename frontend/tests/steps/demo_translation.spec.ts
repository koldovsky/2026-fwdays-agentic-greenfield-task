import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

// Quick 20260711-0910: opt the demo recording into the visual helper
// (mouse trail + focus outline) — the spec file imports the
// fixture's `test` so the helper auto-injects via
// `context.addInitScript({ path: visual-helper.js })` in beforeEach.
import { test } from "../fixtures/visual-helper-fixture";
import { JobStatusPage } from "../pom/JobStatusPage";
import { TranslationConfigPage } from "../pom/TranslationConfigPage";
import { UploadPage } from "../pom/UploadPage";
import { demoPause } from "./_demo_pause";

import path from "node:path";

/**
 * Binding for the 1 DEMO-TRANSLATION @web @demo BDD scenario.
 *
 * Source of truth: `docs/features/demo-translation.feature`
 * (the "Translation Happy Path Demo" feature).
 *
 * The @demo tag excludes this spec from the default e2e runner —
 * per the feature file header comment:
 *
 *   "# @demo feature files are excluded from the default e2e run.
 *    # Run explicitly with: npx playwright test --grep @demo"
 *
 * The scenario is invoked explicitly with `--grep @demo` (or the
 * `yarn test:e2e:demo` script, once added). The default
 * `npx playwright test` invocation does NOT pick this test up
 * (the inherited `@web` tag is also present, but the test()'s
 * explicit `@demo` tag is what the `--grep` matcher uses for
 * exclusion).
 *
 * Test setup:
 *   The demo scenario assumes the demo container is up on
 *   :5173 (per `playwright.config.ts`'s
 *   `reuseExistingServer: !process.env.CI`). The local
 *   `docker compose up` from the repo root starts the demo
 *   container with the `mock-openai` service, so the
 *   translation provider is reachable. The test runtime
 *   is 30-60s end-to-end (mock provider's translation
 *   latency) — hence the 90_000 test timeout.
 *
 * The flow is the full F1 + F2 + F5 + F6 + F8 chain:
 *   1. F1 upload: drag-drop / pick the demo EPUB
 *   2. F2 config: pick "Translation" + provider + model + source + target
 *   3. F5 submit: POST /api/v1/jobs → /jobs?id=<jobId>
 *   4. F5 WS: panel connects, mock provider emits per-chunk events
 *   5. F6 download: completed state shows the EPUB download link
 *   6. F8 back: "Back to Workflow Choice" → routes to "/"
 *
 * The test exercises the SAME code paths as the individual F1/F2/F5
 * smoke specs end-to-end — it's a smoke test for the integrated
 * pipeline, not a new feature.
 */
const FIXTURES_DIR = path.resolve(__dirname, "../../../backend/tests/fixtures/epubs");
const mystereNocturneFixture = path.join(FIXTURES_DIR, "mystere-nocturne.epub");

/**
 * Helper: upload the demo EPUB + pick "Translation" + provider +
 * model + target. Returns the page objects. Mirrors the F5 spec's
 * `submitTranslationJob` helper (`job_status_steps.spec.ts:39-74`)
 * but stops BEFORE submit so the test can interleave the WS panel
 * assertions.
 */
async function bootDemoTranslationFlow(page: Page): Promise<void> {
  const uploadPage = new UploadPage(page);
  await uploadPage.goto();
  await uploadPage.pickFile(mystereNocturneFixture);
  await uploadPage.expectMetadataVisible();
  await demoPause(page, 800, "demo: after metadata preview renders");

  const configPage = new TranslationConfigPage(page);
  await configPage.pickWorkflow("translation");
  await configPage.pickProvider("ollama");
  await configPage.clickLoadModelList();
  // Wait for the model list to populate.
  await expect
    .poll(async () => {
      const values = await configPage.locators.modelSelect
        .locator("option")
        .evaluateAll((els) => els.map((e) => (e as HTMLOptionElement).value));
      return values.filter((v) => v !== "").length;
    })
    .toBeGreaterThan(0);
  // Pick the first non-empty model.
  const firstModel = await configPage.locators.modelSelect.locator("option").evaluateAll((els) => {
    const first = els.find((e) => (e as HTMLOptionElement).value !== "");
    return first ? (first as HTMLOptionElement).value : "";
  });
  await configPage.pickModel(firstModel);
  // Wait for source prefill to land (mystere-nocturne declares "fr").
  await expect.poll(async () => await configPage.locators.sourceLanguage.inputValue()).not.toBe("");
  // Pick the target language.
  await configPage.pickTargetLanguage("en");
  await demoPause(page, 800, "demo: after translation form is fully filled");
}

test.describe("DEMO: Translation Happy Path", { tag: ["@web", "@demo"] }, () => {
  // DEMO @web @demo @smoke — full upload → translation → download → back flow.
  // DEMO-01-SC01. Long happy-path test; runs against the demo
  // container (mock-openai service reachable from the backend).
  // 90s timeout covers the 30-60s mock-provider translation latency
  // + the 3-7s `globalSetup` rebuild + the 2-3s WS connection
  // hand-shake + generous Playwright idle time.
  test.setTimeout(90_000);
  test(
    "A user translates an EPUB from upload through translated EPUB download",
    { tag: "@smoke" },
    async ({ page }) => {
      test.info().annotations.push({ type: "tcid", description: "DEMO-01-SC01" });

      // 1. F1 upload: pick the demo EPUB + assert metadata renders.
      await bootDemoTranslationFlow(page);

      const configPage = new TranslationConfigPage(page);
      // 2. F2 submit: POST /api/v1/jobs → /jobs?id=<jobId>.
      await Promise.all([page.waitForURL(/\/jobs\?id=/, { timeout: 15_000 }), configPage.submit()]);
      const jobId = new URL(page.url()).searchParams.get("id");
      expect(jobId, "submit must land on /jobs?id=<jobId>").not.toBeNull();
      // biome-ignore lint/style/noNonNullAssertion: jobId is asserted non-null on the line above
      const jobIdStr = jobId!;

      // 3. F5 WS panel: panel renders, connection state visible,
      // progress bar present. (Translation happens in the background
      // via the mock provider.)
      const jobStatusPage = new JobStatusPage(page);
      await expect(jobStatusPage.locators.panel).toBeVisible();
      await expect(jobStatusPage.locators.progressBar).toBeVisible();
      await expect(jobStatusPage.locators.connectionState).toBeVisible();
      await demoPause(page, 800, "demo: after WS panel renders");

      // 4. Wait for completion: poll the panel's data-status until
      // it reads "completed" (the mock provider emits per-chunk
      // events; the panel's data-status reflects the WS event's
      // status field).
      await expect(jobStatusPage.locators.panel).toHaveAttribute("data-status", "completed", {
        timeout: 60_000,
      });

      // 5. F6 download: completed translation-only job → EPUB link
      // visible, ZIP link absent (DL-01 visibility table from
      // 04-UI-SPEC §3.1).
      await jobStatusPage.expectDownloadLinksVisible(true, false);
      await demoPause(page, 1500, "demo: after download row renders (translation-only)");

      // 6. F8 back: "Back to Workflow Choice" button is visible +
      // enabled. Click → routes to "/".
      await jobStatusPage.expectBackToWorkflowChoiceVisible("completed");
      await Promise.all([
        page.waitForURL((url) => url.pathname === "/", { timeout: 10_000 }),
        jobStatusPage.clickBackToWorkflowChoice("completed"),
      ]);

      // The chooser view renders — the upload-card testid is the
      // canonical F1 marker.
      await expect(page.getByTestId("upload-card")).toBeVisible();
      await demoPause(page, 800, `demo: after back-to-chooser for job ${jobIdStr}`);
      // Final hold so the recording has a clean tail of the chooser
      // view (the D-06 BDD scenario asserts the webm is ≥ 10s).
      await demoPause(page, 1500, "demo: tail hold (chooser view)");
    },
  );
});
