// Circular match-score donut with summary headline (FR-CHECKLIST-04).
// Score color auto-adapts: green >= 70, amber 45-69, red < 45.
// Presentational + server-renderable. The conic gradient is the only inline
// style (it is dynamic): the arc uses `currentColor` set by a token utility,
// the track uses the --color-hairline token — no new hex introduced.
import type { CSSProperties } from "react";

export interface MatchScoreProps {
  /** Score value 0–100. */
  readonly score?: number;
  /** Summary headline (e.g. "Сильний профіль з двома чесними прогалинами"). */
  readonly headline?: string;
  /** Secondary line. */
  readonly subtext?: string;
  /** Visual size preset. */
  readonly size?: "sm" | "md" | "lg";
}

interface SizePreset {
  readonly outer: number;
  readonly inner: number;
  readonly num: string;
  readonly sub: string;
  readonly headline: string;
}

const sizePresets: Record<NonNullable<MatchScoreProps["size"]>, SizePreset> = {
  sm: { outer: 72, inner: 56, num: "text-[22px]", sub: "text-[9px]", headline: "text-[16px]" },
  md: { outer: 88, inner: 68, num: "text-[28px]", sub: "text-[9px]", headline: "text-[21px]" },
  lg: { outer: 96, inner: 74, num: "text-[30px]", sub: "text-[10px]", headline: "text-[21px]" },
};

export function MatchScore({ score = 76, headline, subtext, size = "md" }: MatchScoreProps) {
  const pct = Math.min(100, Math.max(0, score));
  const arcColor = pct >= 70 ? "text-met" : pct >= 45 ? "text-partial" : "text-gap";
  const d = sizePresets[size];

  const ringStyle: CSSProperties = {
    width: d.outer,
    height: d.outer,
    background: `conic-gradient(currentColor 0 ${pct}%, var(--color-hairline) ${pct}% 100%)`,
  };
  const innerStyle: CSSProperties = { width: d.inner, height: d.inner };

  return (
    <div className="flex items-center gap-5 font-body">
      <div
        className={`relative flex items-center justify-center rounded-full shrink-0 ${arcColor}`}
        style={ringStyle}
      >
        <div
          className="flex flex-col items-center justify-center rounded-full bg-white text-ink"
          style={innerStyle}
        >
          <span className={`font-display font-bold leading-none ${d.num}`}>{score}</span>
          <span className={`text-ink-muted tracking-[0.04em] mt-[2px] ${d.sub}`}>/ 100</span>
        </div>
      </div>

      {(headline ?? subtext) !== undefined && (
        <div className="min-w-0">
          {headline !== undefined && (
            <div
              className={
                `font-display font-semibold text-ink leading-snug ${d.headline} ` +
                (subtext !== undefined ? "mb-[3px]" : "")
              }
            >
              {headline}
            </div>
          )}
          {subtext !== undefined && (
            <div className="text-sm text-ink-soft leading-[1.4]">{subtext}</div>
          )}
        </div>
      )}
    </div>
  );
}
