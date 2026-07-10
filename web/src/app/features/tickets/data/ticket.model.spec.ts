import {
  ATTACHMENT_MAX_FILE_SIZE,
  DEFAULT_TICKET_LIST_FILTERS,
  attachmentPrecheckError,
  ticketListFiltersFromParams,
  ticketListFiltersToParams,
} from './ticket.model';

// URL ↔ filters mapping (design D8): the URL is the single source of the
// list filter state, so both directions must round-trip and survive garbage.
function params(map: Record<string, string>): {
  get(name: string): string | null;
} {
  return { get: (name) => map[name] ?? null };
}

describe('ticketListFiltersFromParams', () => {
  it('answers the defaults for a bare /tickets URL', () => {
    expect(ticketListFiltersFromParams(undefined)).toEqual(
      DEFAULT_TICKET_LIST_FILTERS,
    );
    expect(ticketListFiltersFromParams(params({}))).toEqual(
      DEFAULT_TICKET_LIST_FILTERS,
    );
  });

  it('reads a fully narrowed URL', () => {
    expect(
      ticketListFiltersFromParams(
        params({
          status: 'ACTIVE',
          houseId: '7',
          category: 'PLUMBING',
          priority: 'HIGH',
          q: 'Іваненко',
          sort: 'dueDate',
          order: 'desc',
        }),
      ),
    ).toEqual({
      status: 'ACTIVE',
      houseId: 7,
      category: 'PLUMBING',
      priority: 'HIGH',
      q: 'Іваненко',
      sort: 'dueDate',
      order: 'desc',
    });
  });

  it('drops hand-edited garbage instead of crashing the screen', () => {
    expect(
      ticketListFiltersFromParams(
        params({
          status: 'NOVA',
          houseId: 'abc',
          category: 'SPACESHIP',
          priority: 'URGENT',
          sort: 'title',
          order: 'up',
        }),
      ),
    ).toEqual(DEFAULT_TICKET_LIST_FILTERS);
  });

  it('due-date sort defaults to ascending when order is absent', () => {
    expect(ticketListFiltersFromParams(params({ sort: 'dueDate' }))).toEqual({
      ...DEFAULT_TICKET_LIST_FILTERS,
      sort: 'dueDate',
      order: 'asc',
    });
  });
});

describe('ticketListFiltersToParams', () => {
  it('keeps defaults out of the URL', () => {
    expect(ticketListFiltersToParams(DEFAULT_TICKET_LIST_FILTERS)).toEqual({});
  });

  it('round-trips a narrowed filter state', () => {
    const filters = {
      status: 'IN_PROGRESS' as const,
      houseId: 7,
      category: 'ELEVATOR' as const,
      priority: 'EMERGENCY' as const,
      q: 'ліфт',
      sort: 'dueDate' as const,
      order: 'asc' as const,
    };
    const wire = ticketListFiltersToParams(filters);
    expect(wire).toEqual({
      status: 'IN_PROGRESS',
      houseId: '7',
      category: 'ELEVATOR',
      priority: 'EMERGENCY',
      q: 'ліфт',
      sort: 'dueDate',
      order: 'asc',
    });
    expect(ticketListFiltersFromParams(params(wire))).toEqual(filters);
  });
});

// Client-side upload pre-check (S-07 design D7): instant Ukrainian feedback,
// the API stays the enforcement point.
describe('attachmentPrecheckError', () => {
  const jpeg = { type: 'image/jpeg', size: 3_000_000 };

  it('passes an accepted image under the limits', () => {
    expect(attachmentPrecheckError(jpeg, 0)).toBeNull();
    expect(
      attachmentPrecheckError({ ...jpeg, type: 'image/webp' }, 9),
    ).toBeNull();
  });

  it('rejects HEIC and other types (Р-13)', () => {
    expect(attachmentPrecheckError({ ...jpeg, type: 'image/heic' }, 0)).toBe(
      'Лише фото JPEG, PNG або WebP',
    );
    expect(
      attachmentPrecheckError({ ...jpeg, type: 'application/pdf' }, 0),
    ).toBe('Лише фото JPEG, PNG або WebP');
  });

  it('rejects an oversize file (FR-ATTACH-01)', () => {
    expect(
      attachmentPrecheckError(
        { ...jpeg, size: ATTACHMENT_MAX_FILE_SIZE + 1 },
        0,
      ),
    ).toBe('Файл завеликий — до 10 МБ');
  });

  it('rejects the 11th photo (FR-ATTACH-01)', () => {
    expect(attachmentPrecheckError(jpeg, 10)).toBe(
      'До заявки можна додати щонайбільше 10 фото',
    );
  });
});
