// «Поливайко» all-done empty state (design D7, FR-REM-06). Presentational:
// shown on the home when nothing is due — a centered decorative leaf glyph, the
// "Усі политі! 🌱" title, and a reassurance line. A helpful empty state, never a
// blank area or a raw error.
//
// @trace FR-REM-06

import { LeafIcon } from "@/components/icons";
import { uk } from "@/lib/i18n/uk";

export function AllDoneState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[22px] border border-dashed border-border bg-cloud px-6 py-12 text-center">
      <span className="text-forest">
        <LeafIcon size={48} />
      </span>
      <h2 className="font-display text-[20px] font-bold text-ink">
        {uk.reminders.allDoneTitle}
      </h2>
      <p className="max-w-xs font-body text-sm text-stone">
        {uk.reminders.allDoneReassurance}
      </p>
    </div>
  );
}
