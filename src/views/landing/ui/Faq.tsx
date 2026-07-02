// FAQ accordion (FR-SALES-01, NFR-A11Y-01) built on native <details>/<summary>:
// disclosure, aria-expanded semantics, and keyboard operability come from the
// platform, so the landing page ships no client JS for it (NFR-PERF). The
// chevron is an arrow character (no icon library — BC-BRAND-01).
import { faqItems } from "../lib/content";
import { SectionHead, Wrap } from "./primitives";

function FaqRow({ question, answer }: { readonly question: string; readonly answer: string }) {
  return (
    <details className="group border-b border-hairline">
      <summary className="flex w-full cursor-pointer list-none items-center justify-between gap-4 py-5 text-left font-body text-md font-semibold text-ink [&::-webkit-details-marker]:hidden">
        {question}
        <span
          aria-hidden="true"
          className="shrink-0 text-ink-muted transition-transform duration-200 group-open:rotate-180"
        >
          ↓
        </span>
      </summary>
      <div className="pb-5">
        <p className="text-base leading-loose text-ink-soft">{answer}</p>
      </div>
    </details>
  );
}

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-16 border-y border-hairline bg-surface-card py-16">
      <Wrap>
        <SectionHead kicker="FAQ" title="The honest questions" />
        <div className="max-w-[720px]">
          {faqItems.map((item) => (
            <FaqRow key={item.question} question={item.question} answer={item.answer} />
          ))}
        </div>
      </Wrap>
    </section>
  );
}
