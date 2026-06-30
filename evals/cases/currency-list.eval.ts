/**
 * Eval case — currency-list qualitative surface.
 * Graded by kurs-eval-judge against the rubric below.
 */

export const currencyListEval = {
  id: "currency-list",
  capability: "currency-list",
  traces: ["FR-RATES-03", "FR-RATES-05", "BC-HONESTY-01", "NFR-OBS-01"],
  rubric: [
    {
      id: "stale-date-honest",
      weight: 30,
      criterion:
        "When the official rate is from a previous business day, the AsOfBadge shows that real date plainly («Курс за DD.MM.YYYY») — never relabelled as today, never alarming.",
    },
    {
      id: "error-calm-inline",
      weight: 30,
      criterion:
        "On fetch failure, the error message is calm, specific, inline (not a toast), and offers a clear retry action; no exclamation marks, no stack trace, no raw error text.",
    },
    {
      id: "rate-readability",
      weight: 25,
      criterion:
        "Every rate is rendered in mono tabular figures, uk-UA formatted (comma decimal), with the ₴ unit clearly attached — columns read as a tidy ledger, not a wall of digits.",
    },
    {
      id: "no-fabricated-trend",
      weight: 15,
      criterion:
        "Currency rows show no trend/delta indicator — this slice has no real day-over-day data, and a fabricated flat pill would be dishonest.",
    },
  ],
  scenarios: [
    {
      name: "weekend-stale-rate",
      description:
        "Open the app when NBU's latest published date is a previous business day — the badge reads the real date, not today.",
    },
    {
      name: "nbu-unreachable",
      description:
        "NBU fetch fails or times out — a calm inline message with a retry button replaces the list; the focus panel shows its empty prompt; nothing crashes or goes blank.",
    },
    {
      name: "select-currency",
      description:
        "Click a currency row — the focus panel updates to show that currency's code, name, and official rate.",
    },
  ],
} as const;

export default currencyListEval;
