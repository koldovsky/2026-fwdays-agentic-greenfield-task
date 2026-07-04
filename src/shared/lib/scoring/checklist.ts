// Pure, deterministic honest-scorer (TC-PURE-01): no LLM, no IO, no DOM.
// Implements FR-CHECKLIST-01 (deterministic keyword scoring),
// FR-CHECKLIST-02 (status is exactly one of 5 values),
// FR-CHECKLIST-03 (Ukrainian rationale, <=100 chars, no emoji),
// FR-CHECKLIST-04 (0-100 weighted match score, must-have weighted above nice-to-have),
// BC-HONESTY-01 (overclaim-risk: a skill claimed but unsupported by CV prose).

import type {
  ChecklistItem,
  ChecklistStatus,
  CvProfile,
  Requirement,
} from "./types";

const MAX_RATIONALE = 100;

/** Case-insensitive substring test. */
function contains(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

/** Truncate to <=MAX_RATIONALE chars without cutting mid-nothing (FR-CHECKLIST-03). */
function truncate(text: string): string {
  if (text.length <= MAX_RATIONALE) return text;
  return `${text.slice(0, MAX_RATIONALE - 1).trimEnd()}…`;
}

/** First CV skill/sentence that contains the keyword — evidence drawn ONLY from the CV. */
function findEvidence(keyword: string, cv: CvProfile): string | undefined {
  const sentence = cv.sentences.find((s) => contains(s, keyword));
  if (sentence !== undefined) return sentence;
  return cv.skills.find((s) => contains(s, keyword));
}

const STOPWORDS = new Set([
  "and", "the", "for", "with", "of", "to", "in", "on", "an", "or",
  "та", "і", "й", "для", "з", "на", "до",
]);

/** Meaningful word-tokens of a keyword (len >= 3, not a stopword). */
function tokenize(keyword: string): string[] {
  return keyword
    .toLowerCase()
    .split(/[^\p{L}\p{N}+#]+/u)
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token));
}

/**
 * Adjacent-coverage lookup (blue "info", FR-CHECKLIST-01): a MULTI-word
 * requirement keyword whose full text is absent, but one of whose component
 * tokens appears in the CV — e.g. "React Native" is not present but "React" is.
 * Single-word keywords never qualify (their token IS the whole keyword, already
 * tested), which keeps the rule conservative and deterministic. Returns the
 * matched token so the rationale can name the adjacent evidence.
 */
function findCoverage(
  keywords: readonly string[],
  cv: CvProfile,
): { token: string } | undefined {
  for (const keyword of keywords) {
    const tokens = tokenize(keyword);
    if (tokens.length < 2) continue;
    const hit = tokens.find((token) => findEvidence(token, cv) !== undefined);
    if (hit !== undefined) return { token: hit };
  }
  return undefined;
}

/**
 * Deterministic status rule (FR-CHECKLIST-01/02, BC-HONESTY-01). Per requirement keyword:
 *   - "grounded"    → keyword appears in a CV sentence (prose evidence)
 *   - "claimed-only"→ keyword appears in a CV skill token but NOT in any sentence
 *   - "missing"     → keyword appears nowhere
 * Aggregate:
 *   - every keyword grounded            → "met"
 *   - at least one grounded             → "partial"
 *   - none grounded but a claimed-only  → "overclaim-risk" (asserted skill, no prose support)
 *   - none of the above, but a multi-word keyword is adjacent-covered → "info"
 *     (coverable by nearby CV evidence — a cover-letter suggestion, not a red gap)
 *   - nothing matched                   → "gap"
 */
export function checklistItem(
  requirement: Requirement,
  cvProfile: CvProfile,
): ChecklistItem {
  const groundedKeywords: string[] = [];
  const claimedOnlyKeywords: string[] = [];

  for (const keyword of requirement.keywords) {
    const inSentence = cvProfile.sentences.some((s) => contains(s, keyword));
    if (inSentence) {
      groundedKeywords.push(keyword);
      continue;
    }
    const inSkill = cvProfile.skills.some((s) => contains(s, keyword));
    if (inSkill) claimedOnlyKeywords.push(keyword);
  }

  const total = requirement.keywords.length;

  let status: ChecklistStatus;
  let coverageToken: string | undefined;
  if (total > 0 && groundedKeywords.length === total) {
    status = "met";
  } else if (groundedKeywords.length > 0) {
    status = "partial";
  } else if (claimedOnlyKeywords.length > 0) {
    status = "overclaim-risk";
  } else {
    const coverage = findCoverage(requirement.keywords, cvProfile);
    if (coverage !== undefined) {
      status = "info";
      coverageToken = coverage.token;
    } else {
      status = "gap";
    }
  }

  let rationale: string;
  switch (status) {
    case "met": {
      const evidence = findEvidence(groundedKeywords[0], cvProfile) ?? "";
      rationale = `Підтверджено досвідом у резюме: «${evidence}»`;
      break;
    }
    case "partial": {
      const evidence = findEvidence(groundedKeywords[0], cvProfile) ?? "";
      rationale = `Частково підтверджено досвідом у резюме: «${evidence}»`;
      break;
    }
    case "overclaim-risk": {
      const skill = claimedOnlyKeywords[0];
      rationale = `Навичку «${skill}» заявлено, але немає підтверджень у тексті резюме`;
      break;
    }
    case "info": {
      rationale = `Дотичний досвід «${coverageToken}» — розкрийте у супровідному листі`;
      break;
    }
    case "gap": {
      rationale = "Немає відповідних навичок чи досвіду в резюме";
      break;
    }
  }

  return { status, rationale: truncate(rationale) };
}

const STATUS_CREDIT: Readonly<Record<ChecklistStatus, number>> = {
  met: 1,
  partial: 0.5,
  // Adjacent-coverage: real but not-yet-surfaced evidence earns partial credit,
  // below "partial" and above "gap"/"overclaim-risk" (FR-CHECKLIST-04).
  info: 0.25,
  gap: 0,
  "overclaim-risk": 0,
};

const IMPORTANCE_WEIGHT = { "must-have": 3, "nice-to-have": 1 } as const;

/**
 * Weighted 0-100 integer match score (FR-CHECKLIST-04). must-have is weighted
 * strictly above nice-to-have, so meeting a must-have outscores meeting only a
 * nice-to-have. No LLM — pure arithmetic over checklist statuses.
 */
export function matchScore(
  items: ReadonlyArray<{ requirement: Requirement; item: ChecklistItem }>,
): number {
  if (items.length === 0) return 0;

  let earned = 0;
  let possible = 0;
  for (const { requirement, item } of items) {
    const weight = IMPORTANCE_WEIGHT[requirement.importance];
    earned += weight * STATUS_CREDIT[item.status];
    possible += weight;
  }
  if (possible === 0) return 0;

  const score = Math.round((100 * earned) / possible);
  return Math.min(100, Math.max(0, score));
}
