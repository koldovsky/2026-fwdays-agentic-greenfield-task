import { type Page, expect } from "@playwright/test";

import { VoiceoverConfigLocators } from "./VoiceoverConfigLocators";

/**
 * `VoiceoverConfigPage` — Page Object for the F4 @web BDD scenarios
 * (voiceover half). Combines the locators with high-level actions and
 * assertions. The spec file in `tests/steps/voiceover_config_steps.spec.ts`
 * calls into this class exclusively — no raw `page.getByTestId` from
 * the step bodies.
 *
 * The page assumes the SPA has already navigated to `/`, an EPUB has
 * been uploaded (so the chooser + config panels render), and the
 * chooser is in the `voiceover` state. The fixture pattern is:
 * `await uploadPage.pickFile(...)` → `await expectMetadataVisible()` →
 * `await voiceoverConfigPage.pickWorkflow("voiceover")` → exercise
 * the config panel.
 *
 * **Auto-scroll:** every interaction method calls
 * `scrollIntoViewIfNeeded()` on the target locator before acting.
 * This guarantees the active component is on-screen during the
 * `document-bdd-feature` recording (the form lives below the
 * chooser and would otherwise only become visible when the page
 * jumps to the submit button). User feedback 2026-07-06; pattern
 * locked by commit 47507c4.
 */
export class VoiceoverConfigPage {
  readonly locators: VoiceoverConfigLocators;
  constructor(private readonly page: Page) {
    this.locators = new VoiceoverConfigLocators(page);
  }

  async pickWorkflow(workflow: "translation" | "voiceover" | "both") {
    // The chooser card is a `<label>` wrapping a visually-hidden
    // `<input type="radio">`. Clicking the label dispatches the
    // radio's onChange; the radio is sr-only so `check()` on the
    // input directly races the focus/visibility heuristic.
    await this.locators.chooser(workflow).click();
  }

  async selectVoice(voice: string) {
    await this.locators.voiceoverVoiceSelect.scrollIntoViewIfNeeded();
    await this.locators.voiceoverVoiceSelect.selectOption(voice);
  }

  async submit() {
    await this.locators.voiceoverSubmitButton.scrollIntoViewIfNeeded();
    await this.locators.voiceoverSubmitButton.click();
  }

  async expectConfigVisible() {
    await expect(this.locators.voiceoverConfigStep).toBeVisible();
    await expect(this.locators.voiceoverSourceLanguageDisplay).toBeVisible();
    await expect(this.locators.voiceoverVoiceSelect).toBeVisible();
    await expect(this.locators.voiceoverSubmitButton).toBeVisible();
  }

  async expectConfigHidden() {
    // F2 Rule 1 (CONF-01): irrelevant panels HIDDEN, not greyed-out.
    await expect(this.locators.voiceoverConfigStep).toHaveCount(0);
  }

  async expectChooserSelected(workflow: "translation" | "voiceover" | "both") {
    await expect(this.locators.chooser(workflow)).toHaveAttribute("data-selected", "true");
  }

  async expectVoiceDropdownPopulated(voices: string[]) {
    // The voice select is populated from `GET /api/v1/voices`
    // (the full flat catalog — no per-language matching).
    await expect
      .poll(async () => {
        const values = await this.locators.voiceoverVoiceSelect
          .locator("option")
          .evaluateAll((els) => els.map((e) => (e as HTMLOptionElement).value));
        return values.filter((v) => v !== "").length;
      })
      .toBeGreaterThan(0);
    const values = await this.locators.voiceoverVoiceSelect
      .locator("option")
      .evaluateAll((els) => els.map((e) => (e as HTMLOptionElement).value));
    expect(values).toEqual(voices);
  }

  async expectVoiceoverChooserBadgeAbsent() {
    // D-16: the `voiceover` chooser card no longer carries the
    // "Coming soon" badge.
    await expect(this.locators.chooserBadge("voiceover")).toHaveCount(0);
  }

  async expectBothChooserBadgePresent() {
    // D-17: the `both` (translation+voiceover) chooser card KEEPS
    // its "Coming soon" badge — combined-workflow is Phase 4.
    await expect(this.locators.chooserBadge("both")).toBeVisible();
  }

  async expectSourceLanguageDisplay(code: string) {
    // The source language field is read-only; we assert the
    // `<p>` text matches the expected ISO 639-1 code.
    await expect(this.locators.voiceoverSourceLanguageDisplay).toContainText(code);
  }

  // ── Phase 1 plan 03: OpenAI Base URL + OpenAI API key helpers ─────

  async setBaseUrl(url: string) {
    await this.locators.baseUrlInput.scrollIntoViewIfNeeded();
    await this.locators.baseUrlInput.fill(url);
  }

  async setApiKey(key: string) {
    await this.locators.apiKeyInput.scrollIntoViewIfNeeded();
    await this.locators.apiKeyInput.fill(key);
  }

  async pickVoiceoverLanguage(code: string) {
    await this.locators.voiceoverLanguageSelect.scrollIntoViewIfNeeded();
    await this.locators.voiceoverLanguageSelect.selectOption(code);
  }

  async expectStartDisabled() {
    await expect(this.locators.voiceoverSubmitButton).toBeDisabled();
  }

  async expectStartEnabled() {
    await expect(this.locators.voiceoverSubmitButton).toBeEnabled();
  }
}
