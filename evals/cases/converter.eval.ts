/**
 * Eval case — converter qualitative surface.
 * Graded by kurs-eval-judge against the rubric below.
 */

export const converterEval = {
  id: "converter",
  capability: "converter",
  traces: [
    "FR-CONVERT-01",
    "FR-CONVERT-02",
    "FR-CONVERT-03",
    "FR-CONVERT-04",
    "FR-CONVERT-05",
    "NFR-LOCALE-01",
    "NFR-OBS-01",
  ],
  rubric: [
    {
      id: "locale-input-clarity",
      weight: 30,
      criterion:
        "The amount field accepts comma decimals («100,50») and ignores stray spaces without alarming errors, toasts, or crashes on garbage input.",
    },
    {
      id: "result-formatting",
      weight: 30,
      criterion:
        "Conversion results render in mono tabular figures with uk-UA formatting (comma decimal, grouped thousands) and the correct unit suffix (₴ or ISO code).",
    },
    {
      id: "swap-discoverability",
      weight: 25,
      criterion:
        "The swap control has a calm Ukrainian label; activating it visibly flips direction and recalculates the result — no exclamation marks.",
    },
    {
      id: "empty-input-calmness",
      weight: 15,
      criterion:
        "Clearing the amount field shows «0,00» in the result — never NaN, never a blank crash, never a toast.",
    },
  ],
  scenarios: [
    {
      name: "comma-decimal-conversion",
      description:
        "Select USD, enter «100,50» — result shows the UAH equivalent formatted as uk-UA mono with ₴.",
    },
    {
      name: "swap-direction",
      description:
        "Activate «Поміняти напрям» — labels and units flip; the same official rate line stays visible between fields.",
    },
    {
      name: "empty-input",
      description:
        "Clear the amount field — result reads «0,00» calmly; no error UI appears.",
    },
    {
      name: "currency-change-reset",
      description:
        "Select a different currency — converter remounts with fresh direction/amount for the new code.",
    },
  ],
} as const;

export default converterEval;
