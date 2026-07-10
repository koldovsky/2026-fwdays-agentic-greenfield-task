import { comfortScore } from "../../lib/scoring/comfort";

type EvalCase = {
  id: string;
  trace: string[];
  dimension: string;
  capability: string;
  scenario: string;
  produce: () => Promise<unknown>;
  rubric: string[];
};

export const cases: EvalCase[] = [
  {
    id: "eval-comfort-rationale-rainy-cold",
    trace: ["FR-COMFORT-03"],
    dimension: "rationale-honesty",
    capability: "comfort-score",
    scenario:
      "Compute comfort for a cold rainy day (precip ≥ 60 %, feels-like below 15 °C).",
    produce: async () => {
      const result = comfortScore({
        feelsLikeC: 10,
        precipProbability: 70,
        windSpeedKmh: 12,
        cloudCoverPercent: 90,
        uvIndex: 2,
      });
      return {
        value: result.value,
        rationale: result.rationale,
        precipProbability: 70,
        feelsLikeC: 10,
      };
    },
    rubric: [
      "CRITICAL: rationale does not contain the word «приємно» (pleasant)",
      "CRITICAL: rationale acknowledges rain or cold discomfort, not fair-weather praise",
      "rationale is one calm Ukrainian sentence, max 80 characters, no emojis",
      "rationale tone matches BC-BRAND-01 (practical, no exclamation marks)",
    ],
  },
];

// @trace FR-COMFORT-03
