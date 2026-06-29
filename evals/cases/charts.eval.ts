// Eval cases (Phase 4b authored, graded in Phase 6) for the add-charts slice.
// Tests assert exact mechanics (sort order, count-per-day grouping, empty -> []);
// these evals score QUALITY a unit test can't: the CLARITY/usefulness of the
// per-chart empty-state copy (FR-CHART-03) and whether the watering chart's
// count-per-day representation is understandable to the Owner (FR-CHART-01, D2).
// Ukrainian copy (NFR-LOC-01). produce() lazily imports slice-5 code (the `charts`
// block in lib/i18n/uk) that lands later; the eval-suite collect step resolves it
// once the slice is green.
//
// @trace FR-CHART-03
// @trace FR-CHART-01
// @trace NFR-LOC-01

// Self-contained EvalCase shape — mirrors evals/README.md and watering.eval.ts.
export type EvalCase = {
  id: string;
  trace: string[];
  dimension: string;
  capability: string;
  scenario: string;
  produce: () => Promise<unknown> | unknown;
  rubric: string[];
};

export const cases: EvalCase[] = [
  {
    id: "eval-usability-empty-chart-states",
    trace: ["FR-CHART-03", "NFR-LOC-01"],
    dimension: "usability-clarity",
    capability: "charts",
    scenario:
      "The Owner opens a plant that has no measurements and no waterings yet. " +
      "Instead of a blank panel, a zeroed axis, or an error, each chart shows a " +
      "clear empty state telling the Owner there is no data to plot yet. Grade " +
      "the Ukrainian growth-empty and watering-empty copy.",
    produce: async () => {
      // The `charts` copy block lands with the add-charts slice (graded Phase 6).
      const { uk } = await import("@/lib/i18n/uk");
      return {
        growthEmpty: uk.charts?.growthEmpty,
        wateringEmpty: uk.charts?.wateringEmpty,
      };
    },
    rubric: [
      "CRITICAL: both messages are Ukrainian (NFR-LOC-01)",
      "CRITICAL: each reads as an empty state (no data to chart yet), NOT a blank placeholder, a loading message, or an error (FR-CHART-03)",
      "the growth-empty message makes clear there are no height measurements to plot yet; the watering-empty message makes clear there are no waterings to plot yet — each names ITS OWN chart, they are not interchangeable",
      "tone is friendly and addressed to the Owner, not technical; ideally hints that adding data will populate the chart",
    ],
  },
  {
    id: "eval-usability-watering-frequency-representation",
    trace: ["FR-CHART-01", "NFR-LOC-01"],
    dimension: "usability-clarity",
    capability: "charts",
    scenario:
      "A watering event has no numeric value, so the watering chart plots a " +
      "count-per-day line: the y-value is the number of waterings on each calendar " +
      "day (design D2). The chart title and its value-axis label must make this " +
      "frequency reading understandable to the Owner at a glance — not be mistaken " +
      "for a measurement or a cumulative total. Grade the Ukrainian chart title and " +
      "count-axis label.",
    produce: async () => {
      const { uk } = await import("@/lib/i18n/uk");
      return {
        wateringTitle: uk.charts?.wateringTitle,
        countAxis: uk.charts?.countAxis,
        dateAxis: uk.charts?.dateAxis,
      };
    },
    rubric: [
      "CRITICAL: the copy is Ukrainian (NFR-LOC-01)",
      "CRITICAL: the value-axis label communicates a COUNT OF WATERINGS PER DAY (frequency), not a cumulative total and not a measurement value (D2, FR-CHART-01)",
      "the chart title clearly identifies it as the watering chart for the plant, distinct from the growth chart",
      "the labels are concise enough to read on a chart axis and unambiguous about what the line shows (how often the plant was watered over time)",
    ],
  },
];

export default cases;
