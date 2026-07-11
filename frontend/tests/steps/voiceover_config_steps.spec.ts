import path from "node:path";
/**
 * Bindings for the 4 F4 voiceover @web BDD scenarios.
 *
 * Source of truth: `docs/features/voice-over-generation.feature`
 * (D-16 + D-17 + D-15 + D-07 UX invariants).
 *
 * Tag model:
 *   - `@web` is the layer tag — applied once via `test.describe` so
 *     every test below inherits it. The `--grep @web` filter (full
 *     CI slice) matches via this inherited tag.
 *   - `@smoke` / `@regression` is the scope tag — applied per-test
 *     via the `tag` option on `test()`. The `--grep @smoke` filter
 *     (live demo slice) matches via these per-test tags.
 *
 * The fixture pattern for every test:
 *   1. `uploadPage.goto()` + `uploadPage.pickFile(...)` → upload happy path
 *   2. `uploadPage.expectMetadataVisible()` → metadata preview renders
 *   3. `voiceoverConfigPage.pickWorkflow("voiceover")` → expose the
 *      voiceover config panel
 *   4. Exercise the scenario's flow
 *   5. Assert the scenario's expected behaviour
 */
import { expect } from "@playwright/test";

import { UploadPage } from "../pom/UploadPage";
import { VoiceoverConfigPage } from "../pom/VoiceoverConfigPage";
// Quick 20260711-0910: opt the demo recording into the visual helper
// (mouse trail + focus outline) — the spec file imports the
// fixture's `test` so the helper auto-injects via
// `context.addInitScript({ path: visual-helper.js })` in beforeEach.
import { test } from "../fixtures/visual-helper-fixture";
import { demoPause } from "./_demo_pause";

const FIXTURES_DIR = path.resolve(__dirname, "../../../backend/tests/fixtures/epubs");
const fixture = path.join(FIXTURES_DIR, "mystere-nocturne.epub");

/**
 * Helper: upload an EPUB + pick the chooser workflow + assert the
 * voiceover config panel is rendered. Returns the page objects.
 */
async function bootVoiceoverFlow(
  page: import("@playwright/test").Page,
  workflow: "voiceover" | "both" = "voiceover",
) {
  const uploadPage = new UploadPage(page);
  await uploadPage.goto();
  await uploadPage.pickFile(fixture);
  await uploadPage.expectMetadataVisible();

  const configPage = new VoiceoverConfigPage(page);
  await configPage.pickWorkflow(workflow);
  await configPage.expectChooserSelected(workflow);
  return { uploadPage, configPage };
}

test.describe("F4: Voice-Over Configuration", { tag: "@web" }, () => {
  // F4 @web @smoke — voiceover config panel renders after voiceover selection.
  // VOICE-01-SC01 (D-16).
  test(
    "Voice-Over config panel renders after Voice-Over selection",
    { tag: "@smoke" },
    async ({ page }) => {
      test.info().annotations.push({ type: "tcid", description: "VOICE-01-SC01" });
      const { configPage } = await bootVoiceoverFlow(page, "voiceover");
      await configPage.expectConfigVisible();
      // D-16: source language is read-only; the EPUB is mystere-nocturne
      // (French; declares "fr"). Wait for the metadata fetch to
      // resolve before asserting the display.
      await configPage.expectSourceLanguageDisplay("fr");
      await demoPause(page, 800, "after voiceover config panel renders");
    },
  );

  // F4 @web @regression — voice dropdown populated from GET /api/v1/voices.
  // VOICE-02-SC01 (D-07).
  test(
    "Voice dropdown is populated from the canonical voice catalog",
    { tag: "@regression" },
    async ({ page }) => {
      test.info().annotations.push({ type: "tcid", description: "VOICE-02-SC01" });
      const { configPage } = await bootVoiceoverFlow(page, "voiceover");
      // The full OpenAI voice list is rendered (no per-language
      // matching — voices are a fixed set, not a per-language matrix).
      await configPage.expectVoiceDropdownPopulated([
        "alloy",
        "ash",
        "ballad",
        "coral",
        "echo",
        "fable",
        "onyx",
        "nova",
        "sage",
        "shimmer",
        "verse",
        "marin",
        "cedar",
      ]);
    },
  );

  // F4 @web @smoke — submit posts a voiceover body to /api/v1/jobs and
  // navigates to /jobs?id=<jobId>. The backend Phase 2/3 voiceover
  // pipeline accepts the body and returns 202 + a JobView.
  // VOICE-01-SC02 (D-15 + D-13).
  test(
    "Voice-Over submit posts a voiceover body and navigates to /jobs?id=",
    { tag: "@smoke" },
    async ({ page }) => {
      test.info().annotations.push({ type: "tcid", description: "VOICE-01-SC02" });
      const { configPage } = await bootVoiceoverFlow(page, "voiceover");
      // Wait for the source language display to land before
      // submitting (so the form is in a fully-rendered state).
      await configPage.expectSourceLanguageDisplay("fr");
      // Phase 1 plan 03: enter a fake API key so the Start button
      // is enabled (the Zod schema requires non-empty key).
      await configPage.setApiKey("sk-test-fake-key");
      // Pause before submit so the recording shows the fully-filled
      // form just before the navigation.
      await demoPause(page, 800, "after voiceover form is fully filled, before submit");
      // Submit — the SPA navigates to /jobs?id=<jobId>
      await Promise.all([page.waitForURL(/\/jobs\?id=/, { timeout: 15_000 }), configPage.submit()]);
    },
  );

  // F4 @web @regression — chooser card no longer renders "Coming soon"
  // badge for voiceover (D-16); the `both` card KEEPS its badge (D-17).
  // VOICE-01-SC03 (D-16 + D-17).
  test(
    "Voice-Over chooser card no longer shows the Coming soon badge; both keeps it",
    { tag: "@regression" },
    async ({ page }) => {
      test.info().annotations.push({ type: "tcid", description: "VOICE-01-SC03" });
      const { configPage } = await bootVoiceoverFlow(page, "voiceover");
      // D-16: voiceover card has no badge.
      await configPage.expectVoiceoverChooserBadgeAbsent();
      // D-17: both card keeps its badge.
      await configPage.expectBothChooserBadgePresent();
    },
  );

  // ── Phase 1 plan 03: voice-over form alignment with translation form

  // F4 @web @smoke — OpenAI Base URL + API key fields at the top
  test(
    "Voice-over form shows OpenAI Base URL and OpenAI API key at the top",
    { tag: "@smoke" },
    async ({ page }) => {
      test.info().annotations.push({ type: "tcid", description: "VOICE-01-SC04" });
      const { configPage } = await bootVoiceoverFlow(page, "voiceover");
      // The OpenAI Base URL + API key fields are visible.
      await expect(configPage.locators.baseUrlInput).toBeVisible();
      await expect(configPage.locators.apiKeyInput).toBeVisible();
      // The base URL is pre-populated with the buildtime default.
      // Production: https://api.openai.com/v1; e2e suite: the
      // playwright webServer overrides the env to point at the
      // in-network mock-llm-service, so accept either.
      await expect(configPage.locators.baseUrlInput).toHaveValue(
        process.env.EPUBTV_DEFAULT_OPENAI_URL ?? "https://api.openai.com/v1",
      );
    },
  );

  // F4 @web @smoke — language field is labeled "Voice-over Language" with full names
  test(
    "Voice-over language field is labeled 'Voice-over Language' and shows full language names",
    { tag: "@smoke" },
    async ({ page }) => {
      test.info().annotations.push({ type: "tcid", description: "VOICE-02-SC03" });
      const { configPage } = await bootVoiceoverFlow(page, "voiceover");
      // The label is "Voice-over Language" (renamed from "Source language").
      await expect(configPage.locators.voiceoverLanguageLabel).toHaveText("Voice-over Language");
      // The dropdown shows the full language name (e.g. "English (en)"
      // for an English EPUB) — mystere-nocturne declares "fr" so
      // the option text is "French (fr)".
      const optionText = await configPage.locators.voiceoverLanguageSelect
        .locator("option")
        .evaluateAll((els) => els.map((e) => (e as HTMLOptionElement).textContent));
      expect(optionText.some((t) => t?.trim() === "French (fr)")).toBe(true);
    },
  );

  // F4 @web @smoke — Start Voice-Over button is disabled until the form is valid
  test(
    "Start Voice-Over button is disabled until the form is valid",
    { tag: "@smoke" },
    async ({ page }) => {
      test.info().annotations.push({ type: "tcid", description: "VOICE-01-SC05" });
      const { configPage } = await bootVoiceoverFlow(page, "voiceover");
      // No API key entered yet — the Start button is disabled
      // (Zod schema requires non-empty API key).
      await configPage.expectStartDisabled();
      // Enter a fake API key — the Start button is enabled.
      await configPage.setApiKey("sk-test-fake-key");
      await configPage.expectStartEnabled();
    },
  );

  // F4 @web @regression — broken Settings link is removed from the home page
  test(
    "The broken Settings link is removed from the workflow chooser page",
    { tag: "@regression" },
    async ({ page }) => {
      test.info().annotations.push({ type: "tcid", description: "INFRA-06-SC01" });
      const uploadPage = new UploadPage(page);
      await uploadPage.goto();
      await uploadPage.pickFile(fixture);
      await uploadPage.expectMetadataVisible();
      // The Settings link is GONE — the home page no longer has a
      // top-level <p class="page__settings-link"> block.
      await expect(page.locator("p.page__settings-link")).toHaveCount(0);
      // The /settings route is still functional via direct URL — but
      // there is NO in-page anchor linking to it from the home page.
      await expect(page.locator('a[href="/settings"]')).toHaveCount(0);
    },
  );
});
