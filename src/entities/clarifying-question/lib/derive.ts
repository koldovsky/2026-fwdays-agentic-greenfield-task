// Deterministic, template-based clarifying-question generator (FR-WIZARD-02).
// No LLM call, by design (design.md §2 of add-resume-wizard): honesty here is
// enforced by what data this function CAN see, not by asking a model to
// behave — the same structural move add-agent-loop already made for
// grounding. `ClarifyingQuestionSourceRow` is narrow by construction: it
// cannot carry a cvProfile, raw JD text, match score, or any other row's
// data, so there is nothing in scope for this function to "fish" a
// presupposed answer from.

import type {
  ChecklistStatus,
  RequirementImportance,
} from "@/shared/lib/scoring";

import type { ClarifyingQuestion } from "../model/types";

/** Bound on how many questions a wizard run ever asks (FR-WIZARD-02). */
export const MAX_CLARIFYING_QUESTIONS = 5;

// Only true gaps earn a clarifying question (FR-WIZARD-02, narrowed by
// improve-tailoring-quality T5): a `partial` row already has grounded or
// claimed-covered evidence, so asking about it over-asks. `info`,
// `overclaim-risk`, and `met` are never eligible.
const ELIGIBLE_STATUSES: ReadonlySet<ChecklistStatus> = new Set(["gap"]);

/**
 * The only requirement/status data this skill is allowed to see — no
 * cvProfile, no raw JD text, no match score, no other row's fields.
 */
export interface ClarifyingQuestionSourceRow {
  readonly requirement: {
    readonly text: string;
    readonly keywords: readonly string[];
    readonly importance: RequirementImportance;
  };
  readonly status: ChecklistStatus;
}

export interface DeriveClarifyingQuestionsOptions {
  readonly maxQuestions?: number;
}

function importanceRank(importance: RequirementImportance): number {
  return importance === "must-have" ? 0 : 1;
}

/**
 * Open, unpresumptive prompt for evidence — never a yes/no confirmation of a
 * specific claim, never invents a fact not already in requirement.text/
 * keywords (design.md §2, NFR-I18N-01, no exclamation points).
 */
function questionText(row: ClarifyingQuestionSourceRow): string {
  const keywords = row.requirement.keywords.join(", ");
  return `Вимога: ${row.requirement.text}. Чи є у вас практичний досвід з ${keywords}? Розкажіть коротко про конкретний випадок`;
}

/**
 * Derive up to `opts.maxQuestions` clarifying questions from checklist rows
 * flagged `gap` (FR-WIZARD-02, narrowed by improve-tailoring-quality T5). Pure
 * and deterministic — no LLM, no IO (TC-PURE-01). Eligible rows are prioritized
 * `must-have` before `nice-to-have`, then original array order as the final
 * tiebreak, so the bound always keeps the highest-value gaps first.
 */
export function deriveClarifyingQuestions(
  rows: readonly ClarifyingQuestionSourceRow[],
  opts?: DeriveClarifyingQuestionsOptions,
): readonly ClarifyingQuestion[] {
  const maxQuestions = opts?.maxQuestions ?? MAX_CLARIFYING_QUESTIONS;

  const eligible = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => ELIGIBLE_STATUSES.has(row.status));

  eligible.sort((a, b) => {
    const byImportance =
      importanceRank(a.row.requirement.importance) -
      importanceRank(b.row.requirement.importance);
    if (byImportance !== 0) return byImportance;
    return a.index - b.index;
  });

  return eligible.slice(0, maxQuestions).map(({ row, index }) => ({
    id: `clarify-${index}`,
    requirementText: row.requirement.text,
    text: questionText(row),
  }));
}
