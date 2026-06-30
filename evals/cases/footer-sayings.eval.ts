/**
 * Eval case — footer-sayings qualitative surface.
 * Graded by kurs-eval-judge against the rubric below.
 */

export const footerSayingsEval = {
  id: "footer-sayings",
  capability: "footer-sayings",
  traces: ["FR-SAYINGS-01", "BC-BRAND-01"],
  rubric: [
    {
      id: "calm-dry-tone",
      weight: 40,
      criterion:
        "The saying is calm, dry, and level-headed — no exclamation marks, no hype, no first-person voice, consistent with the rest of the app's tone.",
    },
    {
      id: "money-relevance",
      weight: 30,
      criterion:
        "The saying is thematically about money, currency, or calm financial behaviour — not a generic unrelated quip.",
    },
    {
      id: "determinism",
      weight: 30,
      criterion:
        "The same saying appears on every page load within the same calendar day (Kyiv); it changes only when the day changes.",
    },
  ],
  scenarios: [
    {
      name: "footer-shows-a-saying",
      description: "Load the app — the footer shows the provenance line plus one calm Ukrainian saying.",
    },
    {
      name: "same-day-same-saying",
      description: "Reload the page twice on the same day — the saying text is identical both times.",
    },
  ],
} as const;

export default footerSayingsEval;
