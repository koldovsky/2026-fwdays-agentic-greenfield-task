import { TicketError } from './ticket-errors';
import {
  parseTicketListQuery,
  TICKET_LIST_PAGE_SIZE,
} from './ticket-list-query';

// Every rejection here is the loud 400 of design D7 — malformed filters are
// never silently ignored (spec: "Invalid filter value is a 400").
const rejects = (raw: Record<string, unknown>) => {
  let caught: unknown;
  try {
    parseTicketListQuery(raw);
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(TicketError);
  const err = caught as TicketError;
  expect(err.getStatus()).toBe(400);
  expect(err.getResponse()).toMatchObject({ code: 'TICKET_QUERY_INVALID' });
};

describe('parseTicketListQuery', () => {
  it('defaults to newest-first page 1 with no filters (FR-LIST-04)', () => {
    expect(parseTicketListQuery({})).toEqual({
      statuses: undefined,
      houseId: undefined,
      category: undefined,
      priority: undefined,
      search: undefined,
      sort: 'createdAt',
      order: 'desc',
      page: 1,
      pageSize: TICKET_LIST_PAGE_SIZE,
    });
  });

  it('treats empty-string params as absent filters', () => {
    const query = parseTicketListQuery({
      status: '',
      houseId: '',
      category: '',
      q: '',
    });
    expect(query.statuses).toBeUndefined();
    expect(query.houseId).toBeUndefined();
    expect(query.category).toBeUndefined();
    expect(query.search).toBeUndefined();
  });

  it('expands the ACTIVE preset to the §5.1 active statuses (FR-LIST-02)', () => {
    expect(parseTicketListQuery({ status: 'ACTIVE' }).statuses).toEqual([
      'NEW',
      'IN_PROGRESS',
    ]);
  });

  it('accepts a comma list of concrete statuses', () => {
    expect(parseTicketListQuery({ status: 'DONE,CLOSED' }).statuses).toEqual([
      'DONE',
      'CLOSED',
    ]);
  });

  it('parses combined filters to typed values', () => {
    const query = parseTicketListQuery({
      houseId: '7',
      category: 'PLUMBING',
      priority: 'HIGH',
      q: '  Іваненко  ',
    });
    expect(query.houseId).toBe(BigInt(7));
    expect(query.category).toBe('PLUMBING');
    expect(query.priority).toBe('HIGH');
    expect(query.search).toBe('Іваненко');
  });

  it('treats a whitespace-only search as no search (FR-LIST-03)', () => {
    expect(parseTicketListQuery({ q: '   ' }).search).toBeUndefined();
  });

  it('due-date sort defaults to ascending, explicit order wins', () => {
    expect(parseTicketListQuery({ sort: 'dueDate' })).toMatchObject({
      sort: 'dueDate',
      order: 'asc',
    });
    expect(
      parseTicketListQuery({ sort: 'dueDate', order: 'desc' }),
    ).toMatchObject({ sort: 'dueDate', order: 'desc' });
  });

  it('parses paging and caps pageSize at 100', () => {
    expect(parseTicketListQuery({ page: '3', pageSize: '50' })).toMatchObject({
      page: 3,
      pageSize: 50,
    });
    rejects({ pageSize: '101' });
    rejects({ page: '0' });
    rejects({ page: 'x' });
  });

  it.each([
    { status: 'NOVA' },
    { status: 'ACTIVE,CLOSED' }, // the preset stands alone (design D2)
    { category: 'SPACESHIP' },
    { priority: 'URGENT' },
    { sort: 'title' },
    { order: 'up' },
    { houseId: '-1' },
    { houseId: 'abc' },
    { status: ['NEW', 'DONE'] }, // repeated params arrive as arrays
    { q: 'а'.repeat(256) },
  ])('rejects malformed query %p with 400 TICKET_QUERY_INVALID', (raw) => {
    rejects(raw);
  });
});
