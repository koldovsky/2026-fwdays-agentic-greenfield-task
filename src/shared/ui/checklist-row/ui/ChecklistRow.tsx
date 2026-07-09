// One requirement row in the Vouch compliance checklist (FR-CHECKLIST-02):
// leading status dot, requirement title + priority Badge, one-sentence rationale,
// and a right-aligned StatusPill (locale-aware label, defaults to Ukrainian).
// Presentational, server-safe.
import type { Locale } from "@/shared/lib/i18n";
import type { ChecklistStatus } from "@/shared/lib/scoring";
import { Badge } from "@/shared/ui/badge";
import { StatusPill } from "@/shared/ui/status-pill";

/** Row-local status vocabulary (matches the ChecklistRow.d.ts contract). */
export type ChecklistRowStatus = "met" | "partial" | "info" | "gap" | "overclaim";

export interface ChecklistRowProps {
  /** Requirement title (e.g. "5+ years React"). */
  readonly requirement: string;
  /** Priority level. */
  readonly priority?: "must" | "nice";
  /** Grounding / compliance status. */
  readonly status?: ChecklistRowStatus;
  /** One-sentence plain-language rationale. */
  readonly rationale?: string;
  /** Set true on the final row to suppress the bottom border. */
  readonly last?: boolean;
  /** Visitor locale forwarded to StatusPill. Defaults to "ua" (Ukrainian-first). */
  readonly locale?: Locale;
}

const dotClass: Record<ChecklistRowStatus, string> = {
  met: "bg-met",
  partial: "bg-partial",
  info: "bg-brand",
  gap: "bg-gap",
  overclaim: "bg-overclaim",
};

/** Map the row status onto the canonical checklist status used by StatusPill. */
const toPillStatus: Record<ChecklistRowStatus, ChecklistStatus> = {
  met: "met",
  partial: "partial",
  info: "info",
  gap: "gap",
  overclaim: "overclaim-risk",
};

export function ChecklistRow({
  requirement,
  priority = "must",
  status = "met",
  rationale,
  last = false,
  locale,
}: ChecklistRowProps) {
  return (
    <div
      className={`flex flex-col sm:flex-row gap-2 sm:gap-[14px] py-4 font-body ${last ? "" : "border-b border-hairline"}`}
    >
      {/* Dot + text: always a row so the dot anchors beside the requirement */}
      <div className="flex flex-1 min-w-0 gap-[14px]">
        <span
          className={`mt-[5px] w-[11px] h-[11px] rounded-full shrink-0 ${dotClass[status]}`}
        />
        <div className="flex-1 min-w-0">
          <div
            className={`flex items-center gap-2 flex-wrap ${rationale !== undefined ? "mb-[3px]" : ""}`}
          >
            <span className="font-semibold text-base text-ink">{requirement}</span>
            <Badge priority={priority} />
          </div>
          {rationale !== undefined && (
            <div className="text-[13.5px] text-ink-soft leading-[1.45]">{rationale}</div>
          )}
        </div>
      </div>
      {/* Pill: at sm+ aligns to center of the row; on mobile sits below the text */}
      <div className="self-start sm:self-center shrink-0 pl-[25px] sm:pl-0">
        <StatusPill status={toPillStatus[status]} locale={locale} />
      </div>
    </div>
  );
}
