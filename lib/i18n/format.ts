// @trace NFR-I18N-01
// Pure formatting utilities — no framework deps.

/**
 * Ukrainian grammatical plural for a count of days.
 * Rules: 1 → "день", 2-4 → "дні", 5+ and 11-19 → "днів".
 */
function uaDayForm(count: number): string {
  const abs = Math.abs(count);
  const mod100 = abs % 100;
  const mod10 = abs % 10;
  if (mod100 >= 11 && mod100 <= 19) return "днів";
  if (mod10 === 1) return "день";
  if (mod10 >= 2 && mod10 <= 4) return "дні";
  return "днів";
}

/**
 * Format a days-remaining value with correct Ukrainian grammar. The deadline
 * day is INCLUSIVE: a positive count shows "N днів залишилось"; exactly 0 means
 * the deadline is today (still open) and shows `todayLabel`; only a negative
 * count (the deadline day has fully passed) is overdue. This fixes the
 * off-by-one where a next-day-midnight deadline floored to 0 and read as
 * overdue.
 */
export function formatDaysRemaining(
  days: number,
  overdueLabel: string,
  todayLabel: string,
): string {
  if (days < 0) return overdueLabel;
  if (days === 0) return todayLabel;
  return `${days} ${uaDayForm(days)} залишилось`;
}
