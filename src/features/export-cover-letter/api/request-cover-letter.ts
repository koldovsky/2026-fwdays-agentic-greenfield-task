// Client call to the cover-letter export route (§4.6 + T5 §3.1/3.3). POSTs the
// deterministic fallback ExportDocument (always) plus, when available, the
// grounded-letter `context` (the candidate's CV sentences + confirmed answers,
// the requirements for emphasis, the careerStage for tone, and neutral localized
// framing). The SERVER attempts a verified two-pass LLM letter and falls back to
// the fallback document on any failure — this client never sees or renders
// unverified prose (BC-HONESTY-01/02). Returns the rendered PDF as a Blob; a
// non-ok response throws so the caller surfaces a calm failure (NFR-OBS-01). A
// 402 (server-side paywall, FR-PAYWALL-01) throws the same way — the widget maps
// it to the upgrade surface. Download mechanics live in the widget, not here.
import type { ExportDocument } from "@/entities/export-document";
import type {
  CareerStage,
  ConfirmedAnswerEvidence,
  Requirement,
} from "@/shared/lib/llm";

/**
 * Localized framing for the grounded letter — neutral prose wrapping, never a
 * claim. Passed to the server so it can wrap the verified paragraphs without
 * resolving i18n itself (keeps the route thin, `shared/lib` framework-free).
 */
export interface CoverLetterFraming {
  readonly greeting?: string;
  readonly closing?: string;
  readonly headline?: string;
  readonly footer?: string;
}

/**
 * Grounded-letter context. Its presence opts the request into the server's
 * two-pass LLM path; omit it (or omit cvSentences) to get the deterministic
 * document only. Carries only the candidate's own evidence + emphasis/tone
 * signals — never identifying data (NFR-SEC-02).
 */
export interface CoverLetterContext {
  readonly cvSentences: readonly string[];
  readonly confirmedAnswers?: readonly ConfirmedAnswerEvidence[];
  readonly requirements: readonly Requirement[];
  readonly careerStage?: CareerStage;
  readonly framing?: CoverLetterFraming;
}

export async function requestCoverLetter(
  doc: ExportDocument,
  context?: CoverLetterContext,
): Promise<Blob> {
  const response = await fetch("/api/export/cover-letter", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      document: doc,
      ...(context ? { letter: context } : {}),
    }),
  });
  if (!response.ok) {
    throw new Error(`export_failed:cover-letter:${response.status}`);
  }
  return response.blob();
}
