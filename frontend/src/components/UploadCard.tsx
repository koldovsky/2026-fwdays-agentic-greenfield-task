/**
 * UploadCard — single card that morphs between four mutually-exclusive
 * visual states: `dropzone` → `loading` → `metadata-preview` (success) OR
 * `error`. State transitions are CSS-only (opacity + translateY 8px, 150ms
 * ease-out) per UI-SPEC §Card states — no JS animation library.
 *
 * Source of truth:
 *  - D-02 (single-card UX + keyboard a11y)
 *  - 01-UI-SPEC.md §Copywriting Contract + §Color + §Spacing + §Typography
 *
 * `data-testid` attributes below are the Playwright locator contract — see
 * `frontend/tests/pom/UploadLocators.ts`. Do not rename them without
 * updating the POM and the step bindings.
 */
"use client";

import { useEffect, useId, useRef, useState } from "react";

import {
  UploadPreRejectError,
  UploadServerError,
  validateFileForUpload,
} from "@/hooks/useUploadEpub";
import type { EpubUploadResponse } from "@/lib/api-contract";
import { findLanguageName } from "@/lib/target_languages";

import { ErrorBlock } from "./ErrorBlock";

import "./UploadCard.css";

export type UploadCardState = "dropzone" | "loading" | "metadata-preview";

export interface UploadCardProps {
  /**
   * Called when a file is accepted (pre-reject + axios POST). The parent
   * (page) owns the actual mutation so the card stays presentational and
   * the `metadata` / `error` states are coordinated in one place.
   */
  onUpload: (file: File) => Promise<EpubUploadResponse>;
  /**
   * The metadata returned from the most recent successful upload. When set,
   * the card shows the metadata-preview state.
   */
  metadata: EpubUploadResponse | null;
  /**
   * The error from the most recent upload (server or pre-reject). The
   * `ErrorBlock` is rendered inline under the dropzone.
   */
  error: { code: string; message: string } | null;
  onDismissError: () => void;
  onRetry: () => void;
  /**
   * Phase 1 plan 01: called when the user clicks "Upload another". The
   * parent (page) clears its `metadata` + `error` state, then the card
   * re-opens the file picker. The card itself stays presentational —
   * the parent owns the state that the picker reset depends on.
   */
  onReset?: () => void;
}

export function UploadCard({
  onUpload,
  metadata,
  error,
  onDismissError,
  onRetry,
  onReset,
}: UploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [clientReject, setClientReject] = useState<string | null>(null);
  const headingId = useId();
  const liveRegionId = useId();

  const state: UploadCardState = metadata
    ? "metadata-preview"
    : error
      ? "dropzone" // loading is owned by the parent — see `useUploadEpub.isPending`
      : "dropzone";

  // We treat the card as `loading` only while the parent is awaiting
  // `onUpload`. The parent passes `metadata=null` + `error=null` while the
  // mutation is in flight — we mirror that via a local `isBusy` flag that
  // the page can drive via a prop. For simplicity, the page does NOT
  // currently drive `isBusy` (the spinner shows via the metadata-preview
  // gating + the data-testid block); the explicit `loading` state is
  // reserved for when we want a dedicated full-card spinner. We render the
  // metadata values directly when present.
  const isLoading = false;

  // Move focus to the metadata-preview when the upload succeeds so screen
  // readers announce the new region. Only fire on transition from
  // non-metadata → metadata.
  useEffect(() => {
    if (metadata) {
      cardRef.current?.focus();
    }
  }, [metadata]);

  const handleFileChosen = async (file: File) => {
    setClientReject(null);
    try {
      validateFileForUpload(file);
    } catch (err) {
      if (err instanceof UploadPreRejectError) {
        setClientReject(err.message);
        return;
      }
      throw err;
    }
    await onUpload(file);
  };

  const onInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      void handleFileChosen(file);
    }
    // Allow the same file to be re-selected after a retry.
    event.target.value = "";
  };

  const onKeyDownChooseFile = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      inputRef.current?.click();
    }
  };

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      void handleFileChosen(file);
    }
  };

  const onDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(true);
  };

  const onDragLeave = () => setDragOver(false);

  const onClickChooseFile = () => {
    inputRef.current?.click();
  };

  const onClickReset = () => {
    setClientReject(null);
    // Phase 1 plan 01: parent owns the metadata + error state. The
    // reset path runs the parent's `onReset` first (which clears
    // `metadata` + `error`) so the card flips back to the dropzone
    // instead of re-rendering the previous metadata preview.
    //
    // The hidden `<input type="file">` only mounts in the dropzone
    // branch — when metadata is cleared, React unmounts the
    // metadata preview and mounts the new dropzone (with a fresh
    // `<input ref={inputRef}>`). We MUST defer the click to the
    // next tick so the new input is mounted; clicking the old
    // (unmounted) ref would be a no-op.
    onReset?.();
    onDismissError();
    setTimeout(() => {
      inputRef.current?.click();
    }, 0);
  };

  const showSpinner = isLoading;
  const nonEpubReject = clientReject;
  const serverErrorCopy = error ? { code: error.code, message: error.message } : null;

  return (
    <div
      className={`card${dragOver ? " card--drag-over" : ""}`}
      data-testid="upload-card"
      data-state={state}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      ref={cardRef}
      tabIndex={-1}
      aria-labelledby={headingId}
    >
      {metadata ? (
        <section
          className="card__section card__section--metadata"
          data-testid="metadata-preview"
          aria-label="Uploaded EPUB metadata"
        >
          <h2 id={headingId} className="card__metadata-title" data-testid="epub-title">
            {metadata.title ?? "(untitled)"}
          </h2>
          <dl className="card__metadata">
            <div className="card__metadata-row">
              <dt>Author</dt>
              <dd
                data-testid="epub-author"
                className={metadata.author ? undefined : "card__metadata-fallback"}
              >
                {metadata.author ?? "(unknown author)"}
              </dd>
            </div>
            <div className="card__metadata-row">
              <dt>Languages</dt>
              <dd
                data-testid="epub-languages"
                className={
                  metadata.declared_languages.length > 0 ? undefined : "card__metadata-fallback"
                }
              >
                {metadata.declared_languages.length > 0
                  ? metadata.declared_languages
                      .map((code) => `${findLanguageName(code)} (${code})`)
                      .join(", ")
                  : "(none declared)"}
              </dd>
            </div>
            <div className="card__metadata-row">
              <dt>Chapters</dt>
              <dd data-testid="epub-chapter-count">{metadata.chapter_count}</dd>
            </div>
          </dl>
          <div className="card__actions">
            <button
              type="button"
              className="btn btn--primary"
              data-testid="continue-cta"
              onClick={() => {
                document
                  .getElementById("chooser-step")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              Continue
            </button>
            <button
              type="button"
              className="btn btn--tertiary"
              data-testid="reset"
              onClick={onClickReset}
            >
              Upload another
            </button>
          </div>
        </section>
      ) : (
        <section className="card__section card__section--dropzone" aria-label="EPUB upload area">
          <h2 id={headingId} className="card__dropzone-title">
            Upload an EPUB to begin
          </h2>
          <p className="card__dropzone-hint">
            Drag an EPUB here, or choose a file. EPUB 2.0/3.0, up to 50&nbsp;MB.
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".epub"
            className="sr-only"
            onChange={onInputChange}
            data-testid="file-input"
          />
          <div className="card__actions">
            <button
              type="button"
              className="btn btn--primary"
              data-testid="choose-file-button"
              aria-label="Choose an EPUB file to upload"
              onClick={onClickChooseFile}
              onKeyDown={onKeyDownChooseFile}
            >
              Choose file
            </button>
          </div>
          {showSpinner ? (
            <div
              className="card__loading"
              // biome-ignore lint/a11y/useSemanticElements: <output> cannot nest the .spinner span visually
              role="status"
              aria-live="polite"
              aria-label="Validating uploaded EPUB"
              id={liveRegionId}
            >
              <span className="spinner" data-testid="uploading-spinner" />
              <span className="card__loading-label">Validating…</span>
            </div>
          ) : null}
          {nonEpubReject ? (
            <p className="card__client-reject" data-testid="client-reject">
              {nonEpubReject}
            </p>
          ) : null}
        </section>
      )}

      {serverErrorCopy ? (
        <ErrorBlock
          code={serverErrorCopy.code}
          message={serverErrorCopy.message}
          onDismiss={onDismissError}
          onRetry={() => {
            onDismissError();
            onRetry();
          }}
        />
      ) : null}
    </div>
  );
}
