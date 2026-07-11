import { type Page, expect } from "@playwright/test";

import { TranslationConfigLocators } from "./TranslationConfigLocators";

/**
 * `TranslationConfigPage` — Page Object for the F2 @web BDD scenarios.
 * Combines the locators with high-level actions and assertions. The
 * spec files in `tests/steps/translation_config_steps.spec.ts` call
 * into this class exclusively — no raw `page.getByTestId` from the
 * step bodies.
 *
 * The page assumes the SPA has already navigated to `/`, an EPUB has
 * been uploaded (so the chooser + config panels render), and the
 * chooser is in the `translation` state. The fixture pattern is:
 * `await uploadPage.pickFile(...)` → `await expectMetadataVisible()` →
 * `await translationConfigPage.pickWorkflow("translation")` → exercise
 * the config panel.
 *
 * **Auto-scroll:** every interaction method calls
 * `scrollIntoViewIfNeeded()` on the target locator before acting.
 * This guarantees the active component is on-screen during the
 * `document-bdd-feature` recording (the form lives below the
 * chooser and would otherwise only become visible when the page
 * jumps to the submit button). User feedback 2026-07-06.
 */
export class TranslationConfigPage {
  readonly locators: TranslationConfigLocators;
  constructor(private readonly page: Page) {
    this.locators = new TranslationConfigLocators(page);
  }

  async pickWorkflow(workflow: "translation" | "voiceover" | "both") {
    // The chooser card is a `<label>` wrapping a visually-hidden
    // `<input type="radio">`. Clicking the label dispatches the
    // radio's onChange; the radio is sr-only so `check()` on the
    // input directly races the focus/visibility heuristic.
    await this.locators.chooser(workflow).click();
  }

  async pickProvider(provider: "ollama" | "openai-compatible") {
    await this.locators.providerSelect.scrollIntoViewIfNeeded();
    await this.locators.providerSelect.selectOption(provider);
  }

  async setOpenAIApiKey(key: string) {
    // Set the input value via the native setter + dispatch the React
    // input event so the controlled input's onChange fires with the
    // new value. This is the most reliable way to update a React
    // controlled input from Playwright.
    await this.locators.openaiApikeyInput.evaluate((el, value) => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(el, value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }, key);
  }

  /**
   * Phase 1 plan 02: click the new "Load Model List" button (the
   * legacy "Validate" button is GONE — the key is validated
   * implicitly when Load Models returns 2xx). The default provider
   * is now OpenAI-compatible, so the model select is empty until
   * the user enters a key and clicks Load Models.
   */
  async clickLoadModelList() {
    await this.locators.loadModelList.scrollIntoViewIfNeeded();
    await this.locators.loadModelList.click();
  }

  async expectLoadModelsSpinner() {
    await expect(this.locators.loadModelsSpinner).toBeVisible();
  }

  async expectModelListLoaded() {
    const values = await this.locators.modelSelect
      .locator("option")
      .evaluateAll((els) => els.map((e) => (e as HTMLOptionElement).value));
    expect(values.filter((v) => v !== "").length).toBeGreaterThan(0);
  }

  async expectModelListCleared() {
    const values = await this.locators.modelSelect
      .locator("option")
      .evaluateAll((els) => els.map((e) => (e as HTMLOptionElement).value));
    expect(values.filter((v) => v !== "").length).toBe(0);
  }

  async getBaseUrlValue() {
    return await this.locators.baseUrlInput.inputValue();
  }

  async pickModel(value: string) {
    await this.locators.modelSelect.scrollIntoViewIfNeeded();
    await this.locators.modelSelect.selectOption(value);
  }

  async pickSourceLanguage(code: string) {
    await this.locators.sourceLanguage.scrollIntoViewIfNeeded();
    await this.locators.sourceLanguage.selectOption(code);
  }

  async pickTargetLanguage(code: string) {
    await this.locators.targetLanguage.scrollIntoViewIfNeeded();
    await this.locators.targetLanguage.selectOption(code);
  }

  async submit() {
    await this.locators.submitButton.scrollIntoViewIfNeeded();
    await this.locators.submitButton.click();
  }

  async expectConfigVisible() {
    await expect(this.locators.translationConfig).toBeVisible();
    await expect(this.locators.providerSelect).toBeVisible();
    await expect(this.locators.modelSelect).toBeVisible();
    await expect(this.locators.sourceLanguage).toBeVisible();
    await expect(this.locators.targetLanguage).toBeVisible();
  }

  async expectConfigHidden() {
    // CONF-01: irrelevant panels HIDDEN, not greyed-out.
    await expect(this.locators.translationConfig).toHaveCount(0);
  }

  async expectSourcePrefilledWith(code: string) {
    await expect(this.locators.sourceLanguage).toHaveValue(code);
  }

  async expectSourceBlank() {
    await expect(this.locators.sourceLanguage).toHaveValue("");
  }

  async expectSourceHintVisible() {
    await expect(this.locators.sourceHint).toBeVisible();
  }

  async expectSourceRequiredHintVisible() {
    await expect(this.locators.sourceRequiredHint).toBeVisible();
  }

  async expectNltkNoticeVisible() {
    await expect(this.locators.nltkNotice).toBeVisible();
  }

  async expectNltkNoticeHidden() {
    await expect(this.locators.nltkNotice).toHaveCount(0);
  }

  /**
   * D-09 banner: when the source is in NLTK's `fallback_languages`
   * (NLTK supports the language but the punkt_tab pickle is
   * missing on disk), the notice renders WITH a "Copy command"
   * button so the user can run the install in one click.
   */
  async expectNltkNoticeHasInstallCommand() {
    await expect(this.locators.nltkNotice).toBeVisible();
    await expect(this.locators.nltkCopyButton).toBeVisible();
  }

  /**
   * D-09 banner: when the source is NOT in NLTK's
   * `supported_languages` (NLTK does not ship a sentence
   * tokenizer for that language at all), the notice renders
   * WITHOUT the install command — `nltk.downloader` cannot help.
   */
  async expectNltkNoticeNoInstallCommand() {
    await expect(this.locators.nltkNotice).toBeVisible();
    await expect(this.locators.nltkCopyButton).toHaveCount(0);
  }

  async expectSameLangWarningVisible() {
    await expect(this.locators.sameLangWarning).toBeVisible();
  }

  async expectSameLangWarningHidden() {
    await expect(this.locators.sameLangWarning).toHaveCount(0);
  }

  async expectTargetLanguageCountGte(min: number) {
    const opts = await this.locators.targetLanguage.locator("option").all();
    // Subtract 1 for the empty placeholder option.
    expect(opts.length - 1).toBeGreaterThanOrEqual(min);
  }

  async expectModelSelectEmpty() {
    // The model select has the placeholder option only.
    const realOptions = await this.getModelSelectRealOptions();
    expect(realOptions.length).toBe(0);
  }

  async expectModelSelectPopulated() {
    const realOptions = await this.getModelSelectRealOptions();
    expect(realOptions.length).toBeGreaterThan(0);
  }

  private async getModelSelectRealOptions(): Promise<string[]> {
    // Resolve option values asynchronously; Array.filter does not await
    // async predicates, so we use evaluateAll + a sync filter.
    const values = await this.locators.modelSelect
      .locator("option")
      .evaluateAll((els) => els.map((e) => (e as HTMLOptionElement).value));
    return values.filter((v) => v !== "");
  }

  async expectChooserSelected(workflow: "translation" | "voiceover" | "both") {
    await expect(this.locators.chooser(workflow)).toHaveAttribute("data-selected", "true");
  }

  async expectVoiceoverComingSoon() {
    await expect(this.locators.voiceoverComingSoon).toBeVisible();
  }

  async expectVoiceoverComingSoonAbsent() {
    // Phase 3 (D-16): the voiceover workflow no longer shows the
    // inline "Coming soon" notice. The notice now only renders for
    // the `both` (translation+voiceover) workflow (D-17 — combined
    // workflow is Phase 4). Asserting absence locks the D-16 gate.
    await expect(this.locators.voiceoverComingSoon).toHaveCount(0);
  }
}
