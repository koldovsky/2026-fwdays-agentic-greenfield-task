"use client";

// Drag-and-drop / click-to-browse CV file intake (add-upload-cv task 3.3,
// FR-CV-01). Knows nothing about the tailoring form: extracted text goes up
// through `onExtracted` and the view decides where it lands (FSD — features
// never import features; composition happens in views/tailor-workspace).
// Client-side validation here is UX only; the server re-validates size, MIME,
// and magic bytes as the trust boundary (NFR-SEC-04).
import { useRef, useState, type DragEvent } from "react";

import { t, type Locale } from "@/shared/lib/i18n";
import { Button } from "@/shared/ui";

import { parseCvFile } from "../api/parse-cv-file";
import { CV_FILE_ACCEPT, validateCvFile } from "../lib/validate-file";
import type { UploadCvErrorCode } from "../model/types";

export interface UploadCvDropzoneProps {
  /** UI locale; Ukrainian-first (NFR-I18N-01). */
  readonly locale?: Locale;
  /** Called with the extracted plain text after a successful parse. */
  readonly onExtracted: (text: string) => void;
}

export function UploadCvDropzone({ locale = "ua", onExtracted }: UploadCvDropzoneProps) {
  const copy = t(locale).uploadCv;
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<UploadCvErrorCode | null>(null);
  const [dragActive, setDragActive] = useState(false);

  async function handleFile(file: File | null | undefined) {
    if (!file || pending) return;

    // Instant feedback without a network call (UX half of the validation).
    const clientError = validateCvFile(file);
    if (clientError !== null) {
      setError(clientError);
      return;
    }

    setPending(true);
    setError(null);
    const outcome = await parseCvFile(file);
    if (outcome.ok) {
      onExtracted(outcome.text);
    } else {
      // Calm coded copy, never a raw failure (NFR-OBS-01).
      setError(outcome.error);
    }
    setPending(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    void handleFile(event.dataTransfer.files?.[0]);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(true);
  }

  const errorCopy: Record<UploadCvErrorCode, string> = {
    unsupported_type: copy.error.unsupportedType,
    too_large: copy.error.tooLarge,
    unparseable: copy.error.unparseable,
    failed: copy.error.failed,
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragActive(false)}
        className={
          "flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-8 text-center " +
          (dragActive ? "border-brand bg-brand-wash" : "border-hairline bg-white")
        }
      >
        <p className="text-base font-semibold text-ink">{copy.dropLabel}</p>
        <p className="text-sm text-ink-soft">{copy.hint}</p>
        {/* Keyboard path: a real button opens the native picker; the input
            itself stays out of the tab order so there is exactly one stop. */}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
        >
          {copy.browseAction}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={CV_FILE_ACCEPT}
          className="sr-only"
          tabIndex={-1}
          aria-label={copy.browseAction}
          onChange={(event) => {
            void handleFile(event.target.files?.[0]);
            // Allow re-selecting the same file (re-upload replaces the text).
            event.target.value = "";
          }}
        />
      </div>

      {pending && (
        <p role="status" className="text-sm text-ink-soft">
          {copy.pending}
        </p>
      )}

      {error !== null && !pending && (
        <p role="alert" className="text-sm text-gap-text">
          {errorCopy[error]}
        </p>
      )}
    </div>
  );
}
