import { api, login, uniquePhone } from './auth-helpers';

// S-07 attachments contract (FR-ATTACH-01…03, FR-FEED-02, FR-ACCESS-01,
// Р-13): only JPEG/PNG/WebP up to 10 MB and 10 per ticket, validated
// against the payload bytes; binaries served only through the API with
// owner checks; add/delete land as ATTACHMENT system events.

const JPEG_BYTES = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  Buffer.from('jpeg payload'),
]);
const PNG_BYTES = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.from('png payload'),
]);
const PDF_BYTES = Buffer.from('%PDF-1.7 fake');
const HEIC_BYTES = Buffer.concat([
  Buffer.from([0x00, 0x00, 0x00, 0x18]),
  Buffer.from('ftypheic'),
]);

async function loginUser(): Promise<{ cookie: string }> {
  const { cookie } = await login(uniquePhone());
  return { cookie };
}

function authed(cookie: string) {
  return { headers: { Cookie: cookie } };
}

async function createTicket(cookie: string): Promise<number> {
  const houseRes = await api.post(
    '/api/houses',
    { name: 'Дім' },
    authed(cookie),
  );
  expect(houseRes.status).toBe(201);
  const res = await api.post(
    '/api/tickets',
    { title: 'Заявка з фото', houseId: houseRes.data.id, category: 'OTHER' },
    authed(cookie),
  );
  expect(res.status).toBe(201);
  return res.data.id;
}

function photoForm(bytes: Buffer, type: string, name: string): FormData {
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(bytes)], { type }), name);
  return form;
}

async function upload(
  cookie: string,
  ticketId: number,
  bytes: Buffer = JPEG_BYTES,
  type = 'image/jpeg',
  name = 'фото кухні.jpg',
) {
  return api.post(
    `/api/tickets/${ticketId}/attachments`,
    photoForm(bytes, type, name),
    authed(cookie),
  );
}

async function attachmentEvents(cookie: string, ticketId: number) {
  const res = await api.get(`/api/tickets/${ticketId}/feed`, authed(cookie));
  expect(res.status).toBe(200);
  return (
    res.data as Array<{
      type: string;
      field: string | null;
      oldValue: string | null;
      newValue: string | null;
    }>
  ).filter((item) => item.field === 'ATTACHMENT');
}

describe('attachments guard (NFR-SEC-03)', () => {
  it('refuses all four endpoints without a session', async () => {
    const anonymous = await Promise.all([
      api.post(
        '/api/tickets/1/attachments',
        photoForm(JPEG_BYTES, 'image/jpeg', 'a.jpg'),
      ),
      api.get('/api/tickets/1/attachments'),
      api.get('/api/tickets/1/attachments/1'),
      api.delete('/api/tickets/1/attachments/1'),
    ]);
    for (const res of anonymous) {
      expect(res.status).toBe(401);
      expect(res.data.code).toBe('UNAUTHENTICATED');
    }
  });
});

describe('upload and viewing (FR-ATTACH-01/02/03)', () => {
  it('uploads a JPEG, lists it, serves the original bytes back and logs the feed event', async () => {
    const { cookie } = await loginUser();
    const ticketId = await createTicket(cookie);

    const uploaded = await upload(cookie, ticketId);
    expect(uploaded.status).toBe(201);
    expect(uploaded.data).toMatchObject({
      fileName: 'фото кухні.jpg',
      mimeType: 'image/jpeg',
      size: JPEG_BYTES.length,
    });
    // the generated on-disk name never leaves the API (design D2)
    expect(uploaded.data.storedName).toBeUndefined();

    const list = await api.get(
      `/api/tickets/${ticketId}/attachments`,
      authed(cookie),
    );
    expect(list.status).toBe(200);
    expect(list.data).toHaveLength(1);
    expect(list.data[0].fileName).toBe('фото кухні.jpg');

    const binary = await api.get(
      `/api/tickets/${ticketId}/attachments/${uploaded.data.id}`,
      { ...authed(cookie), responseType: 'arraybuffer' },
    );
    expect(binary.status).toBe(200);
    expect(binary.headers['content-type']).toContain('image/jpeg');
    expect(binary.headers['cache-control']).toContain('private');
    expect(binary.headers['content-disposition']).toContain('inline');
    expect(Buffer.from(binary.data).equals(JPEG_BYTES)).toBe(true);

    const events = await attachmentEvents(cookie, ticketId);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: 'EVENT',
      oldValue: null,
      newValue: 'фото кухні.jpg',
    });
  });

  it('accepts PNG with its own signature', async () => {
    const { cookie } = await loginUser();
    const ticketId = await createTicket(cookie);
    const res = await upload(
      cookie,
      ticketId,
      PNG_BYTES,
      'image/png',
      'план.png',
    );
    expect(res.status).toBe(201);
    expect(res.data.mimeType).toBe('image/png');
  });
});

describe('upload validation (FR-ATTACH-01, Р-13)', () => {
  it('rejects PDF, HEIC and a spoofed content type with nothing stored', async () => {
    const { cookie } = await loginUser();
    const ticketId = await createTicket(cookie);
    const rejected = [
      await upload(cookie, ticketId, PDF_BYTES, 'application/pdf', 'doc.pdf'),
      await upload(cookie, ticketId, HEIC_BYTES, 'image/heic', 'photo.heic'),
      // PDF bytes wearing a JPEG header — magic bytes win (design D4)
      await upload(cookie, ticketId, PDF_BYTES, 'image/jpeg', 'fake.jpg'),
    ];
    for (const res of rejected) {
      expect(res.status).toBe(400);
      expect(res.data.code).toBe('ATTACHMENT_TYPE_INVALID');
    }
    const list = await api.get(
      `/api/tickets/${ticketId}/attachments`,
      authed(cookie),
    );
    expect(list.data).toHaveLength(0);
    expect(await attachmentEvents(cookie, ticketId)).toHaveLength(0);
  });

  it('rejects a file over 10 MB with the contract error, not a bare 413', async () => {
    const { cookie } = await loginUser();
    const ticketId = await createTicket(cookie);
    const oversize = Buffer.concat([
      JPEG_BYTES,
      Buffer.alloc(10 * 1024 * 1024),
    ]);
    const res = await upload(cookie, ticketId, oversize);
    expect(res.status).toBe(400);
    expect(res.data.code).toBe('ATTACHMENT_TOO_LARGE');
  });

  it('rejects the 11th photo on a ticket (FR-ATTACH-01)', async () => {
    const { cookie } = await loginUser();
    const ticketId = await createTicket(cookie);
    for (let i = 0; i < 10; i++) {
      const res = await upload(
        cookie,
        ticketId,
        JPEG_BYTES,
        'image/jpeg',
        `фото-${i}.jpg`,
      );
      expect(res.status).toBe(201);
    }
    const eleventh = await upload(cookie, ticketId);
    expect(eleventh.status).toBe(400);
    expect(eleventh.data.code).toBe('ATTACHMENT_LIMIT_REACHED');
  });

  it('answers the contract shape for a malformed multipart (two file parts)', async () => {
    const { cookie } = await loginUser();
    const ticketId = await createTicket(cookie);
    const form = new FormData();
    form.append(
      'file',
      new Blob([new Uint8Array(JPEG_BYTES)], { type: 'image/jpeg' }),
      'a.jpg',
    );
    form.append(
      'file',
      new Blob([new Uint8Array(JPEG_BYTES)], { type: 'image/jpeg' }),
      'b.jpg',
    );
    const res = await api.post(
      `/api/tickets/${ticketId}/attachments`,
      form,
      authed(cookie),
    );
    // multer's LIMIT_UNEXPECTED_FILE must not leak Nest's default body
    // (slice review S-07, low)
    expect(res.status).toBe(400);
    expect(res.data.code).toBe('ATTACHMENT_FILE_REQUIRED');
  });

  it('rejects a multipart request without the file part', async () => {
    const { cookie } = await loginUser();
    const ticketId = await createTicket(cookie);
    const form = new FormData();
    form.append('note', 'not a file');
    const res = await api.post(
      `/api/tickets/${ticketId}/attachments`,
      form,
      authed(cookie),
    );
    expect(res.status).toBe(400);
    expect(res.data.code).toBe('ATTACHMENT_FILE_REQUIRED');
  });
});

describe('delete (FR-ATTACH-02)', () => {
  it('removes the photo, its binary and logs the feed event', async () => {
    const { cookie } = await loginUser();
    const ticketId = await createTicket(cookie);
    const uploaded = await upload(cookie, ticketId);
    const attachmentId = uploaded.data.id;

    const removed = await api.delete(
      `/api/tickets/${ticketId}/attachments/${attachmentId}`,
      authed(cookie),
    );
    expect(removed.status).toBe(200);
    expect(removed.data).toEqual({ ok: true });

    const list = await api.get(
      `/api/tickets/${ticketId}/attachments`,
      authed(cookie),
    );
    expect(list.data).toHaveLength(0);

    const binary = await api.get(
      `/api/tickets/${ticketId}/attachments/${attachmentId}`,
      authed(cookie),
    );
    expect(binary.status).toBe(404);
    expect(binary.data.code).toBe('ATTACHMENT_NOT_FOUND');

    const events = await attachmentEvents(cookie, ticketId);
    expect(events).toHaveLength(2);
    expect(events[1]).toMatchObject({
      oldValue: 'фото кухні.jpg',
      newValue: null,
    });
  });
});

describe('owner isolation (FR-ACCESS-01, NFR-SEC-03)', () => {
  it('answers 404-parity for a foreign ticket and attachment on all four endpoints', async () => {
    const owner = await loginUser();
    const stranger = await loginUser();
    const ticketId = await createTicket(owner.cookie);
    const uploaded = await upload(owner.cookie, ticketId);
    const attachmentId = uploaded.data.id;

    const foreignUpload = await upload(stranger.cookie, ticketId);
    expect(foreignUpload.status).toBe(404);
    expect(foreignUpload.data.code).toBe('TICKET_NOT_FOUND');

    const foreignList = await api.get(
      `/api/tickets/${ticketId}/attachments`,
      authed(stranger.cookie),
    );
    expect(foreignList.status).toBe(404);
    expect(foreignList.data.code).toBe('TICKET_NOT_FOUND');

    const foreignBinary = await api.get(
      `/api/tickets/${ticketId}/attachments/${attachmentId}`,
      authed(stranger.cookie),
    );
    expect(foreignBinary.status).toBe(404);
    expect(foreignBinary.data.code).toBe('ATTACHMENT_NOT_FOUND');

    const foreignDelete = await api.delete(
      `/api/tickets/${ticketId}/attachments/${attachmentId}`,
      authed(stranger.cookie),
    );
    expect(foreignDelete.status).toBe(404);
    expect(foreignDelete.data.code).toBe('ATTACHMENT_NOT_FOUND');

    // the owner's photo is untouched by all of the above
    const stillThere = await api.get(
      `/api/tickets/${ticketId}/attachments`,
      authed(owner.cookie),
    );
    expect(stillThere.data).toHaveLength(1);
  });

  it('answers the same 404 for a nonexistent attachment id and a malformed id', async () => {
    const { cookie } = await loginUser();
    const ticketId = await createTicket(cookie);
    const missing = await api.get(
      `/api/tickets/${ticketId}/attachments/999999`,
      authed(cookie),
    );
    const malformed = await api.get(
      `/api/tickets/${ticketId}/attachments/abc`,
      authed(cookie),
    );
    for (const res of [missing, malformed]) {
      expect(res.status).toBe(404);
      expect(res.data.code).toBe('ATTACHMENT_NOT_FOUND');
    }
  });
});
