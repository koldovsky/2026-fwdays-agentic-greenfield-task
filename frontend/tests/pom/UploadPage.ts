import { type Page, expect } from "@playwright/test";

import { UploadLocators } from "./UploadLocators";

/**
 * `UploadPage` — Page Object Model wrapper around `UploadLocators` that
 * combines selectors with actions and high-level assertions. The step
 * definitions in `tests/steps/epub_upload_steps.ts` call into this
 * class exclusively — no raw `page.getByTestId` from the step bodies.
 */
export class UploadPage {
  readonly locators: UploadLocators;
  constructor(private readonly page: Page) {
    this.locators = new UploadLocators(page);
  }

  async goto() {
    await this.page.goto("/");
    await expect(this.locators.uploadCard).toBeVisible();
  }

  /**
   * Drag-drop a file onto the upload card. Playwright's `dispatchEvent`
   * does not support serialising a real `DataTransfer` via JSON, so we
   * construct a `DataTransfer` in the page context with a `File` from
   * the supplied path and dispatch a real `dragover` + `drop` event
   * pair. The card's `onDrop` handler picks up the file and runs
   * `validateFileForUpload` then triggers the upload.
   */
  async dragDropFile(filePath: string) {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const filename = path.basename(filePath);
    const base64 = (await fs.readFile(filePath)).toString("base64");
    await this.locators.uploadCard.evaluate(
      async (el, { base64, filename }) => {
        // Decode the base64 to a Uint8Array, then build a File and
        // a DataTransfer for the drop event.
        const bin = atob(base64);
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) {
          bytes[i] = bin.charCodeAt(i);
        }
        const file = new File([bytes], filename, { type: "application/epub+zip" });
        const dt = new DataTransfer();
        dt.items.add(file);
        const dragOver = new DragEvent("dragover", {
          bubbles: true,
          cancelable: true,
          dataTransfer: dt,
        });
        el.dispatchEvent(dragOver);
        const drop = new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt });
        el.dispatchEvent(drop);
      },
      { base64, filename },
    );
  }

  /**
   * Use the OS file picker (via Playwright's `filechooser` event).
   * The hidden `<input type="file" accept=".epub">` is wired to
   * `inputRef` — Playwright intercepts the synthetic `click()` on
   * the input that `chooseFile` triggers.
   */
  async pickFile(filePath: string) {
    const [chooser] = await Promise.all([
      this.page.waitForEvent("filechooser"),
      this.locators.chooseFileButton.click(),
    ]);
    await chooser.setFiles(filePath);
  }

  /**
   * Keyboard-only Accessibility User path: focus the 'Choose file'
   * button and press Enter — the card's `onKeyDown` handler opens
   * the file picker. Playwright intercepts the resulting `filechooser`
   * event.
   */
  async focusChooseFileButton() {
    await this.locators.chooseFileButton.focus();
  }

  async pressEnterOnChooseFile(filePath: string) {
    const [chooser] = await Promise.all([
      this.page.waitForEvent("filechooser"),
      this.locators.chooseFileButton.press("Enter"),
    ]);
    await chooser.setFiles(filePath);
  }

  async expectMetadataVisible() {
    await expect(this.locators.metadataPreview).toBeVisible();
    await expect(this.locators.epubTitle).toBeVisible();
    await expect(this.locators.epubAuthor).toBeVisible();
    await expect(this.locators.epubLanguages).toBeVisible();
    await expect(this.locators.epubChapterCount).toBeVisible();
  }

  async expectErrorVisible(code?: string) {
    await expect(this.locators.errorBlock).toBeVisible();
    if (code) {
      await expect(this.locators.errorBlock).toHaveAttribute("data-error-code", code);
    }
  }

  async expectNoError() {
    await expect(this.locators.errorBlock).toHaveCount(0);
  }

  async expectClientReject(message: RegExp) {
    await expect(this.locators.clientReject).toBeVisible();
    await expect(this.locators.clientReject).toHaveText(message);
  }

  async dismissError() {
    await this.locators.errorDismiss.click();
  }
}
