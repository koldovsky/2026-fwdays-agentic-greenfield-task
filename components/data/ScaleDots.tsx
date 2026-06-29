// @trace FR-PROGRESS-02 NFR-A11Y-02

/**
 * The signature five-dot score readout, ported from
 * `docs/KoloDesign/components/data/ScaleDots` (filled = ink, empty = grey).
 * `value` is the chosen anchor value and `max` the highest anchor value, so the
 * fill reflects the answer. Decorative only (`aria-hidden`) — the caller renders
 * the numeral alongside as the accessible value (NFR-A11Y-02).
 */
export function ScaleDots({ value, max = 5 }: { value: number; max?: number }) {
  const dots = Math.max(1, max);
  const filled = Math.max(0, Math.min(dots, Math.round(value)));

  return (
    <div className="flex items-center gap-[var(--space-3)]" aria-hidden="true">
      {Array.from({ length: dots }).map((_, index) => (
        <span
          key={index}
          className={`h-[10px] w-[10px] shrink-0 rounded-[var(--radius-full)] ${
            index < filled ? "bg-ink" : "bg-[var(--dot-empty)]"
          }`}
        />
      ))}
    </div>
  );
}
