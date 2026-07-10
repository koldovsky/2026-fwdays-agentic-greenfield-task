// Visible linear step indicator for the tailoring wizard (FR-WIZARD-05): the
// user always sees where they are in Analyze → Confirm → Clarify → Generate →
// Export. Presentational; the view owns the state machine and passes the
// current step. Dots only (no icon library, per DESIGN.md); the connector is a
// plain arrow character, marked aria-hidden.
import { t, type Locale } from "@/shared/lib/i18n";

export type WizardStep = "analyze" | "confirm" | "clarify" | "generate" | "export";

export interface WizardStepsProps {
  readonly current: WizardStep;
  /**
   * Whether the flow includes a clarify step. When the analysis produced no
   * clarifying questions the wizard goes confirm → generate directly, so the
   * clarify dot is dropped rather than shown as a completed step the user never
   * saw (FR-WIZARD-05: reflect where the user actually is). Defaults to true —
   * before analysis, clarify is still part of the planned sequence.
   */
  readonly includeClarify?: boolean;
  /** UI locale; Ukrainian-first (NFR-I18N-01). */
  readonly locale?: Locale;
}

export function WizardSteps({ current, includeClarify = true, locale = "ua" }: WizardStepsProps) {
  const copy = t(locale).wizard;
  const order: readonly WizardStep[] = includeClarify
    ? ["analyze", "confirm", "clarify", "generate", "export"]
    : ["analyze", "confirm", "generate", "export"];
  const labels: Record<WizardStep, string> = {
    analyze: copy.stepAnalyze,
    confirm: copy.stepConfirm,
    clarify: copy.stepClarify,
    generate: copy.stepGenerate,
    export: copy.stepExport,
  };
  const currentIndex = order.indexOf(current);

  return (
    <nav aria-label={copy.stepsLabel} className="mb-8">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {order.map((step, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;
          const dotClass = active ? "bg-brand" : done ? "bg-met" : "bg-hairline";
          const textClass = active ? "text-ink font-semibold" : "text-ink-faint";
          return (
            <li key={step} className="flex items-center gap-2">
              {index > 0 && (
                <span aria-hidden="true" className="text-ink-faint">
                  →
                </span>
              )}
              <span className="flex items-center gap-1.5" aria-current={active ? "step" : undefined}>
                <span className={`h-1.5 w-1.5 rounded-pill ${dotClass}`} />
                <span className={`text-xs uppercase tracking-eyebrow ${textClass}`}>
                  {labels[step]}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
