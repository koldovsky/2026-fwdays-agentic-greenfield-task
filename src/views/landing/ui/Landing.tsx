// Public marketing landing (views/landing) — server-rendered composition of all
// sections in order (FR-SALES-01/02/03, FR-SHELL-03). No tailoring job or data
// request runs on load; the FAQ is the only interactive piece.
//
// Copy is localized via shared/lib/i18n. Locale is pinned to "en" for now
// (extract-landing-i18n): t() defaults to `ua` and the display fonts are
// latin-only, so passing an explicit locale keeps the page in English until
// task 10 wires a Cyrillic subset + the language toggle.
import { type Locale } from "@/shared/lib/i18n";
import { Reveal } from "@/shared/ui";
import { TopBarSession } from "@/widgets/top-bar";
import { BeforeAfter } from "./BeforeAfter";
import { ChecklistPreview } from "./ChecklistPreview";
import { Faq } from "./Faq";
import { FinalCta } from "./FinalCta";
import { Footer } from "./Footer";
import { Hero } from "./Hero";
import { HowItWorks } from "./HowItWorks";
import { Pillars } from "./Pillars";
import { Pricing } from "./Pricing";
import { StructuredData } from "./StructuredData";

export function Landing({ locale = "en" }: { readonly locale?: Locale }) {
  return (
    <>
      <StructuredData />
      <TopBarSession locale={locale} />
      <main id="top">
        <Hero locale={locale} />
        {/* Below-the-fold sections reveal on scroll. Each stays server-rendered
            inside a thin client Reveal wrapper (only the wrapper ships JS). */}
        <Reveal>
          <Pillars locale={locale} />
        </Reveal>
        <Reveal>
          <BeforeAfter locale={locale} />
        </Reveal>
        <Reveal>
          <ChecklistPreview locale={locale} />
        </Reveal>
        <Reveal>
          <HowItWorks locale={locale} />
        </Reveal>
        <Reveal>
          <Pricing locale={locale} />
        </Reveal>
        <Reveal>
          <Faq locale={locale} />
        </Reveal>
        <Reveal>
          <FinalCta locale={locale} />
        </Reveal>
      </main>
      <Footer locale={locale} />
    </>
  );
}
