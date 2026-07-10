import { api, login, uniquePhone } from './auth-helpers';

// S-06 ticket-list contract (FR-LIST-01…04, FR-DUE-02, FR-ACCESS-01):
// owner-scoped GET /api/tickets with AND-combined filters (ACTIVE preset),
// LIKE search, sorting, pagination and the server-computed overdue flag.

function authed(cookie: string) {
  return { headers: { Cookie: cookie } };
}

async function createHouse(cookie: string, name: string): Promise<number> {
  const res = await api.post('/api/houses', { name }, authed(cookie));
  expect(res.status).toBe(201);
  return res.data.id;
}

async function createTicket(
  cookie: string,
  body: Record<string, unknown>,
): Promise<number> {
  const res = await api.post('/api/tickets', body, authed(cookie));
  expect(res.status).toBe(201);
  return res.data.id;
}

async function transition(cookie: string, id: number, to: string) {
  const res = await api.post(
    `/api/tickets/${id}/transition`,
    { to },
    authed(cookie),
  );
  expect(res.status).toBe(201);
}

function list(cookie: string, query = '') {
  return api.get(`/api/tickets${query}`, authed(cookie));
}

// now-24h is in the past in every timezone the suite may run in
const YESTERDAY = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

describe('ticket list (FR-LIST-01…04, FR-DUE-02)', () => {
  let cookie: string;
  let houseA: number;
  let houseB: number;
  // fixture per the acceptance scenarios: A = leaky tap (NEW, requester
  // Іваненко) + elevator (IN_PROGRESS, overdue); B = door (CLOSED with the
  // same past due date — the not-overdue twin) + lamp (NEW, executor Іваненко)
  let tap: number;
  let elevator: number;
  let door: number;
  let lamp: number;

  beforeAll(async () => {
    cookie = (await login(uniquePhone())).cookie;
    houseA = await createHouse(cookie, 'вул. Шевченка, 12');
    houseB = await createHouse(cookie, 'просп. Свободи, 3');
    tap = await createTicket(cookie, {
      title: 'Тече кран',
      houseId: houseA,
      category: 'PLUMBING',
      requesterName: 'Іван Іваненко',
    });
    elevator = await createTicket(cookie, {
      title: 'Ліфт зламався',
      houseId: houseA,
      category: 'ELEVATOR',
      priority: 'EMERGENCY',
      dueDate: YESTERDAY,
    });
    await transition(cookie, elevator, 'IN_PROGRESS');
    door = await createTicket(cookie, {
      title: 'Рипить двері підʼїзду',
      houseId: houseB,
      category: 'COMMON_AREAS',
      dueDate: YESTERDAY,
    });
    await transition(cookie, door, 'IN_PROGRESS');
    await transition(cookie, door, 'DONE');
    await transition(cookie, door, 'CLOSED');
    lamp = await createTicket(cookie, {
      title: 'Лампа в підвалі',
      houseId: houseB,
      category: 'ELECTRICITY',
      executor: 'Петро Іваненко',
    });
  });

  it('refuses the list without a session', async () => {
    const res = await api.get('/api/tickets');
    expect(res.status).toBe(401);
    expect(res.data.code).toBe('UNAUTHENTICATED');
  });

  it('answers newest first with the FR-LIST-01 columns and totals', async () => {
    const res = await list(cookie);
    expect(res.status).toBe(200);
    expect(res.data.total).toBe(4);
    expect(res.data.page).toBe(1);
    expect(res.data.items.map((item: { id: number }) => item.id)).toEqual([
      lamp,
      door,
      elevator,
      tap,
    ]);
    expect(res.data.items[3]).toEqual({
      id: tap,
      title: 'Тече кран',
      houseName: 'вул. Шевченка, 12',
      category: 'PLUMBING',
      priority: 'NORMAL',
      status: 'NEW',
      dueDate: null,
      isOverdue: false,
      createdAt: expect.any(String),
    });
  });

  it('combines the ACTIVE preset with a house filter (FR-LIST-02)', async () => {
    const res = await list(cookie, `?status=ACTIVE&houseId=${houseB}`);
    expect(res.status).toBe(200);
    // house B holds a CLOSED door and an active lamp — only the lamp passes
    expect(res.data.items.map((item: { id: number }) => item.id)).toEqual([
      lamp,
    ]);
    expect(res.data.total).toBe(1);
  });

  it('finds tickets by the requester surname across fields, case-insensitively (FR-LIST-03)', async () => {
    const res = await list(cookie, '?q=іваненко');
    expect(res.status).toBe(200);
    // the surname appears as requester on the tap and executor on the lamp
    expect(
      res.data.items.map((item: { id: number }) => item.id).sort(),
    ).toEqual([tap, lamp].sort());
  });

  it('flags the overdue active ticket and not its closed twin (FR-DUE-02)', async () => {
    const res = await list(cookie);
    const byId = new Map(
      res.data.items.map((item: { id: number; isOverdue: boolean }) => [
        item.id,
        item.isOverdue,
      ]),
    );
    expect(byId.get(elevator)).toBe(true); // В роботі, term yesterday
    expect(byId.get(door)).toBe(false); // Закрита, same term
    expect(byId.get(tap)).toBe(false); // no due date

    const card = await api.get(`/api/tickets/${elevator}`, authed(cookie));
    expect(card.data.isOverdue).toBe(true); // the card carries the same flag
  });

  it('sorts by due date with undated tickets last (FR-LIST-04)', async () => {
    const res = await list(cookie, '?sort=dueDate');
    // dated first (same date → id desc), then undated by id desc
    expect(res.data.items.map((item: { id: number }) => item.id)).toEqual([
      door,
      elevator,
      lamp,
      tap,
    ]);
  });

  it('slices pages without repeats or gaps (FR-LIST-04)', async () => {
    const first = await list(cookie, '?pageSize=3');
    const second = await list(cookie, '?pageSize=3&page=2');
    expect(first.data.items).toHaveLength(3);
    expect(second.data.items).toHaveLength(1);
    expect(first.data.total).toBe(4);
    expect(second.data.total).toBe(4);
    const ids = [...first.data.items, ...second.data.items].map(
      (item: { id: number }) => item.id,
    );
    expect(new Set(ids).size).toBe(4);
  });

  it('never shows another user their tickets (FR-ACCESS-01)', async () => {
    const stranger = await login(uniquePhone());
    const own = await list(stranger.cookie);
    expect(own.status).toBe(200);
    expect(own.data.total).toBe(0);
    expect(own.data.items).toEqual([]);
  });

  it.each(['?status=BOGUS', '?category=SPACESHIP', '?pageSize=101', '?page=0'])(
    'rejects the malformed query %s with 400 TICKET_QUERY_INVALID',
    async (query) => {
      const res = await list(cookie, query);
      expect(res.status).toBe(400);
      expect(res.data.code).toBe('TICKET_QUERY_INVALID');
    },
  );

  it('treats LIKE wildcards in the search as literal text (review S-06)', async () => {
    // own user so the fixture totals above stay untouched
    const { cookie: freshCookie } = await login(uniquePhone());
    const houseId = await createHouse(freshCookie, 'вул. Знижкова, 1');
    const literal = await createTicket(freshCookie, {
      title: 'Знижка 10% на послуги',
      houseId,
      category: 'OTHER',
    });
    await createTicket(freshCookie, {
      title: 'Знижка 105 грн', // would match 10% as a wildcard, not literally
      houseId,
      category: 'OTHER',
    });
    const res = await list(freshCookie, `?q=${encodeURIComponent('10%')}`);
    expect(res.status).toBe(200);
    expect(res.data.items.map((item: { id: number }) => item.id)).toEqual([
      literal,
    ]);
  });
});
