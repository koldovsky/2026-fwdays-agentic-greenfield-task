// Public marketing landing (views/landing) — server-rendered composition of all
// sections in order (FR-SALES-01/02/03, FR-SHELL-03). No tailoring job or data
// request runs on load; the FAQ is the only interactive piece.
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

export function Landing() {
  return (
    <>
      <StructuredData />
      <TopBarSession />
      <main id="top">
        <Hero />
        <Pillars />
        <BeforeAfter />
        <ChecklistPreview />
        <HowItWorks />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
