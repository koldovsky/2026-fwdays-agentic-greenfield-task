/**
 * Locale-formatting evals (BC-LANG-01): numbers, percentages, and dates must
 * render to the Ukrainian standard.
 */
import { formatDate, formatNumber, formatPercent } from "@/app/lib/format";
import type { EvalCase } from "./_types";

export const cases: EvalCase[] = [
  {
    id: "format-percent",
    trace: ["BC-LANG-01", "FR-SCORE-02"],
    dimension: "locale-format",
    capability: "app-shell",
    scenario: "A chance percentage rendered for the UI.",
    produce: () => formatPercent(54),
    rubric: [
      "CRITICAL: a space separates the number and the percent sign — '54 %', not '54%' (Ukrainian typographic standard)",
      "no trailing decimals for a whole percentage",
    ],
  },
  {
    id: "format-number-decimal-grouping",
    trace: ["BC-LANG-01"],
    dimension: "locale-format",
    capability: "app-shell",
    scenario: "A competitive score (one decimal) and a grouped seat count.",
    produce: () => `Бал: ${formatNumber(151.55, { maximumFractionDigits: 1 })} · Місць: ${formatNumber(1234)}`,
    rubric: [
      "CRITICAL: the decimal separator is a comma (151,6), not a dot",
      "CRITICAL: thousands are grouped with a space (1 234), not a comma",
    ],
  },
  {
    id: "format-date",
    trace: ["BC-LANG-01", "BC-DEADLINE-01"],
    dimension: "locale-format",
    capability: "app-shell",
    scenario: "An admissions deadline date rendered in the banner.",
    produce: () => formatDate(new Date("2026-07-31")),
    rubric: [
      "CRITICAL: uses the Ukrainian month name in genitive (липня) and day–month–year order",
      "reads naturally as a Ukrainian date",
    ],
  },
];

// @trace BC-LANG-01, FR-SCORE-02, BC-DEADLINE-01
