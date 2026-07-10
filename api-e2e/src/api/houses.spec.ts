import { api, login, uniquePhone } from './auth-helpers';

// S-03 house-directory contract (FR-HOUSE-01/02, FR-ACCESS-01, NFR-SEC-03):
// owner-scoped CRUD; a foreign and a missing house are indistinguishable
// 404s. Two independent users are created per isolation test.

async function loginUser(): Promise<{ cookie: string }> {
  return login(uniquePhone());
}

function authed(cookie: string) {
  return { headers: { Cookie: cookie } };
}

describe('houses guard (NFR-SEC-03)', () => {
  it('refuses every houses endpoint without a session', async () => {
    const anonymous = await Promise.all([
      api.get('/api/houses'),
      api.post('/api/houses', { name: 'Дім' }),
      api.get('/api/houses/1'),
      api.patch('/api/houses/1', { name: 'Дім' }),
      api.delete('/api/houses/1'),
    ]);
    for (const res of anonymous) {
      expect(res.status).toBe(401);
      expect(res.data.code).toBe('UNAUTHENTICATED');
    }
  });
});

describe('houses CRUD (FR-HOUSE-01)', () => {
  it('creates, reads, updates and deletes a house', async () => {
    const { cookie } = await loginUser();

    const created = await api.post(
      '/api/houses',
      { name: '  вул. Шевченка, 12  ', note: '  під’їзд 3  ' },
      authed(cookie),
    );
    expect(created.status).toBe(201);
    expect(created.data).toMatchObject({
      name: 'вул. Шевченка, 12', // trimmed
      note: 'під’їзд 3',
    });
    const id = created.data.id;
    expect(typeof id).toBe('number');

    const list = await api.get('/api/houses', authed(cookie));
    expect(list.status).toBe(200);
    expect(list.data).toHaveLength(1);
    expect(list.data[0].id).toBe(id);

    const patched = await api.patch(
      `/api/houses/${id}`,
      { note: 'оновлена примітка' },
      authed(cookie),
    );
    expect(patched.status).toBe(200);
    expect(patched.data).toMatchObject({
      id,
      name: 'вул. Шевченка, 12', // untouched by the partial update
      note: 'оновлена примітка',
    });

    const deleted = await api.delete(`/api/houses/${id}`, authed(cookie));
    expect(deleted.status).toBe(200);
    const after = await api.get('/api/houses', authed(cookie));
    expect(after.data).toHaveLength(0);
  });

  it('lists houses newest first', async () => {
    const { cookie } = await loginUser();
    const first = await api.post(
      '/api/houses',
      { name: 'Перший' },
      authed(cookie),
    );
    const second = await api.post(
      '/api/houses',
      { name: 'Другий' },
      authed(cookie),
    );
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    const list = await api.get('/api/houses', authed(cookie));
    expect(list.data.map((h: { name: string }) => h.name)).toEqual([
      'Другий',
      'Перший',
    ]);
  });

  it('validates name and note server-side', async () => {
    const { cookie } = await loginUser();

    const noName = await api.post('/api/houses', { note: 'x' }, authed(cookie));
    expect(noName.status).toBe(400);
    expect(noName.data.code).toBe('HOUSE_NAME_INVALID');

    const blankName = await api.post(
      '/api/houses',
      { name: '   ' },
      authed(cookie),
    );
    expect(blankName.status).toBe(400);
    expect(blankName.data.code).toBe('HOUSE_NAME_INVALID');

    const longNote = await api.post(
      '/api/houses',
      { name: 'Дім', note: 'x'.repeat(1001) },
      authed(cookie),
    );
    expect(longNote.status).toBe(400);
    expect(longNote.data.code).toBe('HOUSE_NOTE_INVALID');

    const created = await api.post(
      '/api/houses',
      { name: 'Дім' },
      authed(cookie),
    );
    expect(created.status).toBe(201);
    const emptied = await api.patch(
      `/api/houses/${created.data.id}`,
      { name: '' },
      authed(cookie),
    );
    expect(emptied.status).toBe(400);
    expect(emptied.data.code).toBe('HOUSE_NAME_INVALID');
  });
});

describe('owner isolation (FR-ACCESS-01, NFR-SEC-03)', () => {
  it('answers a foreign house exactly like a missing one for GET/PATCH/DELETE', async () => {
    const userA = await loginUser();
    const userB = await loginUser();
    const created = await api.post(
      '/api/houses',
      { name: 'Будинок А', note: 'секрет' },
      authed(userA.cookie),
    );
    const id = created.data.id;

    const foreignGet = await api.get(`/api/houses/${id}`, authed(userB.cookie));
    const missingGet = await api.get(
      '/api/houses/999999999',
      authed(userB.cookie),
    );
    for (const res of [foreignGet, missingGet]) {
      expect(res.status).toBe(404);
      expect(res.data.code).toBe('HOUSE_NOT_FOUND');
    }
    // identical bodies: nothing distinguishes "not yours" from "not found"
    expect(foreignGet.data).toEqual(missingGet.data);

    const foreignPatch = await api.patch(
      `/api/houses/${id}`,
      { name: 'Захоплений' },
      authed(userB.cookie),
    );
    expect(foreignPatch.status).toBe(404);
    expect(foreignPatch.data).toEqual(missingGet.data);

    const foreignDelete = await api.delete(
      `/api/houses/${id}`,
      authed(userB.cookie),
    );
    expect(foreignDelete.status).toBe(404);
    expect(foreignDelete.data).toEqual(missingGet.data);

    // the owner's house survived the foreign write attempts untouched
    const intact = await api.get(`/api/houses/${id}`, authed(userA.cookie));
    expect(intact.status).toBe(200);
    expect(intact.data).toMatchObject({ name: 'Будинок А', note: 'секрет' });
  });

  it('keeps lists strictly per owner', async () => {
    const userA = await loginUser();
    const userB = await loginUser();
    await api.post('/api/houses', { name: 'Тільки А' }, authed(userA.cookie));

    const listB = await api.get('/api/houses', authed(userB.cookie));
    expect(listB.status).toBe(200);
    expect(listB.data).toEqual([]);
  });

  it('treats a non-numeric id as the same 404', async () => {
    const { cookie } = await loginUser();
    const res = await api.get('/api/houses/abc', authed(cookie));
    expect(res.status).toBe(404);
    expect(res.data.code).toBe('HOUSE_NOT_FOUND');
  });
});
