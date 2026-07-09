// Three-pillar honesty axis (FR-SALES-01). Accent shown as a colored dot token
// (no icon libraries / SVG paths — BC-BRAND-01). Copy via shared/lib/i18n.
import { type Locale } from "@/shared/lib/i18n";
import { pillarsSection, type Pillar } from "../lib/content";
import { SectionHead, Wrap } from "./primitives";

const accentWash: Record<Pillar["accent"], string> = {
  brand: "bg-brand-wash",
  met: "bg-met-bg",
  overclaim: "bg-overclaim-bg",
};

const accentDot: Record<Pillar["accent"], string> = {
  brand: "bg-brand",
  met: "bg-met",
  overclaim: "bg-overclaim",
};

export function Pillars({ locale = "ua" }: { readonly locale?: Locale }) {
  const { head, items } = pillarsSection(locale);
  return (
    <section className="py-16">
      <Wrap>
        <SectionHead kicker={head.kicker} title={head.title} lead={head.lead} />
        <div className="grid gap-4 md:grid-cols-3">
          {items.map((p) => (
            <div
              key={p.title}
              className="rounded-xl border border-hairline bg-surface-card p-6"
            >
              <span
                className={`mb-[14px] grid h-[38px] w-[38px] place-items-center rounded-md ${accentWash[p.accent]}`}
              >
                <span className={`h-[10px] w-[10px] rounded-full ${accentDot[p.accent]}`} />
              </span>
              <h3 className="mb-[6px] font-display text-lg font-semibold text-ink">
                {p.title}
              </h3>
              <p className="text-sm leading-normal text-ink-soft">{p.body}</p>
            </div>
          ))}
        </div>
      </Wrap>
    </section>
  );
}
