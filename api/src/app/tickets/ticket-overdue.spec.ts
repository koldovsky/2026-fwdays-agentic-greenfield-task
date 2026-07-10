import { TicketStatus } from '../../generated/prisma/enums';
import { isTicketOverdue, todayInKyiv } from './ticket-overdue';

const TODAY = '2026-07-08';
const day = (iso: string) => new Date(iso);

describe('isTicketOverdue', () => {
  // PRD §5.4 truth table: due date set AND past AND status active
  it.each([
    ['NEW', '2026-07-07', true],
    ['IN_PROGRESS', '2026-07-07', true],
    ['DONE', '2026-07-07', false],
    ['CLOSED', '2026-07-07', false],
    ['REJECTED', '2026-07-07', false],
    ['NEW', '2026-07-08', false], // due today is not overdue yet
    ['IN_PROGRESS', '2026-07-09', false], // future
  ] as Array<[TicketStatus, string, boolean]>)(
    'status %s with due date %s → overdue=%s (FR-DUE-02, §5.4)',
    (status, dueDate, expected) => {
      expect(isTicketOverdue({ status, dueDate: day(dueDate) }, TODAY)).toBe(
        expected,
      );
    },
  );

  it('a ticket without a due date is never overdue', () => {
    expect(
      isTicketOverdue({ status: TicketStatus.NEW, dueDate: null }, TODAY),
    ).toBe(false);
  });
});

describe('todayInKyiv', () => {
  it('rolls to the next date at Kyiv midnight, not UTC midnight (design D3)', () => {
    // 21:30 UTC in July is 00:30 next day in Kyiv (UTC+3, summer time)
    expect(todayInKyiv(new Date('2026-07-07T21:30:00Z'))).toBe('2026-07-08');
    // 21:30 UTC in January is still 23:30 same day in Kyiv (UTC+2)
    expect(todayInKyiv(new Date('2026-01-15T21:30:00Z'))).toBe('2026-01-15');
  });
});
