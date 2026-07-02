// Checklist status chip (FR-CHECKLIST-02): maps the 4 checklist statuses
// met | partial | gap | overclaim-risk to their token colors + Ukrainian labels.
// Ukrainian-first copy comes from the shared i18n dictionary (NFR-I18N-01).
import { uk } from "@/shared/lib/i18n";
import type { ChecklistStatus } from "@/shared/lib/scoring";

export interface StatusPillProps {
  /** Checklist grounding status. */
  readonly status: ChecklistStatus;
  /** Override the default Ukrainian label for this status. */
  readonly label?: string;
}

const pillClass: Record<ChecklistStatus, string> = {
  met: "bg-met-bg text-met",
  partial: "bg-partial-bg text-partial-text",
  gap: "bg-gap-bg text-gap-text",
  "overclaim-risk": "bg-overclaim-bg text-overclaim-text",
};

const dotClass: Record<ChecklistStatus, string> = {
  met: "bg-met",
  partial: "bg-partial",
  gap: "bg-gap",
  "overclaim-risk": "bg-overclaim",
};

export function StatusPill({ status, label }: StatusPillProps) {
  const text = label ?? uk.checklist.statusLabel[status];
  return (
    <span
      className={
        "inline-flex items-center gap-[7px] font-body font-semibold text-sm " +
        `leading-none px-[13px] py-[7px] rounded-pill ${pillClass[status]}`
      }
    >
      <span className={`w-[7px] h-[7px] rounded-full shrink-0 ${dotClass[status]}`} />
      {text}
    </span>
  );
}
