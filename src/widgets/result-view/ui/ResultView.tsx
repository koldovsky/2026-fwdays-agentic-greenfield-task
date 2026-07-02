// result-view widget — the two-column result frame (FR-SHELL-01/02).
// LAYOUT-ONLY: it renders a shared header + a responsive two-column grid from
// `left` / `right` slot props. It deliberately imports NO other widget
// (checklist-panel, bullet-list) — the composing VIEW passes those in as slots,
// keeping this a pure layout with zero widget→widget imports (FSD import rule).
// Owns no state, no fetch, no logic; styled only with design tokens.
import type { ReactNode } from "react";
import { t } from "@/shared/lib/i18n";
import type { Locale } from "@/shared/lib/i18n";

export interface ResultViewProps {
  /** Left column content — typically the compliance checklist. */
  readonly left: ReactNode;
  /** Right column content — typically the tailored bullet list. */
  readonly right: ReactNode;
  /** UI locale for the frame copy; Ukrainian-first (NFR-I18N-01). */
  readonly locale?: Locale;
}

/**
 * Presentational two-column result layout: stacks to a single column on narrow
 * viewports and splits into two columns on wide ones (FR-SHELL-02). Both columns
 * are supplied by the parent via `left` / `right` slots.
 */
export function ResultView({ left, right, locale = "uk" }: ResultViewProps) {
  const copy = t(locale).result;

  return (
    <section aria-label={copy.regionLabel} className="font-body">
      <header className="mb-6">
        <p className="font-mono text-xs uppercase tracking-eyebrow text-ink-muted m-0">
          {copy.eyebrow}
        </p>
        <h2 className="font-display text-3xl font-semibold tracking-tight text-ink mt-2 mb-0">
          {copy.title}
        </h2>
      </header>

      <div className="grid grid-cols-1 gap-6 md:gap-8 lg:grid-cols-2 lg:items-start">
        <div>{left}</div>
        <div>{right}</div>
      </div>
    </section>
  );
}
