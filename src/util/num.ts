import type { Prisma } from '@prisma/client';

/** Trim a trailing `.0` so whole grams/units read cleanly in prose. */
export const fmt = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/**
 * Round to 1 decimal — the precision gram values carry everywhere (Decimal(7,2) columns tolerate it;
 * readable in prose). One home (rule #12) for food scaling, target calculation, and review deltas.
 */
export const round1 = (n: number): number => Math.round(n * 10) / 10;

/**
 * A nullable Prisma `Decimal` (or number) coerced to `number | null`. One home for the
 * `value === null ? null : Number(value)` boundary idiom (rule #12) — reviews, query targets and
 * the Notion mapper all cross it.
 */
export const nullableNumber = (value: Prisma.Decimal | number | null): number | null =>
  value === null ? null : Number(value);

/**
 * Regex SOURCE fragment for a decimal number with an optional `.`/`,` fraction ("12", "3.5", "89,2").
 * One home for the pattern the metrics parser and the clarify quantity parser both need (rule #12);
 * callers embed it in their own anchored `RegExp`. String (not a `RegExp`) so it composes into a
 * larger pattern; unescape `,`→`.` before `Number(...)` as the parsers already do.
 */
export const DECIMAL_SOURCE = '\\d+(?:[.,]\\d+)?';
