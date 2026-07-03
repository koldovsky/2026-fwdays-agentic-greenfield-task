// Pure, deterministic CV-text normalizer (TC-PURE-01): no IO, no DOM, no LLM.
// Turns raw résumé text into a CvProfile: prose sentences + a skill-token list.

import type { CvProfile } from "@/shared/lib/scoring";

/** Splits on sentence terminators (. ! ?) and newlines. */
const SENTENCE_SPLIT = /[.!?\n]+/;

/** Matches a line that introduces skills, e.g. "Skills:", "Навички -", "Tech stack:". */
const SKILLS_LINE = /^\s*(?:skills?|навички|tech(?:nologies|\s*stack)?|стек)\s*[:\-–—]/i;

/** Splits a skills line's payload into individual tokens. */
const SKILL_TOKEN_SPLIT = /[,;/|]+/;

/**
 * Normalize raw CV text into a deterministic {@link CvProfile}.
 *
 * - `sentences`: trimmed, non-empty fragments split on `.`/`!`/`?`/newline.
 * - `skills`: deduped, lowercased tokens. Derived from any "skills"-like line
 *   (`Skills:`, `Навички:`, `Tech stack:` …); if none is present, falls back to
 *   notable tokens (capitalized words or tokens containing a digit/`+`/`#`/`.`,
 *   e.g. `React`, `Node.js`, `C++`, `S3`) drawn from the prose.
 *
 * Deterministic: same input always yields the same output. No IO/network.
 */
export function normalizeCvText(raw: string): CvProfile {
  const lines = raw.split(/\n/);

  const sentences = raw
    .split(SENTENCE_SPLIT)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const skillsLine = lines.find((line) => SKILLS_LINE.test(line));

  const rawSkillTokens = skillsLine
    ? skillsLine
        .replace(SKILLS_LINE, "")
        .split(SKILL_TOKEN_SPLIT)
    : notableTokens(raw);

  const skills = dedupeLower(rawSkillTokens);

  return { skills, sentences };
}

/**
 * Notable-token fallback (used when no skills line exists): capitalized words or
 * tokens containing a digit / `+` / `#` / `.` (e.g. React, Node.js, C++, S3).
 * Tokenizes the RAW text on whitespace so tech tokens like `Node.js` survive the
 * dot that sentence-splitting would otherwise break.
 */
function notableTokens(raw: string): string[] {
  const tokens: string[] = [];
  for (const word of raw.split(/\s+/)) {
    const token = word.replace(/^[^\p{L}\p{N}+#.]+|[^\p{L}\p{N}+#.]+$/gu, "");
    if (token.length === 0) continue;
    const isCapitalized = /^\p{Lu}/u.test(token);
    const isTechy = /[\d+#.]/.test(token);
    if (isCapitalized || isTechy) tokens.push(token);
  }
  return tokens;
}

/** Trim, lowercase, drop empties, dedupe — order-preserving. */
function dedupeLower(tokens: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const token of tokens) {
    const normalized = token.trim().toLowerCase();
    if (normalized.length === 0 || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}
