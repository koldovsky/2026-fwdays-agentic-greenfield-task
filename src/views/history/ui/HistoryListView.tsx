// History list view (add-tailoring-history, FR-HISTORY-01). Presentational: the
// page resolves auth + the paid gate and passes summaries in. Each row links to
// the detail route; an empty state points a paid user with no history at the
// tailor flow. Design-system tokens only (DESIGN.md) — no new hues/emoji/icons.
import Link from "next/link";

import type { TailoringSummary } from "@/shared/lib/db";
import { t, type Locale } from "@/shared/lib/i18n";

export interface HistoryListViewProps {
  readonly summaries: readonly TailoringSummary[];
  /** UI locale; Ukrainian-first (NFR-I18N-01). */
  readonly locale?: Locale;
}

export function HistoryListView({ summaries, locale = "ua" }: HistoryListViewProps) {
  const copy = t(locale).history;

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-12">
      <h1 className="font-display text-3xl tracking-tight text-ink">{copy.title}</h1>
      <p className="mt-2 max-w-2xl font-body text-base text-ink-soft leading-normal">{copy.lead}</p>

      {summaries.length === 0 ? (
        <div className="mt-8 rounded-xl border border-hairline bg-white p-8 text-center shadow-card">
          <p className="font-body text-base text-ink-soft">{copy.empty}</p>
          <Link
            href="/tailor"
            className="mt-4 inline-block font-body text-base font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {copy.emptyCta}
          </Link>
        </div>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {summaries.map((s) => (
            <li key={s.id}>
              <Link
                href={`/history/${s.id}`}
                className="flex items-center justify-between gap-4 rounded-xl border border-hairline bg-white px-5 py-4 shadow-card transition-colors hover:bg-surface-warm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-body text-base font-semibold text-ink">
                    {s.jobTitle ?? copy.untitled}
                  </span>
                  <time
                    dateTime={s.createdAt}
                    className="mt-0.5 block font-body text-sm text-ink-faint"
                  >
                    {s.createdAt.slice(0, 10)}
                  </time>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-body text-sm text-ink-soft">{copy.scoreLabel}</span>
                  <span className="block font-display text-xl tabular-nums text-ink">
                    {s.matchScore ?? "—"}
                  </span>
                </span>
                <span className="shrink-0 font-body text-sm font-semibold text-brand">
                  {copy.openAction}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
