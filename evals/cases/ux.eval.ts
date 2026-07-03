/**
 * Empty-state evals (FR-UX-01): every empty state must name the situation and
 * give a concrete next action — never a blank screen or a dead end.
 */
import { EMPTY } from "@/app/lib/copy";
import { MICROCOPY_QUALITY } from "./_fixtures";
import type { EvalCase } from "./_types";

const state = (k: keyof typeof EMPTY) => `${EMPTY[k].title}\n${EMPTY[k].text}`;

export const cases: EvalCase[] = [
  {
    id: "empty-recommendations",
    trace: ["FR-UX-01"],
    dimension: "empty-state-guidance",
    capability: "recommendations",
    scenario: "The recommendations list is empty for the selected risk category/filter.",
    produce: () => state("recommendations"),
    rubric: [
      "CRITICAL: gives a concrete next action (change the filter or adjust scores)",
      "names the situation (nothing in this category) without sounding like an error",
      "friendly, second-person Ukrainian",
      MICROCOPY_QUALITY,
    ],
  },
  {
    id: "empty-comparison",
    trace: ["FR-UX-01", "FR-COMPARE-01"],
    dimension: "empty-state-guidance",
    capability: "comparison",
    scenario: "The comparison view has fewer than 2 programs selected.",
    produce: () => state("comparison"),
    rubric: [
      "CRITICAL: tells the user exactly how to proceed (add 2–3 options via the ⇄ button)",
      "explains why it is empty (nothing to compare yet)",
      "friendly, actionable",
      MICROCOPY_QUALITY,
    ],
  },
  {
    id: "empty-saved",
    trace: ["FR-UX-01", "FR-LIST-01"],
    dimension: "empty-state-guidance",
    capability: "shortlist",
    scenario: "The saved shortlist is empty.",
    produce: () => state("saved"),
    rubric: [
      "CRITICAL: tells the user how to add items (the ★ on recommendation cards)",
      "sets the expectation that statuses are tracked here afterwards",
      "friendly, actionable",
      MICROCOPY_QUALITY,
    ],
  },
];

// @trace FR-UX-01, FR-COMPARE-01, FR-LIST-01
