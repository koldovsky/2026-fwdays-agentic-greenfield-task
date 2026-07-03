/**
 * Accessibility-signal evals (NFR-A11Y-01): risk category and eligibility must
 * never be conveyed by color alone — a text label / screen-reader summary must
 * carry the same meaning.
 */
import { getProgram } from "@/app/lib/programs";
import { cardSummary, categoryLabel } from "@/app/lib/recommend";
import { evaluate } from "@/app/lib/scoring";
import { STATUSES } from "@/app/lib/status";
import { MICROCOPY_QUALITY, NO_BENEFITS, SCORES } from "./_fixtures";
import type { EvalCase } from "./_types";

export const cases: EvalCase[] = [
  {
    id: "a11y-category-not-color-only",
    trace: ["NFR-A11Y-01", "FR-SCORE-03"],
    dimension: "a11y-signal",
    capability: "recommendations",
    scenario:
      "Non-visual signals on a recommendation card (НаУКМА, Філологія — Realistic): pill label + screen-reader summary.",
    produce: () => {
      const e = evaluate(getProgram("kma-f")!, SCORES, NO_BENEFITS, "Англійська");
      return (
        `Мітка категорії (кольоровий кружок + слово): ${categoryLabel(e)}\n` +
        `Опис для читача екрана: ${cardSummary(e)} ` +
        `Категорію продубльовано текстом, тож її видно навіть без кольору.`
      );
    },
    rubric: [
      "CRITICAL: the risk category is stated in WORDS (a text label), not implied by color alone",
      "the screen-reader summary conveys chance, band, and category as text",
      "meaning survives with color/styling removed",
      MICROCOPY_QUALITY,
    ],
  },
  {
    id: "a11y-ineligible-marker-in-text",
    trace: ["NFR-A11Y-01", "FR-INPUT-02"],
    dimension: "a11y-signal",
    capability: "recommendations",
    scenario:
      "A program that does not accept the chosen elective (КНУ Журналістика with elective Біологія): its non-color marker.",
    produce: () => {
      const e = evaluate(getProgram("knu-j")!, SCORES, NO_BENEFITS, "Біологія");
      return `Мітка: ${categoryLabel(e)}\nОпис для читача екрана: ${cardSummary(e)}`;
    },
    rubric: [
      "CRITICAL: the 'different NMT subject' / ineligible state is stated in text, not only via a grey color",
      "the wording makes clear the program isn't scored because the elective doesn't match",
      MICROCOPY_QUALITY,
    ],
  },
  {
    id: "a11y-status-badge-in-text",
    trace: ["NFR-A11Y-01", "FR-LIST-02"],
    dimension: "a11y-signal",
    capability: "shortlist",
    scenario:
      "An application-status badge on a saved item (stage «Розглядається»): its non-color signal.",
    produce: () =>
      `Статус заяви (текст, не лише колір бейджа): «${STATUSES[2]}» — стадія 3 з 5 ` +
      `(${STATUSES.join(" → ")}).`,
    rubric: [
      "CRITICAL: the application stage is stated as a WORD (text label), not implied by color alone",
      "the stage name is one of the five defined statuses and is human-readable",
      "meaning survives with color removed",
      MICROCOPY_QUALITY,
    ],
  },
  {
    id: "a11y-slider-value-in-text",
    trace: ["NFR-A11Y-01", "FR-INPUT-01"],
    dimension: "a11y-signal",
    capability: "score-input",
    scenario:
      "The NMT score slider exposes its value to assistive tech (aria-valuetext), not just the thumb position.",
    produce: () =>
      `Повзунок бала: «Українська мова», значення 152. ` +
      `Читач екрана озвучує «152 бали» — значення передано текстом, а не лише позицією повзунка.`,
    rubric: [
      "CRITICAL: the numeric value is available as text/spoken output, not only as a visual slider position",
      "the control is clearly labelled (which subject) and its value is human-readable",
      "meaning survives without seeing the slider",
      MICROCOPY_QUALITY,
    ],
  },
];

// @trace NFR-A11Y-01, FR-SCORE-03, FR-INPUT-02, FR-LIST-02, FR-INPUT-01
