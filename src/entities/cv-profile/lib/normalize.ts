// Pure, deterministic CV-text normalizer (TC-PURE-01): no IO, no DOM, no LLM.
// Two views of the same résumé text:
//   - `normalizeCvText`  → flat CvProfile (prose sentences + skill tokens) for the scorer.
//   - `parseCvDocument`  → sectioned CvDocument (contact/summary/experience+dates/skills/education)
//     for the structured resume export (improve-tailoring-quality §1.1/§4.1) and tenure (§1.3).
// Everything here NEVER throws; unparseable input degrades to fewer sections /
// zero tenure — never a fabricated field and never false credit (BC-HONESTY-01).

import type { CvProfile } from "@/shared/lib/scoring";

import type { CvDateRange, CvDocument, CvRole } from "../model/types";

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

  const skills = dedupeLower(extractSkillTokens(lines, raw));

  return { skills, sentences };
}

/** Skill tokens from a skills line, or the notable-token fallback (shared by both views). */
function extractSkillTokens(lines: readonly string[], raw: string): string[] {
  const skillsLine = lines.find((line) => SKILLS_LINE.test(line));
  return skillsLine
    ? skillsLine.replace(SKILLS_LINE, "").split(SKILL_TOKEN_SPLIT)
    : notableTokens(raw);
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

// ---------------------------------------------------------------------------
// Sectioned CvDocument parse (§1.1 / §4.1) + tenure (§1.3). Pure, never throws.
// ---------------------------------------------------------------------------

/**
 * English + Ukrainian month names → month index 0-11. Lowercased keys; both full
 * and common short forms. The v1 token set is flagged in the proposal for a
 * native-speaker review; unrecognized names simply yield an unparseable date
 * (zero tenure), never a guess.
 */
const MONTHS: Readonly<Record<string, number>> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
  may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7,
  sep: 8, sept: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10,
  dec: 11, december: 11,
  // Ukrainian (nominative + common genitive endings the parser tolerates via prefix match).
  січень: 0, січня: 0, лютий: 1, лютого: 1, березень: 2, березня: 2,
  квітень: 3, квітня: 3, травень: 4, травня: 4, червень: 5, червня: 5,
  липень: 6, липня: 6, серпень: 7, серпня: 7, вересень: 8, вересня: 8,
  жовтень: 9, жовтня: 9, листопад: 10, листопада: 10, грудень: 11, грудня: 11,
};

/**
 * Present-markers (ongoing role) in en + ua. Bounded by Unicode letter
 * lookarounds instead of ASCII `\b`, which does not fire around Cyrillic
 * letters — so a UA CV ending in "дотепер"/"нині"/"донині" is still recognized
 * as ongoing (Vouch is Ukrainian-first). Latin markers match unchanged.
 */
const PRESENT = /(?<!\p{L})(?:present|current|now|дотепер|донині|нині|по\s*теперішній)(?!\p{L})/iu;

/** A 4-digit year, 1900-2099. */
const YEAR = /\b(19|20)\d{2}\b/;

/**
 * A line that looks like a section header (case-insensitive), en + ua. Used to
 * segment the résumé. Conservative: only well-known headers.
 */
const HEADERS: Readonly<Record<string, "summary" | "experience" | "skills" | "education">> = {
  summary: "summary", "professional summary": "summary", profile: "summary",
  about: "summary", objective: "summary", "про себе": "summary", "коротко про себе": "summary",
  experience: "experience", "work experience": "experience", "professional experience": "experience",
  employment: "experience", "досвід": "experience", "досвід роботи": "experience", "робота": "experience",
  skills: "skills", "technical skills": "skills", "tech stack": "skills",
  technologies: "skills", "навички": "skills", "стек": "skills",
  education: "education", "освіта": "education", "навчання": "education",
};

const EMAIL = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/u;
const PHONE = /(?:\+?\d[\d ()\-.]{6,}\d)/;
const URL = /\b(?:https?:\/\/|www\.)[^\s,;]+/i;

/** Parse a token to an absolute month, undefined if not a recognized month. */
function monthIndex(token: string): number | undefined {
  const key = token.toLowerCase().replace(/[.,]/g, "");
  if (key in MONTHS) return MONTHS[key];
  // Ukrainian genitive tolerance: match a known key by prefix (>= 4 chars).
  if (key.length >= 4) {
    for (const name of Object.keys(MONTHS)) {
      if (name.length >= 4 && (key.startsWith(name) || name.startsWith(key))) return MONTHS[name];
    }
  }
  return undefined;
}

/** Absolute month for a "<month?> <year>" endpoint; undefined when no year. */
function endpointToAbsMonth(text: string): number | undefined {
  const yearMatch = text.match(YEAR);
  if (yearMatch === null) return undefined;
  const year = Number(yearMatch[0]);
  let month = 0;
  for (const word of text.split(/\s+/)) {
    const idx = monthIndex(word);
    if (idx !== undefined) {
      month = idx;
      break;
    }
  }
  return year * 12 + month;
}

/**
 * Parse a date range from a line (§1.1). Recognizes "<start> - <end>",
 * "<start> – present", "2019-2022", en + ua months. Returns undefined when no
 * year is present at all. NEVER throws. Unparseable endpoints stay undefined
 * (zero tenure downstream, §1.3 — no false credit).
 */
export function parseDateRange(line: string): CvDateRange | undefined {
  if (!YEAR.test(line)) return undefined;
  const raw = line.trim();
  const ongoing = PRESENT.test(line);

  // Split on a dash/– separating the two endpoints (first dash between years/words).
  const sepMatch = line.match(/\s[-–—]\s|\s(?:to|до)\s/i);
  let startText = line;
  let endText = "";
  if (sepMatch !== undefined && sepMatch !== null && sepMatch.index !== undefined) {
    startText = line.slice(0, sepMatch.index);
    endText = line.slice(sepMatch.index + sepMatch[0].length);
  }

  const startMonth = endpointToAbsMonth(startText);
  const endMonth = ongoing ? undefined : endpointToAbsMonth(endText || startText);

  return {
    ...(startMonth !== undefined ? { startMonth } : {}),
    ...(endMonth !== undefined ? { endMonth } : {}),
    ongoing,
    raw,
  };
}

/** Normalize a candidate header line to a section key, or undefined. */
function headerKey(line: string): "summary" | "experience" | "skills" | "education" | undefined {
  const stripped = line.trim().replace(/[:\-–—].*$/, "").trim().toLowerCase();
  return HEADERS[stripped];
}

/** Detect the contact block from the top lines of the résumé (§4.1). PII — render-only. */
function parseContact(lines: readonly string[]): CvDocument["contact"] {
  const head = lines.slice(0, 8);
  const joined = head.join("\n");
  const email = joined.match(EMAIL)?.[0];
  const phone = joined.match(PHONE)?.[0]?.trim();
  const links = [...joined.matchAll(new RegExp(URL, "gi"))].map((m) => m[0]);
  // Name heuristic: the first non-empty line that is not itself a contact detail
  // or a section header, short (<= 6 words), letters only. Never invented.
  let name: string | undefined;
  for (const line of head) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    if (EMAIL.test(trimmed) || PHONE.test(trimmed) || URL.test(trimmed)) continue;
    if (headerKey(trimmed) !== undefined) break;
    const words = trimmed.split(/\s+/);
    if (words.length <= 6 && /^[\p{L}][\p{L}'.\- ]+$/u.test(trimmed)) name = trimmed;
    break;
  }
  const contact = {
    ...(name !== undefined ? { name } : {}),
    ...(email !== undefined ? { email } : {}),
    ...(phone !== undefined ? { phone } : {}),
    ...(links.length > 0 ? { links } : {}),
  };
  return Object.keys(contact).length > 0 ? contact : undefined;
}

/** True for a bullet line ("- …", "• …", "* …"). */
function isBullet(line: string): boolean {
  return /^\s*[-•*]\s+/.test(line);
}

/** Strip a leading bullet marker. */
function stripBullet(line: string): string {
  return line.replace(/^\s*[-•*]\s+/, "").trim();
}

/**
 * Parse the experience section into roles (§4.1). A role opens on a non-bullet
 * line inside the experience block; a date line (or an inline date) attaches to
 * the current role; bullet lines accumulate under it. Original language kept.
 */
function parseExperience(block: readonly string[]): CvRole[] {
  const roles: CvRole[] = [];
  let current: { title: string; dateRange?: CvDateRange; bullets: string[] } | undefined;
  for (const line of block) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    if (isBullet(trimmed)) {
      if (current !== undefined) current.bullets.push(stripBullet(trimmed));
      continue;
    }
    const range = parseDateRange(trimmed);
    // A pure date line attaches to the open role rather than opening a new one.
    if (range !== undefined && current !== undefined && current.dateRange === undefined && !hasNonDateWords(trimmed)) {
      current.dateRange = range;
      continue;
    }
    if (current !== undefined) roles.push(finalizeRole(current));
    current = { title: trimmed, bullets: [], ...(range !== undefined ? { dateRange: range } : {}) };
  }
  if (current !== undefined) roles.push(finalizeRole(current));
  return roles;
}

/** A line has words beyond the date tokens (so it is a title, not a bare date line). */
function hasNonDateWords(line: string): boolean {
  const withoutDates = line
    .replace(new RegExp(YEAR, "g"), " ")
    .replace(new RegExp(PRESENT, "giu"), " ")
    .split(/\s+/)
    .filter((w) => w.length > 0 && monthIndex(w) === undefined && !/^[-–—.,()]+$/.test(w));
  return withoutDates.length > 0;
}

function finalizeRole(r: { title: string; dateRange?: CvDateRange; bullets: string[] }): CvRole {
  return {
    title: r.title,
    ...(r.dateRange !== undefined ? { dateRange: r.dateRange } : {}),
    bullets: r.bullets,
  };
}

/**
 * Parse raw résumé text into a sectioned {@link CvDocument} (§1.1/§4.1). Pure,
 * deterministic, NEVER throws. Every section is included ONLY when detected —
 * an undetected section is omitted, never fabricated. `experience` and `skills`
 * are always present (possibly empty) so the export merge has stable anchors.
 */
export function parseCvDocument(raw: string): CvDocument {
  const lines = raw.split(/\n/);
  const contact = parseContact(lines);

  // Segment by recognized section headers; lines before the first header are
  // the (unlabeled) header/summary region.
  const sections = new Map<"summary" | "experience" | "skills" | "education", string[]>();
  let currentKey: "summary" | "experience" | "skills" | "education" | undefined;
  const preamble: string[] = [];
  for (const line of lines) {
    const key = headerKey(line);
    if (key !== undefined) {
      currentKey = key;
      if (!sections.has(key)) sections.set(key, []);
      // A skills header can carry its payload inline ("Skills: a, b, c").
      const inline = line.replace(/^[^:\-–—]*[:\-–—]/, "").trim();
      if (key === "skills" && inline.length > 0) sections.get(key)!.push(inline);
      continue;
    }
    if (currentKey === undefined) preamble.push(line);
    else sections.get(currentKey)!.push(line);
  }

  const experienceBlock = sections.get("experience") ?? [];
  const experience = parseExperience(experienceBlock);

  const summaryLines = (sections.get("summary") ?? [])
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const educationLines = (sections.get("education") ?? [])
    .map((l) => stripBullet(l.trim()))
    .filter((l) => l.length > 0);

  const skills = dedupeLower(extractSkillTokens(lines, raw));

  return {
    ...(contact !== undefined ? { contact } : {}),
    ...(summaryLines.length > 0 ? { summary: summaryLines } : {}),
    experience,
    skills,
    ...(educationLines.length > 0 ? { education: educationLines } : {}),
  };
}

// ---------------------------------------------------------------------------
// Tenure (§1.3). Pure. Unknown/unparseable = zero months (no false credit).
// ---------------------------------------------------------------------------

/**
 * Total months of experience across a document's parsed role date ranges (§1.3).
 * Overlapping roles are merged so concurrent positions don't double-count.
 * Ranges missing a start month contribute zero; ongoing ranges are anchored to
 * `asOfMonth` (absolute month, default = a fixed far-future so ongoing counts
 * up to "now" is left to the caller; here we require an explicit anchor to stay
 * deterministic). NEVER throws.
 */
export function totalTenureMonths(doc: CvDocument, asOfMonth: number): number {
  const intervals: Array<[number, number]> = [];
  for (const role of doc.experience) {
    const range = role.dateRange;
    if (range === undefined || range.startMonth === undefined) continue;
    const end = range.ongoing ? asOfMonth : range.endMonth;
    if (end === undefined || end < range.startMonth) continue;
    intervals.push([range.startMonth, end]);
  }
  if (intervals.length === 0) return 0;
  intervals.sort((a, b) => a[0] - b[0]);
  let total = 0;
  let [curStart, curEnd] = intervals[0];
  for (let i = 1; i < intervals.length; i += 1) {
    const [s, e] = intervals[i];
    if (s <= curEnd) {
      if (e > curEnd) curEnd = e;
    } else {
      total += curEnd - curStart;
      [curStart, curEnd] = [s, e];
    }
  }
  total += curEnd - curStart;
  return total;
}

/** Convert an absolute-month count to whole years (floor). */
export function tenureYears(doc: CvDocument, asOfMonth: number): number {
  return Math.floor(totalTenureMonths(doc, asOfMonth) / 12);
}

/** Absolute month for a JS Date (year*12 + monthIndex). Utility for callers. */
export function absMonthOf(date: Date): number {
  return date.getUTCFullYear() * 12 + date.getUTCMonth();
}
