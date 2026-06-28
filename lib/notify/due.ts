/**
 * Pure due-break detection. Framework-free (TC-PURE-01): the clock is supplied
 * as `now`; nothing here reads it. Used by the notify controller to decide when
 * a break has come due and whether to fire the one-shot notification.
 */

/** Whether `now` has reached or passed the next-reminder time. */
export function isDue(now: Date, nextReminder: Date | null): boolean {
  return nextReminder !== null && now.getTime() >= nextReminder.getTime();
}

/**
 * Whether the due event should fire now: it is due AND has not already fired for
 * this exact target. `lastFiredTarget` is the millisecond timestamp of the
 * target last fired for (or `null` if none) — when the target is rescheduled it
 * changes, so the next target can fire again.
 */
export function shouldFire(
  now: Date,
  nextReminder: Date | null,
  lastFiredTarget: number | null,
): boolean {
  if (!isDue(now, nextReminder)) return false;
  return lastFiredTarget !== (nextReminder as Date).getTime();
}
