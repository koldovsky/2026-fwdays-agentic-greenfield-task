/**
 * Eval case — app-shell qualitative surface.
 * Graded by kurs-eval-judge against the rubric below.
 */

export const appShellEval = {
  id: "app-shell",
  capability: "app-shell",
  traces: ["FR-SHELL-01", "FR-SHELL-04"],
  rubric: [
    {
      id: "lockup-readable",
      weight: 25,
      criterion:
        "The «Гривня» lockup and «Офіційний курс НБУ» subtitle are readable in Ukrainian, calm serif/mono pairing, no exclamation marks.",
    },
    {
      id: "theme-discoverable",
      weight: 20,
      criterion:
        "The theme toggle (Switch) is visible in the header with an accessible label; switching to dark applies data-theme without a flash on reload.",
    },
    {
      id: "skeleton-calm",
      weight: 25,
      criterion:
        "While loading, skeleton placeholders occupy comparable footprint to content — the page never feels blank or crashed; pulse respects prefers-reduced-motion.",
    },
    {
      id: "footer-provenance",
      weight: 15,
      criterion:
        "Footer provenance line is honest and calm («Дані: відкритий API НБУ · без кук і трекерів»); no fake «станом на» date; no exclamation marks.",
    },
    {
      id: "empty-honest",
      weight: 15,
      criterion:
        "Optional empty-slot copy, if shown, is a calm Ukrainian sentence — not alarming, not a toast, no exclamation marks.",
    },
  ],
  scenarios: [
    {
      name: "initial-load",
      description:
        "Open `/` at 1200px viewport — header with lockup + theme toggle, two-column main after loading, footer visible.",
    },
    {
      name: "loading-skeleton",
      description:
        "On first paint (within ~600ms), both columns show skeleton placeholders instead of empty space.",
    },
    {
      name: "theme-toggle",
      description:
        "Activate theme toggle in light mode — interface switches to dark; reload preserves choice without flash.",
    },
  ],
} as const;

export default appShellEval;
