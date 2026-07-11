import type { Page } from "@playwright/test";

/**
 * `JobStatusLocators` — Playwright `Locator` getters for the WS-driven
 * `JobStatusPanel`. All selectors use `data-testid` so the WS-driven
 * assertions don't race the DOM.
 *
 * Phase 4 (04-03): the F6 download surface adds 4 new testids per
 * `04-UI-SPEC.md` §8:
 *   - `download-link-epub` / `download-link-zip` — the two `<a download>`
 *     links on the completed state
 *   - `download-filename-epub` / `download-filename-zip` — filename hints
 *     below each link
 * Plus the parent container `job-status-downloads` and the
 * `combined-banner` line for combined jobs.
 *
 * Quick 260710-oih (F7 / JOBS-06) + Quick 260710-btb (F8 / JOBS-07):
 * the cancel surface + back-to-chooser surface add these testids:
 *   - `cancel-job-button` + `job-status-actions` (the cancel container)
 *   - `cancel-error` (the inline `NoticeBanner` for terminal-state clicks)
 *   - `back-to-workflow-choice` / `-failed` / `-cancelled` / `-expired`
 *     (one per terminal state — the panel only renders the matching
 *     variant for the current `data-status`)
 *   - `status-cancelled` / `status-expired` (the F8-SC03 / F8-SC04
 *     container testids; `status-completed` / `status-failed` were
 *     already present from F5/F6)
 */
export class JobStatusLocators {
  constructor(private readonly page: Page) {}

  get panel() {
    return this.page.getByTestId("job-status-panel");
  }
  get progressBar() {
    return this.page.getByTestId("progress-bar");
  }
  get progressText() {
    return this.page.getByTestId("progress-text");
  }
  get chunkList() {
    return this.page.getByTestId("chunk-list");
  }
  get lastChunk() {
    return this.page.getByTestId("last-chunk");
  }
  get connectionState() {
    return this.page.getByTestId("job-status-connection");
  }
  get statusCompleted() {
    return this.page.getByTestId("status-completed");
  }
  get statusFailed() {
    return this.page.getByTestId("status-failed");
  }
  /**
   * @deprecated Renamed to `downloadLinkEpub` per 04-UI-SPEC §8. Retained
   * as an alias for backward-compat with the Phase 1-3 F5 @smoke spec
   * that referenced the old `download-link` testid (the old testid is
   * gone; the alias returns the EPUB link to preserve the F5 spec's
   * "EPUB visible after translation complete" assertion).
   */
  get downloadLink() {
    return this.downloadLinkEpub;
  }
  get jobId() {
    return this.page.getByTestId("job-id");
  }

  /* ── F6 download surface (04-UI-SPEC §8) ────────────────────────────────── */

  /** Parent container that wraps the download link(s) on the completed state. */
  get downloadLinks() {
    return this.page.getByTestId("job-status-downloads");
  }

  /** EPUB download `<a download>` link. */
  get downloadLinkEpub() {
    return this.page.getByTestId("download-link-epub");
  }

  /** Audio ZIP download `<a download>` link. */
  get downloadLinkZip() {
    return this.page.getByTestId("download-link-zip");
  }

  /** Filename hint `<p>` under the EPUB download link. */
  get downloadFilenameEpub() {
    return this.page.getByTestId("download-filename-epub");
  }

  /** Filename hint `<p>` under the ZIP download link. */
  get downloadFilenameZip() {
    return this.page.getByTestId("download-filename-zip");
  }

  /** Combined-workflow banner above the two download links. */
  get combinedBanner() {
    return this.page.getByTestId("combined-banner");
  }

  /* ── F7 cancel surface (Quick 260710-oih / JOBS-06) ─────────────────────── */

  /**
   * Container that wraps the Cancel job button on the progress view.
   * The container is only rendered when the panel is in a non-terminal
   * state (queued / running / connecting) per
   * `JobStatusPanel.tsx:211-223`. Use `toHaveCount(0)` to assert the
   * cancel surface is absent in a terminal state.
   */
  get jobStatusActions() {
    return this.page.getByTestId("job-status-actions");
  }

  /**
   * The "Cancel job" / "Cancelling…" ghost-danger button. The label
   * is "Cancelling…" while the DELETE is in flight
   * (`JobStatusPanel.tsx:220`). The button is hidden in terminal
   * states — `isCancellable` is `false` (`JobStatusPanel.tsx:151`).
   */
  get cancelJobButton() {
    return this.page.getByTestId("cancel-job-button");
  }

  /**
   * Inline `NoticeBanner` for terminal-state click on Cancel. Renders
   * the unwrapped error message from the backend's 409 `job_not_cancellable`
   * envelope. Only visible when `isCancellable` is true AND a cancel
   * mutation has failed with a `CancelJobServerError`
   * (`JobStatusPanel.tsx:225-227`).
   */
  get cancelError() {
    return this.page.getByTestId("cancel-error");
  }

  /* ── F8 back-to-chooser surface (Quick 260710-oih + 260710-btb + 260710-wcg / JOBS-07) ── */

  /**
   * `Back to Workflow Choice` button for the **completed** terminal state.
   * The button is the visible `btn--tertiary` variant
   * (`JobStatusPanel.tsx:298-306`) and calls `router.push("/")`.
   */
  get backToWorkflowChoice() {
    return this.page.getByTestId("back-to-workflow-choice");
  }

  /**
   * `Back to Workflow Choice` button for the **failed** terminal state.
   * Renders inside the `<div data-testid="status-failed">` container
   * (`JobStatusPanel.tsx:310-323`).
   */
  get backToWorkflowChoiceFailed() {
    return this.page.getByTestId("back-to-workflow-choice-failed");
  }

  /**
   * `Back to Workflow Choice` button for the **cancelled** terminal state.
   * Renders inside the `<div data-testid="status-cancelled">` container
   * alongside the "This job was cancelled." `NoticeBanner`
   * (`JobStatusPanel.tsx:326-339`).
   */
  get backToWorkflowChoiceCancelled() {
    return this.page.getByTestId("back-to-workflow-choice-cancelled");
  }

  /**
   * `Back to Workflow Choice` button for the **expired** terminal state.
   * Renders inside the `<div data-testid="status-expired">` container
   * alongside the "This job has expired." `NoticeBanner`
   * (`JobStatusPanel.tsx:342-358`).
   */
  get backToWorkflowChoiceExpired() {
    return this.page.getByTestId("back-to-workflow-choice-expired");
  }

  /**
   * Container for the **cancelled** state copy + back button
   * (`JobStatusPanel.tsx:327`). Useful for asserting the
   * "This job was cancelled." banner is present alongside the button.
   */
  get statusCancelled() {
    return this.page.getByTestId("status-cancelled");
  }

  /**
   * Container for the **expired** state copy + back button
   * (`JobStatusPanel.tsx:343`).
   */
  get statusExpired() {
    return this.page.getByTestId("status-expired");
  }
}
