import type { Evaluation } from "@/app/lib/scoring";
import { categoryLabel } from "@/app/lib/recommend";

/**
 * Category pill (traffic-light). Carries a colored dot AND the word, so the
 * signal is never color-only (NFR-A11Y-01). Non-fitting programs get a neutral
 * "Інший предмет НМТ" label.
 */
export function CategoryPill({ evaluation }: { evaluation: Evaluation }) {
  const label = categoryLabel(evaluation);

  if (!evaluation.fits) {
    return (
      <span
        className="pk-pill"
        style={{
          color: "var(--pk-slate-600)",
          background: "var(--pk-divider)",
        }}
      >
        <span
          className="pk-pill__dot"
          style={{ background: "var(--pk-slate-400)" }}
          aria-hidden="true"
        />
        {label}
      </span>
    );
  }

  return (
    <span className={`pk-pill pk-pill--${evaluation.category}`}>
      <span className="pk-pill__dot" aria-hidden="true" />
      {label}
    </span>
  );
}
