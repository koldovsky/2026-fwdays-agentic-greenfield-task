import { api, login, uniquePhone } from './auth-helpers';

// S-05 lifecycle + feed contract (FR-STATUS-01…03, FR-FEED-01/02,
// FR-TICKET-03, FR-DUE-01, FR-ACCESS-01): transitions only through the
// dedicated endpoint validated against the PRD §5.1 table, every status and
// tracked-field change lands as a system EVENT in the single append-only
// feed, notes append but never change or vanish.

async function loginUser(): Promise<{ cookie: string; phone: string }> {
  const phone = uniquePhone();
  const { cookie } = await login(phone);
  return { cookie, phone };
}

function authed(cookie: string) {
  return { headers: { Cookie: cookie } };
}

async function createHouse(cookie: string, name = 'Дім'): Promise<number> {
  const res = await api.post('/api/houses', { name }, authed(cookie));
  expect(res.status).toBe(201);
  return res.data.id;
}

async function createTicket(
  cookie: string,
  houseId: number,
  overrides: object = {},
): Promise<number> {
  const res = await api.post(
    '/api/tickets',
    { title: 'Заявка', houseId, category: 'OTHER', ...overrides },
    authed(cookie),
  );
  expect(res.status).toBe(201);
  return res.data.id;
}

async function transition(cookie: string, id: number, to: string) {
  return api.post(`/api/tickets/${id}/transition`, { to }, authed(cookie));
}

async function feedOf(cookie: string, id: number) {
  const res = await api.get(`/api/tickets/${id}/feed`, authed(cookie));
  expect(res.status).toBe(200);
  return res.data as Array<{
    id: number;
    type: 'NOTE' | 'EVENT';
    authorName: string | null;
    text: string | null;
    field: string | null;
    oldValue: string | null;
    newValue: string | null;
    createdAt: string;
  }>;
}

describe('lifecycle guard (NFR-SEC-03)', () => {
  it('refuses the three new endpoints without a session', async () => {
    const anonymous = await Promise.all([
      api.post('/api/tickets/1/transition', { to: 'IN_PROGRESS' }),
      api.get('/api/tickets/1/feed'),
      api.post('/api/tickets/1/notes', { text: 'Запис' }),
    ]);
    for (const res of anonymous) {
      expect(res.status).toBe(401);
      expect(res.data.code).toBe('UNAUTHENTICATED');
    }
  });
});

describe('status lifecycle (FR-STATUS-01/02/03)', () => {
  it('walks Нова → В роботі → Виконана → Закрита with a feed event per step', async () => {
    const { cookie, phone } = await loginUser();
    const houseId = await createHouse(cookie);
    const id = await createTicket(cookie, houseId);

    const steps: Array<[string, string]> = [
      ['NEW', 'IN_PROGRESS'],
      ['IN_PROGRESS', 'DONE'],
      ['DONE', 'CLOSED'],
    ];
    for (const [from, to] of steps) {
      const res = await transition(cookie, id, to);
      expect(res.status).toBe(201);
      expect(res.data.status).toBe(to);

      const events = (await feedOf(cookie, id)).filter(
        (i) => i.field === 'STATUS',
      );
      const last = events[events.length - 1];
      // the event records who, when and from → to (FR-STATUS-03)
      expect(last).toMatchObject({
        type: 'EVENT',
        field: 'STATUS',
        oldValue: from,
        newValue: to,
        authorName: phone,
      });
      expect(last.createdAt).toBeDefined();
    }
    // one event per transition, in chronological order
    const statusEvents = (await feedOf(cookie, id)).filter(
      (i) => i.field === 'STATUS',
    );
    expect(statusEvents.map((e) => e.newValue)).toEqual([
      'IN_PROGRESS',
      'DONE',
      'CLOSED',
    ]);
  });

  it('reopens a done ticket (Виконана → В роботі) with its event', async () => {
    const { cookie } = await loginUser();
    const houseId = await createHouse(cookie);
    const id = await createTicket(cookie, houseId);
    await transition(cookie, id, 'IN_PROGRESS');
    await transition(cookie, id, 'DONE');

    const reopened = await transition(cookie, id, 'IN_PROGRESS');
    expect(reopened.status).toBe(201);
    expect(reopened.data.status).toBe('IN_PROGRESS');

    const events = (await feedOf(cookie, id)).filter(
      (i) => i.field === 'STATUS',
    );
    expect(events[events.length - 1]).toMatchObject({
      oldValue: 'DONE',
      newValue: 'IN_PROGRESS',
    });
  });

  it('rejects forbidden transitions with 409 and no feed growth (FR-STATUS-02)', async () => {
    const { cookie } = await loginUser();
    const houseId = await createHouse(cookie);

    // skip from NEW
    const fresh = await createTicket(cookie, houseId);
    const skipped = await transition(cookie, fresh, 'DONE');
    expect(skipped.status).toBe(409);
    expect(skipped.data.code).toBe('TICKET_TRANSITION_FORBIDDEN');

    // terminal escape from CLOSED
    const closed = await createTicket(cookie, houseId);
    await transition(cookie, closed, 'IN_PROGRESS');
    await transition(cookie, closed, 'DONE');
    await transition(cookie, closed, 'CLOSED');
    const before = (await feedOf(cookie, closed)).length;

    const escape = await transition(cookie, closed, 'IN_PROGRESS');
    expect(escape.status).toBe(409);
    expect(escape.data.code).toBe('TICKET_TRANSITION_FORBIDDEN');

    const card = await api.get(`/api/tickets/${closed}`, authed(cookie));
    expect(card.data.status).toBe('CLOSED'); // unchanged
    expect((await feedOf(cookie, closed)).length).toBe(before); // no new event
  });

  it('rejects a value outside the 5 statuses with 400', async () => {
    const { cookie } = await loginUser();
    const houseId = await createHouse(cookie);
    const id = await createTicket(cookie, houseId);

    const res = await transition(cookie, id, 'ARCHIVED');
    expect(res.status).toBe(400);
    expect(res.data.code).toBe('TICKET_STATUS_INVALID');
  });

  it('serves allowedTransitions from the card payload per §5.1', async () => {
    const { cookie } = await loginUser();
    const houseId = await createHouse(cookie);
    const id = await createTicket(cookie, houseId);

    const fresh = await api.get(`/api/tickets/${id}`, authed(cookie));
    expect(fresh.data.allowedTransitions).toEqual(['IN_PROGRESS', 'REJECTED']);

    await transition(cookie, id, 'REJECTED');
    const terminal = await api.get(`/api/tickets/${id}`, authed(cookie));
    expect(terminal.data.allowedTransitions).toEqual([]); // terminal
  });
});

describe('field-change events (FR-TICKET-03, FR-DUE-01)', () => {
  it('records executor and due-date changes with old → new values, then the clear', async () => {
    const { cookie } = await loginUser();
    const houseId = await createHouse(cookie);
    const id = await createTicket(cookie, houseId);

    const patched = await api.patch(
      `/api/tickets/${id}`,
      { executor: 'Майстер Петро', dueDate: '2026-07-20' },
      authed(cookie),
    );
    expect(patched.status).toBe(200);

    let events = (await feedOf(cookie, id)).filter((i) => i.type === 'EVENT');
    expect(events).toHaveLength(2);
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'EXECUTOR',
          oldValue: null,
          newValue: 'Майстер Петро',
        }),
        expect.objectContaining({
          field: 'DUE_DATE',
          oldValue: null,
          newValue: '2026-07-20',
        }),
      ]),
    );

    await api.patch(`/api/tickets/${id}`, { dueDate: null }, authed(cookie));
    events = (await feedOf(cookie, id)).filter((i) => i.field === 'DUE_DATE');
    expect(events[events.length - 1]).toMatchObject({
      oldValue: '2026-07-20',
      newValue: null, // cleared (FR-DUE-01)
    });
  });

  it('snapshots house names on a house change', async () => {
    const { cookie } = await loginUser();
    const oldHouse = await createHouse(cookie, 'вул. Шевченка, 12');
    const newHouse = await createHouse(cookie, 'вул. Франка, 3');
    const id = await createTicket(cookie, oldHouse);

    await api.patch(
      `/api/tickets/${id}`,
      { houseId: newHouse },
      authed(cookie),
    );
    const events = (await feedOf(cookie, id)).filter(
      (i) => i.field === 'HOUSE',
    );
    expect(events).toEqual([
      expect.objectContaining({
        oldValue: 'вул. Шевченка, 12',
        newValue: 'вул. Франка, 3',
      }),
    ]);
  });

  it('keeps the status on attribute changes and skips no-op updates (PRD §5.1)', async () => {
    const { cookie } = await loginUser();
    const houseId = await createHouse(cookie);
    const id = await createTicket(cookie, houseId, { priority: 'HIGH' });
    await transition(cookie, id, 'IN_PROGRESS');
    const before = (await feedOf(cookie, id)).length;

    // same-value write + untracked fields only → no events
    const noop = await api.patch(
      `/api/tickets/${id}`,
      { priority: 'HIGH', title: 'Оновлена назва', description: 'Опис' },
      authed(cookie),
    );
    expect(noop.status).toBe(200);
    expect((await feedOf(cookie, id)).length).toBe(before);

    // a real category change adds exactly one event and keeps the status
    const changed = await api.patch(
      `/api/tickets/${id}`,
      { category: 'ELEVATOR' },
      authed(cookie),
    );
    expect(changed.status).toBe(200);
    expect(changed.data.status).toBe('IN_PROGRESS');
    const after = await feedOf(cookie, id);
    expect(after.length).toBe(before + 1);
    expect(after[after.length - 1]).toMatchObject({
      field: 'CATEGORY',
      oldValue: 'OTHER',
      newValue: 'ELEVATOR',
    });
  });
});

describe('notes and the append-only feed (FR-FEED-01/02)', () => {
  it('appends a note with author and date-time and keeps chronology', async () => {
    const { cookie, phone } = await loginUser();
    const houseId = await createHouse(cookie);
    const id = await createTicket(cookie, houseId);
    await transition(cookie, id, 'IN_PROGRESS');

    const note = await api.post(
      `/api/tickets/${id}/notes`,
      { text: '  Дзвонив майстру  ' },
      authed(cookie),
    );
    expect(note.status).toBe(201);
    expect(note.data).toMatchObject({
      type: 'NOTE',
      text: 'Дзвонив майстру', // trimmed
      authorName: phone,
    });

    // one feed, chronological: STATUS event first, then the note
    const feed = await feedOf(cookie, id);
    expect(feed.map((i) => i.type)).toEqual(['EVENT', 'NOTE']);
  });

  it('rejects empty or whitespace-only notes with 400', async () => {
    const { cookie } = await loginUser();
    const houseId = await createHouse(cookie);
    const id = await createTicket(cookie, houseId);

    for (const text of ['', '   ', undefined]) {
      const res = await api.post(
        `/api/tickets/${id}/notes`,
        { text },
        authed(cookie),
      );
      expect(res.status).toBe(400);
      expect(res.data.code).toBe('TICKET_NOTE_INVALID');
    }
    expect(await feedOf(cookie, id)).toHaveLength(0);
  });

  it('exposes no update or delete routes for feed items (append-only)', async () => {
    const { cookie } = await loginUser();
    const houseId = await createHouse(cookie);
    const id = await createTicket(cookie, houseId);
    await api.post(
      `/api/tickets/${id}/notes`,
      { text: 'Запис' },
      authed(cookie),
    );
    const [item] = await feedOf(cookie, id);

    const attempts = await Promise.all([
      api.patch(
        `/api/tickets/${id}/feed/${item.id}`,
        { text: 'Змінений' },
        authed(cookie),
      ),
      api.delete(`/api/tickets/${id}/feed/${item.id}`, authed(cookie)),
      api.patch(
        `/api/tickets/${id}/notes/${item.id}`,
        { text: 'Змінений' },
        authed(cookie),
      ),
      api.delete(`/api/tickets/${id}/notes/${item.id}`, authed(cookie)),
    ]);
    for (const res of attempts) {
      expect([404, 405]).toContain(res.status);
    }
    // the item survived, unchanged
    const feed = await feedOf(cookie, id);
    expect(feed).toHaveLength(1);
    expect(feed[0].text).toBe('Запис');
  });
});

describe('owner isolation for the new endpoints (FR-ACCESS-01)', () => {
  it('answers a foreign ticket exactly like a missing one for all three', async () => {
    const userA = await loginUser();
    const userB = await loginUser();
    const houseId = await createHouse(userA.cookie);
    const id = await createTicket(userA.cookie, houseId);

    const foreign = await Promise.all([
      transition(userB.cookie, id, 'IN_PROGRESS'),
      api.get(`/api/tickets/${id}/feed`, authed(userB.cookie)),
      api.post(
        `/api/tickets/${id}/notes`,
        { text: 'Чужий' },
        authed(userB.cookie),
      ),
    ]);
    const missing = await Promise.all([
      transition(userB.cookie, 999999999, 'IN_PROGRESS'),
      api.get('/api/tickets/999999999/feed', authed(userB.cookie)),
      api.post(
        '/api/tickets/999999999/notes',
        { text: 'Чужий' },
        authed(userB.cookie),
      ),
    ]);
    for (let i = 0; i < foreign.length; i++) {
      expect(foreign[i].status).toBe(404);
      expect(missing[i].status).toBe(404);
      // identical bodies: nothing distinguishes "not yours" from "not found"
      expect(foreign[i].data).toEqual(missing[i].data);
    }

    // the owner's ticket survived: status NEW, feed empty
    const intact = await api.get(`/api/tickets/${id}`, authed(userA.cookie));
    expect(intact.data.status).toBe('NEW');
    expect(await feedOf(userA.cookie, id)).toHaveLength(0);
  });
});
