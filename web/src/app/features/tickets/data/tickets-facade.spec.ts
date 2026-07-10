import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { TicketsApi } from './tickets-api';
import { TicketsFacade } from './tickets-facade';
import {
  AttachmentDto,
  DEFAULT_TICKET_LIST_FILTERS,
  FeedItemDto,
  TicketDto,
  TicketListFilters,
  TicketListItemDto,
  TicketListPageDto,
  fromWireDate,
  toWireDate,
} from './ticket.model';

const TICKET: TicketDto = {
  id: 12,
  houseId: 1,
  houseName: 'Шевченка 12',
  title: 'Тече кран',
  description: null,
  category: 'PLUMBING',
  priority: 'NORMAL',
  status: 'NEW',
  allowedTransitions: ['IN_PROGRESS', 'REJECTED'],
  isOverdue: false,
  requesterName: null,
  requesterPhone: null,
  executor: null,
  dueDate: null,
  createdAt: '2026-07-08T00:00:00.000Z',
  updatedAt: '2026-07-08T00:00:00.000Z',
};

const INPUT = {
  title: TICKET.title,
  description: null,
  houseId: 1,
  category: 'PLUMBING' as const,
  priority: 'NORMAL' as const,
  requesterName: null,
  requesterPhone: null,
  executor: null,
  dueDate: null,
};

const NOTE: FeedItemDto = {
  id: 1,
  type: 'NOTE',
  authorId: 1,
  authorName: 'Іван',
  text: 'Дзвонив майстру',
  field: null,
  oldValue: null,
  newValue: null,
  createdAt: '2026-07-08T10:00:00.000Z',
};

const STATUS_EVENT: FeedItemDto = {
  ...NOTE,
  id: 2,
  type: 'EVENT',
  text: null,
  field: 'STATUS',
  oldValue: 'NEW',
  newValue: 'IN_PROGRESS',
};

const ATTACHMENT: AttachmentDto = {
  id: 3,
  fileName: 'кухня.jpg',
  mimeType: 'image/jpeg',
  size: 3_000_000,
  createdAt: '2026-07-09T10:00:00.000Z',
};

const ATTACHMENT_EVENT: FeedItemDto = {
  ...NOTE,
  id: 4,
  type: 'EVENT',
  text: null,
  field: 'ATTACHMENT',
  oldValue: null,
  newValue: 'кухня.jpg',
};

function apiError(status: number, code: string): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: { code, message: code } });
}

function setup(api: Partial<TicketsApi>): TicketsFacade {
  TestBed.configureTestingModule({
    providers: [{ provide: TicketsApi, useValue: api }],
  });
  return TestBed.inject(TicketsFacade);
}

const ROW: TicketListItemDto = {
  id: 12,
  title: 'Тече кран',
  houseName: 'Шевченка 12',
  category: 'PLUMBING',
  priority: 'NORMAL',
  status: 'NEW',
  dueDate: null,
  isOverdue: false,
  createdAt: '2026-07-08T00:00:00.000Z',
};

function listPage(
  items: TicketListItemDto[],
  total: number,
  page = 1,
): TicketListPageDto {
  return { items, total, page, pageSize: 20 };
}

describe('TicketsFacade list (S-06)', () => {
  it('loadList passes the filters to the API and shows page 1 (FR-LIST-02)', async () => {
    const calls: Array<[TicketListFilters, number]> = [];
    const facade = setup({
      list: (filters, page) => {
        calls.push([filters, page]);
        return of(listPage([ROW], 3));
      },
    });
    const filters: TicketListFilters = {
      ...DEFAULT_TICKET_LIST_FILTERS,
      status: 'ACTIVE',
      houseId: 7,
    };
    await facade.loadList(filters);
    expect(calls).toEqual([[filters, 1]]);
    expect(facade.listItems()).toEqual([ROW]);
    expect(facade.listTotal()).toBe(3);
    expect(facade.listHasMore()).toBe(true);
    expect(facade.listLoading()).toBe(false);
    expect(facade.listError()).toBeNull();
  });

  it('loadList failure maps the query error and empties the list', async () => {
    const facade = setup({
      list: () => throwError(() => apiError(400, 'TICKET_QUERY_INVALID')),
    });
    await facade.loadList(DEFAULT_TICKET_LIST_FILTERS);
    expect(facade.listItems()).toEqual([]);
    expect(facade.listError()).toBe(
      'Невірні параметри списку — скиньте фільтри',
    );
    expect(facade.listLoading()).toBe(false);
  });

  it('loadMore appends the next page of the same query (FR-LIST-04)', async () => {
    const calls: Array<[TicketListFilters, number]> = [];
    const second: TicketListItemDto = { ...ROW, id: 13 };
    const pages = [listPage([ROW], 2), listPage([second], 2, 2)];
    const facade = setup({
      list: (filters, page) => {
        calls.push([filters, page]);
        return of(pages[calls.length - 1]);
      },
    });
    const filters: TicketListFilters = {
      ...DEFAULT_TICKET_LIST_FILTERS,
      q: 'кран',
    };
    await facade.loadList(filters);
    await facade.loadMore();
    expect(calls).toEqual([
      [filters, 1],
      [filters, 2],
    ]);
    expect(facade.listItems()).toEqual([ROW, second]);
    expect(facade.listHasMore()).toBe(false);
  });

  it('a failed loadMore keeps the shown rows and reports on its own channel (review S-06)', async () => {
    let requests = 0;
    const facade = setup({
      list: () => {
        requests += 1;
        return requests === 1
          ? of(listPage([ROW], 2))
          : throwError(() => apiError(500, 'INTERNAL'));
      },
    });
    await facade.loadList(DEFAULT_TICKET_LIST_FILTERS);
    await expect(facade.loadMore()).resolves.toBe(false);
    // the list must NOT unmount: items intact, the page-level error stays null
    expect(facade.listItems()).toEqual([ROW]);
    expect(facade.listError()).toBeNull();
    expect(facade.listMoreError()).toBe('Щось пішло не так. Спробуйте ще раз');
    expect(facade.listLoadingMore()).toBe(false);
    // and a retry is still possible
    expect(facade.listHasMore()).toBe(true);
  });

  it('loadMore is a no-op when everything is already shown', async () => {
    let requests = 0;
    const facade = setup({
      list: () => {
        requests += 1;
        return of(listPage([ROW], 1));
      },
    });
    await facade.loadList(DEFAULT_TICKET_LIST_FILTERS);
    await facade.loadMore();
    expect(requests).toBe(1);
  });
});

describe('TicketsFacade', () => {
  it('load fills the ticket and its feed (FR-TICKET-01, FR-FEED-01)', async () => {
    const facade = setup({
      get: () => of(TICKET),
      getFeed: () => of([NOTE]),
      listAttachments: () => of([]),
    });
    await facade.load(12);
    expect(facade.ticket()).toEqual(TICKET);
    expect(facade.feed()).toEqual([NOTE]);
    expect(facade.loading()).toBe(false);
    expect(facade.error()).toBeNull();
  });

  it('load of a foreign/missing ticket maps the 404 code (FR-ACCESS-01)', async () => {
    const facade = setup({
      get: () => throwError(() => apiError(404, 'TICKET_NOT_FOUND')),
      getFeed: () => throwError(() => apiError(404, 'TICKET_NOT_FOUND')),
      listAttachments: () =>
        throwError(() => apiError(404, 'TICKET_NOT_FOUND')),
    });
    await facade.load(999);
    expect(facade.ticket()).toBeNull();
    expect(facade.feed()).toEqual([]);
    expect(facade.error()).toBe('Заявку не знайдено');
  });

  it('create resolves to the saved ticket and keeps it in state', async () => {
    const facade = setup({ create: () => of(TICKET) });
    await expect(facade.create(INPUT)).resolves.toEqual(TICKET);
    expect(facade.ticket()).toEqual(TICKET);
    expect(facade.pending()).toBe(false);
    expect(facade.error()).toBeNull();
  });

  it('create failure maps the API code to Ukrainian copy', async () => {
    const facade = setup({
      create: () => throwError(() => apiError(404, 'TICKET_HOUSE_NOT_FOUND')),
    });
    await expect(facade.create(INPUT)).resolves.toBeNull();
    expect(facade.error()).toBe('Будинок не знайдено');
    expect(facade.pending()).toBe(false);
  });

  it('update resolves to the fresh ticket (FR-TICKET-01 edit)', async () => {
    const updated = { ...TICKET, executor: 'Майстер Петро' };
    const facade = setup({ update: () => of(updated) });
    await expect(
      facade.update(12, { ...INPUT, executor: 'Майстер Петро' }),
    ).resolves.toEqual(updated);
    expect(facade.ticket()).toEqual(updated);
  });

  it('update failure surfaces the validation copy', async () => {
    const facade = setup({
      update: () => throwError(() => apiError(400, 'TICKET_TITLE_INVALID')),
    });
    await expect(facade.update(12, INPUT)).resolves.toBeNull();
    expect(facade.error()).toBe('Вкажіть назву заявки');
  });

  it('transition swaps in the fresh card payload and reloads the feed (FR-STATUS-02/03)', async () => {
    const moved: TicketDto = {
      ...TICKET,
      status: 'IN_PROGRESS',
      allowedTransitions: ['DONE', 'REJECTED'],
    };
    let feedReads = 0;
    const facade = setup({
      get: () => of(TICKET),
      getFeed: () => (feedReads++ === 0 ? of([]) : of([STATUS_EVENT])),
      listAttachments: () => of([]),
      transition: () => of(moved),
    });
    await facade.load(12);
    await expect(facade.transition(12, 'IN_PROGRESS')).resolves.toBe(true);
    expect(facade.ticket()).toEqual(moved);
    expect(facade.feed()).toEqual([STATUS_EVENT]);
    expect(facade.pending()).toBe(false);
  });

  it('keeps the fresh ticket when only the feed reload fails (S-05 review, medium)', async () => {
    const moved: TicketDto = {
      ...TICKET,
      status: 'IN_PROGRESS',
      allowedTransitions: ['DONE', 'REJECTED'],
    };
    let feedReads = 0;
    const facade = setup({
      get: () => of(TICKET),
      getFeed: () =>
        feedReads++ === 0
          ? of([])
          : throwError(() => apiError(500, 'INTERNAL')),
      listAttachments: () => of([]),
      transition: () => of(moved),
    });
    await facade.load(12);
    // the transition landed server-side; the follow-up feed GET failed
    await expect(facade.transition(12, 'IN_PROGRESS')).resolves.toBe(false);
    expect(facade.ticket()).toEqual(moved); // not the stale NEW card
    expect(facade.error()).not.toBeNull(); // the user still sees a problem
    expect(facade.pending()).toBe(false);
  });

  it('forbidden transition maps the 409 code and keeps the state (FR-STATUS-02)', async () => {
    const facade = setup({
      get: () => of(TICKET),
      getFeed: () => of([]),
      listAttachments: () => of([]),
      transition: () =>
        throwError(() => apiError(409, 'TICKET_TRANSITION_FORBIDDEN')),
    });
    await facade.load(12);
    await expect(facade.transition(12, 'IN_PROGRESS')).resolves.toBe(false);
    expect(facade.ticket()).toEqual(TICKET);
    expect(facade.error()).toBe(
      'Цей перехід статусу неможливий — оновіть сторінку',
    );
    expect(facade.pending()).toBe(false);
  });

  it('addNote reloads the feed and keeps the ticket (FR-FEED-01)', async () => {
    let feedReads = 0;
    const facade = setup({
      get: () => of(TICKET),
      getFeed: () => (feedReads++ === 0 ? of([]) : of([NOTE])),
      listAttachments: () => of([]),
      addNote: () => of(NOTE),
    });
    await facade.load(12);
    await expect(facade.addNote(12, 'Дзвонив майстру')).resolves.toBe(true);
    expect(facade.feed()).toEqual([NOTE]);
    expect(facade.ticket()).toEqual(TICKET);
  });

  it('addNote failure surfaces the validation copy and returns false', async () => {
    const facade = setup({
      addNote: () => throwError(() => apiError(400, 'TICKET_NOTE_INVALID')),
    });
    await expect(facade.addNote(12, '')).resolves.toBe(false);
    expect(facade.error()).toBe('Введіть текст запису');
  });

  it('reset clears the held ticket, feed and error (create mode starts blank)', async () => {
    const facade = setup({
      get: () => of(TICKET),
      getFeed: () => of([NOTE]),
      listAttachments: () => of([ATTACHMENT]),
    });
    await facade.load(12);
    expect(facade.ticket()).toEqual(TICKET);
    expect(facade.feed()).toEqual([NOTE]);
    expect(facade.attachments()).toEqual([ATTACHMENT]);

    facade.reset();
    expect(facade.ticket()).toBeNull();
    expect(facade.feed()).toEqual([]);
    expect(facade.attachments()).toEqual([]);
    expect(facade.error()).toBeNull();
    expect(facade.pending()).toBe(false);
  });
});

// Design D5: the due date crosses the wire as a local calendar date —
// no UTC conversion that could shift the day.
describe('TicketsFacade attachments (S-07)', () => {
  const loaded = (overrides: Partial<TicketsApi>) =>
    setup({
      get: () => of(TICKET),
      getFeed: () => of([]),
      listAttachments: () => of([]),
      ...overrides,
    });

  it('uploadAttachment reloads the grid and the feed event together (FR-ATTACH-01, FR-FEED-02)', async () => {
    let uploads = 0;
    const facade = loaded({
      listAttachments: () => (uploads === 0 ? of([]) : of([ATTACHMENT])),
      getFeed: () => (uploads === 0 ? of([]) : of([ATTACHMENT_EVENT])),
      uploadAttachment: () => {
        uploads++;
        return of(ATTACHMENT);
      },
    });
    await facade.load(12);
    const ok = await facade.uploadAttachment(
      12,
      new File(['x'], 'кухня.jpg', { type: 'image/jpeg' }),
    );
    expect(ok).toBe(true);
    expect(facade.attachments()).toEqual([ATTACHMENT]);
    expect(facade.feed()).toEqual([ATTACHMENT_EVENT]);
    expect(facade.pending()).toBe(false);
  });

  it('keeps the committed photo when only the reload fails (S-07 review, medium)', async () => {
    let uploaded = false;
    const facade = loaded({
      listAttachments: () =>
        uploaded ? throwError(() => apiError(500, 'INTERNAL')) : of([]),
      uploadAttachment: () => {
        uploaded = true;
        return of(ATTACHMENT);
      },
    });
    await facade.load(12);
    // the upload landed server-side; the follow-up reload failed
    const ok = await facade.uploadAttachment(
      12,
      new File(['x'], 'кухня.jpg', { type: 'image/jpeg' }),
    );
    expect(ok).toBe(false);
    expect(facade.attachments()).toEqual([ATTACHMENT]); // not hidden
    expect(facade.error()).not.toBeNull(); // the user still sees a problem
    expect(facade.pending()).toBe(false);
  });

  it('rejected upload maps the API code and keeps the grid (FR-ATTACH-01)', async () => {
    const facade = loaded({
      uploadAttachment: () =>
        throwError(() => apiError(400, 'ATTACHMENT_TYPE_INVALID')),
    });
    await facade.load(12);
    const ok = await facade.uploadAttachment(
      12,
      new File(['x'], 'doc.pdf', { type: 'application/pdf' }),
    );
    expect(ok).toBe(false);
    expect(facade.error()).toBe('Лише фото JPEG, PNG або WebP');
    expect(facade.attachments()).toEqual([]);
    expect(facade.pending()).toBe(false);
  });

  it('deleteAttachment removes the photo and reloads the feed (FR-ATTACH-02)', async () => {
    let deletes = 0;
    const facade = loaded({
      listAttachments: () => (deletes === 0 ? of([ATTACHMENT]) : of([])),
      getFeed: () =>
        deletes === 0
          ? of([])
          : of([
              { ...ATTACHMENT_EVENT, oldValue: 'кухня.jpg', newValue: null },
            ]),
      deleteAttachment: () => {
        deletes++;
        return of({ ok: true as const });
      },
    });
    await facade.load(12);
    const ok = await facade.deleteAttachment(12, ATTACHMENT.id);
    expect(ok).toBe(true);
    expect(facade.attachments()).toEqual([]);
    expect(facade.feed()).toHaveLength(1);
  });

  it('deleteAttachment failure surfaces the 404 copy (FR-ACCESS-01)', async () => {
    const facade = loaded({
      deleteAttachment: () =>
        throwError(() => apiError(404, 'ATTACHMENT_NOT_FOUND')),
    });
    await facade.load(12);
    const ok = await facade.deleteAttachment(12, 99);
    expect(ok).toBe(false);
    expect(facade.error()).toBe('Фото не знайдено');
  });
});

describe('due date wire conversion', () => {
  it('converts a local Date to YYYY-MM-DD by local parts', () => {
    expect(toWireDate(new Date(2026, 6, 15))).toBe('2026-07-15');
    expect(toWireDate(new Date(2026, 0, 1))).toBe('2026-01-01');
  });

  it('maps empty values to null (clears the date, FR-DUE-01)', () => {
    expect(toWireDate(null)).toBeNull();
    expect(fromWireDate(null)).toBeNull();
  });

  it('parses YYYY-MM-DD into a local Date and round-trips', () => {
    const date = fromWireDate('2026-07-15');
    expect(date).toEqual(new Date(2026, 6, 15));
    expect(toWireDate(date)).toBe('2026-07-15');
  });
});
