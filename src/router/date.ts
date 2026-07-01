import { isoFromDbDate } from '../util/date.js';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** The user-local calendar date for an instant, as YYYY-MM-DD (en-CA formats to that shape). */
export const localDateString = (instant: Date, timeZone: string): string =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);

/** Add `delta` days to a YYYY-MM-DD date (UTC math on the calendar date — no TZ shift). */
export const addDays = (isoDate: string, delta: number): string => {
  const parts = isoDate.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  const dt = new Date(Date.UTC(year, month - 1, day));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return isoFromDbDate(dt);
};

/**
 * Resolve a router date token to a concrete calendar date in the user's timezone (invariant: the
 * model never computes "today"). `yesterday` back-dates to the prior local day; an explicit
 * YYYY-MM-DD passes through; anything else falls back to the user-local today.
 */
export const resolveDate = (token: string, userTz: string, now: Date): string => {
  const localToday = localDateString(now, userTz);

  if (token === 'today') {
    return localToday;
  }
  if (token === 'yesterday') {
    return addDays(localToday, -1);
  }
  if (ISO_DATE.test(token)) {
    return token;
  }

  return localToday;
};
