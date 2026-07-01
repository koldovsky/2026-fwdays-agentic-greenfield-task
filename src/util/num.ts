/** Trim a trailing `.0` so whole grams/units read cleanly in prose. */
export const fmt = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(1));
