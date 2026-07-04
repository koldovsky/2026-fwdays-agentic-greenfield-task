/** MHOA tennis calendar rules (BC-MHOA-TENNIS-04, BC-MHOA-TENNIS-05). */

export function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function dayDiffFrom(reference: Date, targetIso: string): number {
  const ref = startOfLocalDay(reference);
  const [y, m, d] = targetIso.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  return Math.round((target.getTime() - ref.getTime()) / 86_400_000);
}

/** Dates with 1 ≤ dayDiff ≤ 7 — currently bookable on MHOA. */
export function isWithinBookingWindow(targetIso: string, reference: Date = new Date()): boolean {
  const diff = dayDiffFrom(reference, targetIso);
  return diff >= 1 && diff <= 7;
}

/** Midnight local time when target date enters the 7-day window (dayDiff becomes 7). */
export function getOpensAt(targetIso: string): Date {
  const [y, m, d] = targetIso.split("-").map(Number);
  const target = new Date(y, m - 1, d);
  const opens = new Date(target);
  opens.setDate(opens.getDate() - 7);
  opens.setHours(0, 0, 0, 0);
  return opens;
}

/** Next N bookable ISO dates starting tomorrow (or from ref+1). */
export function getBookableDates(reference: Date = new Date(), count = 7): string[] {
  const dates: string[] = [];
  const ref = startOfLocalDay(reference);
  for (let i = 1; i <= 7 && dates.length < count; i++) {
    const d = new Date(ref);
    d.setDate(d.getDate() + i);
    dates.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    );
  }
  return dates;
}

/** 11:59 PM local on the night before target — last moment MHOA accepts booking (BC-MHOA-TENNIS-03). */
export function getBookingDeadline(targetIso: string): Date {
  const [y, m, d] = targetIso.split("-").map(Number);
  const deadline = new Date(y, m - 1, d - 1, 23, 59, 0, 0);
  return deadline;
}

export function formatOpensAtLabel(opensAt: Date): string {
  return opensAt.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Maximum days ahead users may schedule (8 weeks). */
export const MAX_SCHEDULE_DAYS = 56;

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Day 8 through MAX_SCHEDULE_DAYS ahead — queue-only, not live on MHOA yet. */
export function isSchedulableDate(
  targetIso: string,
  reference: Date = new Date(),
): boolean {
  const diff = dayDiffFrom(reference, targetIso);
  return diff >= 8 && diff <= MAX_SCHEDULE_DAYS;
}

/** First ISO date outside the live 7-day window (day 8). */
export function getMinSchedulableDate(reference: Date = new Date()): string {
  const d = startOfLocalDay(reference);
  d.setDate(d.getDate() + 8);
  return toIsoDate(d);
}

/** Last ISO date users may schedule (8 weeks ahead). */
export function getMaxSchedulableDate(reference: Date = new Date()): string {
  const d = startOfLocalDay(reference);
  d.setDate(d.getDate() + MAX_SCHEDULE_DAYS);
  return toIsoDate(d);
}
