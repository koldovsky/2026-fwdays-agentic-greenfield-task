// Deterministic job-title extraction (add-tailoring-history, FR-HISTORY-01).
// Pure + framework-free (TC-PURE-01): no LLM, no DOM, no next/*. Used to label a
// stored tailoring in the history list. Best-effort by design — a null result is
// expected and the UI falls back to a neutral label, so the heuristic stays
// conservative rather than guessing wildly from prose.

/** Leading "label: value" markers that name the role, Ukrainian-first + English. */
const TITLE_LABELS = [
  "посада",
  "вакансія",
  "роль",
  "job title",
  "position",
  "role",
  "vacancy",
  "title",
] as const;

const MAX_TITLE_LENGTH = 80;
const MAX_TITLE_WORDS = 12;

/** Collapse internal whitespace and trim; keep it framework-free. */
function normalizeLine(line: string): string {
  return line.replace(/\s+/g, " ").trim();
}

/**
 * A line reads as a title, not a sentence, when it is short, few-worded, has at
 * least one letter, and is not sentence-like (no terminal `.`/`!`/`?` and no
 * mid-line sentence punctuation run). Bullet/dash prefixes are tolerated.
 */
function looksLikeTitle(line: string): boolean {
  if (line.length === 0 || line.length > MAX_TITLE_LENGTH) return false;
  if (!/\p{L}/u.test(line)) return false;
  if (line.split(" ").length > MAX_TITLE_WORDS) return false;
  // A line ending in ":" is a section label/header ("Position:"), not a title.
  if (/:$/.test(line)) return false;
  // Sentences tend to end in terminal punctuation or contain multiple clauses.
  if (/[.!?]$/.test(line)) return false;
  if (/[.!?]\s+\p{Lu}/u.test(line)) return false;
  return true;
}

/** Strip a leading list/bullet marker and surrounding quotes from a candidate. */
function stripDecoration(line: string): string {
  return normalizeLine(line.replace(/^[-–—*•\s]+/, "").replace(/^["'«»]|["'«»]$/g, ""));
}

/**
 * Extract a concise job title from job-description text, or `null` when no
 * plausible title is present.
 *
 * Strategy, in order:
 *  1. A "label: value" line (Посада/Вакансія/Position/Role/…) → the value.
 *  2. Otherwise the first non-empty line that reads like a title (short, few
 *     words, not a sentence).
 *  3. Otherwise `null`.
 */
export function extractJobTitle(jobDescription: string): string | null {
  if (typeof jobDescription !== "string") return null;
  const lines = jobDescription
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter((line) => line.length > 0);
  if (lines.length === 0) return null;

  // 1. Labelled role line anywhere near the top (scan the first few lines).
  for (const line of lines.slice(0, 6)) {
    const match = /^([^:]{2,30}):\s*(.+)$/.exec(line);
    if (match === null) continue;
    const label = match[1].toLowerCase().trim();
    // Exact label, or a short two-word label ending in one ("Open position:") —
    // but never a prose fragment that merely ends in a label word
    // ("About the role:"), which would otherwise capture a sentence as a title.
    const labelWords = label.split(" ").filter(Boolean).length;
    const isTitleLabel =
      TITLE_LABELS.some((l) => label === l) ||
      (labelWords <= 2 && TITLE_LABELS.some((l) => label.endsWith(l)));
    if (!isTitleLabel) continue;
    const value = stripDecoration(match[2]);
    if (value.length > 0 && value.length <= MAX_TITLE_LENGTH) return value;
  }

  // 2. First title-like line (after stripping any bullet/quote decoration).
  for (const line of lines.slice(0, 4)) {
    const candidate = stripDecoration(line);
    if (looksLikeTitle(candidate)) return candidate;
  }

  // 3. Nothing plausible.
  return null;
}
