import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TicketError } from './ticket-errors';
import { parseTicketListQuery } from './ticket-list-query';
import { ALLOWED_TRANSITIONS, TicketsService } from './tickets.service';

const OWNER = BigInt(1);
const HOUSE = BigInt(7);

describe('TicketsService', () => {
  const prismaMock = {
    ticket: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    house: {
      findFirst: jest.fn(),
    },
    ticketFeedItem: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  let service: TicketsService;

  const ownHouse = () =>
    prismaMock.house.findFirst.mockResolvedValue({ id: HOUSE });

  beforeEach(() => {
    jest.resetAllMocks();
    // interactive transactions run the callback against the same mock —
    // the tx client and the root client are interchangeable in these tests;
    // the batch (array) form used by list() just awaits its members
    prismaMock.$transaction.mockImplementation(
      (arg: Array<Promise<unknown>> | ((tx: unknown) => unknown)) =>
        Array.isArray(arg) ? Promise.all(arg) : arg(prismaMock),
    );
    service = new TicketsService(prismaMock as unknown as PrismaService);
  });

  describe('create', () => {
    it('creates a ticket for the owner with trimmed fields and defaults (FR-TICKET-01)', async () => {
      ownHouse();
      prismaMock.ticket.create.mockResolvedValue({});
      await service.create(OWNER, {
        houseId: 7,
        title: '  Тече кран  ',
        category: 'PLUMBING',
        requesterName: ' Іван ',
      });
      expect(prismaMock.house.findFirst).toHaveBeenCalledWith({
        where: { id: HOUSE, userId: OWNER },
        select: { id: true },
      });
      expect(prismaMock.ticket.create).toHaveBeenCalledWith({
        data: {
          userId: OWNER,
          houseId: HOUSE,
          title: 'Тече кран',
          description: null,
          category: 'PLUMBING',
          requesterName: 'Іван',
          requesterPhone: null,
          executor: null,
          dueDate: null,
          // no priority key: the schema default NORMAL applies (PRD §5.3)
        },
        include: { house: true },
      });
    });

    it('stores an explicit priority and a parsed due date', async () => {
      ownHouse();
      prismaMock.ticket.create.mockResolvedValue({});
      await service.create(OWNER, {
        houseId: 7,
        title: 'Ліфт',
        category: 'ELEVATOR',
        priority: 'EMERGENCY',
        dueDate: '2026-07-15',
      });
      const data = prismaMock.ticket.create.mock.calls[0][0].data;
      expect(data.priority).toBe('EMERGENCY');
      expect(data.dueDate).toEqual(new Date('2026-07-15'));
    });

    it.each([undefined, '', '   ', 42])(
      'rejects invalid title %p with TICKET_TITLE_INVALID and creates nothing',
      async (title) => {
        ownHouse();
        await expect(
          service.create(OWNER, { houseId: 7, title, category: 'OTHER' }),
        ).rejects.toMatchObject({
          response: { code: 'TICKET_TITLE_INVALID' },
        });
        expect(prismaMock.ticket.create).not.toHaveBeenCalled();
      },
    );

    it('rejects a missing or malformed houseId as a 400 shape error', async () => {
      for (const houseId of [undefined, 'x', -1, 1.5]) {
        const err = await service
          .create(OWNER, { houseId, title: 'Т', category: 'OTHER' })
          .catch((e) => e);
        expect(err).toBeInstanceOf(TicketError);
        expect(err.getStatus()).toBe(400);
        expect(err.getResponse()).toMatchObject({
          code: 'TICKET_HOUSE_INVALID',
        });
      }
      expect(prismaMock.house.findFirst).not.toHaveBeenCalled();
    });

    it('answers the same 404 for a foreign and a missing house (FR-ACCESS-01)', async () => {
      prismaMock.house.findFirst.mockResolvedValue(null); // foreign or missing
      const err = await service
        .create(OWNER, { houseId: 7, title: 'Т', category: 'OTHER' })
        .catch((e) => e);
      expect(err).toBeInstanceOf(TicketError);
      expect(err.getStatus()).toBe(404);
      expect(err.getResponse()).toMatchObject({
        code: 'TICKET_HOUSE_NOT_FOUND',
      });
      expect(prismaMock.ticket.create).not.toHaveBeenCalled();
    });

    it.each(['SOMETHING', '', 5, undefined])(
      'rejects invalid category %p',
      async (category) => {
        ownHouse();
        await expect(
          service.create(OWNER, { houseId: 7, title: 'Т', category }),
        ).rejects.toMatchObject({
          response: { code: 'TICKET_CATEGORY_INVALID' },
        });
      },
    );

    it('rejects an unknown priority', async () => {
      ownHouse();
      await expect(
        service.create(OWNER, {
          houseId: 7,
          title: 'Т',
          category: 'OTHER',
          priority: 'URGENT',
        }),
      ).rejects.toMatchObject({
        response: { code: 'TICKET_PRIORITY_INVALID' },
      });
    });

    it.each(['15.07.2026', '2026-13-40', '2026-02-31', 20260715])(
      'rejects invalid due date %p',
      async (dueDate) => {
        ownHouse();
        await expect(
          service.create(OWNER, {
            houseId: 7,
            title: 'Т',
            category: 'OTHER',
            dueDate,
          }),
        ).rejects.toMatchObject({
          response: { code: 'TICKET_DUE_DATE_INVALID' },
        });
      },
    );

    it('rejects overlong optional texts with their own codes', async () => {
      ownHouse();
      const cases: Array<[string, string, string]> = [
        ['description', 'a'.repeat(10_001), 'TICKET_DESCRIPTION_INVALID'],
        ['requesterName', 'a'.repeat(256), 'TICKET_REQUESTER_INVALID'],
        ['requesterPhone', '1'.repeat(33), 'TICKET_REQUESTER_INVALID'],
        ['executor', 'a'.repeat(256), 'TICKET_EXECUTOR_INVALID'],
      ];
      for (const [field, value, code] of cases) {
        await expect(
          service.create(OWNER, {
            houseId: 7,
            title: 'Т',
            category: 'OTHER',
            [field]: value,
          }),
        ).rejects.toMatchObject({ response: { code } });
      }
    });

    it('maps the FK backstop (P2003) to the house 404', async () => {
      ownHouse(); // race: house deleted after the owner check
      prismaMock.ticket.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('FK constraint', {
          code: 'P2003',
          clientVersion: 'test',
        }),
      );
      await expect(
        service.create(OWNER, { houseId: 7, title: 'Т', category: 'OTHER' }),
      ).rejects.toMatchObject({ response: { code: 'TICKET_HOUSE_NOT_FOUND' } });
    });
  });

  describe('get', () => {
    it('scopes the lookup to id AND owner and joins the house (NFR-SEC-03)', async () => {
      const ticket = { id: BigInt(5) };
      prismaMock.ticket.findFirst.mockResolvedValue(ticket);
      await expect(service.get(OWNER, '5')).resolves.toBe(ticket);
      expect(prismaMock.ticket.findFirst).toHaveBeenCalledWith({
        where: { id: BigInt(5), userId: OWNER },
        include: { house: true },
      });
    });

    it('answers the same 404 for missing and foreign tickets (FR-ACCESS-01)', async () => {
      prismaMock.ticket.findFirst.mockResolvedValue(null); // foreign or missing
      const missing = await service.get(OWNER, '999').catch((e) => e);
      const foreign = await service.get(OWNER, '5').catch((e) => e);
      for (const err of [missing, foreign]) {
        expect(err).toBeInstanceOf(TicketError);
        expect(err.getStatus()).toBe(404);
      }
      expect(missing.getResponse()).toEqual(foreign.getResponse());
    });

    it('treats a non-numeric id as the same 404 without querying', async () => {
      await expect(service.get(OWNER, 'abc')).rejects.toMatchObject({
        response: { code: 'TICKET_NOT_FOUND' },
      });
      expect(prismaMock.ticket.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    // a realistic current row: the diff compares every tracked field
    const CURRENT = {
      id: BigInt(5),
      userId: OWNER,
      houseId: HOUSE,
      house: { id: HOUSE, name: 'Шевченка 12' },
      title: 'Стара назва',
      category: 'PLUMBING',
      priority: 'NORMAL',
      executor: null,
      dueDate: null,
    };
    const existingTicket = (overrides: Record<string, unknown> = {}) =>
      prismaMock.ticket.findFirst.mockResolvedValue({
        ...CURRENT,
        ...overrides,
      });

    it('updates only the fields present in the body, atomically with the owner filter', async () => {
      existingTicket();
      prismaMock.ticket.updateMany.mockResolvedValue({ count: 1 });
      await service.update(OWNER, '5', {
        executor: ' Майстер Петро ',
        dueDate: '2026-07-20',
      });
      expect(prismaMock.ticket.updateMany).toHaveBeenCalledWith({
        where: { id: BigInt(5), userId: OWNER },
        data: {
          executor: 'Майстер Петро',
          dueDate: new Date('2026-07-20'),
        },
      });
      expect(prismaMock.house.findFirst).not.toHaveBeenCalled();
    });

    it('records one EVENT per changed tracked field with old → new values (FR-TICKET-03)', async () => {
      existingTicket();
      prismaMock.ticket.updateMany.mockResolvedValue({ count: 1 });
      await service.update(OWNER, '5', {
        executor: 'Майстер Петро',
        dueDate: '2026-07-20',
      });
      expect(prismaMock.ticketFeedItem.createMany).toHaveBeenCalledWith({
        data: [
          {
            ticketId: BigInt(5),
            authorId: OWNER,
            type: 'EVENT',
            field: 'EXECUTOR',
            oldValue: null,
            newValue: 'Майстер Петро',
          },
          {
            ticketId: BigInt(5),
            authorId: OWNER,
            type: 'EVENT',
            field: 'DUE_DATE',
            oldValue: null,
            newValue: '2026-07-20',
          },
        ],
      });
    });

    it('clears the due date on dueDate: null and records the event (FR-DUE-01)', async () => {
      existingTicket({ dueDate: new Date('2026-07-20') });
      prismaMock.ticket.updateMany.mockResolvedValue({ count: 1 });
      await service.update(OWNER, '5', { dueDate: null });
      expect(prismaMock.ticket.updateMany).toHaveBeenCalledWith({
        where: { id: BigInt(5), userId: OWNER },
        data: { dueDate: null },
      });
      const events = prismaMock.ticketFeedItem.createMany.mock.calls[0][0].data;
      expect(events).toEqual([
        expect.objectContaining({
          field: 'DUE_DATE',
          oldValue: '2026-07-20',
          newValue: null,
        }),
      ]);
    });

    it('skips events for same-value writes and untracked fields', async () => {
      existingTicket();
      prismaMock.ticket.updateMany.mockResolvedValue({ count: 1 });
      await service.update(OWNER, '5', {
        title: 'Нова назва', // untracked (FR-TICKET-03 lists five fields)
        category: 'PLUMBING', // same value as stored
        executor: null, // still empty
      });
      expect(prismaMock.ticketFeedItem.createMany).not.toHaveBeenCalled();
    });

    it('snapshots both house names on a house change (design D1)', async () => {
      existingTicket();
      prismaMock.house.findFirst.mockResolvedValue({ name: 'Франка 3' });
      prismaMock.ticket.updateMany.mockResolvedValue({ count: 1 });
      await service.update(OWNER, '5', { houseId: 9 });
      expect(prismaMock.house.findFirst).toHaveBeenCalledWith({
        where: { id: BigInt(9), userId: OWNER },
        select: { name: true },
      });
      const events = prismaMock.ticketFeedItem.createMany.mock.calls[0][0].data;
      expect(events).toEqual([
        expect.objectContaining({
          field: 'HOUSE',
          oldValue: 'Шевченка 12',
          newValue: 'Франка 3',
        }),
      ]);
    });

    it('does not read status from the body (transitions have their own endpoint)', async () => {
      existingTicket();
      prismaMock.ticket.updateMany.mockResolvedValue({ count: 1 });
      await service.update(OWNER, '5', {
        title: 'Нова назва',
        status: 'CLOSED',
      } as never);
      const data = prismaMock.ticket.updateMany.mock.calls[0][0].data;
      expect(data).toEqual({ title: 'Нова назва' });
    });

    it('treats a patch with no writable fields as a no-op read (S-04 smoke finding)', async () => {
      const ticket = { id: BigInt(5) };
      prismaMock.ticket.findFirst.mockResolvedValue(ticket);
      await expect(
        service.update(OWNER, '5', { status: 'CLOSED' } as never),
      ).resolves.toBe(ticket);
      // no empty updateMany: it would report count 0 and 404 the owner
      expect(prismaMock.ticket.updateMany).not.toHaveBeenCalled();
      expect(prismaMock.ticketFeedItem.createMany).not.toHaveBeenCalled();
    });

    it('re-checks house ownership when houseId changes', async () => {
      existingTicket();
      prismaMock.house.findFirst.mockResolvedValue(null); // foreign or missing
      await expect(
        service.update(OWNER, '5', { houseId: 9 }),
      ).rejects.toMatchObject({ response: { code: 'TICKET_HOUSE_NOT_FOUND' } });
      expect(prismaMock.ticket.updateMany).not.toHaveBeenCalled();
    });

    it('rejects emptying the title and changes nothing', async () => {
      await expect(
        service.update(OWNER, '5', { title: '  ' }),
      ).rejects.toMatchObject({ response: { code: 'TICKET_TITLE_INVALID' } });
      expect(prismaMock.ticket.updateMany).not.toHaveBeenCalled();
    });

    it('answers 404 when the ticket is foreign or missing', async () => {
      prismaMock.ticket.findFirst.mockResolvedValue(null);
      await expect(
        service.update(OWNER, '5', { title: 'Т' }),
      ).rejects.toMatchObject({ response: { code: 'TICKET_NOT_FOUND' } });
      expect(prismaMock.ticket.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('transition', () => {
    const ticketIn = (status: string) =>
      prismaMock.ticket.findFirst
        .mockResolvedValueOnce({ status })
        .mockResolvedValue({ id: BigInt(5), status: 'X' });

    it.each([
      ['NEW', 'IN_PROGRESS'],
      ['NEW', 'REJECTED'],
      ['IN_PROGRESS', 'DONE'],
      ['IN_PROGRESS', 'REJECTED'],
      ['DONE', 'IN_PROGRESS'],
      ['DONE', 'CLOSED'],
    ])(
      'allows %s → %s, guards on the read status and records the event (FR-STATUS-02/03)',
      async (from, to) => {
        ticketIn(from);
        prismaMock.ticket.updateMany.mockResolvedValue({ count: 1 });
        await service.transition(OWNER, '5', { to });
        expect(prismaMock.ticket.updateMany).toHaveBeenCalledWith({
          where: { id: BigInt(5), userId: OWNER, status: from },
          data: { status: to },
        });
        expect(prismaMock.ticketFeedItem.create).toHaveBeenCalledWith({
          data: {
            ticketId: BigInt(5),
            authorId: OWNER,
            type: 'EVENT',
            field: 'STATUS',
            oldValue: from,
            newValue: to,
          },
        });
      },
    );

    it.each([
      ['CLOSED', 'IN_PROGRESS'], // terminal escape
      ['REJECTED', 'NEW'], // terminal escape
      ['NEW', 'DONE'], // skip
      ['NEW', 'CLOSED'], // skip
      ['DONE', 'REJECTED'], // not in the table
      ['IN_PROGRESS', 'IN_PROGRESS'], // self-transition
    ])(
      'rejects %s → %s with 409 and writes nothing (FR-STATUS-02)',
      async (from, to) => {
        ticketIn(from);
        const err = await service
          .transition(OWNER, '5', { to })
          .catch((e) => e);
        expect(err).toBeInstanceOf(TicketError);
        expect(err.getStatus()).toBe(409);
        expect(err.getResponse()).toMatchObject({
          code: 'TICKET_TRANSITION_FORBIDDEN',
        });
        expect(prismaMock.ticket.updateMany).not.toHaveBeenCalled();
        expect(prismaMock.ticketFeedItem.create).not.toHaveBeenCalled();
      },
    );

    it('rejects a stale request (concurrent transition won the race) with the same 409', async () => {
      ticketIn('DONE');
      prismaMock.ticket.updateMany.mockResolvedValue({ count: 0 });
      await expect(
        service.transition(OWNER, '5', { to: 'CLOSED' }),
      ).rejects.toMatchObject({
        response: { code: 'TICKET_TRANSITION_FORBIDDEN' },
      });
      expect(prismaMock.ticketFeedItem.create).not.toHaveBeenCalled();
    });

    it.each(['Closed', 'ARCHIVED', '', 42, undefined])(
      'rejects a non-status target %p with 400 before touching the DB',
      async (to) => {
        await expect(
          service.transition(OWNER, '5', { to }),
        ).rejects.toMatchObject({
          response: { code: 'TICKET_STATUS_INVALID' },
        });
        expect(prismaMock.ticket.findFirst).not.toHaveBeenCalled();
      },
    );

    it('answers the same 404 for foreign and missing tickets (FR-ACCESS-01)', async () => {
      prismaMock.ticket.findFirst.mockResolvedValue(null);
      await expect(
        service.transition(OWNER, '5', { to: 'IN_PROGRESS' }),
      ).rejects.toMatchObject({ response: { code: 'TICKET_NOT_FOUND' } });
      expect(prismaMock.ticket.updateMany).not.toHaveBeenCalled();
    });

    it('covers the whole §5.1 table: terminal statuses allow nothing', () => {
      expect(ALLOWED_TRANSITIONS).toEqual({
        NEW: ['IN_PROGRESS', 'REJECTED'],
        IN_PROGRESS: ['DONE', 'REJECTED'],
        DONE: ['IN_PROGRESS', 'CLOSED'],
        CLOSED: [],
        REJECTED: [],
      });
    });
  });

  describe('getFeed', () => {
    it('returns the feed ordered by id with authors, scoped to the owner', async () => {
      prismaMock.ticket.findFirst.mockResolvedValue({ id: BigInt(5) });
      const items = [{ id: BigInt(1) }];
      prismaMock.ticketFeedItem.findMany.mockResolvedValue(items);
      await expect(service.getFeed(OWNER, '5')).resolves.toBe(items);
      expect(prismaMock.ticket.findFirst).toHaveBeenCalledWith({
        where: { id: BigInt(5), userId: OWNER },
        select: { id: true },
      });
      expect(prismaMock.ticketFeedItem.findMany).toHaveBeenCalledWith({
        where: { ticketId: BigInt(5) },
        orderBy: { id: 'asc' },
        include: { author: true },
      });
    });

    it('answers the same 404 for foreign and missing tickets', async () => {
      prismaMock.ticket.findFirst.mockResolvedValue(null);
      await expect(service.getFeed(OWNER, '5')).rejects.toMatchObject({
        response: { code: 'TICKET_NOT_FOUND' },
      });
      expect(prismaMock.ticketFeedItem.findMany).not.toHaveBeenCalled();
    });
  });

  describe('addNote', () => {
    it('appends a trimmed NOTE with the author (FR-FEED-01)', async () => {
      prismaMock.ticket.findFirst.mockResolvedValue({ id: BigInt(5) });
      prismaMock.ticketFeedItem.create.mockResolvedValue({});
      await service.addNote(OWNER, '5', { text: '  Дзвонив майстру  ' });
      expect(prismaMock.ticketFeedItem.create).toHaveBeenCalledWith({
        data: {
          ticketId: BigInt(5),
          authorId: OWNER,
          type: 'NOTE',
          text: 'Дзвонив майстру',
        },
        include: { author: true },
      });
    });

    it.each(['', '   ', undefined, 42])(
      'rejects an empty or non-text note %p with 400 and appends nothing',
      async (text) => {
        await expect(
          service.addNote(OWNER, '5', { text }),
        ).rejects.toMatchObject({ response: { code: 'TICKET_NOTE_INVALID' } });
        expect(prismaMock.ticketFeedItem.create).not.toHaveBeenCalled();
      },
    );

    it('rejects an overlong note with 400', async () => {
      await expect(
        service.addNote(OWNER, '5', { text: 'а'.repeat(10_001) }),
      ).rejects.toMatchObject({ response: { code: 'TICKET_NOTE_INVALID' } });
    });

    it('answers the same 404 for foreign and missing tickets', async () => {
      prismaMock.ticket.findFirst.mockResolvedValue(null);
      await expect(
        service.addNote(OWNER, '5', { text: 'Запис' }),
      ).rejects.toMatchObject({ response: { code: 'TICKET_NOT_FOUND' } });
      expect(prismaMock.ticketFeedItem.create).not.toHaveBeenCalled();
    });
  });

  describe('list', () => {
    // queries go through the real parser — list() never sees raw params
    const listQuery = (raw: Record<string, unknown> = {}) =>
      parseTicketListQuery(raw);

    beforeEach(() => {
      prismaMock.ticket.findMany.mockResolvedValue([]);
      prismaMock.ticket.count.mockResolvedValue(0);
    });

    it('scopes to the owner and defaults to newest first, page 1 (FR-LIST-01/04)', async () => {
      await service.list(OWNER, listQuery());
      expect(prismaMock.ticket.findMany).toHaveBeenCalledWith({
        where: { userId: OWNER },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: 0,
        take: 20,
        include: { house: true },
      });
      expect(prismaMock.ticket.count).toHaveBeenCalledWith({
        where: { userId: OWNER },
      });
    });

    it('AND-combines the ACTIVE preset with house/category/priority (FR-LIST-02)', async () => {
      await service.list(
        OWNER,
        listQuery({
          status: 'ACTIVE',
          houseId: '7',
          category: 'PLUMBING',
          priority: 'HIGH',
        }),
      );
      expect(prismaMock.ticket.findMany.mock.calls[0][0].where).toEqual({
        userId: OWNER,
        status: { in: ['NEW', 'IN_PROGRESS'] },
        houseId: HOUSE,
        category: 'PLUMBING',
        priority: 'HIGH',
      });
    });

    it('searches all four FR-LIST-03 subjects as substrings alongside filters', async () => {
      await service.list(OWNER, listQuery({ q: 'Іваненко', status: 'NEW' }));
      expect(prismaMock.ticket.findMany.mock.calls[0][0].where).toEqual({
        userId: OWNER,
        status: { in: ['NEW'] },
        OR: [
          { title: { contains: 'Іваненко' } },
          { description: { contains: 'Іваненко' } },
          { requesterName: { contains: 'Іваненко' } },
          { requesterPhone: { contains: 'Іваненко' } },
          { executor: { contains: 'Іваненко' } },
        ],
      });
    });

    it('escapes LIKE wildcards — a search for literal % is not a wildcard (review S-06)', async () => {
      await service.list(OWNER, listQuery({ q: '10%_5\\' }));
      const or = prismaMock.ticket.findMany.mock.calls[0][0].where.OR;
      expect(or[0]).toEqual({ title: { contains: '10\\%\\_5\\\\' } });
    });

    it('sorts by due date with undated tickets last and a stable tie-break (FR-LIST-04)', async () => {
      await service.list(OWNER, listQuery({ sort: 'dueDate' }));
      expect(prismaMock.ticket.findMany.mock.calls[0][0].orderBy).toEqual([
        { dueDate: { sort: 'asc', nulls: 'last' } },
        { id: 'desc' },
      ]);
    });

    it('slices the requested page and reports the full total', async () => {
      const rows = [{ id: BigInt(9) }];
      prismaMock.ticket.findMany.mockResolvedValue(rows);
      prismaMock.ticket.count.mockResolvedValue(107);
      const result = await service.list(
        OWNER,
        listQuery({ page: '3', pageSize: '50' }),
      );
      const args = prismaMock.ticket.findMany.mock.calls[0][0];
      expect(args.skip).toBe(100);
      expect(args.take).toBe(50);
      expect(result).toEqual({ items: rows, total: 107 });
    });
  });
});
