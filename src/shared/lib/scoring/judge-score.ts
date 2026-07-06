// Deterministic scorer OVER the flagged LLM coverage judge's cited evidence
// (improve-tailoring-quality T5 §2.3). Pure (TC-PURE-01): no LLM, no IO, no DOM
// — it consumes verdicts the loop already fetched and re-verifies them against
// the CV text. This is the FLAGGED path only; the pure heuristic scorer
// (checklist.ts) is untouched and stays the default.
//
// HONESTY CORE — the judge may only UPGRADE a requirement off `gap`, and ONLY
// when it carries a citation that appears VERBATIM in the CV text (FR-CHECKLIST-01
// relaxed to "deterministic scorer over LLM-cited, CV-grounded evidence" for
// this path only; BC-HONESTY-01). Every other move is refused:
//   - a fabricated / paraphrased / uncited citation is DISCARDED (fall through
//     to the heuristic row) — the model cannot inflate a score from thin air;
//   - a `covered` verdict can NEVER manufacture `met` (that needs prose the
//     heuristic scorer already checks) — the judge lifts a gap to at most
//     `partial` (verbatim citation present) or `info` (`adjacent`);
//   - a row the heuristic already scored above `gap` (`met`/`partial`/`info`/
//     `overclaim-risk`) is LEFT ALONE — the judge only rescues true gaps, it
//     never downgrades and it never touches an overclaim flag (bullet grounding
//     is a separate pass, BC-HONESTY-02).

import { containsToken, tokenize } from "./checklist";
import type { CoverageVerdict } from "./judge-types";
import type { ChecklistItem, Requirement } from "./types";

/** One heuristic-scored row the judge may (only) upgrade off `gap`. */
export interface ScoredRow {
  readonly requirement: Requirement;
  readonly item: ChecklistItem;
}

/** Max Ukrainian rationale length, mirrors checklist.ts (FR-CHECKLIST-03). */
const MAX_RATIONALE = 100;

function truncate(text: string): string {
  if (text.length <= MAX_RATIONALE) return text;
  return `${text.slice(0, MAX_RATIONALE - 1).trimEnd()}…`;
}

/**
 * Minimum meaningful citation length after trim. A shorter survivor (a stray
 * "a", "на", a lone punctuation mark) is not evidence of anything — accepting it
 * would let a trivial common token verify and inflate the score, so it is
 * rejected before any CV / requirement match (BC-HONESTY-01).
 */
const MIN_CITATION_CHARS = 8;

/**
 * Relevance-aware verbatim gate (replaces the old any-substring check that let a
 * stopword or a stray short token "verify" a gap and inflate the score). A
 * citation may upgrade a `gap` row ONLY when ALL of the following hold:
 *   1. non-trivial — >= MIN_CITATION_CHARS after trim, and it carries at least
 *      one meaningful (non-stopword, len >= 3) token, so pure whitespace /
 *      punctuation / a single short token can never pass;
 *   2. verbatim — it appears, case-insensitively, inside one of the candidate's
 *      OWN CV sentences (a paraphrased / fabricated citation is worthless);
 *   3. relevant — the matched CV sentence shares at least one non-trivial
 *      keyword-token with the requirement it upgrades, reusing checklist.ts's
 *      `tokenize` + `containsToken` so evidence is tied to the requirement the
 *      same way the heuristic scorer ties it (a citation that matches the CV but
 *      says nothing about THIS requirement cannot rescue its gap).
 * Any failure returns false → the caller keeps the original heuristic gap row,
 * discarding the verdict exactly as it discards a fabricated citation.
 */
function citationVerifiesRequirement(
  citation: string | undefined,
  cvSentences: readonly string[],
  requirement: Requirement,
): boolean {
  if (citation === undefined) return false;
  const trimmed = citation.trim();
  if (trimmed.length < MIN_CITATION_CHARS) return false;
  // Must carry a meaningful token — rejects an 8-char run of a stopword/padding.
  if (tokenize(trimmed).length === 0) return false;

  const needle = trimmed.toLowerCase();
  const matchedSentence = cvSentences.find((s) => s.toLowerCase().includes(needle));
  if (matchedSentence === undefined) return false;

  // Requirement keyword-tokens the evidence must overlap to be RELEVANT — drawn
  // from the requirement's keywords and its prose text, the same signal the
  // heuristic scorer keys on.
  const requirementTokens = new Set<string>();
  for (const keyword of requirement.keywords) for (const t of tokenize(keyword)) requirementTokens.add(t);
  for (const t of tokenize(requirement.text)) requirementTokens.add(t);
  if (requirementTokens.size === 0) return false;

  // Overlap is satisfied by the citation OR the CV sentence it matched carrying
  // any one requirement token as a whole token (containsToken avoids short-token
  // collisions, mirroring checklist.ts evidence matching).
  return [...requirementTokens].some(
    (token) => containsToken(trimmed, token) || containsToken(matchedSentence, token),
  );
}

/**
 * Apply the flagged coverage judge's verdicts on top of the heuristic checklist,
 * deterministically and honestly. Returns a NEW checklist; the input rows are
 * never mutated. For each row:
 *   1. find the judge verdict for that requirement id;
 *   2. if the heuristic status is already above `gap`, keep it (the judge only
 *      rescues true gaps — it never downgrades or unflags);
 *   3. else, if the verdict is `covered`/`adjacent` AND its citation passes the
 *      relevance-aware verbatim gate (non-trivial, verbatim in the CV, AND
 *      overlapping a keyword of THIS requirement), upgrade:
 *        · `covered`  → `partial` (a listed-but-cited skill, never `met`);
 *        · `adjacent` → `info`   (coverable via a cover letter);
 *      naming the surviving citation in the rationale;
 *   4. otherwise (no verdict, `uncovered`, or an uncited/fabricated citation)
 *      keep the heuristic row unchanged.
 */
export function applyCoverageJudge(
  rows: readonly ScoredRow[],
  verdicts: readonly CoverageVerdict[],
  cvSentences: readonly string[],
): ScoredRow[] {
  const byId = new Map<string, CoverageVerdict>();
  for (const v of verdicts) byId.set(v.requirementId, v);

  return rows.map((row) => {
    // The judge only ever rescues a true `gap`; every other status (including
    // overclaim-risk) is the heuristic scorer's call and is left untouched.
    if (row.item.status !== "gap") return row;

    const verdict = byId.get(row.requirement.id);
    if (verdict === undefined || verdict.label === "uncovered") return row;

    // Every upgrade off `gap` REQUIRES a citation that survives the
    // relevance-aware verbatim gate: non-trivial, verbatim in the CV, AND
    // sharing a keyword with THIS requirement (BC-HONESTY-01). No survivor →
    // keep the heuristic gap, discarding the fabricated/uncited/irrelevant verdict.
    if (!citationVerifiesRequirement(verdict.citation, cvSentences, row.requirement)) return row;
    const citation = (verdict.citation as string).trim();

    if (verdict.label === "covered") {
      // `covered` never becomes `met` (that needs prose the heuristic checks).
      return {
        requirement: row.requirement,
        item: {
          status: "partial",
          rationale: truncate(`Підтверджено цитатою з резюме: «${citation}»`),
        },
      };
    }
    // `adjacent`: coverable, surface it in a cover letter (mirrors "info").
    return {
      requirement: row.requirement,
      item: {
        status: "info",
        rationale: truncate(`Дотичний досвід у резюме: «${citation}» — розкрийте у листі`),
      },
    };
  });
}
