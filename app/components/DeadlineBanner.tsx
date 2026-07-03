import { formatDate } from "@/app/lib/format";
import { DEADLINE_LEAD, deadlineText } from "@/app/lib/copy";

/**
 * Global deadline banner slot (BC-DEADLINE-01, passive surface).
 *
 * Renders on every route to surface admissions deadlines prominently.
 * For the app-shell capability the content is a static placeholder — active
 * reminders/countdowns are out of scope (deadline-reminders, Phase 3).
 *
 * Not color-only (NFR-A11Y-01): meaning is carried by the ⏳ mark and the
 * text label, not just the warn palette.
 */
const PLACEHOLDER_DEADLINE = new Date("2026-07-31T00:00:00");

export function DeadlineBanner() {
  return (
    <div className="pk-banner" role="note" aria-label="Дедлайн вступу">
      <span className="pk-banner__num" aria-hidden="true">
        ⏳
      </span>
      <p className="pk-banner__text">
        <strong>{DEADLINE_LEAD}</strong> {deadlineText(formatDate(PLACEHOLDER_DEADLINE))}
      </p>
    </div>
  );
}
