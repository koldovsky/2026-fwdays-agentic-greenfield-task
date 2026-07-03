// Hero: positioning copy + primary CTA, alongside the signature static demo card
// (FR-SALES-01/02). Demo uses example data only — no network, no sign-in.
import { Button, GroundingBadge } from "@/shared/ui";
import { demoBullets, demoRequirement, demoScore } from "../lib/content";
import { Kicker, Wrap } from "./primitives";

function DemoCard() {
  return (
    <div
      className="rounded-3xl border border-hairline bg-surface-card p-[22px] shadow-lifted"
      aria-label="Example of a tailored bullet"
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <span className="text-xs text-ink-muted">
          Requirement: <b className="font-semibold text-ink-soft">{demoRequirement}</b>
        </span>
        <Kicker>Vouch</Kicker>
      </div>

      {demoBullets.map((b, i) => (
        <div
          key={b.text}
          className={`py-[14px] ${i === 0 ? "" : "border-t border-surface-canvas"}`}
        >
          <p
            className={`mb-[10px] text-base leading-normal ${
              b.excluded ? "text-ink-muted line-through decoration-ink-faint" : "text-ink"
            }`}
          >
            {b.text}
          </p>
          <GroundingBadge status={b.grounding} label={b.label} />
        </div>
      ))}

      <div className="mt-[18px] flex items-center gap-[10px] border-t border-dashed border-hairline pt-4 text-[12.5px] text-ink-soft">
        <span className="font-mono font-bold text-met">{demoScore} / 100</span>
        <span>match to this job — 7 of 9 requirements met</span>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="py-16 sm:py-20">
      <Wrap className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <Kicker>Honest resume tailoring</Kicker>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight text-ink sm:text-5xl">
            We won&apos;t write what you <span className="text-brand">can&apos;t defend</span>
          </h1>
          <p className="mt-5 max-w-[30em] text-lg leading-relaxed text-ink-soft">
            Vouch tailors your resume to each job and grounds every line in your real
            experience. You get a requirement-by-requirement checklist — and anything we
            can&apos;t back from your CV gets flagged, not slipped in.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button href="/tailor" variant="primary" size="lg">
              Tailor my CV — free
            </Button>
            <Button href="#how" variant="ghost" size="lg">
              See how it works
            </Button>
          </div>
          <p className="mt-[14px] text-sm text-ink-muted">
            First tailoring is free. No account needed to try it.
          </p>
        </div>

        <DemoCard />
      </Wrap>
    </section>
  );
}
