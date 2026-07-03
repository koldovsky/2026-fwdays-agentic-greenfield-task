/**
 * Math-transparency evals (FR-DETAIL-01): the detail breakdown must show where
 * the competitive score comes from — each subject × weight contribution, the
 * benefit multiplier, and a total that actually sums.
 */
import { formatNumber } from "@/app/lib/format";
import { getProgram } from "@/app/lib/programs";
import { scoreBreakdown } from "@/app/lib/recommend";
import { competitiveScore } from "@/app/lib/scoring";
import { BENEFITS_ON, ELECTIVE, NO_BENEFITS, SCORES, TRANSPARENCY_QUALITY } from "./_fixtures";
import type { EvalCase } from "./_types";
import type { Benefits } from "@/app/lib/types";

const one = (v: number) => formatNumber(v, { maximumFractionDigits: 1 });

function breakdownText(id: string, benefits: Benefits): string {
  const program = getProgram(id)!;
  const rows = scoreBreakdown(program, SCORES, benefits, ELECTIVE);
  const lines = rows.map((r) => `${r.label} → ${one(r.value)}`);
  lines.push(`Конкурсний бал: ${one(competitiveScore(program, SCORES, benefits))}`);
  return lines.join("\n");
}

export const cases: EvalCase[] = [
  {
    id: "transparency-breakdown-sums",
    trace: ["FR-DETAIL-01"],
    dimension: "math-transparency",
    capability: "program-detail",
    scenario:
      "Score breakdown for НаУКМА, Філологія (no benefits) — subject contributions and the total.",
    produce: () => breakdownText("kma-f", NO_BENEFITS),
    rubric: [
      "CRITICAL: the listed contributions add up to the stated 'Конкурсний бал' total",
      "each row shows the subject, its weight (×), and the resulting contribution",
      "all four NMT subjects are represented",
      "numbers use the Ukrainian decimal comma",
      TRANSPARENCY_QUALITY,
    ],
  },
  {
    id: "transparency-breakdown-with-benefit",
    trace: ["FR-DETAIL-01", "FR-INPUT-03"],
    dimension: "math-transparency",
    capability: "program-detail",
    scenario:
      "Breakdown for ЛНУ, Соціологія with village + quota benefits (+6 %) — the benefit line must appear.",
    produce: () => breakdownText("lnu-s", BENEFITS_ON),
    rubric: [
      "CRITICAL: an explicit benefit/multiplier line is present and shows the +6 % effect",
      "CRITICAL: subject contributions plus the benefit line sum to the stated total",
      "the benefit's contribution is distinguishable from the subject contributions",
      TRANSPARENCY_QUALITY,
    ],
  },
];

// @trace FR-DETAIL-01, FR-INPUT-03
