/**
 * Playwright bindings for the 2 Phase 1 plan 01 F1 @web scenarios:
 *  - "Continue button scrolls the page to the workflow chooser" (EPUB-01-SC18, @web @smoke)
 *  - "Upload another re-opens the file picker" (EPUB-01-SC19, @web @regression)
 *
 * Source of truth: `docs/features/epub-upload-and-validation.feature`
 * under the new `Rule: Continue scrolls to the workflow chooser` and
 * `Rule: Upload another re-opens the file picker` blocks. The BDD
 * scenarios stay as the contract; the Playwright spec is the
 * executable binding (mirror of the F1 spec pattern in
 * `epub_upload_steps.spec.ts`).
 *
 * Kept in a separate file from `epub_upload_steps.spec.ts` to avoid
 * merge friction with the existing F1 tests; future consolidation is
 * a routine follow-up.
 */
import path from "node:path";
import { expect } from "@playwright/test";

import { UploadPage } from "../pom/UploadPage";
// Quick 20260711-0910: opt the demo recording into the visual helper
// (mouse trail + focus outline) — the spec file imports the
// fixture's `test` so the helper auto-injects via
// `context.addInitScript({ path: visual-helper.js })` in beforeEach.
import { test } from "../fixtures/visual-helper-fixture";

const FIXTURES_DIR = path.resolve(__dirname, "../../../backend/tests/fixtures/epubs");

const fixtures = {
  mystereNocturne: path.join(FIXTURES_DIR, "mystere-nocturne.epub"),
  anonymous: path.join(FIXTURES_DIR, "anonymous.epub"),
};

test.describe("F1: Upload card UX (Phase 1 plan 01)", { tag: "@web" }, () => {
  // F1 @web @smoke — Continue button scrolls to the chooser
  test(
    "Continue button scrolls the page to the workflow chooser",
    { tag: "@smoke" },
    async ({ page }) => {
      test.info().annotations.push({ type: "tcid", description: "EPUB-01-SC18" });
      const uploadPage = new UploadPage(page);
      await uploadPage.goto();
      await uploadPage.pickFile(fixtures.mystereNocturne);
      await uploadPage.expectMetadataVisible();

      // Click Continue — the smooth-scroll handler must move the
      // chooser into the viewport. We assert the chooser's bounding
      // box is within the viewport's lower half (per Playwright 1.56
      // `toBeInViewport({ ratio: 0.5 })`).
      await uploadPage.locators.continueCta.click();
      const chooserStep = page.locator("#chooser-step");
      await expect(chooserStep).toBeInViewport({ ratio: 0.5 });
    },
  );

  // F1 @web @regression — Upload another re-opens the file picker
  test("Upload another re-opens the file picker", { tag: "@regression" }, async ({ page }) => {
    test.info().annotations.push({ type: "tcid", description: "EPUB-01-SC19" });
    const uploadPage = new UploadPage(page);
    await uploadPage.goto();
    await uploadPage.pickFile(fixtures.mystereNocturne);
    await uploadPage.expectMetadataVisible();

    // Click "Upload another" — the filechooser event must fire
    // within 1s (Playwright's default timeout for the event
    // listener). We then assert the metadata preview flipped back
    // to the dropzone state.
    const [chooser] = await Promise.all([
      page.waitForEvent("filechooser", { timeout: 1000 }),
      uploadPage.locators.reset.click(),
    ]);
    expect(chooser).toBeTruthy();

    // The card must be back in the dropzone state — the parent
    // cleared `metadata` + `error`, so the metadata-preview is
    // gone and the "Choose file" button is visible again.
    await expect(uploadPage.locators.metadataPreview).toHaveCount(0);
    await expect(uploadPage.locators.chooseFileButton).toBeVisible();

    // Round-trip: selecting a NEW file via the re-opened picker
    // re-runs the upload flow and the new metadata is visible.
    await chooser.setFiles(fixtures.anonymous);
    await uploadPage.expectMetadataVisible();
  });
});
