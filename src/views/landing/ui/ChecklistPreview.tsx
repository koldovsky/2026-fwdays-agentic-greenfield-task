// Match-score checklist preview (FR-SALES-02, FR-CHECKLIST-02/04). Reuses the
// shared MatchScore donut + ChecklistRow. Static example data only.
import { ChecklistRow, MatchScore } from "@/shared/ui";
import {
  checklistHeadline,
  checklistRows,
  checklistScore,
  checklistSubtext,
} from "../lib/content";
import { SectionHead, Wrap } from "./primitives";

export function ChecklistPreview() {
  return (
    <section className="py-16">
      <Wrap>
        <SectionHead
          kicker="The checklist"
          title="Know exactly where you stand"
          lead="Before you send anything, Vouch shows you the honest match — requirement by requirement."
        />
        <div className="grid gap-10 sm:grid-cols-[220px_1fr]">
          <div className="flex flex-col items-start">
            <MatchScore
              score={checklistScore}
              headline={checklistHeadline}
              subtext={checklistSubtext}
              size="lg"
            />
          </div>
          <div>
            {checklistRows.map((row, i) => (
              <ChecklistRow
                key={row.requirement}
                requirement={row.requirement}
                priority={row.priority}
                status={row.status}
                rationale={row.rationale}
                last={i === checklistRows.length - 1}
              />
            ))}
          </div>
        </div>
      </Wrap>
    </section>
  );
}
