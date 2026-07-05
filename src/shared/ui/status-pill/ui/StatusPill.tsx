// Checklist status chip (FR-CHECKLIST-02): maps the 5 checklist statuses
// met | partial | info | gap | overclaim-risk to their token colors + Ukrainian
// labels. "info" reuses the existing brand blue (no new hue — DESIGN.md).
// Ukrainian-first copy comes from the shared i18n dictionary (NFR-I18N-01).
import { t, type Locale } from "@/shared/lib/i18n";
import type { ChecklistStatus } from "@/shared/lib/scoring";

export interface StatusPillProps {
  /** Checklist grounding status. */
  readonly status: ChecklistStatus;
  /** Override the default Ukrainian label for this status. */
  readonly label?: string;
  /** Visitor locale. Defaults to "ua" (Ukrainian-first). */
  readonly locale?: Locale;
}

const pillClass: Record<ChecklistStatus, string> = {
  met: "bg-met-bg text-met",
  partial: "bg-partial-bg text-partial-text",
  info: "bg-brand-wash text-brand",
  gap: "bg-gap-bg text-gap-text",
  "overclaim-risk": "bg-overclaim-bg text-overclaim-text",
};

const dotClass: Record<ChecklistStatus, string> = {
  met: "bg-met",
  partial: "bg-partial",
  info: "bg-brand",
  gap: "bg-gap",
  "overclaim-risk": "bg-overclaim",
};

export function StatusPill({ status, label, locale }: StatusPillProps) {
  const text = label ?? t(locale ?? "ua").checklist.statusLabel[status];
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
