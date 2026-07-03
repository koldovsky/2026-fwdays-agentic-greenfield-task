/**
 * Advice-quality evals: category-appropriate detail advice (§6) and the
 * cross-option comparison recommendation (FR-COMPARE-01) must be correct,
 * actionable, and matched to the risk category.
 */
import { getProgram } from "@/app/lib/programs";
import { adviceFor, compareAdvice, type ScoredProgram } from "@/app/lib/recommend";
import { evaluate } from "@/app/lib/scoring";
import { ELECTIVE, MICROCOPY_QUALITY, NO_BENEFITS, SCORES } from "./_fixtures";
import type { EvalCase } from "./_types";

const scored = (id: string): ScoredProgram => {
  const program = getProgram(id)!;
  return { program, evaluation: evaluate(program, SCORES, NO_BENEFITS, ELECTIVE) };
};
const advice = (id: string) => {
  const s = scored(id);
  return adviceFor(s.program, s.evaluation);
};

export const cases: EvalCase[] = [
  {
    id: "advice-safe",
    trace: ["FR-SCORE-03", "FR-DETAIL-01"],
    dimension: "category-advice",
    capability: "program-detail",
    scenario: "Advice for a Safe program (ХНУ, Психологія — ~96 %).",
    produce: () => advice("hnu-p"),
    rubric: [
      "CRITICAL: advice is consistent with a high/Safe chance (a reliable choice)",
      "gives a concrete priority action (e.g. keep as a fallback priority)",
      "includes the lo–hi range and the number of budget seats for context",
      MICROCOPY_QUALITY,
    ],
  },
  {
    id: "advice-real",
    trace: ["FR-SCORE-03", "FR-DETAIL-01"],
    dimension: "category-advice",
    capability: "program-detail",
    scenario: "Advice for a Realistic program (НаУКМА, Філологія — ~73 %).",
    produce: () => advice("kma-f"),
    rubric: [
      "CRITICAL: advice matches a middling/Realistic chance (achievable, worth a high priority)",
      "recommends a concrete priority placement (e.g. priority 1–2)",
      "includes the lo–hi range and budget-seat context",
      MICROCOPY_QUALITY,
    ],
  },
  {
    id: "advice-dream",
    trace: ["FR-SCORE-03", "FR-DETAIL-01"],
    dimension: "category-advice",
    capability: "program-detail",
    scenario: "Advice for a Reach/Dream program (КНУ, Журналістика — ~11 %).",
    produce: () => advice("knu-j"),
    rubric: [
      "CRITICAL: advice honestly acknowledges it is a long shot without saying it is impossible",
      "still offers a constructive option (try it as one of the priorities)",
      "includes the lo–hi range and budget-seat context",
      MICROCOPY_QUALITY,
    ],
  },
  {
    id: "compare-advice-three",
    trace: ["FR-COMPARE-01"],
    dimension: "comparison-advice",
    capability: "comparison",
    scenario:
      "Comparison recommendation across НаУКМА (73 %), ЛНУ англ. (86 %), ХНУ Психологія (96 %).",
    produce: () => compareAdvice([scored("kma-f"), scored("lnu-e"), scored("hnu-p")]),
    rubric: [
      "CRITICAL: identifies ХНУ (Психологія) — the highest-chance option — as the best pick",
      "states its chance and recommends it as priority 1",
      "actionable and unambiguous",
      MICROCOPY_QUALITY,
    ],
  },
  {
    id: "compare-advice-two",
    trace: ["FR-COMPARE-01"],
    dimension: "comparison-advice",
    capability: "comparison",
    scenario: "Comparison recommendation across КНУ Журн. (11 %) and УКУ Журн. (62 %).",
    produce: () => compareAdvice([scored("knu-j"), scored("uku-j")]),
    rubric: [
      "CRITICAL: recommends УКУ (Журналістика) — the higher-chance option — as priority 1",
      "states its chance",
      "actionable and unambiguous",
      MICROCOPY_QUALITY,
    ],
  },
  {
    id: "compare-advice-midtier",
    trace: ["FR-COMPARE-01"],
    dimension: "comparison-advice",
    capability: "comparison",
    scenario:
      "Comparison recommendation across ОНУ (45 %), УКУ (62 %), НаУКМА Філологія (73 %).",
    produce: () => compareAdvice([scored("onu-ir"), scored("uku-j"), scored("kma-f")]),
    rubric: [
      "CRITICAL: identifies НаУКМА (Філологія) — the highest-chance option (73 %) — as priority 1",
      "states its chance and quantifies the gap over the next option",
      "actionable and unambiguous",
      MICROCOPY_QUALITY,
    ],
  },
];

// @trace FR-SCORE-03, FR-DETAIL-01, FR-COMPARE-01
