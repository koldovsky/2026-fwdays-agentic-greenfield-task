"use client";

// CV intake composer (gate-premium-upload-zone, T4). Composes two focused
// zones with an unchanged external props contract so no call site needs
// updating:
//   - TextUploadZone: free, ungated parse → `onExtracted` (FR-CV-01, FR-ONBOARD-01).
//   - PremiumAttachZone: paid-gated original-PDF attach → `onAttachmentChange`.
// The attach entitlement (`paid`) is server-resolved (never client-derived); the
// server re-checks before honoring any attachment (NFR-SEC-04, BC-HONESTY-01).
import { useState } from "react";

import type { Locale } from "@/shared/lib/i18n";
import type { DocumentAttachment } from "@/shared/lib/llm";
import { MAX_ATTACHMENT_BYTES, PDF_MIME } from "@/shared/lib/parse-document";

import { resolveCvMime } from "../lib/validate-file";
import { PremiumAttachZone } from "./PremiumAttachZone";
import { TextUploadZone } from "./TextUploadZone";

export interface UploadCvDropzoneProps {
  /** UI locale; Ukrainian-first (NFR-I18N-01). */
  readonly locale?: Locale;
  /** Called with the extracted plain text after a successful parse. */
  readonly onExtracted: (text: string) => void;
  /**
   * Server-resolved paid entitlement (add-premium-pdf-attach, T5). When true the
   * premium zone is a live PDF drop target whose file is offered to the
   * generation pass; when false it is a blurred, inert premium affordance. Never
   * client-derived — the server re-checks before honoring the attachment.
   */
  readonly paid?: boolean;
  /**
   * Called with the original PDF (or null to clear) once a paid user attaches
   * one. The parent forwards it to the generation request; the server validates
   * and gates it again (NFR-SEC-04). Absent → the premium zone is not rendered.
   */
  readonly onAttachmentChange?: (attachment: DocumentAttachment | null) => void;
  /** Opens the upgrade surface when a free/anon user activates the banner CTA. */
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
  // Filename of the attached original PDF (paid only), and the too-large note.
  const [attachedName, setAttachedName] = useState<string | null>(null);
  const [attachTooLarge, setAttachTooLarge] = useState(false);

  // The premium zone is only rendered when the parent wires the attach feature.
  const attachEnabled = onAttachmentChange !== undefined;

  function clearAttachment() {
    setAttachedName(null);
    setAttachTooLarge(false);
    onAttachmentChange?.(null);
  }

  /**
   * Offer a paid user's PDF to the generation pass as the original document.
   * Any non-PDF (or a failed read) clears a prior attachment so the request
   * never carries a stale document (BC-HONESTY-01/02 stays text-true). This is a
   * UX guard only; the server re-validates type, size, and magic bytes.
   */
  async function maybeAttach(file: File) {
    if (!paid) return;
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

  return (
    <div className="flex flex-col gap-3">
      <TextUploadZone locale={locale} onExtracted={onExtracted} />

      {attachEnabled && (
        <PremiumAttachZone
          locale={locale}
          paid={paid}
          attachedName={attachedName}
          attachTooLarge={attachTooLarge}
          onFileSelected={maybeAttach}
          onClearAttachment={clearAttachment}
          onUpgrade={onUpgrade}
        />
      )}
    </div>
  );
}
