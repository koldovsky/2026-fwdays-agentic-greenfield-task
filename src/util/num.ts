/** Trim a trailing `.0` so whole grams/units read cleanly in prose. */
export const fmt = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/**
 * Regex SOURCE fragment for a decimal number with an optional `.`/`,` fraction ("12", "3.5", "89,2").
 * One home for the pattern the metrics parser and the clarify quantity parser both need (rule #12);
 * callers embed it in their own anchored `RegExp`. String (not a `RegExp`) so it composes into a
 * larger pattern; unescape `,`→`.` before `Number(...)` as the parsers already do.
 */
export const DECIMAL_SOURCE = '\\d+(?:[.,]\\d+)?';
