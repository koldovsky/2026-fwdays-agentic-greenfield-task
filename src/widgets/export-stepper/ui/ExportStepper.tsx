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
import type { CvDocument } from "@/entities/cv-profile";
import { renderPlainText } from "@/entities/export-document";
import {
  buildCoverLetterDocument,
  requestCoverLetter,
  type CoverLetterContext,
} from "@/features/export-cover-letter";
import { buildExportDocument, requestExport, type ExportFormat } from "@/features/export-resume";
import type { CareerStage, ConfirmedAnswerEvidence, Requirement } from "@/shared/lib/llm";
import { t, type Locale } from "@/shared/lib/i18n";
import { Button } from "@/shared/ui";

/** Download states: the résumé formats plus the cover-letter export (§4). */
type PendingExport = ExportFormat | "cover-letter";

/**
 * Grounded-letter evidence forwarded to the server (T5 §3.1/3.3). The candidate's
 * own CV sentences + confirmed answers plus the requirements (emphasis) and
 * careerStage (tone). When present, the server attempts a verified two-pass LLM
 * letter and falls back to the deterministic reflow on any failure — so this
 * widget never renders unverified prose (BC-HONESTY-01/02). Absent keeps the
 * pre-T5 deterministic-only behavior.
 */
export interface LetterEvidence {
  readonly cvSentences: readonly string[];
  readonly confirmedAnswers?: readonly ConfirmedAnswerEvidence[];
  readonly requirements: readonly Requirement[];
  readonly careerStage?: CareerStage;
}

export interface ExportStepperProps {
  readonly bullets: readonly Bullet[];
  /** Server-resolved paid entitlement (FR-PAYWALL-01). */
  readonly paid: boolean;
  /**
   * Optional grounded-letter evidence (T5). When supplied, the cover-letter
   * action requests a server-verified LLM letter; the deterministic reflow is
   * the fail-honest fallback either way.
   */
  readonly letterEvidence?: LetterEvidence;
  /**
   * Optional sectioned CV parse for the structured résumé export (T5 §4). When
   * supplied, PDF/DOCX/clipboard render contact/summary/experience/skills/
   * education with kept bullets merged in; absent keeps the flat bullet list.
   * SECURITY (NFR-SEC-01/02): this carries contact PII and is used ONLY to build
   * the export document — it is NEVER forwarded to any LLM request. It is kept
   * strictly separate from `letterEvidence` (the only LLM-bound input here).
   */
  readonly cvDocument?: CvDocument;
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
  letterEvidence,
  cvDocument,
  locale = "ua",
  onPaywall,
  onStartOver,
  onCopyText = (text) => navigator.clipboard.writeText(text),
  onDownload = downloadBlob,
}: ExportStepperProps) {
  const copy = t(locale);
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState<PendingExport | null>(null);
  const [error, setError] = useState(false);

  // Free-tier footer unless paid (FR-EXPORT-04); only included bullets, in
  // order (BC-HONESTY-02 — the flag was seeded by the loop, never re-derived).
  const doc = useMemo(
    () =>
      buildExportDocument(bullets, {
        headline: copy.export.headline,
        footer: paid ? undefined : copy.export.footer,
        // Structured export (§4): contact PII stays here, on the export path
        // only, and never flows into any LLM request (NFR-SEC-01/02).
        ...(cvDocument ? { cvDocument } : {}),
      }),
    [bullets, paid, copy.export.headline, copy.export.footer, cvDocument],
  );

  // Cover-letter document (§4): grounded, kept bullets reflowed to Ukrainian
  // prose with neutral framing; same free-tier footer rule (FR-EXPORT-04).
  const coverLetterDoc = useMemo(
    () =>
      buildCoverLetterDocument(bullets, {
        headline: copy.export.coverLetter.headline,
        greeting: copy.export.coverLetter.greeting,
        intro: copy.export.coverLetter.intro,
        closing: copy.export.coverLetter.closing,
        footer: paid ? undefined : copy.export.footer,
      }),
    [bullets, paid, copy.export.coverLetter, copy.export.footer],
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

  // Grounded-letter context (T5 §3.1/3.3): the candidate's own evidence + the
  // requirements/tone signals, plus neutral localized framing for the verified
  // paragraphs. Only present when the view forwarded letter evidence; the server
  // still falls back to `coverLetterDoc` on any failure, so the deterministic
  // reflow remains the fail-honest floor (BC-HONESTY-01/02). Framing here omits
  // `intro` on purpose — the LLM writes its own opening body; greeting/closing
  // only bracket it.
  const letterContext = useMemo<CoverLetterContext | undefined>(
    () =>
      letterEvidence
        ? {
            cvSentences: letterEvidence.cvSentences,
            requirements: letterEvidence.requirements,
            ...(letterEvidence.confirmedAnswers
              ? { confirmedAnswers: letterEvidence.confirmedAnswers }
              : {}),
            ...(letterEvidence.careerStage ? { careerStage: letterEvidence.careerStage } : {}),
            framing: {
              greeting: copy.export.coverLetter.greeting,
              closing: copy.export.coverLetter.closing,
              headline: copy.export.coverLetter.headline,
              ...(paid ? {} : { footer: copy.export.footer }),
            },
          }
        : undefined,
    [letterEvidence, paid, copy.export.coverLetter, copy.export.footer],
  );

  const handleCoverLetter = async () => {
    if (!paid) return onPaywall();
    setError(false);
    setCopied(false);
    setPending("cover-letter");
    try {
      const blob = await requestCoverLetter(coverLetterDoc, letterContext);
      onDownload(blob, "vouch-cover-letter.pdf");
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
        <Button
          variant="secondary"
          size="md"
          disabled={pending !== null}
          onClick={handleCoverLetter}
        >
          {pending === "cover-letter" ? copy.export.pending : copy.export.coverLetter.action}
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
