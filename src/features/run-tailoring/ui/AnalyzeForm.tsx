"use client";

// CV + JD input form that drives the wizard's ANALYSIS phase (FR-WIZARD-01,
// FR-CV-02, FR-JD-01). Streams NDJSON progress from /api/tailor/analyze via
// streamAnalyze and hands the finished analysis (checklist + score + clarifying
// questions) up to the parent view, which owns the wizard state machine and
// decides what comes next (confirm → clarify → generate). This component owns
// only the analyze run's in-flight/error UI.
//
// The analyze route's `rate_limited` is a stateless per-IP anti-abuse cap
// (NFR-SEC-04), NOT the NFR-COST-02 tailoring budget — so it surfaces inline
// here and does NOT open the paywall (the paywall belongs to the generate
// step, which spends the actual budget).
import { useState, type FormEvent } from "react";
import { t, type Locale } from "@/shared/lib/i18n";
import { Button } from "@/shared/ui";
import { streamAnalyze } from "../api/stream-analyze";
import type { AnalysisResult } from "../lib/loop";
import type { TailorErrorCode, TailorRunPhase } from "../model/types";

export interface AnalyzeFormProps {
  /** UI locale; Ukrainian-first (NFR-I18N-01). */
  readonly locale?: Locale;
  /**
   * Called with the analysis once the run streams its terminal `analysis`
   * event. The JD text is handed back alongside it because generation needs it
   * as `jobDescription` and the analysis payload itself doesn't carry it.
   */
  readonly onAnalysis: (analysis: AnalysisResult, jdText: string) => void;
  /** Controlled CV textarea value (lifted by the view for the upload path, FR-CV-01/03). */
  readonly cvText: string;
  readonly onCvTextChange: (text: string) => void;
  /**
   * Server-resolved paid entitlement (FR-PAYWALL-01). When true the résumé text
   * field is hidden — a premium user supplies their CV via the enabled
   * drag&drop upload zone, whose extracted text flows in through `cvText`. The
   * JD field, honeypot, and Analyze button are unchanged. Never client-derived.
   */
  readonly paid?: boolean;
}

const fieldClass =
  "w-full rounded-sm border border-hairline bg-white px-3 py-2 text-base text-ink " +
  "placeholder:text-ink-faint focus:outline-2 focus:outline-offset-1 focus:outline-brand";

const labelClass = "block text-sm font-semibold text-ink";

export function AnalyzeForm({
  locale = "ua",
  onAnalysis,
  cvText,
  onCvTextChange,
  paid = false,
}: AnalyzeFormProps) {
  const copy = t(locale);
  const [phase, setPhase] = useState<TailorRunPhase | null>(null);
  const [error, setError] = useState<TailorErrorCode | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const form = new FormData(formEvent.currentTarget);
    // For a paid user the résumé textarea isn't rendered, so read the CV from
    // the controlled prop (fed by the upload zone) rather than the form field.
    const cv = paid ? cvText : String(form.get("cvText") ?? "");
    const jdText = String(form.get("jdText") ?? "");

    // Honeypot (NFR-SEC-04): a filled value means a scripted submitter — silently
    // no-op, never reveal detection with an error or a distinct code path.
    if (String(form.get("website") ?? "") !== "") return;

    setPending(true);
    setError(null);
    setPhase(null);
    // A healthy run ends in a terminal `analysis` or `error` event; a stream that
    // closes without one (e.g. the function is killed at maxDuration) must still
    // surface a calm failure rather than fall silently back to idle (NFR-OBS-01).
    let sawTerminal = false;
    try {
      for await (const event of streamAnalyze({ cvText: cv, jdText })) {
        if (event.type === "status") {
          if (event.phase === "queued" || event.phase === "processing") setPhase(event.phase);
          continue;
        }
        if (event.type === "error") {
          sawTerminal = true;
          setError(event.code);
          continue;
        }
        if (event.type === "analysis") {
          sawTerminal = true;
          setError(null);
          const { type: _type, ...analysis } = event;
          void _type;
          onAnalysis(analysis, jdText);
        }
      }
      if (!sawTerminal) setError("failed");
    } catch {
      setError("failed");
    } finally {
      setPending(false);
      setPhase(null);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Résumé text field: free/anon paste path (FR-CV-03). Hidden for a paid
          user, who uploads their CV via the enabled drag&drop zone; that zone's
          extracted text flows in through the `cvText` prop and is read in
          handleSubmit, so the CV still reaches analysis on the premium path. */}
      {!paid && (
        <label className={labelClass}>
          {copy.workspace.cvLabel}
          <textarea
            name="cvText"
            rows={8}
            required
            className={`mt-1 ${fieldClass}`}
            value={cvText}
            onChange={(e) => onCvTextChange(e.target.value)}
          />
        </label>
      )}

      <label className={labelClass}>
        {copy.workspace.jdLabel}
        <textarea name="jdText" rows={6} required className={`mt-1 ${fieldClass}`} />
      </label>

      {phase !== null && (
        <p role="status" className="text-sm text-ink-soft">
          {phase === "queued" ? copy.tailorRun.queued : copy.tailorRun.processing}
        </p>
      )}

      {error !== null && (
        <p role="alert" className="text-sm text-gap-text">
          {error === "empty_input"
            ? copy.tailorRun.emptyInput
            : error === "rate_limited"
              ? copy.tailorRun.rateLimited
              : copy.tailorRun.failed}
        </p>
      )}

      {/* Honeypot (NFR-SEC-04): off-screen, hidden from assistive tech. */}
      <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <Button
        type="submit"
        size="md"
        disabled={pending || (paid && cvText.trim() === "")}
      >
        {copy.wizard.analyzeAction}
      </Button>
    </form>
  );
}
