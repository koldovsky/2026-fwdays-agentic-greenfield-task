// Compliance checklist widget (FR-CHECKLIST-02, FR-CHECKLIST-04): a headline
// 0–100 MatchScore above a list of requirement rows, each showing its text,
// must-have / nice-to-have priority, and met / partial / gap / overclaim-risk
// status. Purely presentational — all data arrives via props, no fetching and
// no business logic. Composes the shared/ui kit; styled only with design tokens.
import type { ChecklistStatus } from "@/entities/checklist-item";
import type { Requirement } from "@/entities/requirement";
import { t } from "@/shared/lib/i18n";
import type { Locale } from "@/shared/lib/i18n";
import { ChecklistRow, MatchScore } from "@/shared/ui";
import type { ChecklistRowStatus } from "@/shared/ui";

/** One requirement paired with its scored status + rationale. */
export interface ChecklistPanelRow {
  /** The ranked JD requirement (text + importance). */
  readonly requirement: Requirement;
  /** Grounding / compliance status for this requirement. */
  readonly status: ChecklistStatus;
  /** One-sentence Ukrainian rationale (FR-CHECKLIST-03). */
  readonly rationale?: string;
}

export interface ChecklistPanelProps {
  /** Overall 0–100 weighted match score (FR-CHECKLIST-04). */
  readonly score: number;
  /** Requirement rows, rendered in the given order. */
  readonly rows: readonly ChecklistPanelRow[];
  /** UI locale for centralized copy; Ukrainian-first (NFR-I18N-01). */
  readonly locale?: Locale;
}

/** Canonical checklist status → the row-local vocabulary of ChecklistRow. */
const toRowStatus: Record<ChecklistStatus, ChecklistRowStatus> = {
  met: "met",
  partial: "partial",
  info: "info",
  gap: "gap",
  "overclaim-risk": "overclaim",
};

/** Requirement importance → the Badge priority vocabulary. */
const toPriority: Record<Requirement["importance"], "must" | "nice"> = {
  "must-have": "must",
  "nice-to-have": "nice",
};

export function ChecklistPanel({ score, rows, locale = "ua" }: ChecklistPanelProps) {
  const copy = t(locale);

  return (
    <section className="bg-white border border-hairline rounded-xl shadow-card p-6 font-body">
      <header className="mb-2">
        <MatchScore score={score} headline={copy.checklist.scoreHeadline} />
      </header>
      <div>
        {rows.map((row, index) => (
          <ChecklistRow
            key={row.requirement.id}
            requirement={row.requirement.text}
            priority={toPriority[row.requirement.importance]}
            status={toRowStatus[row.status]}
            rationale={row.rationale}
            last={index === rows.length - 1}
          />
        ))}
      </div>
    </section>
  );
}
