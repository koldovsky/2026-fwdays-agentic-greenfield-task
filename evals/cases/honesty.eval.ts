/**
 * Honesty-framing evals (BC-HONESTY-01): chances are always shown as estimates
 * with a band and an explicit "not a guarantee", never a promise.
 */
import { DISCLAIMER_TEXT, honestyBandSentence } from "@/app/lib/copy";
import { getProgram } from "@/app/lib/programs";
import { cardSummary } from "@/app/lib/recommend";
import { evaluate } from "@/app/lib/scoring";
import { ELECTIVE, MICROCOPY_QUALITY, NO_BENEFITS, SCORES } from "./_fixtures";
import type { EvalCase } from "./_types";

const evalOf = (id: string) =>
  evaluate(getProgram(id)!, SCORES, NO_BENEFITS, ELECTIVE);

export const cases: EvalCase[] = [
  {
    id: "honesty-global-disclaimer",
    trace: ["BC-HONESTY-01"],
    dimension: "honesty-framing",
    capability: "app-shell",
    scenario: "The persistent global disclaimer shown on every route.",
    produce: () => DISCLAIMER_TEXT,
    rubric: [
      "CRITICAL: states chances are an estimate, NOT a guarantee of admission",
      "attributes the final decision to the institutions, not the app",
      "frames the numbers as guidance/orientation only",
      "written in clear, non-alarming Ukrainian",
      MICROCOPY_QUALITY,
    ],
  },
  {
    id: "honesty-detail-band-midchance",
    trace: ["BC-HONESTY-01", "FR-SCORE-02"],
    dimension: "honesty-framing",
    capability: "program-detail",
    scenario:
      "Detail view honesty sentence for a mid-chance program (НаУКМА, Філологія — ~73 %).",
    produce: () => {
      const e = evalOf("kma-f");
      return honestyBandSentence(e.chance, e.band[0], e.band[1]);
    },
    rubric: [
      "CRITICAL: presents the chance as an estimate WITH an explicit lo–hi range, never a bare certainty",
      "CRITICAL: explicitly says it is not a guarantee",
      "explains the range comes from year-to-year cutoff volatility",
      "percentage uses the Ukrainian '54 %' format (space before %)",
      MICROCOPY_QUALITY,
    ],
  },
  {
    id: "honesty-strong-profile-no-100",
    trace: ["BC-HONESTY-01", "FR-SCORE-02"],
    dimension: "honesty-framing",
    capability: "recommendations",
    scenario:
      "A strong match (ЛНУ, Філологія (англ.) — ~86 %): the card's textual summary + global disclaimer.",
    produce: () => `${cardSummary(evalOf("lnu-e"))}\n${DISCLAIMER_TEXT}`,
    rubric: [
      "CRITICAL: never presents the chance as 100 % or a guaranteed place (the model caps well below 100 %)",
      "shows a percentage, a band, and a category label in text",
      "pairs the strong chance with the honesty disclaimer",
      MICROCOPY_QUALITY,
    ],
  },
];

// @trace BC-HONESTY-01, FR-SCORE-02
