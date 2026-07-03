import type { CSSProperties } from "react";
import { formatPercent } from "@/app/lib/format";
import type { Category } from "@/app/lib/types";

/**
 * Chance ring (donut) — the design-system `.pk-ring`. The percentage arc is
 * driven by the `--pk-pct` custom property; color follows the traffic-light
 * category. Not color-only: an accessible label states the chance + category
 * in words (NFR-A11Y-01).
 *
 * When the program doesn't accept the chosen elective (`fits === false`) there
 * is no chance to show, so we render a neutral "—" ring instead of a fake risk
 * color (BC-HONESTY-01).
 */
export function ChanceRing({
  chance,
  category,
  categoryLabel,
  fits,
  large = false,
}: {
  chance: number;
  category: Category;
  categoryLabel: string;
  fits: boolean;
  large?: boolean;
}) {
  const sizeClass = large ? " pk-ring--lg" : "";

  if (!fits) {
    const mutedStyle: CSSProperties = {
      background: "var(--pk-divider)",
      color: "var(--pk-slate-400)",
    };
    return (
      <div
        className={`pk-ring${sizeClass}`}
        style={mutedStyle}
        role="img"
        aria-label="Ця програма приймає інший предмет НМТ"
      >
        <span className="pk-ring__val" style={{ color: "var(--pk-slate-400)" }}>
          —
        </span>
      </div>
    );
  }

  const ringStyle = { "--pk-pct": `${chance}%` } as CSSProperties;
  return (
    <div
      className={`pk-ring pk-ring--${category}${sizeClass}`}
      style={ringStyle}
      role="img"
      aria-label={`Шанс ${formatPercent(chance)} — ${categoryLabel}`}
    >
      <span className="pk-ring__val" aria-hidden="true">
        {formatPercent(chance)}
      </span>
    </div>
  );
}
