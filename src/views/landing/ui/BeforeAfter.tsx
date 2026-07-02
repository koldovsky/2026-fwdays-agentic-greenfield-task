// Grounded before/after section (FR-SALES-02): original CV line vs the tailored
// rewrite, each rewrite carrying its grounding badge.
import { GroundingBadge } from "@/shared/ui";
import { beforeAfter } from "../lib/content";
import { SectionHead, Wrap } from "./primitives";

export function BeforeAfter() {
  return (
    <section className="border-y border-hairline bg-surface-card py-16">
      <Wrap>
        <SectionHead
          kicker="Grounded rewrites"
          title="Tailored, not invented"
          lead="Vouch sharpens what's already true. Your original line stays the source; the rewrite stretches toward the job without drifting off your record."
        />
        <div className="flex flex-col gap-4">
          {beforeAfter.map((row) => (
            <div key={row.after} className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-hairline-warm bg-surface-warm p-6">
                <div className="mb-[10px] font-mono text-[11px] uppercase tracking-wider text-ink-muted">
                  Your CV
                </div>
                <p className="text-base leading-relaxed text-ink-soft">{row.before}</p>
              </div>
              <div className="rounded-xl border border-brand-wash bg-surface-card p-6">
                <div className="mb-[10px] font-mono text-[11px] uppercase tracking-wider text-brand">
                  Tailored for this job
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
