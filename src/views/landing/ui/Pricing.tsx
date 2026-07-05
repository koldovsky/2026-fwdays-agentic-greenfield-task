// Pricing table (FR-SALES-03): Free / Pro / Job-hunt Pass with plain renewal
// numbers. Included-feature marker is a colored dot (no SVG icons — BC-BRAND-01).
// Copy via shared/lib/i18n.
import { type Locale } from "@/shared/lib/i18n";
import { Button } from "@/shared/ui";
import { pricingSection } from "../lib/content";
import { SectionHead, Wrap } from "./primitives";

export function Pricing({ locale = "ua" }: { readonly locale?: Locale }) {
  const { head, plans } = pricingSection(locale);
  return (
    <section id="pricing" className="scroll-mt-16 py-16">
      <Wrap>
        <SectionHead kicker={head.kicker} title={head.title} lead={head.lead} />
        <div className="grid items-stretch gap-4 md:grid-cols-3">
          {plans.map((plan) => {
            const featured = plan.featured;
            return (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-xl border p-[26px] ${
                  featured
                    ? "border-ink bg-ink text-surface-canvas"
                    : "border-hairline bg-surface-card"
                }`}
              >
                {plan.badge !== undefined && (
                  <span className="absolute right-[18px] top-[18px] rounded-xs bg-brand-wash px-2 py-[3px] text-[10px] font-bold uppercase tracking-wide text-ink">
                    {plan.badge}
                  </span>
                )}
                <div
                  className={`font-display text-[17px] font-semibold ${featured ? "text-white" : "text-ink"}`}
                >
                  {plan.name}
                </div>
                <div
                  className={`mb-[2px] mt-3 font-display text-3xl font-bold ${featured ? "text-white" : "text-ink"}`}
                >
                  {plan.price}
                </div>
                <div className={`text-sm ${featured ? "text-ink-faint" : "text-ink-muted"}`}>
                  {plan.cadence}
                </div>
                <ul className="my-[22px] flex flex-col gap-[9px] text-sm">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className={`flex items-start gap-2 ${featured ? "text-brand-wash" : "text-ink-soft"}`}
                    >
                      <span className="mt-[6px] h-[6px] w-[6px] shrink-0 rounded-full bg-met" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto">
                  <Button
                    href="/tailor"
                    variant={featured ? "primary" : "secondary"}
                    size="md"
                  >
                    {plan.cta}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Wrap>
    </section>
  );
}
