"use client";

// CV + JD input form that drives one tailoring run (FR-CV-02, FR-JD-01,
// FR-TAILOR-01). Streams NDJSON progress from /api/tailor via streamTailoring
// and hands the finished result up to the parent view — this component owns
// only the run's in-flight/error UI, not the result itself (that stays with
// the view, which also seeds bullet export state from it).
import { useState, type FormEvent } from "react";
import { t, type Locale } from "@/shared/lib/i18n";
import { Button } from "@/shared/ui";
import { streamTailoring } from "../api/stream-tailoring";
import type { TailorRunPhase, TailorErrorCode, TailoringRunResult } from "../model/types";

export interface TailoringFormProps {
  /** UI locale; Ukrainian-first (NFR-I18N-01). */
  readonly locale?: Locale;
  /** Called with the finished result once the run streams a `result` event. */
  readonly onResult: (result: TailoringRunResult) => void;
  /**
   * Optional controlled value for the CV textarea (add-upload-cv task 4.1).
   * When provided, the view owns the text — e.g. so an upload's extracted
   * text lands here for review before tailoring (FR-CV-01/03). When omitted,
   * the textarea stays uncontrolled exactly as before (paste path, FR-CV-02).
   */
  readonly cvText?: string;
  /** Change handler for the controlled CV textarea. */
  readonly onCvTextChange?: (text: string) => void;
  /**
   * Fired when the server rejects the run with `rate_limited` (NFR-COST-02).
   * The limit itself is enforced server-side and surfaced inline by this form;
   * this hook only lets the composing view open the paywall ABOVE it
   * (FR-PAYWALL-01) — no limit logic is duplicated here.
   */
  readonly onRateLimited?: () => void;
}

const fieldClass =
  "w-full rounded-sm border border-hairline bg-white px-3 py-2 text-base text-ink " +
  "placeholder:text-ink-faint focus:outline-2 focus:outline-offset-1 focus:outline-brand";

const labelClass = "block text-sm font-semibold text-ink";

export function TailoringForm({
  locale = "ua",
  onResult,
  cvText,
  onCvTextChange,
  onRateLimited,
}: TailoringFormProps) {
  const copy = t(locale);
  const [phase, setPhase] = useState<TailorRunPhase | null>(null);
  const [error, setError] = useState<TailorErrorCode | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const form = new FormData(formEvent.currentTarget);
    const cvText = String(form.get("cvText") ?? "");
    const jdText = String(form.get("jdText") ?? "");

    // Honeypot (NFR-SEC-04): real visitors never see or fill this field. A
    // filled value means a scripted submitter — silently no-op, never reveal
    // detection with an error or a distinct code path.
    if (String(form.get("website") ?? "") !== "") return;

    setPending(true);
    setError(null);
    setPhase(null);
    try {
      for await (const runEvent of streamTailoring({ cvText, jdText })) {
        if (runEvent.type === "status") {
          if (runEvent.phase === "queued" || runEvent.phase === "processing") {
            setPhase(runEvent.phase);
          }
          continue;
        }
        if (runEvent.type === "error") {
          setError(runEvent.code);
          if (runEvent.code === "rate_limited") onRateLimited?.();
          continue;
        }
        if (runEvent.type === "result") {
          onResult(runEvent.result);
          setError(null);
        }
      }
    } catch {
      // A rejected fetch or a malformed NDJSON line surfaces the same calm
      // failure copy as a coded error event — never an unhandled exception
      // (NFR-OBS-01).
      setError("failed");
    } finally {
      setPending(false);
      setPhase(null);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className={labelClass}>
        {copy.workspace.cvLabel}
        <textarea
          name="cvText"
          rows={8}
          required
          className={`mt-1 ${fieldClass}`}
          // Controlled only when the parent provides cvText (task 4.1);
          // otherwise unchanged uncontrolled paste behavior (FR-CV-02).
          {...(cvText !== undefined
            ? { value: cvText, onChange: (e) => onCvTextChange?.(e.target.value) }
            : {})}
        />
      </label>

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

      {/* Honeypot (NFR-SEC-04): off-screen, not display:none (some scrapers
          skip that), and hidden from assistive tech — real users never
          encounter it. A filled value is handled in handleSubmit. */}
      <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
        <label>
          Website
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <Button type="submit" size="md" disabled={pending}>
        {copy.action.tailor}
      </Button>
    </form>
  );
}
