// «Поливайко» home summary card (design D7, FR-REM-03). Presentational: a pine
// card (paper text, radius 22) showing the "Сьогодні полити" label and the big
// due count. A count of 0 renders a literal 0, never a blank — the all-done state
// replaces the LIST, not the count display.
//
// @trace FR-REM-03

import { uk } from "@/lib/i18n/uk";
import { ukPlural } from "@/lib/i18n/plural";

export interface SummaryCardProps {
  /** Number of plants due today (soon + overdue). */
  count: number;
}

export function SummaryCard({ count }: SummaryCardProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[22px] bg-pine px-6 py-5 text-paper">
      <p className="font-display text-[15px] font-semibold">
        {uk.reminders.summaryLabel}
      </p>
      <p
        className="font-display text-[40px] font-bold leading-none tabular-nums"
        aria-label={`${count} ${ukPlural(count, uk.reminders.summaryUnit)}`}
      >
        {count}
      </p>
    </div>
  );
}
