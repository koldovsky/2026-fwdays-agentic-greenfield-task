import { naceCatalog } from "@/lib/nace/catalog";
import type { MatchResult, NaceEntry } from "@/lib/nace/types";

/**
 * Deterministic keyword matcher (FR-NACE-05, design D3).
 *
 * Pure function — no I/O, no React, no storage (TC-STACK-04). Scores each
 * entry by how many of its curated keywords occur in the tokenized input;
 * a tie on the top score returns `ambiguous` so the consuming UI
 * (`form-input`) can ask the clarifying question — never a silent
 * first-wins pick.
 */

/** Everything that is not a letter, digit, or combining mark collapses to a space. */
const NON_ALPHANUMERIC_PATTERN = /[^\p{L}\p{M}\p{N}]+/gu;

const LETTERS_ONLY_PATTERN = /^[\p{L}\p{M}]+$/u;

/**
 * NFC first, so decomposed Ukrainian input (NFD «й» = «и» + U+0306) compares
 * equal to the composed keywords instead of being split mid-word.
 */
const tokenizeServiceText = (text: string): readonly string[] => {
  const normalized = text
    .normalize("NFC")
    .toLowerCase()
    .replace(NON_ALPHANUMERIC_PATTERN, " ")
    .trim();
  return normalized.length === 0 ? [] : normalized.split(" ");
};

/**
 * Keyword tokens anchor at the START of a text token: letter-only stems
 * match by prefix («логотип» → «логотипів») so Ukrainian inflections work,
 * while tokens containing digits («360», «3d») require an exact token —
 * a price like «3600» or a word like «демонтаж» must never produce a
 * confident wrong match (review finding on unanchored `includes`).
 */
const tokenMatches = (textToken: string, keywordToken: string): boolean =>
  textToken === keywordToken ||
  (LETTERS_ONLY_PATTERN.test(keywordToken) &&
    textToken.startsWith(keywordToken));

/** Multi-word keywords must match consecutive text tokens, in order. */
const keywordOccurs = (
  textTokens: readonly string[],
  keywordTokens: readonly string[]
): boolean => {
  if (keywordTokens.length === 0 || keywordTokens.length > textTokens.length) {
    return false;
  }
  const lastStart = textTokens.length - keywordTokens.length;
  for (let start = 0; start <= lastStart; start += 1) {
    const matchesWindow = keywordTokens.every((keywordToken, offset) =>
      tokenMatches(textTokens[start + offset] ?? "", keywordToken)
    );
    if (matchesWindow) {
      return true;
    }
  }
  return false;
};

const scoreEntry = (
  textTokens: readonly string[],
  entry: NaceEntry
): number => {
  let score = 0;
  for (const keyword of entry.keywords) {
    if (keywordOccurs(textTokens, tokenizeServiceText(keyword))) {
      score += 1;
    }
  }
  return score;
};

/**
 * Maps user service text (Ukrainian or English, any letter case) to catalog
 * entries. Returns `matched` for a single top-scoring entry, `ambiguous`
 * with all tied top candidates, or `none` when no keyword matches.
 */
export const matchNaceEntry = (
  serviceText: string,
  entries: readonly NaceEntry[] = naceCatalog
): MatchResult => {
  const textTokens = tokenizeServiceText(serviceText);
  if (textTokens.length === 0) {
    return { kind: "none" };
  }

  const scoredEntries = entries.map((entry) => ({
    entry,
    score: scoreEntry(textTokens, entry),
  }));
  let topScore = 0;
  for (const { score } of scoredEntries) {
    if (score > topScore) {
      topScore = score;
    }
  }
  if (topScore === 0) {
    return { kind: "none" };
  }

  const candidates = scoredEntries
    .filter(({ score }) => score === topScore)
    .map(({ entry }) => entry);
  const [singleCandidate] = candidates;
  if (candidates.length === 1 && singleCandidate) {
    return { kind: "matched", entry: singleCandidate };
  }
  return { kind: "ambiguous", candidates };
};
