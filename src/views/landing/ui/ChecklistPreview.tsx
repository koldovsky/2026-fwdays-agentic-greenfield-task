// Match-score checklist preview (FR-SALES-02, FR-CHECKLIST-02/04). Reuses the
// shared MatchScore donut + ChecklistRow. Static example data only. Copy via i18n.
import { type Locale } from "@/shared/lib/i18n";
import { ChecklistRow, MatchScore } from "@/shared/ui";
import { checklistSection } from "../lib/content";
import { SectionHead, Wrap } from "./primitives";

export function ChecklistPreview({ locale = "ua" }: { readonly locale?: Locale }) {
  const { head, score, headline, subtext, rows } = checklistSection(locale);
  return (
    <section className="py-16">
      <Wrap>
        <SectionHead kicker={head.kicker} title={head.title} lead={head.lead} />
        <div className="grid gap-10 md:grid-cols-[auto_1fr]">
          <div className="flex flex-col items-start">
            <MatchScore score={score} headline={headline} subtext={subtext} size="lg" />
          </div>
          <div>
            {rows.map((row, i) => (
              <ChecklistRow
                key={row.requirement}
                requirement={row.requirement}
                priority={row.priority}
                status={row.status}
                rationale={row.rationale}
                last={i === rows.length - 1}
                locale={locale}
              />
            ))}
          </div>
        </div>
      </Wrap>
    </section>
  );
}
