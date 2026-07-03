"use client";

// Export step actions (add-resume-wizard task 4.7, FR-EXPORT-01/02/03): copy to
// clipboard, download PDF, download DOCX — plus start-over. Each action is
// paywall-gated the same way the old single export CTA was (FR-PAYWALL-01):
// when the server-resolved entitlement is not paid, the action opens the
// paywall instead of exporting. The free-tier attribution footer is applied to
// the built document unless the user is paid (FR-EXPORT-04). The download
// mechanics + clipboard write are injectable so the composition is testable.
import { useMemo, useState } from "react";

import type { Bullet } from "@/entities/bullet";
import { renderPlainText } from "@/entities/export-document";
import { buildExportDocument, requestExport, type ExportFormat } from "@/features/export-resume";
import { t, type Locale } from "@/shared/lib/i18n";
import { Button } from "@/shared/ui";

export interface ExportStepperProps {
  readonly bullets: readonly Bullet[];
  /** Server-resolved paid entitlement (FR-PAYWALL-01). */
  readonly paid: boolean;
  /** UI locale; Ukrainian-first (NFR-I18N-01). */
  readonly locale?: Locale;
  /** Open the export paywall when a gated action is used without paid access. */
  readonly onPaywall: () => void;
  /** Reset the wizard. */
  readonly onStartOver: () => void;
  /** Clipboard seam — injectable in tests; defaults to the Clipboard API. */
  readonly onCopyText?: (text: string) => void | Promise<void>;
  /** Download seam — injectable in tests; defaults to an object-URL anchor. */
  readonly onDownload?: (blob: Blob, filename: string) => void;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ExportStepper({
  bullets,
  paid,
  locale = "ua",
  onPaywall,
  onStartOver,
  onCopyText = (text) => navigator.clipboard.writeText(text),
  onDownload = downloadBlob,
}: ExportStepperProps) {
  const copy = t(locale);
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState<ExportFormat | null>(null);
  const [error, setError] = useState(false);

  // Free-tier footer unless paid (FR-EXPORT-04); only included bullets, in
  // order (BC-HONESTY-02 — the flag was seeded by the loop, never re-derived).
  const doc = useMemo(
    () =>
      buildExportDocument(bullets, {
        headline: copy.export.headline,
        footer: paid ? undefined : copy.export.footer,
      }),
    [bullets, paid, copy.export.headline, copy.export.footer],
  );

  const handleCopy = async () => {
    if (!paid) return onPaywall();
    setError(false);
    try {
      await onCopyText(renderPlainText(doc));
      setCopied(true);
    } catch {
      setError(true);
    }
  };

  const handleDownload = async (format: ExportFormat, filename: string) => {
    if (!paid) return onPaywall();
    setError(false);
    setCopied(false);
    setPending(format);
    try {
      const blob = await requestExport(doc, format);
      onDownload(blob, filename);
    } catch {
      setError(true);
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button size="md" onClick={handleCopy}>
          {copy.export.copyAction}
        </Button>
        <Button
          variant="secondary"
          size="md"
          disabled={pending !== null}
          onClick={() => handleDownload("pdf", "vouch-resume.pdf")}
        >
          {pending === "pdf" ? copy.export.pending : copy.export.pdfAction}
        </Button>
        <Button
          variant="secondary"
          size="md"
          disabled={pending !== null}
          onClick={() => handleDownload("docx", "vouch-resume.docx")}
        >
          {pending === "docx" ? copy.export.pending : copy.export.docxAction}
        </Button>
        <Button variant="ghost" size="md" onClick={onStartOver}>
          {copy.wizard.startOverAction}
        </Button>
      </div>

      {copied && (
        <p role="status" className="text-sm text-met-text">
          {copy.export.copiedNotice}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-gap-text">
          {copy.export.error}
        </p>
      )}
    </div>
  );
}
