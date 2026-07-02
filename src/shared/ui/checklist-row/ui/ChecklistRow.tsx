// One requirement row in the Vouch compliance checklist (FR-CHECKLIST-02):
// leading status dot, requirement title + priority Badge, one-sentence rationale,
// and a right-aligned StatusPill (Ukrainian label). Presentational, server-safe.
import type { ChecklistStatus } from "@/shared/lib/scoring";
import { Badge } from "@/shared/ui/badge";
import { StatusPill } from "@/shared/ui/status-pill";

/** Row-local status vocabulary (matches the ChecklistRow.d.ts contract). */
export type ChecklistRowStatus = "met" | "partial" | "gap" | "overclaim";

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
}

const dotClass: Record<ChecklistRowStatus, string> = {
  met: "bg-met",
  partial: "bg-partial",
  gap: "bg-gap",
  overclaim: "bg-overclaim",
};

/** Map the row status onto the canonical checklist status used by StatusPill. */
const toPillStatus: Record<ChecklistRowStatus, ChecklistStatus> = {
  met: "met",
  partial: "partial",
  gap: "gap",
  overclaim: "overclaim-risk",
};

export function ChecklistRow({
  requirement,
  priority = "must",
  status = "met",
  rationale,
  last = false,
}: ChecklistRowProps) {
  return (
    <div
      className={`flex gap-[14px] py-4 font-body ${last ? "" : "border-b border-hairline"}`}
    >
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
      <div className="self-center shrink-0">
        <StatusPill status={toPillStatus[status]} />
      </div>
    </div>
  );
}
