/**
 * Eval case — currency-picker qualitative surface.
 * Graded by kurs-eval-judge against the rubric below.
 */

export const currencyPickerEval = {
  id: "currency-picker",
  capability: "currency-picker",
  traces: ["FR-PICK-01", "FR-PICK-02", "FR-PICK-03"],
  rubric: [
    {
      id: "filter-correctness",
      weight: 35,
      criterion:
        "Typing an ISO code or a Ukrainian-name substring narrows the rendered rows to exactly the matching currencies, case-insensitive; clearing the field restores the full list.",
    },
    {
      id: "empty-result-calm",
      weight: 35,
      criterion:
        "A non-matching query shows the exact «Нічого не знайдено» wording inline, in place of the rows — never a toast, never an alarming tone, never the AsOfBadge disappearing too.",
    },
    {
      id: "selection-still-works",
      weight: 30,
      criterion:
        "Selecting a currency from a filtered (narrowed) result list correctly sets the active currency and updates the focus/converter panel, identically to selecting from the unfiltered list.",
    },
  ],
  scenarios: [
    {
      name: "filter-by-code",
      description: "Type «USD» — only the USD row remains visible.",
    },
    {
      name: "filter-by-name",
      description: "Type «дол» — rows whose Ukrainian name contains that substring remain (e.g. Долар США).",
    },
    {
      name: "no-match",
      description: "Type «zzz» — the rows are replaced by the inline «Нічого не знайдено» message; the AsOfBadge stays visible.",
    },
    {
      name: "select-after-filter",
      description: "Filter to one currency, select it — the focus panel shows that currency's converter.",
    },
  ],
} as const;

export default currencyPickerEval;
