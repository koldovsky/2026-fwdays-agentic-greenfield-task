import { api, login, uniquePhone } from './auth-helpers';

// S-04 ticket-crud contract (FR-TICKET-01/02/04, FR-ACCESS-01, NFR-SEC-03):
// owner-scoped create/get/update, no delete; a foreign and a missing ticket
// (or referenced house) are indistinguishable 404s; FR-HOUSE-02 becomes
// observable here — a house with a ticket refuses deletion.

async function loginUser(): Promise<{ cookie: string }> {
  return login(uniquePhone());
}

function authed(cookie: string) {
  return { headers: { Cookie: cookie } };
}

async function createHouse(cookie: string, name = 'Дім'): Promise<number> {
  const res = await api.post('/api/houses', { name }, authed(cookie));
  expect(res.status).toBe(201);
  return res.data.id;
}

describe('tickets guard (NFR-SEC-03)', () => {
  it('refuses every tickets endpoint without a session', async () => {
    const anonymous = await Promise.all([
      api.post('/api/tickets', { title: 'Т' }),
      api.get('/api/tickets/1'),
      api.patch('/api/tickets/1', { title: 'Т' }),
    ]);
    for (const res of anonymous) {
      expect(res.status).toBe(401);
      expect(res.data.code).toBe('UNAUTHENTICATED');
    }
  });
});

describe('ticket creation (FR-TICKET-01/02, FR-STATUS-01)', () => {
  it('creates a full ticket and reads it back with the house name', async () => {
    const { cookie } = await loginUser();
    const houseId = await createHouse(cookie, 'вул. Шевченка, 12');

    const created = await api.post(
      '/api/tickets',
      {
        title: '  Тече кран  ',
        description: 'На кухні, з учора',
        houseId,
        category: 'PLUMBING',
        priority: 'HIGH',
        requesterName: 'Іван Петренко',
        requesterPhone: '+380671112233',
        executor: 'Майстер Петро',
        dueDate: '2026-07-15',
      },
      authed(cookie),
    );
    expect(created.status).toBe(201);
    expect(created.data).toMatchObject({
      title: 'Тече кран', // trimmed
      description: 'На кухні, з учора',
      houseId,
      houseName: 'вул. Шевченка, 12',
      category: 'PLUMBING',
      priority: 'HIGH',
      status: 'NEW',
      requesterName: 'Іван Петренко',
      requesterPhone: '+380671112233',
      executor: 'Майстер Петро',
      dueDate: '2026-07-15',
    });
    expect(typeof created.data.id).toBe('number');
    expect(created.data.createdAt).toBeDefined();

    const read = await api.get(
      `/api/tickets/${created.data.id}`,
      authed(cookie),
    );
    expect(read.status).toBe(200);
    expect(read.data).toEqual(created.data);
  });

  it('applies defaults (Звичайна, Нова) and sequential numbers #N', async () => {
    const { cookie } = await loginUser();
    const houseId = await createHouse(cookie);

    const minimal = { title: 'Перша', houseId, category: 'OTHER' };
    const first = await api.post('/api/tickets', minimal, authed(cookie));
    expect(first.status).toBe(201);
    expect(first.data).toMatchObject({
      priority: 'NORMAL',
      status: 'NEW',
      description: null,
      requesterName: null,
      executor: null,
      dueDate: null,
    });

    const second = await api.post(
      '/api/tickets',
      { ...minimal, title: 'Друга' },
      authed(cookie),
    );
    // #N is the global auto-increment id: strictly growing
    expect(second.data.id).toBeGreaterThan(first.data.id);
  });

  it('validates required fields and shapes server-side', async () => {
    const { cookie } = await loginUser();
    const houseId = await createHouse(cookie);
    const valid = { title: 'Т', houseId, category: 'OTHER' };

    const cases: Array<[object, number, string]> = [
      [{ ...valid, title: '   ' }, 400, 'TICKET_TITLE_INVALID'],
      [{ houseId, category: 'OTHER' }, 400, 'TICKET_TITLE_INVALID'],
      [{ ...valid, category: 'НЕВІДОМА' }, 400, 'TICKET_CATEGORY_INVALID'],
      [{ title: 'Т', houseId }, 400, 'TICKET_CATEGORY_INVALID'],
      [{ title: 'Т', category: 'OTHER' }, 400, 'TICKET_HOUSE_INVALID'],
      [{ ...valid, priority: 'URGENT' }, 400, 'TICKET_PRIORITY_INVALID'],
      [{ ...valid, dueDate: '15.07.2026' }, 400, 'TICKET_DUE_DATE_INVALID'],
      [{ ...valid, dueDate: '2026-02-31' }, 400, 'TICKET_DUE_DATE_INVALID'],
    ];
    for (const [body, status, code] of cases) {
      const res = await api.post('/api/tickets', body, authed(cookie));
      expect(res.status).toBe(status);
      expect(res.data.code).toBe(code);
    }
  });

  it('never accepts a client-supplied status (transitions have their own endpoint)', async () => {
    const { cookie } = await loginUser();
    const houseId = await createHouse(cookie);

    const created = await api.post(
      '/api/tickets',
      { title: 'Т', houseId, category: 'OTHER', status: 'CLOSED' },
      authed(cookie),
    );
    expect(created.status).toBe(201);
    expect(created.data.status).toBe('NEW');

    const patched = await api.patch(
      `/api/tickets/${created.data.id}`,
      { status: 'CLOSED', title: 'Оновлена' },
      authed(cookie),
    );
    expect(patched.status).toBe(200);
    expect(patched.data).toMatchObject({ status: 'NEW', title: 'Оновлена' });

    // a status-only patch is an effective no-op, not a 404 (smoke finding)
    const statusOnly = await api.patch(
      `/api/tickets/${created.data.id}`,
      { status: 'CLOSED' },
      authed(cookie),
    );
    expect(statusOnly.status).toBe(200);
    expect(statusOnly.data).toMatchObject({ status: 'NEW', title: 'Оновлена' });
  });
});

describe('ticket editing (FR-TICKET-01, FR-DUE-01)', () => {
  it('updates executor and due date, then clears the due date', async () => {
    const { cookie } = await loginUser();
    const houseId = await createHouse(cookie);
    const created = await api.post(
      '/api/tickets',
      { title: 'Т', houseId, category: 'ELEVATOR' },
      authed(cookie),
    );
    const id = created.data.id;

    const patched = await api.patch(
      `/api/tickets/${id}`,
      { executor: ' Майстер Петро ', dueDate: '2026-07-20' },
      authed(cookie),
    );
    expect(patched.status).toBe(200);
    expect(patched.data).toMatchObject({
      executor: 'Майстер Петро', // trimmed
      dueDate: '2026-07-20', // round-trips unchanged (design D5)
      title: 'Т', // untouched by the partial update
      category: 'ELEVATOR',
    });

    const cleared = await api.patch(
      `/api/tickets/${id}`,
      { dueDate: null },
      authed(cookie),
    );
    expect(cleared.status).toBe(200);
    expect(cleared.data.dueDate).toBeNull();
    expect(cleared.data.executor).toBe('Майстер Петро');
  });

  it('re-checks house ownership when houseId changes', async () => {
    const userA = await loginUser();
    const userB = await loginUser();
    const houseA = await createHouse(userA.cookie);
    const houseB = await createHouse(userB.cookie);
    const created = await api.post(
      '/api/tickets',
      { title: 'Т', houseId: houseA, category: 'OTHER' },
      authed(userA.cookie),
    );

    const res = await api.patch(
      `/api/tickets/${created.data.id}`,
      { houseId: houseB },
      authed(userA.cookie),
    );
    expect(res.status).toBe(404);
    expect(res.data.code).toBe('TICKET_HOUSE_NOT_FOUND');
  });
});

describe('no ticket deletion (FR-TICKET-04)', () => {
  it('does not expose DELETE /api/tickets/:id', async () => {
    const { cookie } = await loginUser();
    const houseId = await createHouse(cookie);
    const created = await api.post(
      '/api/tickets',
      { title: 'Т', houseId, category: 'OTHER' },
      authed(cookie),
    );

    const res = await api.delete(
      `/api/tickets/${created.data.id}`,
      authed(cookie),
    );
    expect([404, 405]).toContain(res.status);

    const survived = await api.get(
      `/api/tickets/${created.data.id}`,
      authed(cookie),
    );
    expect(survived.status).toBe(200);
  });
});

describe('owner isolation (FR-ACCESS-01, NFR-SEC-03)', () => {
  it('answers a foreign ticket exactly like a missing one for GET/PATCH', async () => {
    const userA = await loginUser();
    const userB = await loginUser();
    const houseId = await createHouse(userA.cookie);
    const created = await api.post(
      '/api/tickets',
      { title: 'Секретна', houseId, category: 'OTHER' },
      authed(userA.cookie),
    );
    const id = created.data.id;

    const foreignGet = await api.get(
      `/api/tickets/${id}`,
      authed(userB.cookie),
    );
    const missingGet = await api.get(
      '/api/tickets/999999999',
      authed(userB.cookie),
    );
    for (const res of [foreignGet, missingGet]) {
      expect(res.status).toBe(404);
      expect(res.data.code).toBe('TICKET_NOT_FOUND');
    }
    // identical bodies: nothing distinguishes "not yours" from "not found"
    expect(foreignGet.data).toEqual(missingGet.data);

    const foreignPatch = await api.patch(
      `/api/tickets/${id}`,
      { title: 'Захоплена' },
      authed(userB.cookie),
    );
    expect(foreignPatch.status).toBe(404);
    expect(foreignPatch.data).toEqual(missingGet.data);

    // the owner's ticket survived the foreign write attempt untouched
    const intact = await api.get(`/api/tickets/${id}`, authed(userA.cookie));
    expect(intact.status).toBe(200);
    expect(intact.data.title).toBe('Секретна');
  });

  it('answers a foreign house on create exactly like a missing one', async () => {
    const userA = await loginUser();
    const userB = await loginUser();
    const houseA = await createHouse(userA.cookie);

    const foreign = await api.post(
      '/api/tickets',
      { title: 'Т', houseId: houseA, category: 'OTHER' },
      authed(userB.cookie),
    );
    const missing = await api.post(
      '/api/tickets',
      { title: 'Т', houseId: 999999999, category: 'OTHER' },
      authed(userB.cookie),
    );
    for (const res of [foreign, missing]) {
      expect(res.status).toBe(404);
      expect(res.data.code).toBe('TICKET_HOUSE_NOT_FOUND');
    }
    expect(foreign.data).toEqual(missing.data);
  });

  it('treats a non-numeric ticket id as the same 404', async () => {
    const { cookie } = await loginUser();
    const res = await api.get('/api/tickets/abc', authed(cookie));
    expect(res.status).toBe(404);
    expect(res.data.code).toBe('TICKET_NOT_FOUND');
  });
});

describe('house deletion with tickets (FR-HOUSE-02)', () => {
  it('refuses deleting a house with a ticket and allows it once none reference it', async () => {
    const { cookie } = await loginUser();
    const withTicket = await createHouse(cookie, 'З заявкою');
    const withoutTicket = await createHouse(cookie, 'Без заявок');
    await api.post(
      '/api/tickets',
      { title: 'Т', houseId: withTicket, category: 'OTHER' },
      authed(cookie),
    );

    const refused = await api.delete(
      `/api/houses/${withTicket}`,
      authed(cookie),
    );
    expect(refused.status).toBe(409);
    expect(refused.data.code).toBe('HOUSE_HAS_TICKETS');

    // the house survived
    const intact = await api.get(`/api/houses/${withTicket}`, authed(cookie));
    expect(intact.status).toBe(200);

    // a house without tickets still deletes fine
    const deleted = await api.delete(
      `/api/houses/${withoutTicket}`,
      authed(cookie),
    );
    expect(deleted.status).toBe(200);
  });
});
