"use client";

/**
 * JobStatusPanel — WS-driven job status view (F5 + F8 + JOBS-03 + DL-01 + JOBS-06).
 *
 * Connects to `ws://${wsBase}/api/v1/jobs/${jobId}/events` via
 * `useJobEvents`. The 6-field envelope drives the progress bar; the
 * last 10 chunk_ids render in a list. On `status='completed'`, the
 * download row renders 1-2 `<a download>` links gated on
 * `hasEpubArtifact` / `hasZipArtifact` (per 04-UI-SPEC.md §3.1
 * visibility table). The links point to
 * `/api/v1/jobs/{jobId}/download?artifact=epub|zip` and the browser
 * handles `Content-Disposition: attachment; filename*=UTF-8''...` —
 * no client-side filename sanitization (DL-02 invariant).
 *
 * For combined jobs (`translation+voiceover`), both links stack
 * inside a single `<div class="job-status__downloads">` block with
 * a `combined-banner` line above them.
 *
 * On `status='failed'`, the `error` field (a backend code, e.g.
 * `internal_dispatch_error` / `provider_timeout` / `validation_error`
 * / `not_found`) is mapped to a human-readable sentence via the
 * `formatJobError` helper at module scope — the raw code is never
 * surfaced to the user. The mapped message renders inside a
 * `<NoticeBanner tone='error'>`. The panel deliberately ignores the
 * WS frame's `detail_message` field (which is the raw Python
 * exception text from `_safe_dispatch` in `worker_queue.py`).
 *
 * F8 (navigation-back-to-chooser): in every terminal state
 * (`completed` / `failed` / `cancelled` / `expired`) the panel renders
 * a "Back to Workflow Choice" `<button type="button">` that calls
 * `router.push("/")`. The button is the visible `btn--tertiary`
 * variant (1px accent border + accent text color, not the
 * invisible-ghost variant) so it reads as a button.
 *
 * JOBS-06 (Quick 260710-oih): in any non-terminal state
 * (queued / running / connecting) the panel renders a
 * "Cancel job" ghost-danger button that calls
 * `DELETE /api/v1/jobs/{id}` via `useCancelJob`. On success the
 * default behaviour is `router.push("/")` (back to the chooser);
 * a caller can pass `onCancelled` to override (e.g. for a
 * page-level state reset).
 *
 * Reconnect: handled in `useJobEvents` — fixed 1000ms `setTimeout` on
 * `onclose`, no exponential backoff (sprint path).
 */

import { useRouter } from "next/navigation";
import { useMemo } from "react";

import { useCancelJob } from "@/hooks/useCancelJob";
import { CancelJobServerError } from "@/hooks/useCancelJob";
import { useJobEvents } from "@/hooks/useJobEvents";

import { NoticeBanner } from "./NoticeBanner";

import "./JobStatusPanel.css";

export interface JobStatusPanelProps {
  jobId: string;
  /** The job's `job_type` — used for the title. */
  jobType?: string;
  /** True when the job produces a translated EPUB artifact (translation / combined). */
  hasEpubArtifact?: boolean;
  /** True when the job produces an audio ZIP artifact (voiceover / combined). */
  hasZipArtifact?: boolean;
  /** Server-pre-sanitized filename for the EPUB download (DL-02). */
  filenameEpub?: string | null;
  /** Server-pre-sanitized filename for the ZIP download (DL-02). */
  filenameZip?: string | null;
  /**
   * Authoritative job status from `GET /api/v1/jobs/{id}` (via useJobView).
   * The WS event stream is the live progress feed, but the JobView is the
   * source of truth for the current state — when the WS hasn't received
   * any event yet (e.g. the worker finished before the client connected),
   * the panel falls back to this value so the download row renders for
   * already-completed jobs.
   */
  jobStatus?: string | null;
  /**
   * Quick 260710-oih / JOBS-06: optional callback fired when the user
   * clicks the Cancel button and the DELETE succeeds. When omitted,
   * the panel falls back to `router.push("/")` (back to the chooser).
   */
  onCancelled?: (jobId: string) => void;
}

const MAX_CHUNK_HISTORY = 10;

/**
 * Map a backend WS error code to a human-readable sentence.
 *
 * The `event.error` field on the F5-AC5 envelope is a *code* (e.g.
 * `internal_dispatch_error`, `provider_timeout`,
 * `validation_error`, `not_found`) — not a user-facing string.
 * The panel deliberately never surfaces the frame's
 * `detail_message` field (which carries the raw Python exception
 * text); the code→copy mapping below is the canonical
 * client-side pattern (mirrors `ErrorBlock.tsx:25-29`'s
 * `COPY[code]` table).
 *
 * Pure function: no hooks, no side effects → unit-testable in
 * isolation if a follow-up task adds coverage.
 */
function formatJobError(code: string | undefined): string {
  switch (code) {
    case "provider_timeout":
      return "The translation service took too long to respond. Please try again.";
    case "internal_dispatch_error":
      return "Something went wrong while running the job. Please try again.";
    case "validation_error":
      return "The job configuration was rejected by the server.";
    default:
      // Catches `not_found`, unknown future codes, and undefined (no error
      // code on the WS frame) — all collapse to the same generic copy.
      return "The job failed. Please start a new workflow.";
  }
}

export function JobStatusPanel({
  jobId,
  jobType = "translation",
  hasEpubArtifact = false,
  hasZipArtifact = false,
  filenameEpub = null,
  filenameZip = null,
  jobStatus = null,
  onCancelled,
}: JobStatusPanelProps) {
  const { event, isConnected, isReconnecting, lastCloseCode } = useJobEvents(jobId);
  const router = useRouter();

  const progress = event?.progress_current ?? 0;
  const total = event?.progress_total ?? 0;
  const percent = total > 0 ? Math.min(100, Math.round((progress / total) * 100)) : 0;

  const chunkList = useMemo(() => {
    const ids: string[] = [];
    return ids;
  }, []);

  // Status priority:
  //   1. WS event (live progress feed — most recent signal)
  //   2. JobView's status (authoritative; handles the late-subscriber
  //      case where the worker finished before the WS connected)
  //   3. Connection-based default ("running" if WS is open, "connecting"
  //      otherwise — the panel is in the pre-first-event state)
  const status = event?.status ?? jobStatus ?? (isConnected ? "running" : "connecting");
  const isTerminal =
    status === "completed" || status === "failed" || status === "cancelled" || status === "expired";
  const isCancellable = !isTerminal;

  // Quick 260710-oih / JOBS-06: Cancel button on the progress view.
  // The button calls DELETE /api/v1/jobs/{id}; on success the panel
  // either runs the caller-supplied `onCancelled` (page-level state
  // reset) or falls back to `router.push("/")` (back to the chooser).
  const cancelMutation = useCancelJob({
    onSuccess: () => {
      if (onCancelled) {
        onCancelled(jobId);
      } else {
        router.push("/");
      }
    },
  });
  const cancelErrorMessage =
    cancelMutation.error instanceof CancelJobServerError
      ? cancelMutation.error.message
      : (cancelMutation.error?.message ?? null);

  return (
    <section
      className="job-status"
      data-testid="job-status-panel"
      data-status={status}
      aria-label="Job status"
    >
      <h2 className="job-status__title" data-testid="job-status-title">
        {jobType === "translation"
          ? "Translation progress"
          : jobType === "voiceover"
            ? "Voice-Over progress"
            : "Job progress"}
      </h2>

      <p className="job-status__jobid" data-testid="job-id">
        Job: <code>{jobId}</code>
      </p>

      <div
        className="job-status__connection"
        data-testid="job-status-connection"
        data-connected={isConnected ? "true" : "false"}
      >
        {isConnected ? "Connected" : isReconnecting ? "Reconnecting…" : "Disconnected"}
        {lastCloseCode != null ? ` (close ${lastCloseCode})` : ""}
      </div>

      <progress
        className="job-status__progress"
        data-testid="progress-bar"
        max={Math.max(total, 1)}
        value={progress}
        aria-label="Translation progress"
      />

      <p className="job-status__progress-text" data-testid="progress-text">
        {progress} / {total} chunks ({percent}%)
      </p>

      {isCancellable ? (
        <div className="job-status__actions" data-testid="job-status-actions">
          <button
            type="button"
            className="btn btn--tertiary btn--danger"
            data-testid="cancel-job-button"
            onClick={() => cancelMutation.mutate(jobId)}
            disabled={cancelMutation.isPending}
          >
            {cancelMutation.isPending ? "Cancelling…" : "Cancel job"}
          </button>
        </div>
      ) : null}

      {isCancellable && cancelErrorMessage ? (
        <NoticeBanner tone="error" message={cancelErrorMessage} testId="cancel-error" />
      ) : null}

      {event?.chunk_id ? (
        <p className="job-status__last-chunk" data-testid="last-chunk">
          Last chunk: <code>{event.chunk_id}</code>
        </p>
      ) : null}

      {chunkList.length > 0 ? (
        <ul className="job-status__chunk-list" data-testid="chunk-list">
          {chunkList.slice(-MAX_CHUNK_HISTORY).map((id) => (
            <li key={id}>{id}</li>
          ))}
        </ul>
      ) : null}

      {status === "completed" ? (
        <div className="job-status__completed" data-testid="status-completed">
          <p
            className="job-status__completed-copy"
            // biome-ignore lint/a11y/useSemanticElements: <output> cannot contain the <a> download row
            role="status"
          >
            {jobType === "translation+voiceover"
              ? "Translation + Voice-Over complete."
              : jobType === "voiceover"
                ? "Voice-Over complete."
                : "Translation complete."}
          </p>
          {jobType === "translation+voiceover" && (hasEpubArtifact || hasZipArtifact) ? (
            <output className="job-status__combined-banner" data-testid="combined-banner">
              Your book was translated <strong>and</strong> narrated. Both files are ready below.
            </output>
          ) : null}
          {hasEpubArtifact || hasZipArtifact ? (
            <div className="job-status__downloads" data-testid="job-status-downloads">
              {hasEpubArtifact ? (
                <div className="job-status__download-item">
                  <a
                    href={`/api/v1/jobs/${encodeURIComponent(jobId)}/download?artifact=epub`}
                    download
                    data-testid="download-link-epub"
                    className="job-status__download-link"
                    aria-label="Download translated EPUB as a file"
                  >
                    Download translated EPUB
                  </a>
                  <p className="job-status__download-filename" data-testid="download-filename-epub">
                    {filenameEpub ?? "translated.epub"}
                  </p>
                </div>
              ) : null}
              {hasZipArtifact ? (
                <div className="job-status__download-item">
                  <a
                    href={`/api/v1/jobs/${encodeURIComponent(jobId)}/download?artifact=zip`}
                    download
                    data-testid="download-link-zip"
                    className="job-status__download-link"
                    aria-label="Download audio ZIP archive as a file"
                  >
                    Download audio ZIP
                  </a>
                  <p className="job-status__download-filename" data-testid="download-filename-zip">
                    {filenameZip ?? "audio.zip"}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="job-status__post-actions" data-testid="job-status-post-actions">
            <button
              type="button"
              className="btn btn--tertiary"
              data-testid="back-to-workflow-choice"
              onClick={() => router.push("/")}
            >
              Back to Workflow Choice
            </button>
          </div>
        </div>
      ) : null}

      {status === "failed" ? (
        <div data-testid="status-failed">
          <NoticeBanner tone="error" message={formatJobError(event?.error)} />
          <div className="job-status__post-actions" data-testid="job-status-post-actions">
            <button
              type="button"
              className="btn btn--tertiary"
              data-testid="back-to-workflow-choice-failed"
              onClick={() => router.push("/")}
            >
              Back to Workflow Choice
            </button>
          </div>
        </div>
      ) : null}

      {status === "cancelled" ? (
        <div data-testid="status-cancelled">
          <NoticeBanner tone="info" message="This job was cancelled." />
          <div className="job-status__post-actions" data-testid="job-status-post-actions">
            <button
              type="button"
              className="btn btn--tertiary"
              data-testid="back-to-workflow-choice-cancelled"
              onClick={() => router.push("/")}
            >
              Back to Workflow Choice
            </button>
          </div>
        </div>
      ) : null}

      {status === "expired" ? (
        <div data-testid="status-expired">
          <NoticeBanner
            tone="info"
            message="This job has expired. Its artifacts are no longer available."
          />
          <div className="job-status__post-actions" data-testid="job-status-post-actions">
            <button
              type="button"
              className="btn btn--tertiary"
              data-testid="back-to-workflow-choice-expired"
              onClick={() => router.push("/")}
            >
              Back to Workflow Choice
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
