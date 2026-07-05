// Final CTA block (FR-SALES-01): dark panel with the primary conversion action.
// Copy via shared/lib/i18n.
import { type Locale } from "@/shared/lib/i18n";
import { Button } from "@/shared/ui";
import { finalCtaContent } from "../lib/content";
import { Wrap } from "./primitives";

export function FinalCta({ locale = "ua" }: { readonly locale?: Locale }) {
  const copy = finalCtaContent(locale);
  return (
    <section className="py-16">
      <Wrap>
        <div className="rounded-3xl bg-ink px-10 py-14 text-center text-white shadow-ink">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {copy.headline}
          </h2>
          <p className="mx-auto mt-[14px] max-w-[32em] text-lg leading-relaxed text-brand-wash">
            {copy.subtext}
          </p>
          <div className="mt-7 flex justify-center">
            <Button href="/tailor" variant="primary" size="lg">
              {copy.cta}
            </Button>
          </div>
        </div>
      </Wrap>
    </section>
  );
}
