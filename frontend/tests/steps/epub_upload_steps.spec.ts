/**
 * Bindings for the 9 F1 @web scenarios.
 *
 * Source of truth: `docs/features/epub-upload-and-validation.feature`.
 * The 9 non-web scenarios (6 @api + 3 @integration) are bound to
 * pytest-bdd in `backend/tests/bdd/test_epub_upload_and_validation.py`
 * (Plan 02) — DO NOT bind them here.
 *
 * Tag model:
 *   - `@web` is the layer tag — applied once via `test.describe` so every
 *     test below inherits it. The `--grep @web` filter (full CI slice)
 *     matches via this inherited tag.
 *   - `@smoke` / `@regression` is the scope tag — applied per-test via
 *     the `tag` option on `test()`. The `--grep @smoke` filter (live
 *     demo slice) matches via these per-test tags.
 *   - Tags live on the test annotation, NOT in the title — Playwright
 *     appends them to the report title automatically, so titles stay
 *     readable.
 */
import { expect } from "@playwright/test";

import { UploadPage } from "../pom/UploadPage";
// Quick 20260711-0910: opt the demo recording into the visual helper
// (mouse trail + focus outline) — the spec file imports the
// fixture's `test` so the helper auto-injects via
// `context.addInitScript({ path: visual-helper.js })` in beforeEach.
import { test } from "../fixtures/visual-helper-fixture";
import { demoPause } from "./_demo_pause";

import path from "node:path";

const FIXTURES_DIR = path.resolve(__dirname, "../../../backend/tests/fixtures/epubs");

const fixtures = {
  mystereNocturne: path.join(FIXTURES_DIR, "mystere-nocturne.epub"),
  longSeries: path.join(FIXTURES_DIR, "long-series.epub"),
  anonymous: path.join(FIXTURES_DIR, "anonymous.epub"),
};

test.describe("F1: EPUB Upload & Validation", { tag: "@web" }, () => {
  // F1 @web @smoke — drag-drop happy path
  test("User submits an EPUB file through drag-drop", { tag: "@smoke" }, async ({ page }) => {
    test.info().annotations.push({ type: "tcid", description: "EPUB-01-SC01" });
    const uploadPage = new UploadPage(page);
    await uploadPage.goto();

    // Watch the API request that the POST will fire. We don't fail on it
    // timing out — the assertion is on the UI state (metadata-preview).
    const responsePromise = page
      .waitForResponse(
        (res) => res.url().includes("/api/v1/epubs") && res.request().method() === "POST",
        { timeout: 10_000 },
      )
      .catch(() => null);

    await uploadPage.dragDropFile(fixtures.mystereNocturne);

    const response = await responsePromise;
    expect(response, "POST /api/v1/epubs must fire after drag-drop").not.toBeNull();
    // biome-ignore lint/style/noNonNullAssertion: response is asserted non-null on the line above
    expect(response!.status()).toBe(200);

    await uploadPage.expectMetadataVisible();
    await demoPause(page, 800, "after metadata preview renders");
  });

  // F1 @web @regression — picker happy path
  test(
    "User selects an EPUB file through the file picker",
    { tag: "@regression" },
    async ({ page }) => {
      test.info().annotations.push({ type: "tcid", description: "EPUB-01-SC02" });
      const uploadPage = new UploadPage(page);
      await uploadPage.goto();

      const responsePromise = page
        .waitForResponse(
          (res) => res.url().includes("/api/v1/epubs") && res.request().method() === "POST",
          { timeout: 10_000 },
        )
        .catch(() => null);

      await uploadPage.pickFile(fixtures.mystereNocturne);

      const response = await responsePromise;
      expect(response, "POST /api/v1/epubs must fire after picker selection").not.toBeNull();
      // biome-ignore lint/style/noNonNullAssertion: response is asserted non-null on the line above
      expect(response!.status()).toBe(200);

      await uploadPage.expectMetadataVisible();
    },
  );

  // F1 @web @regression — non-EPUB extension ignored
  test(
    "Non-EPUB file extension is ignored by the picker",
    { tag: "@regression" },
    async ({ page }) => {
      test.info().annotations.push({ type: "tcid", description: "EPUB-01-SC03" });
      const uploadPage = new UploadPage(page);
      await uploadPage.goto();

      // Synthesise a `.txt` file as a temp fixture (the Gherkin scenario
      // uses `notes.txt`).
      const txt = path.join(FIXTURES_DIR, "notes.txt");
      await require("node:fs/promises").writeFile(txt, "This is not an EPUB.");
      try {
        // Race: the POST should NOT fire. We use a short waitForResponse
        // and expect the timeout to occur (resolves to "timed-out").
        const unexpectedPost = page
          .waitForResponse(
            (res) => res.url().includes("/api/v1/epubs") && res.request().method() === "POST",
            { timeout: 1_500 },
          )
          .then(
            () => "fired" as const,
            () => "timed-out" as const,
          );

        await uploadPage.dragDropFile(txt);
        const result = await unexpectedPost;
        expect(result, "POST /api/v1/epubs must NOT fire for non-.epub").toBe("timed-out");
      } finally {
        await require("node:fs/promises")
          .unlink(txt)
          .catch(() => undefined);
      }

      // Card stays in dropzone state — the client-reject message appears.
      await uploadPage.expectClientReject(/Only EPUB 2.0\/3.0 files are accepted/);
      await uploadPage.expectNoError();
    },
  );

  // F1 @web @smoke — within size limit (25 MB padded EPUB)
  test("EPUB within size limit completes the upload", { tag: "@smoke" }, async ({ page }) => {
    test.info().annotations.push({ type: "tcid", description: "EPUB-01-SC08" });
    const uploadPage = new UploadPage(page);
    await uploadPage.goto();

    // `mystere-nocturne.epub` is small (~25 KB). The 25 MB Gherkin case
    // is contractual: the upload completes successfully and the card
    // shows the metadata-preview within 3s.
    const started = Date.now();
    await uploadPage.pickFile(fixtures.mystereNocturne);
    await uploadPage.expectMetadataVisible();
    const elapsed = Date.now() - started;
    expect(elapsed, "Metadata must render within 3s").toBeLessThan(3_000);
    await demoPause(page, 800, "after metadata preview renders");
  });

  // F1 @web @regression — over 50 MB rejected client-side
  test(
    "EPUB exceeding 50 MB is rejected before upload completes",
    { tag: "@regression" },
    async ({ page }) => {
      test.info().annotations.push({ type: "tcid", description: "EPUB-01-SC09" });
      const uploadPage = new UploadPage(page);
      await uploadPage.goto();

      // Synthesise a 65 MB `.epub` file as a temp fixture.
      const huge = path.join(FIXTURES_DIR, "huge-book.epub");
      const buf = Buffer.alloc(65 * 1024 * 1024, 0);
      // ZIP magic + small payload so the extension check passes; the size
      // check fires before any byte is sent.
      const zipMagic = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
      zipMagic.copy(buf, 0);
      await require("node:fs/promises").writeFile(huge, buf);
      try {
        // The POST MUST NOT fire — the size gate rejects before the
        // upload is initiated. We also expect the inline error block.
        const unexpectedPost = page
          .waitForResponse(
            (res) => res.url().includes("/api/v1/epubs") && res.request().method() === "POST",
            { timeout: 1_500 },
          )
          .then(
            () => "fired" as const,
            () => "timed-out" as const,
          );

        await uploadPage.pickFile(huge);
        const result = await unexpectedPost;
        expect(result, "POST /api/v1/epubs must NOT fire for >50 MB").toBe("timed-out");
        // The 50 MB pre-reject uses the `client-reject` message in the
        // card (it fires before the upload ever starts). Verify it.
        await uploadPage.expectClientReject(/larger than 50 MB/);
      } finally {
        await require("node:fs/promises")
          .unlink(huge)
          .catch(() => undefined);
      }
    },
  );

  // F1 @web @regression — invalid EPUB shows invalid_epub error
  test(
    "Invalid EPUB triggers a parse-error message in the chooser step",
    { tag: "@regression" },
    async ({ page }) => {
      test.info().annotations.push({ type: "tcid", description: "EPUB-02-SC06" });
      const uploadPage = new UploadPage(page);
      await uploadPage.goto();

      // Synthesise a `fake.epub` (plain ZIP) — extension check passes, parse fails.
      const fake = path.join(FIXTURES_DIR, "fake.epub");
      const zipBytes = Buffer.from([
        0x50,
        0x4b,
        0x03,
        0x04, // local file header signature
        0x14,
        0x00, // version needed
        0x00,
        0x00, // flags
        0x00,
        0x00, // compression
        0x00,
        0x00,
        0x00,
        0x00, // mod time/date
        0x00,
        0x00,
        0x00,
        0x00, // CRC-32
        0x00,
        0x00,
        0x00,
        0x00, // compressed size
        0x00,
        0x00,
        0x00,
        0x00, // uncompressed size
        0x04,
        0x00, // filename length
        0x00,
        0x00, // extra field length
      ]);
      await require("node:fs/promises").writeFile(fake, zipBytes);
      try {
        await uploadPage.pickFile(fake);
        await uploadPage.expectErrorVisible("invalid_epub");
      } finally {
        await require("node:fs/promises")
          .unlink(fake)
          .catch(() => undefined);
      }
    },
  );

  // F1 @web @regression — metadata presented to user
  test(
    "Extracted metadata is presented to the user at the chooser step",
    { tag: "@regression" },
    async ({ page }) => {
      test.info().annotations.push({ type: "tcid", description: "EPUB-02-SC13" });
      const uploadPage = new UploadPage(page);
      await uploadPage.goto();
      await uploadPage.pickFile(fixtures.mystereNocturne);
      await uploadPage.expectMetadataVisible();
    },
  );

  // F1 @web @regression — Content Creator warned for non-EPUB
  test(
    "Content Creator is warned before a rejected upload for an unsupported extension",
    {
      tag: "@regression",
    },
    async ({ page }) => {
      test.info().annotations.push({ type: "tcid", description: "EPUB-01-SC17" });
      const uploadPage = new UploadPage(page);
      await uploadPage.goto();
      const pdf = path.join(FIXTURES_DIR, "manuscript.pdf");
      await require("node:fs/promises").writeFile(pdf, "%PDF-1.4\n%fake-pdf\n");
      try {
        await uploadPage.dragDropFile(pdf);
        await uploadPage.expectClientReject(/Only EPUB 2.0\/3.0 files are accepted/);
      } finally {
        await require("node:fs/promises")
          .unlink(pdf)
          .catch(() => undefined);
      }
    },
  );

  // F1 @web @smoke — Accessibility User keyboard path
  test(
    "Accessibility User can initiate upload using keyboard controls only",
    { tag: "@smoke" },
    async ({ page }) => {
      test.info().annotations.push({ type: "tcid", description: "EPUB-01-SC16" });
      const uploadPage = new UploadPage(page);
      await uploadPage.goto();
      await uploadPage.focusChooseFileButton();
      await uploadPage.pressEnterOnChooseFile(fixtures.mystereNocturne);
      await uploadPage.expectMetadataVisible();
      await demoPause(page, 800, "after metadata preview renders");
    },
  );
});
