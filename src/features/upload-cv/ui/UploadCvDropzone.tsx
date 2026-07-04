"use client";

// Drag-and-drop / click-to-browse CV file intake (add-upload-cv task 3.3,
// FR-CV-01). Knows nothing about the tailoring form: extracted text goes up
// through `onExtracted` and the view decides where it lands (FSD — features
// never import features; composition happens in views/tailor-workspace).
// Client-side validation here is UX only; the server re-validates size, MIME,
// and magic bytes as the trust boundary (NFR-SEC-04).
import { useRef, useState, type DragEvent } from "react";

import { t, type Locale } from "@/shared/lib/i18n";
import type { DocumentAttachment } from "@/shared/lib/llm";
import { MAX_ATTACHMENT_BYTES, PDF_MIME } from "@/shared/lib/parse-document";
import { Button } from "@/shared/ui";

import { parseCvFile } from "../api/parse-cv-file";
import { CV_FILE_ACCEPT, resolveCvMime, validateCvFile } from "../lib/validate-file";
import type { UploadCvErrorCode } from "../model/types";

export interface UploadCvDropzoneProps {
  /** UI locale; Ukrainian-first (NFR-I18N-01). */
  readonly locale?: Locale;
  /** Called with the extracted plain text after a successful parse. */
  readonly onExtracted: (text: string) => void;
  /**
   * Server-resolved paid entitlement (add-premium-pdf-attach, T5). When true a
   * PDF upload is ALSO offered to the generation pass as the original document;
   * when false the attach control is a disabled premium affordance. Never
   * client-derived — the server re-checks before honoring the attachment.
   */
  readonly paid?: boolean;
  /**
   * Called with the original PDF (or null to clear) once a paid user uploads
   * one. The parent forwards it to the generation request; the server validates
   * and gates it again (NFR-SEC-04). Absent → no attach feature is wired.
   */
  readonly onAttachmentChange?: (attachment: DocumentAttachment | null) => void;
  /** Opens the upgrade surface when a free/anon user activates the control. */
  readonly onUpgrade?: () => void;
}

/** Read a File as bare base64 (strips the `data:...;base64,` prefix). */
function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("read_failed"));
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : "");
    };
    reader.readAsDataURL(file);
  });
}

export function UploadCvDropzone({
  locale = "ua",
  onExtracted,
  paid = false,
  onAttachmentChange,
  onUpgrade,
}: UploadCvDropzoneProps) {
  const copy = t(locale).uploadCv;
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<UploadCvErrorCode | null>(null);
  const [dragActive, setDragActive] = useState(false);
  // Filename of the attached original PDF (paid only), and the too-large note.
  const [attachedName, setAttachedName] = useState<string | null>(null);
  const [attachTooLarge, setAttachTooLarge] = useState(false);

  // The attach control is only wired when the parent passes a change handler.
  const attachEnabled = onAttachmentChange !== undefined;

  function clearAttachment() {
    setAttachedName(null);
    setAttachTooLarge(false);
    onAttachmentChange?.(null);
  }

  /**
   * For a paid user, offer a PDF upload to the generation pass as the original
   * document. Any non-PDF (or a failed read) clears a prior attachment so the
   * request never carries a stale document (BC-HONESTY-01/02 stays text-true).
   */
  async function maybeAttach(file: File) {
    if (!paid || !attachEnabled) return;
    if (resolveCvMime(file) !== PDF_MIME) {
      clearAttachment();
      return;
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setAttachTooLarge(true);
      setAttachedName(null);
      onAttachmentChange?.(null);
      return;
    }
    try {
      const dataBase64 = await readFileAsBase64(file);
      onAttachmentChange?.({ kind: "pdf", mediaType: "application/pdf", dataBase64 });
      setAttachedName(file.name);
      setAttachTooLarge(false);
    } catch {
      clearAttachment();
    }
  }

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
      await maybeAttach(file);
    } else {
      // Calm coded copy, never a raw failure (NFR-OBS-01).
      setError(outcome.error);
      clearAttachment();
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

      {/* Premium attach control (add-premium-pdf-attach, T5, FR-PAYWALL-02). */}
      {attachEnabled && paid && attachedName !== null && (
        <div className="flex items-center gap-3 text-sm text-ink-soft">
          <span>
            {copy.attach.attachedLabel}: {attachedName}
          </span>
          <Button type="button" variant="ghost" size="sm" onClick={clearAttachment}>
            {copy.attach.remove}
          </Button>
        </div>
      )}

      {attachEnabled && paid && attachTooLarge && (
        <p role="alert" className="text-sm text-gap-text">
          {copy.attach.tooLarge}
        </p>
      )}

      {attachEnabled && !paid && (
        // Looks locked, but activating it opens the upgrade surface (spec:
        // disabled affordance + premium badge → upgrade path). A real button so
        // it is keyboard-reachable; onUpgrade drives the paywall.
        <button
          type="button"
          onClick={onUpgrade}
          aria-disabled="true"
          className="flex items-center gap-2 self-start rounded-lg border border-hairline bg-surface-canvas px-3 py-2 text-sm text-ink-muted"
        >
          <span>{copy.attach.addOriginalPdf}</span>
          <span className="inline-flex items-center rounded-xs bg-brand-wash px-[7px] py-[2px] font-body text-[10px] font-bold uppercase tracking-wide leading-[1.6] text-brand">
            {copy.attach.premiumBadge}
          </span>
        </button>
      )}
    </div>
  );
}
