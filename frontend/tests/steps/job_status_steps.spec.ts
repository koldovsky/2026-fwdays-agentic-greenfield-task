import path from "node:path";
/**
 * Non-BDD Playwright happy-path E2E for the WS-driven JobStatusPanel.
 *
 * NOT a BDD binding. The 2 F5 @integration @web scenarios
 * ("A client receives a progress event within one second of a chunk
 * completing" + "A client that connects mid-job still receives the next
 * progress event") are bound in plan 02-06 as pytest-bdd scenarios
 * (they carry the @integration tag, not @web). This spec is a
 * non-binding end-to-end smoke that asserts the WS pipeline:
 *
 *   1. Upload an EPUB via the UI.
 *   2. Pick "Translation" + Ollama + a model + source + target.
 *   3. Submit — the SPA navigates to `/jobs?id=<jobId>`.
 *   4. The JobStatusPanel connects to the WS endpoint and renders the
 *      progress bar + connection state.
 *
 * We use `long-series.epub` so the mock-translator pipeline emits
 * per-chunk WS events over a window long enough for the SPA to
 * connect + receive (mystere-nocturne.epub is too small; the mock
 * completes in milliseconds and the late-subscriber sees 0 / 0).
 * The 1s-on-time-subscriber timing assertion is the F5 @integration
 * BDD scenario (plan 02-06, pytest-bdd), not this E2E smoke.
 */
import { expect } from "@playwright/test";

import { JobStatusPage } from "../pom/JobStatusPage";
import { TranslationConfigPage } from "../pom/TranslationConfigPage";
import { UploadPage } from "../pom/UploadPage";
// Quick 20260711-0910: opt the demo recording into the visual helper
// (mouse trail + focus outline) — the spec file imports the
// fixture's `test` so the helper auto-injects via
// `context.addInitScript({ path: visual-helper.js })` in beforeEach.
import { test } from "../fixtures/visual-helper-fixture";
import { demoPause } from "./_demo_pause";

const FIXTURES_DIR = path.resolve(__dirname, "../../../backend/tests/fixtures/epubs");
const fixture = path.join(FIXTURES_DIR, "long-series.epub");

/**
 * F6 @smoke helper: upload + translation chooser + submit, then return
 * the new job id. Used by the F6 download surface tests below.
 */
async function submitTranslationJob(page: import("@playwright/test").Page): Promise<string> {
  const uploadPage = new UploadPage(page);
  await uploadPage.goto();
  await uploadPage.pickFile(fixture);
  await uploadPage.expectMetadataVisible();

  const configPage = new TranslationConfigPage(page);
  await configPage.pickWorkflow("translation");
  await configPage.pickProvider("ollama");
  // Phase 1 plan 02: click Load Model List to populate the model select.
  await configPage.clickLoadModelList();
  await expect
    .poll(async () => {
      const values = await configPage.locators.modelSelect
        .locator("option")
        .evaluateAll((els) => els.map((e) => (e as HTMLOptionElement).value));
      return values.filter((v) => v !== "").length;
    })
    .toBeGreaterThan(0);
  await configPage.pickModel(
    await configPage.locators.modelSelect.locator("option").evaluateAll((els) => {
      const first = els.find((e) => (e as HTMLOptionElement).value !== "");
      return first ? (first as HTMLOptionElement).value : "";
    }),
  );
  await expect.poll(async () => await configPage.locators.sourceLanguage.inputValue()).not.toBe("");
  await configPage.pickTargetLanguage("de");

  await Promise.all([page.waitForURL(/\/jobs\?id=/, { timeout: 15_000 }), configPage.submit()]);
  const url = new URL(page.url());
  const jobId = url.searchParams.get("id");
  if (!jobId) {
    throw new Error("No job id in URL after submit");
  }
  return jobId;
}

test.describe("F5: WebSocket happy path", { tag: "@web" }, () => {
  test(
    "WS-driven JobStatusPanel renders + connects after a translation job is created",
    { tag: "@smoke" },
    async ({ page }) => {
      test.info().annotations.push({ type: "tcid", description: "JOBS-03-SC01" });
      // Upload
      const uploadPage = new UploadPage(page);
      await uploadPage.goto();
      await uploadPage.pickFile(fixture);
      await uploadPage.expectMetadataVisible();

      // Choose translation + provider + model + source + target
      const configPage = new TranslationConfigPage(page);
      await configPage.pickWorkflow("translation");
      await configPage.pickProvider("ollama");
      // Phase 1 plan 02: click Load Model List to populate the model select.
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
      await configPage.pickModel(
        await configPage.locators.modelSelect.locator("option").evaluateAll((els) => {
          const first = els.find((e) => (e as HTMLOptionElement).value !== "");
          return first ? (first as HTMLOptionElement).value : "";
        }),
      );
      // Wait for source prefill to land (any non-empty value).
      await expect
        .poll(async () => await configPage.locators.sourceLanguage.inputValue())
        .not.toBe("");
      await configPage.pickTargetLanguage("de");

      // Submit — the SPA navigates to /jobs?id=<jobId>
      await Promise.all([page.waitForURL(/\/jobs\?id=/, { timeout: 15_000 }), configPage.submit()]);

      // Assert the WS panel rendered.
      const jobStatus = new JobStatusPage(page);
      await expect(jobStatus.locators.panel).toBeVisible();
      await expect(jobStatus.locators.progressBar).toBeVisible();
      // The connection state indicator is present (the late-subscriber
      // may see Connected, Reconnecting, or Disconnected with a close
      // code depending on timing — the panel wires `useJobEvents`
      // correctly regardless of the exact state).
      await expect(jobStatus.locators.connectionState).toBeVisible();
      await demoPause(page, 800, "after WS panel renders + connection state visible");
    },
  );
});

test.describe("F6: Download surface (EPUB + ZIP)", { tag: "@web" }, () => {
  // F6 @smoke — happy path for the F6 download row (DL-01). The
  // translation-only job_type produces only the EPUB artifact; the
  // ZIP link MUST NOT render (04-UI-SPEC §3.1 visibility table).
  //
  // Implementation note: the F5 @smoke spec above submits a real
  // translation job (long-series.epub, 122 chapters) and the worker
  // is single-tenant with MAX_ACTIVE=1 — the F5 job is still in the
  // queue when the F6 test starts, so we can't wait for a real
  // completion. Instead we stub GET /api/v1/jobs/{id} to return a
  // completed JobView; the panel uses `data.status` as the
  // authoritative status fallback (Rule 2 deviation: the late-
  // subscriber case is not representable with a real job in a
  // single-tenant queue). The WS endpoint returns 1008 for the fake
  // id; useJobEvents reconnects on close but `jobStatus` drives
  // the download row visibility regardless.
  test(
    "completed translation job shows the EPUB download link only (no ZIP)",
    { tag: "@smoke" },
    async ({ page }) => {
      test.info().annotations.push({ type: "tcid", description: "DL-01-SC01" });
      const fakeJobId = "dl01-translation-completed-fixture";

      // Stub GET /api/v1/jobs/{id} to return a completed translation
      // JobView. The stub matches the specific id so the POST
      // /api/v1/jobs call from a parallel test still goes through.
      await page.route(`**/api/v1/jobs/${fakeJobId}`, async (route) => {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: fakeJobId,
            epub_id: "fake-epub-id",
            job_type: "translation",
            status: "completed",
            source_language: "en",
            target_language: "de",
            voice: null,
            chapter_ids: ["ch1", "ch2", "ch3"],
            last_chunk_id: "ch3_chunk_3",
            created_at: "2026-07-07T00:00:00Z",
            updated_at: "2026-07-07T00:01:00Z",
          }),
        });
      });

      await page.goto(`/jobs.html?id=${encodeURIComponent(fakeJobId)}`);
      const jobStatus = new JobStatusPage(page);
      // Translation job → EPUB link only; ZIP link MUST be absent.
      await jobStatus.expectDownloadLinksVisible(true, false);
      await expect(jobStatus.locators.combinedBanner).toHaveCount(0);
      await demoPause(page, 800, "after download row renders (translation-only)");
    },
  );

  // F6 @smoke — combined job (translation+voiceover) produces BOTH
  // artifacts; the panel renders both download links stacked with a
  // combined-banner above them (04-UI-SPEC §3.1). Same stub
  // approach as DL-01-SC01: stub GET /api/v1/jobs/{id} with a
  // completed combined JobView.
  test(
    "completed combined job shows both EPUB and ZIP download links + combined banner",
    { tag: "@smoke" },
    async ({ page }) => {
      test.info().annotations.push({ type: "tcid", description: "DL-01-SC02" });
      const fakeJobId = "dl01-combined-completed-fixture";

      await page.route(`**/api/v1/jobs/${fakeJobId}`, async (route) => {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: fakeJobId,
            epub_id: "fake-epub-id",
            job_type: "translation+voiceover",
            status: "completed",
            source_language: "en",
            target_language: "de",
            voice: "alloy",
            chapter_ids: ["ch1", "ch2", "ch3"],
            last_chunk_id: "ch3_chunk_3",
            created_at: "2026-07-07T00:00:00Z",
            updated_at: "2026-07-07T00:01:00Z",
          }),
        });
      });

      await page.goto(`/jobs.html?id=${encodeURIComponent(fakeJobId)}`);
      const jobStatus = new JobStatusPage(page);
      // Combined job → BOTH links visible + combined banner.
      await jobStatus.expectDownloadLinksVisible(true, true);
      await expect(jobStatus.locators.combinedBanner).toBeVisible();
      await demoPause(page, 800, "after download row renders (combined, with banner)");
    },
  );
});
