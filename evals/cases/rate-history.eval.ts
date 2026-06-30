/**
 * Eval case — rate-history qualitative surface.
 * Graded by kurs-eval-judge against the rubric below.
 */

export const rateHistoryEval = {
  id: "rate-history",
  capability: "rate-history",
  traces: ["FR-HISTORY-01", "FR-HISTORY-03", "FR-HISTORY-04", "NFR-OBS-01"],
  rubric: [
    {
      id: "chart-readability",
      weight: 30,
      criterion:
        "The chart reads calmly: brand-coloured area with a soft gradient, mono tabular axis ticks and tooltip values, no theatrical animation (chart settles instantly, per the project's honest-not-theatrical motion rule).",
    },
    {
      id: "honest-y-domain",
      weight: 25,
      criterion:
        "Small day-to-day moves render as a roughly flat line, not an exaggerated swing — the y-domain is padded around the actual data range (FR-HISTORY-04).",
    },
    {
      id: "calm-empty-error",
      weight: 25,
      criterion:
        "Empty and error states are calm, inline (not a toast), and distinct from each other — the user can tell 'no data published' apart from 'fetch failed', without alarming wording or raw error text.",
    },
    {
      id: "loading-never-blank",
      weight: 20,
      criterion:
        "While history is loading, a skeleton of comparable footprint to the eventual chart is shown — the panel never looks empty or broken during the fetch.",
    },
  ],
  scenarios: [
    {
      name: "thirty-day-line",
      description: "Select a currency — within a moment, a ~30-day line of its official rate renders below the converter.",
    },
    {
      name: "history-fetch-failure",
      description: "NBU's range endpoint fails or times out — a calm inline message replaces the chart area; the converter above is unaffected.",
    },
    {
      name: "history-empty",
      description: "The range endpoint returns zero points for the window — an honest 'no data for this period' message is shown, not a blank chart.",
    },
    {
      name: "currency-switch-refetch",
      description: "Switching the active currency re-fetches and re-renders history for the new currency, replacing the prior chart cleanly.",
    },
  ],
} as const;

export default rateHistoryEval;
