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
        {/* Score summary sits in a card on top of the checklist grid. */}
        <div className="rounded-xl border border-hairline bg-surface-card px-6 py-5">
          <MatchScore score={score} headline={headline} subtext={subtext} size="lg" />
        </div>
        {/*
          Bullets render as a two-column grid below (single column below sm).
          `auto-rows-fr` keeps every grid row the same height so the two columns
          stay aligned instead of shifting when a rationale wraps. `last` is left
          false; the trailing dividers are dropped with CSS — the very last cell
          in every layout, plus the bottom desktop row's second cell at sm+.
        */}
        <div className="mt-8 grid auto-rows-fr gap-x-12 sm:grid-cols-2 [&>*:last-child]:border-b-0 sm:[&>*:nth-last-child(2)]:border-b-0">
          {rows.map((row) => (
            <ChecklistRow
              key={row.requirement}
              requirement={row.requirement}
              priority={row.priority}
              status={row.status}
              rationale={row.rationale}
              locale={locale}
            />
          ))}
        </div>
      </Wrap>
    </section>
  );
}
