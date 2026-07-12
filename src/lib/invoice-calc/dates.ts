/**
 * Bilingual dates and deadline computation (FR-CALC-02, FR-CALC-05).
 *
 * Dates travel in and out as ISO `YYYY-MM-DD` strings interpreted as
 * calendar dates. Arithmetic uses UTC constructors so day math never
 * crosses DST edges; whose "today" feeds the issue date is the caller's
 * concern (the form passes the date in).
 */

import { type ValidationError, validationError } from "./validation";

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const MONTHS_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const DAYS_PER_WEEK = 7;
const TWO_DIGITS = 2;
const YEAR_DIGITS = 4;
const MAX_YEAR = 9999;

interface CalendarDate {
  readonly year: number;
  readonly month: number; // 1–12
  readonly day: number; // 1–31
}

function parseIsoDate(iso: string): CalendarDate | null {
  const match = ISO_DATE_PATTERN.exec(iso);
  if (!match) {
    return null;
  }
  const [, yearPart, monthPart, dayPart] = match;
  const year = Number.parseInt(yearPart, 10);
  const month = Number.parseInt(monthPart, 10);
  const day = Number.parseInt(dayPart, 10);
  // Round-trip through Date.UTC to reject impossible dates like 2026-02-30.
  const utc = new Date(Date.UTC(year, month - 1, day));
  const isRealDate =
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === day;
  return isRealDate ? { year, month, day } : null;
}

function toIso({ year, month, day }: CalendarDate): string {
  // Year is padded too: an unpadded year like `999-12-31` breaks the
  // documented YYYY-MM-DD shape and the lexicographic isOnOrAfter compare.
  const yyyy = String(year).padStart(YEAR_DIGITS, "0");
  const mm = String(month).padStart(TWO_DIGITS, "0");
  const dd = String(day).padStart(TWO_DIGITS, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function requireIsoDate(iso: string, label: string): CalendarDate {
  const parsed = parseIsoDate(iso);
  if (!parsed) {
    throw new Error(`${label} must be a valid ISO date (YYYY-MM-DD), received "${iso}"`);
  }
  return parsed;
}

/** `2026-05-03` → `May 03, 2026` (FR-CALC-02). */
export function renderDateEn(iso: string): string {
  const { year, month, day } = requireIsoDate(iso, "Date");
  const dd = String(day).padStart(TWO_DIGITS, "0");
  return `${MONTHS_EN[month - 1]} ${dd}, ${year}`;
}

/** `2026-05-03` → `03.05.2026` (FR-CALC-02). */
export function renderDateUa(iso: string): string {
  const { year, month, day } = requireIsoDate(iso, "Date");
  const dd = String(day).padStart(TWO_DIGITS, "0");
  const mm = String(month).padStart(TWO_DIGITS, "0");
  return `${dd}.${mm}.${year}`;
}

/** Payment or execution term (FR-CALC-05). */
export type DeadlineTerm =
  | { readonly days: number }
  | { readonly weeks: number }
  | { readonly date: string };

function addDays(start: CalendarDate, days: number): CalendarDate {
  const utc = new Date(Date.UTC(start.year, start.month - 1, start.day + days));
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
  };
}

function isOnOrAfter(candidate: CalendarDate, reference: CalendarDate): boolean {
  return toIso(candidate) >= toIso(reference);
}

/**
 * Computes a deadline date from the issue date and a term expressed in
 * days, weeks, or as an explicit date (FR-CALC-05). An explicit date must
 * fall on or after the issue date.
 */
export function computeDeadline(
  issueIso: string,
  term: DeadlineTerm
): string | ValidationError {
  const issue = parseIsoDate(issueIso);
  if (!issue) {
    return validationError(
      `Issue date must be a valid ISO date (YYYY-MM-DD), received "${issueIso}"`
    );
  }

  if ("date" in term) {
    const explicit = parseIsoDate(term.date);
    if (!explicit) {
      return validationError(
        `Deadline must be a valid ISO date (YYYY-MM-DD), received "${term.date}"`
      );
    }
    if (!isOnOrAfter(explicit, issue)) {
      return validationError(
        `Deadline ${term.date} is before the issue date ${issueIso}`
      );
    }
    return toIso(explicit);
  }

  const termAmount = "days" in term ? term.days : term.weeks;
  if (!Number.isSafeInteger(termAmount) || termAmount < 0) {
    return validationError(
      `Term must be a non-negative whole number of days or weeks, received ${termAmount}`
    );
  }
  const days = "days" in term ? term.days : term.weeks * DAYS_PER_WEEK;
  const deadline = addDays(issue, days);
  // Past the JS Date range the accessors return NaN; either way a deadline
  // beyond year 9999 has left the module's own YYYY-MM-DD contract.
  if (!Number.isSafeInteger(deadline.year) || deadline.year > MAX_YEAR) {
    return validationError(
      `Term of ${termAmount} ${"days" in term ? "days" : "weeks"} pushes the deadline past year ${MAX_YEAR}`
    );
  }
  return toIso(deadline);
}
