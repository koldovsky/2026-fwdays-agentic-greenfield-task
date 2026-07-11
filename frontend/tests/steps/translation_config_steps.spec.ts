import path from "node:path";
/**
 * Bindings for the 9 F2 @web BDD scenarios.
 *
 * Source of truth: `docs/features/translation-configuration.feature`.
 * The 3 non-web scenarios (2 @api + 1 @integration) are bound to
 * pytest-bdd in `backend/tests/bdd/test_translation_configuration.py`
 * (Plan 02-06) — DO NOT bind them here.
 *
 * Tag model:
 *   - `@web` is the layer tag — applied once via `test.describe` so every
 *     test below inherits it. The `--grep @web` filter (full CI slice)
 *     matches via this inherited tag.
 *   - `@smoke` / `@regression` is the scope tag — applied per-test via
 *     the `tag` option on `test()`. The `--grep @smoke` filter (live
 *     demo slice) matches via these per-test tags.
 *
 * The fixture pattern for every test:
 *   1. `uploadPage.goto()` + `uploadPage.pickFile(...)` → upload happy path
 *   2. `uploadPage.expectMetadataVisible()` → metadata preview renders
 *   3. `translationConfigPage.pickWorkflow("translation")` → expose config
 *   4. Exercise the scenario's flow
 *   5. Assert the scenario's expected behaviour
 */
import { expect } from "@playwright/test";

import { TranslationConfigPage } from "../pom/TranslationConfigPage";
import { UploadPage } from "../pom/UploadPage";
// Quick 20260711-0910: opt the demo recording into the visual helper
// (mouse trail + focus outline) — the spec file imports the
// fixture's `test` so the helper auto-injects via
// `context.addInitScript({ path: visual-helper.js })` in beforeEach.
import { test } from "../fixtures/visual-helper-fixture";
import { demoPause } from "./_demo_pause";

const FIXTURES_DIR = path.resolve(__dirname, "../../../backend/tests/fixtures/epubs");

const fixtures = {
  mystereNocturne: path.join(FIXTURES_DIR, "mystere-nocturne.epub"),
  bilingualReader: path.join(FIXTURES_DIR, "bilingual-reader.epub"),
  longSeries: path.join(FIXTURES_DIR, "long-series.epub"),
  anonymous: path.join(FIXTURES_DIR, "anonymous.epub"),
};

/**
 * Helper: upload an EPUB + pick the chooser workflow + assert the config
 * panel is in the expected visibility state. Returns the page object.
 */
async function bootConfigFlow(
  page: import("@playwright/test").Page,
  workflow: "translation" | "voiceover" | "both",
  fixture: string = fixtures.mystereNocturne,
) {
  const uploadPage = new UploadPage(page);
  await uploadPage.goto();
  await uploadPage.pickFile(fixture);
  await uploadPage.expectMetadataVisible();

  const configPage = new TranslationConfigPage(page);
  await configPage.pickWorkflow(workflow);
  await configPage.expectChooserSelected(workflow);
  return { uploadPage, configPage };
}

/**
 * Phase 1 plan 04 (BACK-03 + BACK-05): the Load Models button now
 * POSTs to the per-provider endpoint with the body
 * `{base_url, api_key}`. The test webserver (a single uvicorn
 * process on :5173) does NOT have a live Ollama or OpenAI-compatible
 * provider, so the POST would 502 `provider_unreachable` in tests
 * that rely on a successful model list. We mock both POST
 * endpoints with `page.route()` to return the canned catalog so the
 * SPA can populate the model dropdown end-to-end.
 *
 * The canned model lists mirror the v1.1 demo's documented catalog
 * (the SPA renders the same `<option>` values regardless of source).
 */
async function mockProviderModelsEndpoints(page: import("@playwright/test").Page): Promise<void> {
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
  await page.route("**/api/v1/providers/openai-compatible/models", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        models: [
          { id: "gpt-4o-mini", object: "model", created: 1700000000, owned_by: "openai" },
          { id: "gpt-4o", object: "model", created: 1700000000, owned_by: "openai" },
        ],
      }),
    });
  });
}

/**
 * D-09 NLTK health mock. The three-state banner is keyed on the
 * source language vs. the response's `supported_languages` +
 * `fallback_languages` arrays. We mock the endpoint so the test
 * does not depend on what's actually baked in the test
 * webserver's venv.
 *
 * Modes:
 *   - "all-baked"  — `supported_languages` has the 19 closed set
 *                    and `fallback_languages` is empty. Source in
 *                    supported → no banner.
 *   - "fallback"   — `fallback_languages` contains the codes we
 *                    want to trigger the install-command banner
 *                    (NLTK has them but the pickle is missing).
 *   - "unsupported" — `supported_languages` is missing the codes
 *                    we want to trigger the no-install-command
 *                    banner (NLTK does not ship a tokenizer for
 *                    those languages).
 */
async function mockNltkHealth(
  page: import("@playwright/test").Page,
  mode: "all-baked" | "fallback" | "unsupported",
): Promise<void> {
  const SUPPORTED: ReadonlyArray<string> = [
    "cs",
    "da",
    "de",
    "el",
    "en",
    "es",
    "et",
    "fi",
    "fr",
    "it",
    "ml",
    "nl",
    "no",
    "pl",
    "pt",
    "ru",
    "sl",
    "sv",
    "tr",
  ];
  let supported = [...SUPPORTED];
  let fallback: string[] = [];
  let suggestCommand: string | null = null;
  if (mode === "fallback") {
    // "fr" is in supported but the punkt_tab pickle is missing —
    // triggers the install-command banner.
    fallback = ["fr"];
    suggestCommand = "python -m nltk.downloader punkt_tab";
  } else if (mode === "unsupported") {
    // Drop "fr" from supported so the banner renders without the
    // install command (NLTK does not ship a tokenizer for "fr").
    supported = SUPPORTED.filter((code) => code !== "fr");
  }
  await page.route("**/api/v1/health/nltk", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        supported_languages: supported,
        fallback_languages: fallback,
        suggest_command: suggestCommand,
        install_size_mb_estimate: suggestCommand ? 4 : null,
      }),
    });
  });
}

test.describe("F2: Translation Configuration", { tag: "@web" }, () => {
  // F2 @web @smoke — Translation chooser surfaces all 4 fields
  test(
    "Translation configuration surfaces all four fields after Translation or both selection",
    { tag: "@smoke" },
    async ({ page }) => {
      test.info().annotations.push({ type: "tcid", description: "CONF-01-SC01" });
      const { configPage } = await bootConfigFlow(page, "translation");
      await configPage.expectConfigVisible();
      await demoPause(page, 800, "after translation config panel renders");
    },
  );

  // F2 @web @smoke — "both" chooser also surfaces the 4 fields
  test(
    "Translation configuration also surfaces when the user selected both",
    { tag: "@smoke" },
    async ({ page }) => {
      test.info().annotations.push({ type: "tcid", description: "CONF-01-SC02" });
      const { configPage } = await bootConfigFlow(page, "both");
      await configPage.expectConfigVisible();
      await demoPause(page, 800, "after translation config panel renders (both workflow)");
    },
  );

  // F2 @web @regression — Voice-Over only hides translation fields
  // Phase 3 (D-16): voiceover workflow no longer shows the "Coming
  // soon" inline notice — the `<VoiceoverConfigStep>` is the real
  // config panel. The chooser card no longer renders the "Coming
  // soon" badge either (D-16); only the `both` card keeps its badge
  // (D-17 — combined-workflow is Phase 4).
  test(
    "No translation fields render when the user selected Voice-Over only",
    { tag: "@regression" },
    async ({ page }) => {
      test.info().annotations.push({ type: "tcid", description: "CONF-01-SC03" });
      const { configPage } = await bootConfigFlow(page, "voiceover");
      await configPage.expectConfigHidden();
      // D-16: voiceover does NOT show the inline "coming soon" notice
      // (the notice now only renders for the `both` workflow).
      await configPage.expectVoiceoverComingSoonAbsent();
    },
  );

  // F2 @web @smoke — source prefill when EPUB declares a single language
  test(
    "Source language defaults to the single language declared by the EPUB",
    { tag: "@smoke" },
    async ({ page }) => {
      test.info().annotations.push({ type: "tcid", description: "CONF-02-SC04" });
      const { configPage } = await bootConfigFlow(page, "translation", fixtures.mystereNocturne);
      // mystere-nocturne.epub declares French ("fr"). Wait for the metadata
      // fetch to resolve before asserting the prefill.
      await expect
        .poll(async () => await configPage.locators.sourceLanguage.inputValue())
        .toBe("fr");
      await configPage.expectSourcePrefilledWith("fr");
      await demoPause(page, 800, "after source language prefill lands");
    },
  );

  // F2 @web @regression — source left blank when EPUB declares >1 language
  test(
    "Source language remains unset when the EPUB declares multiple languages",
    { tag: "@regression" },
    async ({ page }) => {
      test.info().annotations.push({ type: "tcid", description: "CONF-02-SC05" });
      const { configPage } = await bootConfigFlow(page, "translation", fixtures.bilingualReader);
      // Wait for the metadata fetch to resolve + the hint to render.
      await configPage.expectSourceHintVisible();
      await configPage.expectSourceBlank();
    },
  );

  // F2 @web @smoke — Ollama provider lists models
  // Phase 1 plan 04: the model list is now populated by clicking
  // "Load Model List" — the SPA POSTs to
  // `/api/v1/providers/ollama/models` with body `{base_url}` and
  // renders the response. The test webserver doesn't have a live
  // Ollama, so we mock the POST endpoint with the canned catalog.
  test(
    "Choosing the Ollama provider lists its available models",
    { tag: "@smoke" },
    async ({ page }) => {
      test.info().annotations.push({ type: "tcid", description: "CONF-02-SC06" });
      await mockProviderModelsEndpoints(page);
      const { configPage } = await bootConfigFlow(page, "translation");
      await configPage.pickProvider("ollama");
      // The base URL field is pre-populated from the buildtime
      // constant; just click Load Model List.
      await configPage.clickLoadModelList();
      await expect
        .poll(async () => {
          const values = await configPage.locators.modelSelect
            .locator("option")
            .evaluateAll((els) => els.map((e) => (e as HTMLOptionElement).value));
          return values.filter((v) => v !== "").length;
        })
        .toBeGreaterThan(0);
      await configPage.expectModelSelectPopulated();
      // Assert the canned model names (Phase 1 plan 04 update).
      const opts = await configPage.locators.modelSelect
        .locator("option")
        .evaluateAll((els) => els.map((e) => (e as HTMLOptionElement).value));
      expect(opts).toContain("translategemma:12b");
      expect(opts).toContain("translategemma:27b");
      expect(opts).toContain("llama3.1:8b");
      await demoPause(page, 800, "after model select is populated");
    },
  );

  // F2 @web @regression — OpenAI-compatible requires API key
  // Phase 1 plan 04: the SPA POSTs `{base_url, api_key}` to
  // `/api/v1/providers/openai-compatible/models`. The test webserver
  // doesn't have a live OpenAI-compatible provider, so we mock the
  // POST endpoint with the canned catalog.
  test(
    "Choosing an OpenAI-compatible provider requires an API key",
    { tag: "@regression" },
    async ({ page }) => {
      test.info().annotations.push({ type: "tcid", description: "CONF-02-SC07" });
      await mockProviderModelsEndpoints(page);
      const { configPage } = await bootConfigFlow(page, "translation");
      // Default provider is OpenAI-compatible (Phase 1 plan 02). The
      // model select is empty (placeholder only) until the key is
      // entered + Load Model List returns 2xx.
      await expect(configPage.locators.openaiApikeyForm).toBeVisible();
      await configPage.expectModelSelectEmpty();
      // Enter a key + click Load Model List — the model select populates.
      await configPage.setOpenAIApiKey("sk-test-fake-key");
      await configPage.clickLoadModelList();
      await expect
        .poll(async () => {
          const values = await configPage.locators.modelSelect
            .locator("option")
            .evaluateAll((els) => els.map((e) => (e as HTMLOptionElement).value));
          return values.filter((v) => v !== "").length;
        })
        .toBeGreaterThan(0);
      // Assert the canned model names (Phase 1 plan 04 update).
      const opts = await configPage.locators.modelSelect
        .locator("option")
        .evaluateAll((els) => els.map((e) => (e as HTMLOptionElement).value));
      expect(opts).toContain("gpt-4o-mini");
      expect(opts).toContain("gpt-4o");
    },
  );

  // F2 @integration @regression — ≥55 target languages (also @web @integration)
  // Bound here per the plan: the assertion is on the dropdown options, not
  // the backend API.
  test("Target languages include at least 55 options", { tag: "@regression" }, async ({ page }) => {
    test.info().annotations.push({ type: "tcid", description: "CONF-02-SC10" });
    const { configPage } = await bootConfigFlow(page, "translation");
    await configPage.expectTargetLanguageCountGte(55);
  });

  // F2 @web @regression — the 9th scenario: target language that differs
  // from the source. Asserts the target select accepts a different value
  // and the same-lang warning does NOT show.
  test(
    "A Language Learner selects a target language that differs from the source",
    { tag: "@regression" },
    async ({ page }) => {
      test.info().annotations.push({ type: "tcid", description: "CONF-02-SC11" });
      const { configPage } = await bootConfigFlow(page, "translation", fixtures.mystereNocturne);
      // Wait for the source prefill (fr) to land.
      await expect
        .poll(async () => await configPage.locators.sourceLanguage.inputValue())
        .toBe("fr");
      // Pick a different target — e.g. "en" (English).
      await configPage.pickTargetLanguage("en");
      await expect(configPage.locators.targetLanguage).toHaveValue("en");
      // Same-language warning must NOT show (source=fr, target=en).
      await configPage.expectSameLangWarningHidden();
    },
  );

  // F2 @web @regression — same language for source + target shows guidance
  test(
    "Selecting the same language for source and target shows guidance",
    { tag: "@regression" },
    async ({ page }) => {
      test.info().annotations.push({ type: "tcid", description: "CONF-02-SC12" });
      const { configPage } = await bootConfigFlow(page, "translation", fixtures.mystereNocturne);
      // Source pre-fills to "fr"; pick the same for target.
      await expect
        .poll(async () => await configPage.locators.sourceLanguage.inputValue())
        .toBe("fr");
      await configPage.pickTargetLanguage("fr");
      await configPage.expectSameLangWarningVisible();
    },
  );

  // ── Phase 1 plan 02: dynamic model loading + provider-conditional Base URL fields

  // F2 @web @smoke — default provider is OpenAI-compatible
  test("Default translation provider is OpenAI-compatible", { tag: "@smoke" }, async ({ page }) => {
    test.info().annotations.push({ type: "tcid", description: "CONF-02-SC13" });
    const { configPage } = await bootConfigFlow(page, "translation");
    // The provider <select> is rendered with the value of the
    // local state; the default is now "openai-compatible"
    // (was "ollama" before Phase 1 plan 02).
    await expect(configPage.locators.providerSelect).toHaveValue("openai-compatible");
    // The OpenAI-compatible key form is visible by default.
    await expect(configPage.locators.openaiApikeyForm).toBeVisible();
    // The base URL field for OpenAI is pre-populated with the
    // buildtime default. Production: https://api.openai.com/v1; e2e
    // suite: the playwright webServer overrides the env to point at
    // the in-network mock-llm-service, so accept either.
    await expect(configPage.locators.baseUrlInput).toHaveValue(
      process.env.EPUBTV_DEFAULT_OPENAI_URL ?? "https://api.openai.com/v1",
    );
  });

  // F2 @web @smoke — Load Model List button populates the model dropdown
  test(
    "Load Model List button populates the Model dropdown for the OpenAI-compatible provider",
    { tag: "@smoke" },
    async ({ page }) => {
      test.info().annotations.push({ type: "tcid", description: "CONF-02-SC14" });
      await mockProviderModelsEndpoints(page);
      const { configPage } = await bootConfigFlow(page, "translation");
      // The base URL field is pre-populated from the buildtime
      // constant; just enter the key + click Load Model List.
      await configPage.setOpenAIApiKey("sk-test-fake-key");
      await configPage.clickLoadModelList();
      await expect
        .poll(async () => {
          const values = await configPage.locators.modelSelect
            .locator("option")
            .evaluateAll((els) => els.map((e) => (e as HTMLOptionElement).value));
          return values.filter((v) => v !== "").length;
        })
        .toBeGreaterThan(0);
      // Assert the canned model names (Phase 1 plan 04 update).
      const opts = await configPage.locators.modelSelect
        .locator("option")
        .evaluateAll((els) => els.map((e) => (e as HTMLOptionElement).value));
      expect(opts).toContain("gpt-4o-mini");
      expect(opts).toContain("gpt-4o");
    },
  );

  // F2 @web @regression — Changing the API key discards the loaded model list
  test(
    "Changing the API key discards the loaded model list",
    { tag: "@regression" },
    async ({ page }) => {
      test.info().annotations.push({ type: "tcid", description: "CONF-02-SC15" });
      await mockProviderModelsEndpoints(page);
      const { configPage } = await bootConfigFlow(page, "translation");
      // Load models for the first key.
      await configPage.setOpenAIApiKey("sk-first-key");
      await configPage.clickLoadModelList();
      await expect
        .poll(async () => {
          const values = await configPage.locators.modelSelect
            .locator("option")
            .evaluateAll((els) => els.map((e) => (e as HTMLOptionElement).value));
          return values.filter((v) => v !== "").length;
        })
        .toBeGreaterThan(0);
      // Change the key — the model list must be cleared.
      await configPage.setOpenAIApiKey("sk-second-key");
      await expect
        .poll(async () => {
          const values = await configPage.locators.modelSelect
            .locator("option")
            .evaluateAll((els) => els.map((e) => (e as HTMLOptionElement).value));
          return values.filter((v) => v !== "").length;
        })
        .toBe(0);
    },
  );

  // ── D-09 NLTK banner (Quick 20260711-0847) ───────────────────────────
  // Three states for the picked source language:
  //   1. source in `supported_languages` AND not in `fallback_languages`
  //      → no banner (fully supported, punkt_tab is installed).
  //   2. source in `fallback_languages` (supported but pickle missing)
  //      → banner WITH the install command.
  //   3. source NOT in `supported_languages` (NLTK-unsupported)
  //      → banner WITHOUT the install command.

  // @regression — fully baked state: source in supported → no banner
  test(
    "NLTK banner is hidden when the source is in supported_languages",
    { tag: "@regression" },
    async ({ page }) => {
      test.info().annotations.push({ type: "tcid", description: "CONF-02-SC16" });
      await mockNltkHealth(page, "all-baked");
      const { configPage } = await bootConfigFlow(page, "translation", fixtures.mystereNocturne);
      // mystere-nocturne pre-fills source to "fr" — in the mocked
      // supported_languages (all 19) so the banner stays hidden.
      await expect
        .poll(async () => await configPage.locators.sourceLanguage.inputValue())
        .toBe("fr");
      await configPage.expectNltkNoticeHidden();
    },
  );

  // @regression — fallback state: source in fallback → banner + install cmd
  test(
    "NLTK banner shows the install command when the source is in fallback_languages",
    { tag: "@regression" },
    async ({ page }) => {
      test.info().annotations.push({ type: "tcid", description: "CONF-02-SC17" });
      await mockNltkHealth(page, "fallback");
      const { configPage } = await bootConfigFlow(page, "translation", fixtures.mystereNocturne);
      // mystere-nocturne pre-fills source to "fr" — the mock puts
      // "fr" in fallback so the banner renders with the install
      // command + the Copy command button.
      await expect
        .poll(async () => await configPage.locators.sourceLanguage.inputValue())
        .toBe("fr");
      await configPage.expectNltkNoticeHasInstallCommand();
    },
  );

  // @regression — unsupported state: source not in supported → banner, no cmd
  test(
    "NLTK banner shows without the install command when the source is not in supported_languages",
    { tag: "@regression" },
    async ({ page }) => {
      test.info().annotations.push({ type: "tcid", description: "CONF-02-SC18" });
      await mockNltkHealth(page, "unsupported");
      const { configPage } = await bootConfigFlow(page, "translation", fixtures.mystereNocturne);
      // mystere-nocturne pre-fills source to "fr" — the mock drops
      // "fr" from supported so the banner renders without the
      // install command (NLTK does not ship a tokenizer for "fr").
      await expect
        .poll(async () => await configPage.locators.sourceLanguage.inputValue())
        .toBe("fr");
      await configPage.expectNltkNoticeNoInstallCommand();
    },
  );
});
