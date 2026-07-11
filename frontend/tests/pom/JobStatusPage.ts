import { type Page, expect } from "@playwright/test";

import { JobStatusLocators } from "./JobStatusLocators";

/**
 * `JobStatusPage` — Page Object for the WS-driven `JobStatusPanel`.
 *
 * The panel is a WS consumer — the test asserts on the live `progress`
 * text + the `chunk_id` list. We use `expect.toHaveText(...)` with a
 * short retry (Playwright's default) rather than `waitForTimeout`, so
 * the assertions are non-flaky.
 *
 * Quick 260710-oih (F7 / JOBS-06) + Quick 260710-btb (F8 / JOBS-07):
 * the cancel + back-to-chooser surfaces add 4 dedicated state-based
 * assertions. The Cancel button is gated on `!isTerminal`
 * (`JobStatusPanel.tsx:149-151`); the Back to Workflow Choice button
 * is one of 4 testid variants keyed by terminal status
 * (`JobStatusPanel.tsx:297-358`).
 */
export class JobStatusPage {
  readonly locators: JobStatusLocators;
  constructor(private readonly page: Page) {
    this.locators = new JobStatusLocators(page);
  }

  async gotoJob(jobId: string) {
    // `.html` suffix is required: Starlette `StaticFiles` does NOT
    // auto-resolve `/jobs` → `/jobs.html` (returns 404). Mirrors the
    // F5/F6 @web spec convention at `job_status_steps.spec.ts:178,219`.
    await this.page.goto(`/jobs.html?id=${encodeURIComponent(jobId)}`);
    await expect(this.locators.panel).toBeVisible();
  }

  async expectProgress(current: number, total: number) {
    await expect(this.locators.progressText).toContainText(`${current} / ${total} chunks`);
  }

  async expectProgressAdvancing() {
    // Asserts that the progress text changed from its initial value
    // within a 5s window (Playwright's default expect timeout).
    const initial = await this.locators.progressText.textContent();
    await expect(this.locators.progressText).not.toHaveText(initial ?? "");
  }

  async expectChunkIdVisible(chunkId: string) {
    await expect(this.locators.lastChunk).toContainText(chunkId);
  }

  async expectCompleted() {
    await expect(this.locators.statusCompleted).toBeVisible();
    await expect(this.locators.downloadLink).toBeVisible();
  }

  async expectFailed(errorRegex?: RegExp) {
    await expect(this.locators.statusFailed).toBeVisible();
    if (errorRegex) {
      await expect(this.locators.statusFailed).toContainText(errorRegex);
    }
  }

  /**
   * F6 download surface assertion (04-03). Mirrors `expectCompleted` but
   * for the 4-artifact visibility matrix from 04-UI-SPEC §3.1.
   * Pass `true` for the artifact kinds the job produced; the
   * corresponding link must be visible. Pass `false` and the link
   * must be absent (count === 0). For combined jobs, pass `true` for
   * both.
   */
  async expectDownloadLinksVisible(epub: boolean, zip: boolean) {
    if (epub) {
      await expect(this.locators.downloadLinkEpub).toBeVisible();
      await expect(this.locators.downloadLinkEpub).toHaveAttribute(
        "href",
        /\/api\/v1\/jobs\/.*\/download\?artifact=epub$/,
      );
      await expect(this.locators.downloadFilenameEpub).toBeVisible();
    } else {
      await expect(this.locators.downloadLinkEpub).toHaveCount(0);
    }
    if (zip) {
      await expect(this.locators.downloadLinkZip).toBeVisible();
      await expect(this.locators.downloadLinkZip).toHaveAttribute(
        "href",
        /\/api\/v1\/jobs\/.*\/download\?artifact=zip$/,
      );
      await expect(this.locators.downloadFilenameZip).toBeVisible();
    } else {
      await expect(this.locators.downloadLinkZip).toHaveCount(0);
    }
  }

  /* ── F7 cancel surface (Quick 260710-oih / JOBS-06) ─────────────────────── */

  /**
   * JOBS-06-SC01 (F7 @web @smoke): a running job shows an enabled
   * "Cancel job" button. The panel's `data-status` MUST be a
   * non-terminal value (`running` / `queued` / `connecting`).
   */
  async expectCancelButtonVisible() {
    await expect(this.locators.cancelJobButton).toBeVisible();
    await expect(this.locators.cancelJobButton).toBeEnabled();
    const status = await this.locators.panel.getAttribute("data-status");
    expect(["running", "queued", "connecting"]).toContain(status);
  }

  /**
   * JOBS-06-SC02: click the "Cancel job" button. The button calls
   * `useCancelJob.mutate(jobId)` which `DELETE /api/v1/jobs/{id}`.
   */
  async clickCancel() {
    await this.locators.cancelJobButton.click();
  }

  /**
   * JOBS-06-SC02: while the DELETE is in flight, the button is
   * disabled + the label is "Cancelling…"
   * (`JobStatusPanel.tsx:218-220`). The mutation's `isPending` flag
   * drives both states.
   */
  async expectCancellingLabel() {
    await expect(this.locators.cancelJobButton).toBeDisabled();
    await expect(this.locators.cancelJobButton).toHaveText("Cancelling…");
  }

  /**
   * JOBS-06-SC10: terminal-state click on Cancel surfaces an inline
   * error in the `NoticeBanner` with `data-testid="cancel-error"`.
   * The error message is the unwrapped `payload.message` from the
   * 409 `job_not_cancellable` envelope. The optional `errorText`
   * regex narrows the assertion to a specific substring.
   */
  async expectCancelErrorVisible(errorText?: string | RegExp) {
    await expect(this.locators.cancelError).toBeVisible();
    if (errorText) {
      await expect(this.locators.cancelError).toContainText(errorText);
    }
  }

  /* ── F8 back-to-chooser surface (Quick 260710-oih + 260710-btb + 260710-wcg / JOBS-07) ── */

  /**
   * JOBS-07-SC01..SC04 (F8 @web @smoke + @regression): in a given
   * terminal state, the matching `back-to-workflow-choice*` testid is
   * visible + enabled. The other 3 variants MUST be absent (the panel
   * only renders one back-button per state).
   */
  async expectBackToWorkflowChoiceVisible(
    variant: "completed" | "failed" | "cancelled" | "expired",
  ) {
    const map = {
      completed: this.locators.backToWorkflowChoice,
      failed: this.locators.backToWorkflowChoiceFailed,
      cancelled: this.locators.backToWorkflowChoiceCancelled,
      expired: this.locators.backToWorkflowChoiceExpired,
    } as const;
    const target = map[variant];
    await expect(target).toBeVisible();
    await expect(target).toBeEnabled();
    const others = (Object.entries(map) as [keyof typeof map, typeof target][])
      .filter(([k]) => k !== variant)
      .map(([, l]) => l);
    for (const other of others) {
      await expect(other).toHaveCount(0);
    }
  }

  /**
   * JOBS-07-SC05 + SC06 (F8 @web @smoke + @regression): in a
   * non-terminal state (`running` / `queued` / `connecting`), ALL 4
   * `back-to-workflow-choice*` testids MUST be absent. The impl
   * renders nothing (the button is not greyed-out — see F8 feature
   * file "OR" branch — the "OR disabled" branch is not exercised).
   */
  async expectNoBackToWorkflowChoice() {
    await expect(this.locators.backToWorkflowChoice).toHaveCount(0);
    await expect(this.locators.backToWorkflowChoiceFailed).toHaveCount(0);
    await expect(this.locators.backToWorkflowChoiceCancelled).toHaveCount(0);
    await expect(this.locators.backToWorkflowChoiceExpired).toHaveCount(0);
  }

  /**
   * Click the matching `back-to-workflow-choice*` button. The button
   * calls `router.push("/")` (back to the chooser) per
   * `JobStatusPanel.tsx:302, 318, 334, 353`.
   */
  async clickBackToWorkflowChoice(variant: "completed" | "failed" | "cancelled" | "expired") {
    const map = {
      completed: this.locators.backToWorkflowChoice,
      failed: this.locators.backToWorkflowChoiceFailed,
      cancelled: this.locators.backToWorkflowChoiceCancelled,
      expired: this.locators.backToWorkflowChoiceExpired,
    } as const;
    await map[variant].click();
  }

  /* ── F7/F8 setup helper ────────────────────────────────────────────────── */

  /**
   * F7/F8 setup helper: navigate to `/jobs?id={jobId}` and wait for
   * the panel's `data-status` to match. Playwright's `expect.poll`
   * handles the WS event propagation race; the fallback to
   * `useJobView.jobStatus` (`JobStatusPanel.tsx:148`) means the
   * panel reaches the target status as soon as the mocked GET
   * `/api/v1/jobs/{id}` returns.
   *
   * Most F7/F8 tests pre-stub the GET endpoint with `page.route`
   * (a synthetic JobView) before calling this method — the helper
   * itself just waits for the rendered state to converge.
   */
  async gotoJobWithStatus(
    jobId: string,
    expectedStatus: "running" | "queued" | "completed" | "failed" | "cancelled" | "expired",
  ) {
    // `.html` suffix required (StaticFiles does not auto-resolve
    // `/jobs` → `/jobs.html`). Mirrors the F5/F6 @web spec convention.
    await this.page.goto(`/jobs.html?id=${encodeURIComponent(jobId)}`);
    await expect(this.locators.panel).toBeVisible();
    await expect(this.locators.panel).toHaveAttribute("data-status", expectedStatus, {
      timeout: 10_000,
    });
  }
}
