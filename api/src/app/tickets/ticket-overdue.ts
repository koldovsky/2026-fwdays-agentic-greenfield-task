import { TicketStatus } from '../../generated/prisma/enums';

// The PRD §5.1 activity rule in one place (S-06 design D2/D3): drives both
// the ACTIVE list preset and the overdue flag, so the SPA owns no copy —
// same principle as ALLOWED_TRANSITIONS for the §5.1 table.
export const ACTIVE_STATUSES: readonly TicketStatus[] = [
  TicketStatus.NEW,
  TicketStatus.IN_PROGRESS,
];

// Overdue is a calendar-date comparison (PRD §5.4): the due date is a plain
// YYYY-MM-DD, so "past" needs a "today" in some timezone. The product is
// single-market Ukraine while the server runs in UTC — a UTC "today" would
// flip the highlight 2-3 hours late for users (design D3).
const KYIV_TODAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Kyiv',
});

export function todayInKyiv(now: Date = new Date()): string {
  return KYIV_TODAY.format(now); // en-CA renders as YYYY-MM-DD
}

// PRD §5.4: overdue = due date set AND in the past AND status active.
// Purely informational — callers only render it, no side effects anywhere.
export function isTicketOverdue(
  ticket: { status: TicketStatus; dueDate: Date | null },
  today: string = todayInKyiv(),
): boolean {
  return (
    ticket.dueDate !== null &&
    ACTIVE_STATUSES.includes(ticket.status) &&
    ticket.dueDate.toISOString().slice(0, 10) < today
  );
}
