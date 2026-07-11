import type { Page } from "@playwright/test";

/**
 * `VoiceoverConfigLocators` — Playwright `Locator` getters keyed by
 * the `data-testid` set declared in `VoiceoverConfigStep.tsx` and
 * `ChooserStep.tsx`. All selectors prefer `data-testid` over CSS
 * class names or DOM position (frontend/TESTING.md +
 * e2e-testing-patterns skill).
 */
export class VoiceoverConfigLocators {
  constructor(private readonly page: Page) {}

  // Chooser (shared with TranslationConfigLocators; re-declared here
  // so the voiceover spec is self-contained).
  get chooserStep() {
    return this.page.getByTestId("chooser-step");
  }
  chooser(workflow: "translation" | "voiceover" | "both") {
    return this.page.getByTestId(`chooser-${workflow}`);
  }
  chooserBadge(workflow: "voiceover" | "both") {
    return this.page.getByTestId(`chooser-${workflow}-badge`);
  }
  get voiceoverComingSoon() {
    return this.page.getByTestId("voiceover-coming-soon");
  }

  // Voiceover config panel
  get voiceoverConfigStep() {
    return this.page.getByTestId("voiceover-config-step");
  }
  get voiceoverSourceLanguageDisplay() {
    return this.page.getByTestId("voiceover-source-language-display");
  }
  get voiceoverVoiceSelect() {
    return this.page.getByTestId("voiceover-voice-select");
  }
  get voiceoverSubmitButton() {
    return this.page.getByTestId("voiceover-submit-button");
  }
  get voiceoverErrorBanner() {
    return this.page.getByTestId("voiceover-error-banner");
  }
  get voiceoverSourceLanguageRequiredBanner() {
    return this.page.getByTestId("voiceover-source-language-required");
  }
  // Phase 1 plan 03: OpenAI Base URL + OpenAI API key fields at the top of the form.
  get baseUrlInput() {
    return this.page.getByTestId("voiceover-base-url");
  }
  get apiKeyInput() {
    return this.page.getByTestId("voiceover-api-key");
  }
  get voiceoverLanguageSelect() {
    return this.page.getByTestId("voiceover-language-select");
  }
  get voiceoverLanguageLabel() {
    return this.page.getByTestId("voiceover-language-label");
  }
}
