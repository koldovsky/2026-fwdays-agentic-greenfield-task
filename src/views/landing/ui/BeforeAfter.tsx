// Grounded before/after section (FR-SALES-02): original CV line vs the tailored
// rewrite, each rewrite carrying its grounding badge. Copy via shared/lib/i18n.
import { type Locale } from "@/shared/lib/i18n";
import { GroundingBadge } from "@/shared/ui";
import { beforeAfterSection } from "../lib/content";
import { SectionHead, Wrap } from "./primitives";

export function BeforeAfter({ locale = "ua" }: { readonly locale?: Locale }) {
  const { head, yourCvLabel, tailoredLabel, rows } = beforeAfterSection(locale);
  return (
    <section className="border-y border-hairline bg-surface-card py-16">
      <Wrap>
        <SectionHead kicker={head.kicker} title={head.title} lead={head.lead} />
        <div className="flex flex-col gap-4">
          {rows.map((row) => (
            <div key={row.after} className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-hairline-warm bg-surface-warm p-6">
                <div className="mb-[10px] font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                  {yourCvLabel}
                </div>
                <p className="text-base leading-relaxed text-ink-soft">{row.before}</p>
              </div>
              <div className="rounded-xl border border-brand-wash bg-surface-card p-6">
                <div className="mb-[10px] font-mono text-[11px] uppercase tracking-wider text-brand">
                  {tailoredLabel}
                </div>
                <p className="text-base leading-relaxed text-ink">{row.after}</p>
                <div className="mt-[14px]">
                  <GroundingBadge status={row.grounding} label={row.label} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Wrap>
    </section>
  );
}
