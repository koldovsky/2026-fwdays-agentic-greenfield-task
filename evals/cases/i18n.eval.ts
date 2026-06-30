/**
 * Eval case — i18n qualitative surface.
 * Graded by kurs-eval-judge against the rubric below.
 */

export const i18nEval = {
  id: "i18n",
  capability: "i18n",
  traces: ["FR-I18N-01", "NFR-I18N-01"],
  rubric: [
    {
      id: "copy-centralised",
      weight: 35,
      criterion:
        "No component or page under app/ or components/ contains an inline Ukrainian (or metadata) string literal — every user-facing string is read from lib/i18n/uk.ts.",
    },
    {
      id: "voice-consistent",
      weight: 25,
      criterion:
        "Every string in the table reads Ukrainian-first, calm, and consistent with the brand voice (BC-BRAND-01) — no exclamation marks anywhere.",
    },
    {
      id: "labels-deduplicated",
      weight: 20,
      criterion:
        "The rates/focus column labels are defined exactly once in uk.shell and reused verbatim by both the shell's aria-labels and the page's visible placeholder titles — not two separate literals that happen to match.",
    },
    {
      id: "zero-behaviour-change",
      weight: 20,
      criterion:
        "The migration is purely structural: rendered text, metadata title/description, and aria-labels are byte-identical to the app-shell slice before this change.",
    },
  ],
  scenarios: [
    {
      name: "string-table-source-of-truth",
      description:
        "Grep app/ and components/ for Cyrillic literals outside lib/i18n/uk.ts — zero matches.",
    },
    {
      name: "shared-column-labels",
      description:
        "Compare the aria-label values in AppShell.tsx against the visible titles in app/page.tsx — both resolve to the same uk.shell.* property.",
    },
  ],
} as const;

export default i18nEval;
