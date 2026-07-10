// Grounding status pill shown beneath each tailored CV bullet.
// FR-BULLETS-01 (grounded), FR-BULLETS-02 (overclaim), FR-EDIT-02 (manual edit).
// Ukrainian-first default labels (NFR-I18N-01, BC-BRAND-01) — no exclamation points.

export type GroundingStatus = "met" | "partial" | "overclaim" | "manual";

export interface GroundingBadgeProps {
  /** Grounding result. */
  readonly status?: GroundingStatus;
  /** Override the default label for this status (e.g. a CV line reference). */
  readonly label?: string;
}

interface GroundingConfig {
  readonly pill: string;
  readonly dot: string;
  readonly defaultLabel: string;
}

const config: Record<GroundingStatus, GroundingConfig> = {
  met: { pill: "bg-met-bg text-met", dot: "bg-met", defaultLabel: "Підтверджено" },
  partial: {
    pill: "bg-partial-bg text-partial-text",
    dot: "bg-partial",
    defaultLabel: "Частково підтверджено",
  },
  overclaim: {
    pill: "bg-overclaim-bg text-overclaim-text",
    dot: "bg-overclaim",
    defaultLabel: "Немає підтверджень · виключено з експорту",
  },
  manual: {
    pill: "bg-surface-canvas text-ink-soft",
    dot: "bg-ink-muted",
    defaultLabel: "Відредаговано вручну",
  },
};

export function GroundingBadge({ status = "met", label }: GroundingBadgeProps) {
  const c = config[status];
  return (
    <span
      className={
        "inline-flex items-center gap-[7px] font-body font-semibold text-[12.5px] " +
        `leading-none px-[11px] py-[6px] rounded-pill ${c.pill}`
      }
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${c.dot}`} />
      {label !== undefined ? label : c.defaultLabel}
    </span>
  );
}
