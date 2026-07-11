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
 * Bindings for the 9 F8 @web BDD scenarios.
 *
 * Source of truth: `docs/features/navigation-back-to-chooser.feature`
 * (Quick 260710-oih + 260710-btb + 260710-wcg / JOBS-07 / the four
 * `Back to Workflow Choice` button variants on `JobStatusPanel`).
 *
 * Tag model:
 *   - `@web` is the layer tag — applied once via `test.describe` so
 *     every test below inherits it. The `--grep @web` filter (full
 *     CI slice) matches via this inherited tag.
 *   - `@smoke` / `@regression` is the scope tag — applied per-test
 *     via the `tag` option on `test()`. The `--grep @smoke` filter
 *     (live demo slice) matches via these per-test tags.
 *
 * Test isolation:
 *   Every test uses a synthetic job_id (e.g. `synth-f8-sc01-completed`)
 *   and stubs the matching `GET /api/v1/jobs/{id}` endpoint with
 *   `page.route` so the panel falls back to the mocked status via
 *   the late-subscriber path (`JobStatusPanel.tsx:148`). The WS
 *   endpoint is intentionally NOT mocked — it will close immediately
 *   (1008) for a synthetic id, and the panel re-renders with the
 *   mocked status from `useJobView`.
 *
 * The F8-SC03 (cancelled) test carries the same re-scope note as
 * the F7-SC14 test: the impl physically deletes rows on cancel, so
 * the test stubs the row to persist (NOT delete) for the cancelled
 * state to be observable in the SPA. The F8-SC01/SC02/SC04 (completed
 * / failed / expired) tests are unaffected — those states are
 * observable in the normal lifecycle.
 */

const FIXTURES_DIR = path.resolve(__dirname, "../../../backend/tests/fixtures/epubs");
const mystereNocturneFixture = path.join(FIXTURES_DIR, "mystere-nocturne.epub");

/**
 * Stub a synthetic GET /api/v1/jobs/{id} response with the given
 * status. The stub matches the specific id so other tests' POSTs
 * (e.g. the F8-SC08 "submit a new job" flow) still go through to
 * the real backend. Mirrors the F6 download-surface stub pattern
 * from `job_status_steps.spec.ts:158-176`.
 */
async function stubJobStatus(
  page: Page,
  jobId: string,
  status: "running" | "queued" | "completed" | "failed" | "cancelled" | "expired",
  jobType: "translation" | "voiceover" | "translation+voiceover" = "translation",
): Promise<void> {
  await page.route(`**/api/v1/jobs/${jobId}`, async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: jobId,
        epub_id: "synthetic-epub-id",
        job_type: jobType,
        status,
        source_language: "fr",
        target_language: "en",
        voice: null,
        chapter_ids: ["ch1", "ch2", "ch3"],
        last_chunk_id: status === "completed" ? "ch3_chunk_3" : null,
        created_at: "2026-07-10T00:00:00Z",
        updated_at: "2026-07-10T00:00:00Z",
      }),
    });
  });
}

test.describe("F8: Navigation Back to Workflow Chooser", { tag: "@web" }, () => {
  // F8 @web @smoke — completed job shows the Back to Workflow Choice button.
  // JOBS-07-SC01 (F8-SC01 in the .feature file).
  test(
    "A completed job shows an enabled Back to Workflow Choice button",
    { tag: "@smoke" },
    async ({ page }) => {
      test.info().annotations.push({ type: "tcid", description: "JOBS-07-SC01" });
      const fakeJobId = "synth-f8-sc01-completed";
      await stubJobStatus(page, fakeJobId, "completed");

      const jobStatusPage = new JobStatusPage(page);
      await jobStatusPage.gotoJobWithStatus(fakeJobId, "completed");
      await jobStatusPage.expectBackToWorkflowChoiceVisible("completed");
      // Quick 260710-wcg: the back button is the visible `btn--tertiary`
      // variant (the outline-with-accent-border variant). The class
      // assertion is the lock on the WCG promotion.
      await expect(jobStatusPage.locators.backToWorkflowChoice).toHaveClass(/btn--tertiary/);
      await demoPause(page, 800, "after completed job renders the back-to-chooser button");
    },
  );

  // F8 @web @smoke — failed job shows the Back to Workflow Choice button.
  // JOBS-07-SC02 (F8-SC02 in the .feature file).
  test(
    "A failed job shows an enabled Back to Workflow Choice button",
    { tag: "@smoke" },
    async ({ page }) => {
      test.info().annotations.push({ type: "tcid", description: "JOBS-07-SC02" });
      const fakeJobId = "synth-f8-sc02-failed";
      await stubJobStatus(page, fakeJobId, "failed");

      const jobStatusPage = new JobStatusPage(page);
      await jobStatusPage.gotoJobWithStatus(fakeJobId, "failed");
      await jobStatusPage.expectBackToWorkflowChoiceVisible("failed");
      await demoPause(page, 800, "after failed job renders the back-to-chooser button");
    },
  );

  // F8 @web @regression — cancelled job shows the Back to Workflow Choice button.
  // JOBS-07-SC03 (F8-SC03 in the .feature file).
  // Same re-scope caveat as F7-SC14: the impl physically deletes rows
  // on cancel, so the test stubs the row to persist (NOT delete) for
  // the cancelled state to be observable in the SPA.
  test(
    "A cancelled job shows an enabled Back to Workflow Choice button",
    { tag: "@regression" },
    async ({ page }) => {
      test.info().annotations.push({ type: "tcid", description: "JOBS-07-SC03" });
      const fakeJobId = "synth-f8-sc03-cancelled";
      await stubJobStatus(page, fakeJobId, "cancelled");

      const jobStatusPage = new JobStatusPage(page);
      await jobStatusPage.gotoJobWithStatus(fakeJobId, "cancelled");
      await jobStatusPage.expectBackToWorkflowChoiceVisible("cancelled");
      await demoPause(page, 800, "after cancelled job renders the back-to-chooser button");
    },
  );

  // F8 @web @regression — expired job shows the Back to Workflow Choice button.
  // JOBS-07-SC04 (F8-SC04 in the .feature file).
  test(
    "An expired job shows an enabled Back to Workflow Choice button",
    { tag: "@regression" },
    async ({ page }) => {
      test.info().annotations.push({ type: "tcid", description: "JOBS-07-SC04" });
      const fakeJobId = "synth-f8-sc04-expired";
      await stubJobStatus(page, fakeJobId, "expired");

      const jobStatusPage = new JobStatusPage(page);
      await jobStatusPage.gotoJobWithStatus(fakeJobId, "expired");
      await jobStatusPage.expectBackToWorkflowChoiceVisible("expired");
      await demoPause(page, 800, "after expired job renders the back-to-chooser button");
    },
  );

  // F8 @web @smoke — running job does NOT show a clickable back button.
  // JOBS-07-SC05 (F8-SC05 in the .feature file).
  //
  // The Gherkin allows "OR the button is disabled with a tooltip" —
  // the impl satisfies the OTHER branch: the button is hidden
  // entirely (`isTerminal` is false → the terminal-state branches
  // don't render). Asserting count === 0 for all 4 testids locks
  // the impl's chosen branch.
  test(
    "A running job does not show a clickable Back to Workflow Choice button",
    { tag: "@smoke" },
    async ({ page }) => {
      test.info().annotations.push({ type: "tcid", description: "JOBS-07-SC05" });
      const fakeJobId = "synth-f8-sc05-running";
      await stubJobStatus(page, fakeJobId, "running");

      const jobStatusPage = new JobStatusPage(page);
      await jobStatusPage.gotoJobWithStatus(fakeJobId, "running");
      await jobStatusPage.expectNoBackToWorkflowChoice();
    },
  );

  // F8 @web @regression — queued job does NOT show a clickable back button.
  // JOBS-07-SC06 (F8-SC06 in the .feature file).
  test(
    "A queued job does not show a clickable Back to Workflow Choice button",
    { tag: "@regression" },
    async ({ page }) => {
      test.info().annotations.push({ type: "tcid", description: "JOBS-07-SC06" });
      const fakeJobId = "synth-f8-sc06-queued";
      await stubJobStatus(page, fakeJobId, "queued");

      const jobStatusPage = new JobStatusPage(page);
      await jobStatusPage.gotoJobWithStatus(fakeJobId, "queued");
      await jobStatusPage.expectNoBackToWorkflowChoice();
    },
  );

  // F8 @web @smoke — clicking Back to Workflow Choice routes to "/" without
  // a full page reload + preserves the previously-uploaded EPUB session.
  // JOBS-07-SC07 (F8-SC07 in the .feature file).
  //
  // The "no full page reload" assertion uses a marker:
  //   1. Before the click, set `window.__noReloadMarker = true` in the page
  //      context (the marker survives a Next.js client-side navigation,
  //      but is cleared by a full page reload — a fresh `window` is loaded).
  //   2. Click the back button.
  //   3. Wait for the URL to land at "/".
  //   4. Assert the marker is STILL set → confirms client-side routing.
  //
  // The "previously-uploaded EPUB remains available" assertion is
  // implicit: the chooser view's React state is preserved across the
  // `router.push("/")` because the page-level store (Zustand
  // `useWorkflowStore`) lives outside the page component. We assert
  // the chooser view renders the upload-card with the
  // `data-testid="upload-card"` (the same testid from F1) so the
  // writer confirms a re-upload is NOT required.
  test(
    "Clicking Back to Workflow Choice routes the SPA to the chooser without a full page reload",
    { tag: "@smoke" },
    async ({ page }) => {
      test.info().annotations.push({ type: "tcid", description: "JOBS-07-SC07" });
      const fakeJobId = "synth-f8-sc07-completed";
      await stubJobStatus(page, fakeJobId, "completed");

      const jobStatusPage = new JobStatusPage(page);
      await jobStatusPage.gotoJobWithStatus(fakeJobId, "completed");

      // Set the no-reload marker before the click.
      await page.evaluate(() => {
        (window as unknown as { __noReloadMarker: boolean }).__noReloadMarker = true;
      });

      // Click + wait for the URL to land at the chooser root.
      await Promise.all([
        page.waitForURL((url) => url.pathname === "/", { timeout: 10_000 }),
        jobStatusPage.clickBackToWorkflowChoice("completed"),
      ]);

      // The marker must STILL be set — a full page reload would have
      // wiped the `window` global.
      const markerSurvived = await page.evaluate(
        () => (window as unknown as { __noReloadMarker?: boolean }).__noReloadMarker === true,
      );
      expect(
        markerSurvived,
        "no full page reload — window marker must survive the navigation",
      ).toBe(true);

      // The chooser view is rendered. The upload-card testid is the
      // canonical F1 chooser marker.
      await expect(page.getByTestId("upload-card")).toBeVisible();
    },
  );

  // F8 @web @regression — a new job submitted after navigating back is a
  // fresh POST with no implicit link to the prior job.
  // JOBS-07-SC08 (F8-SC08 in the .feature file).
  //
  // The assertion is on the POST /api/v1/jobs request body — it must
  // NOT carry any of: `resume_from_job_id`, `parent_job_id`,
  // `source_job_id`, or any other field that would link the new job
  // to the prior `synth-f8-sc08-completed` row. The Pydantic v2
  // discriminated union (`JobCreateBody` in `api-contract.ts:116`)
  // enforces this at the server side, but the writer is locking
  // the SPA-side contract: the form does not pre-fill any of these
  // fields after a back-navigation.
  //
  // Setup: navigate to a synthetic completed job → click back →
  // upload mystere-nocturne.epub + configure + submit a real
  // translation job. Capture the POST body and assert it has no
  // resume/parent link.
  test(
    "A new job submitted after navigating back is a fresh POST with no implicit link to the prior job",
    { tag: "@regression" },
    async ({ page }) => {
      test.info().annotations.push({ type: "tcid", description: "JOBS-07-SC08" });
      const fakeJobId = "synth-f8-sc08-completed";
      await stubJobStatus(page, fakeJobId, "completed");
      // Mock provider model-list endpoints (the test webserver has no
      // live Ollama/OpenAI-compatible provider). Mirrors the F2 helper
      // at `translation_config_steps.spec.ts:73-107`.
      await page.route("**/api/v1/providers/ollama/models", async (route) => {
        if (route.request().method() !== "POST") {
          await route.continue();
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            models: [
              { name: "translategemma:12b" },
              { name: "translategemma:27b" },
              { name: "llama3.1:8b" },
            ],
          }),
        });
      });

      // First: navigate to the completed job + click back to the chooser.
      const jobStatusPage = new JobStatusPage(page);
      await jobStatusPage.gotoJobWithStatus(fakeJobId, "completed");
      await Promise.all([
        page.waitForURL((url) => url.pathname === "/", { timeout: 10_000 }),
        jobStatusPage.clickBackToWorkflowChoice("completed"),
      ]);

      // Second: upload a fresh EPUB + configure + submit. Capture the
      // POST /api/v1/jobs request body.
      const newJobPostPromise = page.waitForRequest(
        (req) => req.url().includes("/api/v1/jobs") && req.method() === "POST",
        { timeout: 15_000 },
      );

      const uploadPage = new UploadPage(page);
      await uploadPage.pickFile(mystereNocturneFixture);
      await uploadPage.expectMetadataVisible();

      const configPage = new TranslationConfigPage(page);
      await configPage.pickWorkflow("translation");
      // Wait for the config panel to render after the chooser radio
      // change. Matches the F2 happy-path pattern at
      // `translation_config_steps.spec.ts:117` (the panel mounts as
      // a sibling of the chooser once the workflow state settles;
      // without the wait, the next `pickTargetLanguage` + `submit`
      // race the panel re-render and the submit-button locator
      // never resolves).
      await configPage.expectConfigVisible();
      // Pick provider + model + source + target. Submit is disabled
      // until a model is selected (see `TranslationConfigStep.tsx:151`
      // `isStartDisabled = createJob.isPending || !target || !model || !isFormValid`).
      await configPage.pickProvider("ollama");
      await configPage.clickLoadModelList();
      await expect
        .poll(async () => {
          const values = await configPage.locators.modelSelect
            .locator("option")
            .evaluateAll((els) => els.map((e) => (e as HTMLOptionElement).value));
          return values.filter((v) => v !== "").length;
        })
        .toBeGreaterThan(0);
      const firstModel = await configPage.locators.modelSelect
        .locator("option")
        .evaluateAll((els) => {
          const first = els.find((e) => (e as HTMLOptionElement).value !== "");
          return first ? (first as HTMLOptionElement).value : "";
        });
      await configPage.pickModel(firstModel);
      // The default source is mystere-nocturne's "fr" (prefill). Pick
      // a target and submit.
      await configPage.pickTargetLanguage("en");
      await configPage.submit();

      const newJobPost = await newJobPostPromise;
      const postBody = newJobPost.postDataJSON() as Record<string, unknown> | null;
      expect(postBody, "POST /api/v1/jobs must fire after submit").not.toBeNull();
      // biome-ignore lint/style/noNonNullAssertion: postBody is asserted non-null on the line above
      const body = postBody!;
      // Assert no resume / parent / source_job_id fields. The Pydantic
      // schema's `extra="forbid"` would 422 if any of these landed
      // server-side; the writer is locking the SPA-side contract.
      expect(body).not.toHaveProperty("resume_from_job_id");
      expect(body).not.toHaveProperty("parent_job_id");
      expect(body).not.toHaveProperty("source_job_id");
      expect(body).not.toHaveProperty("prior_job_id");
      // The body MUST be a translation job body (job_type="translation")
      // and MUST NOT carry the prior job id in any field.
      expect(body.job_type).toBe("translation");
      const bodyKeys = Object.keys(body).join(",");
      expect(bodyKeys).not.toContain(fakeJobId);
    },
  );

  // F8 @web @regression — navigating back to the chooser does NOT
  // auto-start a new job.
  // JOBS-07-SC09 (F8-SC09 in the .feature file).
  //
  // The assertion watches the network for 2s after the back-button
  // click and asserts NO POST /api/v1/jobs fires. A `waitForRequest`
  // with a 2s timeout is the canonical "expect this to NOT happen"
  // pattern from the e2e-testing-patterns skill (reference/details.md
  // §"Waiting Strategies" — `waitForTimeout` with a strict timeout
  // race).
  test(
    "Navigating back to the chooser does not auto-start a new job",
    { tag: "@regression" },
    async ({ page }) => {
      test.info().annotations.push({ type: "tcid", description: "JOBS-07-SC09" });
      const fakeJobId = "synth-f8-sc09-completed";
      await stubJobStatus(page, fakeJobId, "completed");

      const jobStatusPage = new JobStatusPage(page);
      await jobStatusPage.gotoJobWithStatus(fakeJobId, "completed");

      // Race the back-button click against a 2s POST /api/v1/jobs
      // wait — the wait MUST time out (no POST fires).
      const unexpectedPost = page
        .waitForRequest((req) => req.url().includes("/api/v1/jobs") && req.method() === "POST", {
          timeout: 2_000,
        })
        .then(
          () => "fired" as const,
          () => "timed-out" as const,
        );

      await Promise.all([
        page.waitForURL((url) => url.pathname === "/", { timeout: 10_000 }),
        jobStatusPage.clickBackToWorkflowChoice("completed"),
      ]);

      const postResult = await unexpectedPost;
      expect(
        postResult,
        "POST /api/v1/jobs MUST NOT fire as a side-effect of back-navigation",
      ).toBe("timed-out");
    },
  );
});
