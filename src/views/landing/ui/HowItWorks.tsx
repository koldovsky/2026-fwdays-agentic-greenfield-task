// How-it-works section (FR-SALES-01): three numbered steps.
import { steps } from "../lib/content";
import { SectionHead, Wrap } from "./primitives";

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-16 border-y border-hairline bg-surface-card py-16">
      <Wrap>
        <SectionHead kicker="How it works" title="Three steps, two minutes" />
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className="rounded-xl border border-hairline bg-surface-card p-6"
            >
              <div className="font-mono text-xs font-bold text-brand">{step.number}</div>
              <h3 className="mb-[6px] mt-[10px] font-display text-lg font-semibold text-ink">
                {step.title}
              </h3>
              <p className="text-sm leading-normal text-ink-soft">{step.body}</p>
            </div>
          ))}
        </div>
      </Wrap>
    </section>
  );
}
