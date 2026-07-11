import type { Page } from "@playwright/test";

/**
 * `UploadLocators` — Playwright `Locator` getters keyed by the
 * `data-testid` set declared in `UploadCard.tsx` / `ErrorBlock.tsx`.
 *
 * Selectors prefer `data-testid` over CSS class names or DOM position
 * (frontend/TESTING.md + e2e-testing-patterns skill).
 */
export class UploadLocators {
  constructor(private readonly page: Page) {}

  get uploadCard() {
    return this.page.getByTestId("upload-card");
  }
  get chooseFileButton() {
    return this.page.getByTestId("choose-file-button");
  }
  get fileInput() {
    return this.page.getByTestId("file-input");
  }
  get uploadingSpinner() {
    return this.page.getByTestId("uploading-spinner");
  }
  get pageLoading() {
    return this.page.getByTestId("page-loading");
  }
  get metadataPreview() {
    return this.page.getByTestId("metadata-preview");
  }
  get epubTitle() {
    return this.page.getByTestId("epub-title");
  }
  get epubAuthor() {
    return this.page.getByTestId("epub-author");
  }
  get epubLanguages() {
    return this.page.getByTestId("epub-languages");
  }
  get epubChapterCount() {
    return this.page.getByTestId("epub-chapter-count");
  }
  get continueCta() {
    return this.page.getByTestId("continue-cta");
  }
  get reset() {
    return this.page.getByTestId("reset");
  }
  get errorBlock() {
    return this.page.getByTestId("error-block");
  }
  get errorRetry() {
    return this.page.getByTestId("error-retry");
  }
  get errorDismiss() {
    return this.page.getByTestId("error-dismiss");
  }
  get clientReject() {
    return this.page.getByTestId("client-reject");
  }
  /**
   * Phase 1 plan 01: chooser-step locator — used by the "Continue
   * scrolls to chooser" Playwright spec. The chooser renders an
   * `<fieldset data-testid="chooser-step" id="chooser-step">`; both
   * the testid selector AND the id selector work — the testid
   * keeps the contract scoped to the BDD-tcid-binding convention
   * (the id is the smooth-scroll target the JSX uses).
   */
  get chooserStep() {
    return this.page.getByTestId("chooser-step");
  }
}
