// Hero: positioning copy + primary CTA, alongside the signature static demo card
// (FR-SALES-01/02). Demo uses example data only — no network, no sign-in.
// Entrance: only the supporting copy below the headline rises in (`.rise-in`);
// the h1 and the demo card stay painted so the LCP element is never delayed
// (landing-animations, NFR-PERF-04). Motion is CSS-only and reduced-motion-safe.
// Copy is localized via shared/lib/i18n; locale is pinned to "en" until task 10
// wires Cyrillic fonts (extract-landing-i18n).
import type { CSSProperties } from "react";
import { type Locale } from "@/shared/lib/i18n";
import { Button, GroundingBadge } from "@/shared/ui";
import { demoContent, heroContent, type DemoContent } from "../lib/content";
import { Kicker, Wrap } from "./primitives";

const riseDelay = (ms: number) => ({ "--rise-delay": `${ms}ms` }) as CSSProperties;

function DemoCard({ demo }: { readonly demo: DemoContent }) {
  return (
    <div
      className="rounded-3xl border border-hairline bg-surface-card p-[22px] shadow-lifted"
      aria-label={demo.cardLabel}
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <span className="text-xs text-ink-muted">
          {demo.requirementPrefix}{" "}
          <b className="font-semibold text-ink-soft">{demo.requirement}</b>
        </span>
        <Kicker>Vouch</Kicker>
      </div>

      {demo.bullets.map((b, i) => (
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
        <span className="font-mono font-bold text-met">{demo.score} / 100</span>
        <span>{demo.scoreCaption}</span>
      </div>
    </div>
  );
}

export function Hero({ locale = "en" }: { readonly locale?: Locale }) {
  const hero = heroContent(locale);
  const demo = demoContent(locale);
  return (
    <section className="py-16 sm:py-20">
      <Wrap className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <Kicker>{hero.kicker}</Kicker>
          <h1 className="mt-4 font-display text-4xl font-bold leading-tight tracking-tight text-ink sm:text-5xl">
            {hero.headlineLead}
            <span className="text-brand">{hero.headlineEmphasis}</span>
            {hero.headlineTail}
          </h1>
          <p
            className="rise-in mt-5 max-w-[32em] text-lg leading-relaxed text-ink-soft"
            style={riseDelay(0)}
          >
            {hero.lead}
          </p>
          <div
            className="rise-in mt-7 flex flex-wrap items-center gap-3"
            style={riseDelay(80)}
          >
            <Button href="/tailor" variant="primary" size="lg">
              {hero.ctaPrimary}
            </Button>
            <Button href="#how" variant="ghost" size="lg">
              {hero.ctaSecondary}
            </Button>
          </div>
          <p className="rise-in mt-[14px] text-sm text-ink-muted" style={riseDelay(160)}>
            {hero.note}
          </p>
        </div>

        <DemoCard demo={demo} />
      </Wrap>
    </section>
  );
}
