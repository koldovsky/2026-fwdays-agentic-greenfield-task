/**
 * Eval case — trend-hint qualitative surface.
 * Graded by kurs-eval-judge against the rubric below.
 */

export const trendHintEval = {
  id: "trend-hint",
  capability: "trend-hint",
  traces: ["FR-TREND-01", "FR-TREND-02", "FR-TREND-03", "BC-BRAND-01"],
  rubric: [
    {
      id: "calm-phrasing",
      weight: 35,
      criterion:
        "The sentence is calm and level-headed — no exclamation marks, no hype words, no alarm — regardless of whether the move is positive, negative, or flat.",
    },
    {
      id: "correct-direction-wording",
      weight: 35,
      criterion:
        "Strengthening uses 'зміцнів', weakening uses 'послабшав', and a move within the flat band reads 'майже без змін' — the wording always matches the actual sign and magnitude of the computed move, sourced from the single trendTone classifier.",
    },
    {
      id: "number-then-detail",
      weight: 30,
      criterion:
        "The sentence leads with the currency and the magnitude before any qualitative read — one number, then the detail, consistent with the brand voice.",
    },
  ],
  scenarios: [
    {
      name: "strengthening-currency",
      description: "A currency that gained >0.05% over 7 days reads 'зміцнів на X% до гривні.'",
    },
    {
      name: "weakening-currency",
      description: "A currency that lost >0.05% over 7 days reads 'послабшав на X% до гривні.'",
    },
    {
      name: "flat-currency",
      description: "A currency within ±0.05% over 7 days reads 'майже без змін до гривні.' with no percentage shown.",
    },
    {
      name: "insufficient-history",
      description: "Fewer than 8 days of history — no trend hint is shown at all (quiet omission, not an error).",
    },
  ],
} as const;

export default trendHintEval;
