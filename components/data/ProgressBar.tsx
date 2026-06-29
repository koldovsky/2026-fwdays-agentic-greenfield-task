// @trace FR-PROGRESS-01 NFR-A11Y-02

import { progressFraction } from "@/lib/cycles/progress";

/**
 * Answered/total progress, ported from `docs/KoloDesign/components/data/ProgressBar`.
 * The thin 4px bar is always accompanied by the numeric `answered / total`
 * label, so progress is never communicated by fill alone (NFR-A11Y-02), and the
 * bar carries `role="progressbar"` with an accessible value text.
 */
export function ProgressBar({
  answered,
  total,
  label,
}: {
  answered: number;
  total: number;
  label?: string;
}) {
  const pct = Math.round(progressFraction({ answered, total }) * 100);
  const valueText = `${answered} / ${total}`;

  return (
    <div className="flex flex-col gap-[var(--space-2)]">
      <span className="text-[var(--text-xs)] text-ink-muted">
        {label !== undefined ? `${label}: ` : ""}
        {valueText}
      </span>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={Math.max(total, 1)}
        aria-valuenow={answered}
        aria-valuetext={valueText}
        className="h-[4px] w-full overflow-hidden rounded-[2px] bg-[var(--line)]"
      >
        <div
          className="h-[4px] rounded-[2px] bg-[var(--accent)] transition-[width] duration-[var(--motion-mid)]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
