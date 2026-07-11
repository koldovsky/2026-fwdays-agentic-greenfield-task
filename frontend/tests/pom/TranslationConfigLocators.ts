import type { Page } from "@playwright/test";

/**
 * `TranslationConfigLocators` — Playwright `Locator` getters keyed by
 * the `data-testid` set declared in `TranslationConfigStep.tsx`,
 * `ChooserStep.tsx`, `ProviderModelSelect.tsx`, and `TargetLanguageSelect.tsx`.
 *
 * Selectors prefer `data-testid` over CSS class names or DOM position
 * (frontend/TESTING.md + e2e-testing-patterns skill).
 */
export class TranslationConfigLocators {
  constructor(private readonly page: Page) {}

  // Chooser
  get chooserStep() {
    return this.page.getByTestId("chooser-step");
  }
  chooser(workflow: "translation" | "voiceover" | "both") {
    return this.page.getByTestId(`chooser-${workflow}`);
  }
  chooserInput(workflow: "translation" | "voiceover" | "both") {
    return this.page.getByTestId(`chooser-${workflow}-input`);
  }
  chooserBadge(workflow: "voiceover" | "both") {
    return this.page.getByTestId(`chooser-${workflow}-badge`);
  }
  get voiceoverComingSoon() {
    return this.page.getByTestId("voiceover-coming-soon");
  }

  // Config panel
  get translationConfig() {
    return this.page.getByTestId("translation-config");
  }
  get providerSelect() {
    return this.page.getByTestId("provider-select");
  }
  get modelSelect() {
    return this.page.getByTestId("model-select");
  }
  get sourceLanguage() {
    return this.page.getByTestId("source-language");
  }
  get targetLanguage() {
    return this.page.getByTestId("target-language");
  }
  get nltkNotice() {
    return this.page.getByTestId("nltk-notice");
  }
  get nltkCopyButton() {
    return this.page.getByTestId("nltk-copy-button");
  }
  get sourceHint() {
    return this.page.getByTestId("source-hint");
  }
  get sourceRequiredHint() {
    return this.page.getByTestId("source-required-hint");
  }
  get submitButton() {
    return this.page.getByTestId("submit-translation-job");
  }
  get sameLangWarning() {
    return this.page.getByTestId("same-lang-warning");
  }

  // OpenAI key flow
  get openaiApikeyForm() {
    return this.page.getByTestId("openai-apikey-form");
  }
  get openaiApikeyInput() {
    return this.page.getByTestId("openai-apikey-input");
  }
  /**
   * Phase 1 plan 02: the legacy "Validate" button is GONE. The
   * OpenAI API key is validated implicitly when "Load Model List"
   * returns 2xx. The ``loadModelList`` button replaces the old
   * ``openaiApikeySubmit`` button for both providers — Ollama also
   * has it (the key header is just ignored).
   */
  get loadModelList() {
    return this.page.getByTestId("load-model-list");
  }
  get loadModelsSpinner() {
    return this.page.getByTestId("load-models-spinner");
  }
  get loadModelsError() {
    return this.page.getByTestId("load-models-error");
  }
  get baseUrlInput() {
    return this.page.getByTestId("base-url-input");
  }
}
