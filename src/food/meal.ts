import { Meal } from '@prisma/client';

// Meal is inferred from the user's local clock — no LLM call (the router doesn't classify it and
// asking would break log-by-default). A late dinner logging as `snack` is correctable later; reviews
// group by date, not meal, so daily totals are unaffected. The literal stays English (invariant #6).

/** Hour-of-day (0–23) for an instant in the user's timezone. */
const hourInTz = (now: Date, tz: string): number => {
  const hh = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    hourCycle: 'h23',
  }).format(now);

  return Number(hh);
};

export const inferMeal = (now: Date, tz: string): Meal => {
  const hour = hourInTz(now, tz);

  if (hour >= 5 && hour < 11) {
    return Meal.breakfast;
  }
  if (hour >= 11 && hour < 16) {
    return Meal.lunch;
  }
  if (hour >= 16 && hour < 22) {
    return Meal.dinner;
  }
  return Meal.snack;
};
