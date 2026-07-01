// Shared calendar-date helper (backend-conventions rule #12). One home for what was copy-pasted
// verbatim across food/write, metrics/write, metrics/service, and query/aggregate.

/**
 * The user-local calendar day as a `@db.Date` value: UTC midnight of that ISO date, so a `DATE`
 * column round-trips without a timezone skew (the router already resolved the local day; we never
 * shift it here). `isoDate` is a `YYYY-MM-DD` string.
 */
export const toDbDate = (isoDate: string): Date => new Date(`${isoDate}T00:00:00.000Z`);

/** Inverse of {@link toDbDate}: a `@db.Date` value (UTC midnight) back to its `YYYY-MM-DD` string. */
export const isoFromDbDate = (date: Date): string => date.toISOString().slice(0, 10);
