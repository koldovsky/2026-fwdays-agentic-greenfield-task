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
  SeniorityLevel,
} from "./types";

const MAX_RATIONALE = 100;

/**
 * Synonym/alias groups (pure data, improve-tailoring-quality T5). A JD keyword
 * and a CV token that name the same skill count as the same evidence, so "k8s"
 * on the CV grounds a "Kubernetes" requirement (and vice versa). Deliberately
 * conservative: only well-known, unambiguous multi-character aliases — short or
 * overloaded tokens (go, r, c, ai) are excluded because substring matching them
 * would over-credit. Matching is by whole-group membership, so an alias only
 * expands a keyword that is itself a recognized member.
 */
const ALIAS_GROUPS: readonly (readonly string[])[] = [
  ["kubernetes", "k8s"],
  ["javascript", "js"],
  ["typescript", "ts"],
  ["postgresql", "postgres", "psql"],
  ["react", "reactjs", "react.js"],
  ["react native", "react-native"],
  ["node", "nodejs", "node.js"],
  ["ci/cd", "cicd", "ci cd", "continuous integration"],
  ["amazon web services", "aws"],
  ["google cloud platform", "gcp"],
  ["microsoft azure", "azure"],
  ["kotlin multiplatform", "kmp"],
  ["machine learning", "ml"],
  ["natural language processing", "nlp"],
  ["object oriented programming", "oop"],
  ["test driven development", "tdd"],
  ["user experience", "ux"],
  ["user interface", "ui"],
  ["rest api", "restful", "rest"],
  ["graphql", "gql"],
  ["c sharp", "c#", "csharp"],
  ["dot net", ".net", "dotnet"],
];

/** Case-insensitive substring test. */
function contains(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

/**
 * The OTHER members of a keyword's alias group (empty when unrecognized) — so an
 * unrecognized keyword is never expanded.
 */
function aliasesOf(keyword: string): readonly string[] {
  const lower = keyword.toLowerCase().trim();
  for (const group of ALIAS_GROUPS) {
    if (group.includes(lower)) return group.filter((member) => member !== lower);
  }
  return [];
}

/**
 * Whole-token containment: `token` appears in `text` NOT flanked by another
 * letter/digit. Unlike a raw substring test this never lets a short alias credit
 * an unrelated word (e.g. "ts" must not match "results", "aws" must not match
 * "laws", "ui" must not match "build") — score inflation is an honesty failure
 * equal to overclaiming (BC-HONESTY-01). Handles tech tokens with punctuation
 * (k8s, c#, .net, node.js) since the flanks only reject letters/digits.
 */
export function containsToken(text: string, token: string): boolean {
  const haystack = text.toLowerCase();
  const needle = token.toLowerCase();
  if (needle.length === 0) return false;
  let from = 0;
  for (;;) {
    const idx = haystack.indexOf(needle, from);
    if (idx === -1) return false;
    const before = idx === 0 ? "" : haystack[idx - 1];
    const afterIdx = idx + needle.length;
    const after = afterIdx >= haystack.length ? "" : haystack[afterIdx];
    const boundedBefore = before === "" || !/[\p{L}\p{N}]/u.test(before);
    const boundedAfter = after === "" || !/[\p{L}\p{N}]/u.test(after);
    if (boundedBefore && boundedAfter) return true;
    from = idx + 1;
  }
}

/**
 * True when the keyword matches `text`: the keyword itself by substring (the
 * scorer's original, backward-compatible behavior), OR any of its aliases as a
 * whole token (boundary-matched so a short alias never collides with an
 * unrelated word).
 */
function textMatchesKeyword(text: string, keyword: string): boolean {
  if (contains(text, keyword)) return true;
  return aliasesOf(keyword).some((alias) => containsToken(text, alias));
}

/** True when the keyword (or an alias) appears in any of `texts`. */
function matchesAny(texts: readonly string[], keyword: string): boolean {
  return texts.some((text) => textMatchesKeyword(text, keyword));
}

/** Truncate to <=MAX_RATIONALE chars without cutting mid-nothing (FR-CHECKLIST-03). */
function truncate(text: string): string {
  if (text.length <= MAX_RATIONALE) return text;
  return `${text.slice(0, MAX_RATIONALE - 1).trimEnd()}…`;
}

/** First CV skill/sentence matching the keyword or an alias — evidence drawn ONLY from the CV. */
function findEvidence(keyword: string, cv: CvProfile): string | undefined {
  const sentence = cv.sentences.find((s) => textMatchesKeyword(s, keyword));
  if (sentence !== undefined) return sentence;
  return cv.skills.find((s) => textMatchesKeyword(s, keyword));
}

const STOPWORDS = new Set([
  "and", "the", "for", "with", "of", "to", "in", "on", "an", "or",
  "та", "і", "й", "для", "з", "на", "до",
]);

/**
 * Duration requirement detection (improve-tailoring-quality §1.3). A requirement
 * like "3+ years of backend" or "5 років досвіду" states a minimum tenure. We
 * read the FIRST year count from the requirement text; a requirement with no
 * year count is not a duration requirement (returns undefined). Pure.
 */
const YEARS_REQUIRED = /(\d{1,2})\s*\+?\s*(?:years?|yrs?|рок(?:и|ів)|року)/i;

/** Minimum years a requirement demands, or undefined when it is not a duration req. */
export function requiredYears(requirement: Requirement): number | undefined {
  const match = requirement.text.match(YEARS_REQUIRED);
  if (match === null) return undefined;
  const n = Number(match[1]);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Meaningful word-tokens of a keyword (len >= 3, not a stopword). */
export function tokenize(keyword: string): string[] {
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
 *   - none grounded but a claimed-only  → depends on seniority (T5):
 *       · junior / unknown → "overclaim-risk" (asserted skill, no prose support)
 *       · mid / senior     → "partial" (claimed-covered: a listed skill is
 *         acceptable evidence for an experienced candidate, still below a
 *         prose-grounded "met" and disclosed honestly in the rationale)
 *   - none of the above, but a multi-word keyword is adjacent-covered → "info"
 *     (coverable by nearby CV evidence — a cover-letter suggestion, not a red gap)
 *   - nothing matched                   → "gap"
 *
 * Keyword matching is alias-aware (synonyms like k8s/kubernetes count as the
 * same evidence). `seniority` only relaxes the claimed-only branch; grounded
 * evidence still requires the keyword (or an alias) in CV prose. This changes
 * only the coverage panel + score — bullet grounding (export exclusion) is a
 * separate pass and is untouched (BC-HONESTY-01/02).
 */
export function checklistItem(
  requirement: Requirement,
  cvProfile: CvProfile,
  seniority?: SeniorityLevel,
  candidateTenureYears?: number,
): ChecklistItem {
  const groundedKeywords: string[] = [];
  const claimedOnlyKeywords: string[] = [];

  for (const keyword of requirement.keywords) {
    if (matchesAny(cvProfile.sentences, keyword)) {
      groundedKeywords.push(keyword);
      continue;
    }
    if (matchesAny(cvProfile.skills, keyword)) claimedOnlyKeywords.push(keyword);
  }

  const total = requirement.keywords.length;
  // Experienced candidates: a listed skill counts as covered, not an overclaim.
  const experienced = seniority === "mid" || seniority === "senior";

  // Duration requirement (§1.3): tenure parsed from the CV's own dates satisfies
  // the "years" side of a "N+ years of X" requirement, but ONLY the years — the
  // domain keyword must still be grounded in prose. Tenure NEVER credits a
  // requirement whose skill the CV never mentions (BC-HONESTY-01); it only lifts
  // an already-grounded requirement from partial toward met.
  const minYears = requiredYears(requirement);
  const tenureSatisfies =
    minYears !== undefined &&
    candidateTenureYears !== undefined &&
    candidateTenureYears >= minYears;

  let status: ChecklistStatus;
  let coverageToken: string | undefined;
  let claimedCovered = false;
  let tenureMet = false;
  if (total > 0 && groundedKeywords.length === total) {
    status = "met";
  } else if (groundedKeywords.length > 0) {
    // Grounded on the skill; if the requirement's only unmet part is the year
    // count and parsed tenure covers it, this is a full "met" (§1.3).
    if (tenureSatisfies) {
      status = "met";
      tenureMet = true;
    } else {
      status = "partial";
    }
  } else if (claimedOnlyKeywords.length > 0) {
    if (experienced) {
      status = "partial";
      claimedCovered = true;
    } else {
      status = "overclaim-risk";
    }
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
      rationale = tenureMet
        ? `Підтверджено навичкою та стажем у резюме: «${evidence}»`
        : `Підтверджено досвідом у резюме: «${evidence}»`;
      break;
    }
    case "partial": {
      if (claimedCovered) {
        const skill = claimedOnlyKeywords[0];
        rationale = `Навичку «${skill}» вказано у резюме, прийнятно для вашого рівня досвіду`;
      } else {
        const evidence = findEvidence(groundedKeywords[0], cvProfile) ?? "";
        rationale = `Частково підтверджено досвідом у резюме: «${evidence}»`;
      }
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
