// S-02 otp-auth contract (FR-AUTH-01…04, NFR-SEC-01/02); shared login
// plumbing lives in auth-helpers (reused by S-03+ authenticated suites).
import { api, login, requestCode, uniquePhone } from './auth-helpers';
import { dbClose, dbQuery } from './db';

afterAll(async () => {
  await dbClose();
});

describe('POST /api/auth/otp/request', () => {
  it('issues a dev-mode code for a valid phone and normalizes the number', async () => {
    const phone = uniquePhone();
    const local = `0${phone.slice(4)}`; // 067… form of the same number
    await requestCode(local);
    const rows = await dbQuery<{ phone: string; code_hash: string }[]>(
      'SELECT phone, code_hash FROM otp_code WHERE phone = ?',
      [phone],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].code_hash).toMatch(/^[0-9a-f]{64}$/); // hash, never the code
  });

  it('rejects a malformed phone with PHONE_INVALID', async () => {
    const res = await api.post('/api/auth/otp/request', { phone: '12345' });
    expect(res.status).toBe(400);
    expect(res.data.code).toBe('PHONE_INVALID');
  });

  it('refuses a second code within 60s with RATE_LIMITED_60S (FR-AUTH-03)', async () => {
    const phone = uniquePhone();
    await requestCode(phone);
    const res = await api.post('/api/auth/otp/request', { phone });
    expect(res.status).toBe(429);
    expect(res.data.code).toBe('RATE_LIMITED_60S');
  });

  it('concurrent requests cannot bypass the rate limit (slice-review fix)', async () => {
    const phone = uniquePhone();
    const responses = await Promise.all(
      Array.from({ length: 4 }, () =>
        api.post('/api/auth/otp/request', { phone }),
      ),
    );
    expect(responses.filter((r) => r.status === 200)).toHaveLength(1);
    expect(responses.filter((r) => r.status === 429)).toHaveLength(3);
  });

  it('refuses the 6th SMS in 24h with RATE_LIMITED_DAILY (FR-AUTH-03)', async () => {
    const phone = uniquePhone();
    // Backfill 5 sends spread over the last day (all outside the 60s window)
    for (let i = 1; i <= 5; i++) {
      await dbQuery(
        `INSERT INTO otp_code (phone, code_hash, expires_at, attempts, consumed_at, created_at)
         VALUES (?, REPEAT('0', 64), NOW() - INTERVAL ? HOUR, 0, NOW(), NOW() - INTERVAL ? HOUR)`,
        [phone, i, i],
      );
    }
    const res = await api.post('/api/auth/otp/request', { phone });
    expect(res.status).toBe(429);
    expect(res.data.code).toBe('RATE_LIMITED_DAILY');
  });
});

describe('POST /api/auth/otp/verify', () => {
  it('creates the account on first login and reuses it afterwards (FR-AUTH-01)', async () => {
    const phone = uniquePhone();
    const first = await login(phone);
    expect(first.verifyRes.data).toMatchObject({ phone, name: null });
    const userId = first.verifyRes.data.id;

    // wait out nothing: bypass the 60s limit by aging the send log
    await dbQuery(
      'UPDATE otp_code SET created_at = created_at - INTERVAL 2 MINUTE WHERE phone = ?',
      [phone],
    );
    const second = await login(phone);
    expect(second.verifyRes.data.id).toBe(userId);
    const users = await dbQuery<unknown[]>(
      'SELECT id FROM user WHERE phone = ?',
      [phone],
    );
    expect(users).toHaveLength(1);
  });

  it('rejects a wrong code with OTP_INVALID and invalidates after 5 failures (FR-AUTH-02)', async () => {
    const phone = uniquePhone();
    const code = await requestCode(phone);
    const wrong = code === '000000' ? '000001' : '000000';

    for (let attempt = 1; attempt <= 4; attempt++) {
      const res = await api.post('/api/auth/otp/verify', {
        phone,
        code: wrong,
      });
      expect(res.status).toBe(400);
      expect(res.data.code).toBe('OTP_INVALID');
    }
    const fifth = await api.post('/api/auth/otp/verify', {
      phone,
      code: wrong,
    });
    expect(fifth.status).toBe(400);
    expect(fifth.data.code).toBe('OTP_ATTEMPTS_EXCEEDED');

    // even the correct code is dead now — a new one must be requested
    const correct = await api.post('/api/auth/otp/verify', { phone, code });
    expect(correct.status).toBe(400);
    expect(correct.data.code).toBe('OTP_EXPIRED_OR_MISSING');
  });

  it('rejects an expired code (FR-AUTH-02)', async () => {
    const phone = uniquePhone();
    const code = await requestCode(phone);
    await dbQuery(
      'UPDATE otp_code SET expires_at = NOW() - INTERVAL 1 SECOND WHERE phone = ?',
      [phone],
    );
    const res = await api.post('/api/auth/otp/verify', { phone, code });
    expect(res.status).toBe(400);
    expect(res.data.code).toBe('OTP_EXPIRED_OR_MISSING');
  });

  it('rejects a reused code (single-use, FR-AUTH-02)', async () => {
    const phone = uniquePhone();
    const code = await requestCode(phone);
    const first = await api.post('/api/auth/otp/verify', { phone, code });
    expect(first.status).toBe(200);
    const reuse = await api.post('/api/auth/otp/verify', { phone, code });
    expect(reuse.status).toBe(400);
    expect(reuse.data.code).toBe('OTP_EXPIRED_OR_MISSING');
  });

  it('only the latest requested code verifies (supersede)', async () => {
    const phone = uniquePhone();
    const oldCode = await requestCode(phone);
    await dbQuery(
      'UPDATE otp_code SET created_at = created_at - INTERVAL 2 MINUTE WHERE phone = ?',
      [phone],
    );
    const newCode = await requestCode(phone);
    const oldRes = await api.post('/api/auth/otp/verify', {
      phone,
      code: oldCode,
    });
    // superseded code is consumed → no active match for its hash
    expect(oldRes.status).toBe(400);
    const newRes = await api.post('/api/auth/otp/verify', {
      phone,
      code: newCode,
    });
    expect(newRes.status).toBe(200);
  });
});

describe('session cookie and guard (NFR-SEC-01, FR-AUTH-04)', () => {
  it('sets an httpOnly SameSite=Lax cookie expiring in ~30 days', async () => {
    const phone = uniquePhone();
    const { verifyRes } = await login(phone);
    const setCookie = verifyRes.headers['set-cookie']?.find((c: string) =>
      c.startsWith('sd_session='),
    ) as string;
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');
    expect(setCookie).toContain('Path=/');
    const expires = new Date(/Expires=([^;]+)/.exec(setCookie)?.[1] ?? 0);
    const days = (expires.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    expect(days).toBeGreaterThan(29);
  });

  it('serves /api/auth/me with a session and 401 UNAUTHENTICATED without', async () => {
    const phone = uniquePhone();
    const { cookie } = await login(phone);

    const me = await api.get('/api/auth/me', { headers: { Cookie: cookie } });
    expect(me.status).toBe(200);
    expect(me.data).toMatchObject({ phone });

    const anonymous = await api.get('/api/auth/me');
    expect(anonymous.status).toBe(401);
    expect(anonymous.data.code).toBe('UNAUTHENTICATED');

    const garbage = await api.get('/api/auth/me', {
      headers: { Cookie: 'sd_session=not-a-real-token' },
    });
    expect(garbage.status).toBe(401);
  });

  it('keeps health public (allowlist)', async () => {
    const res = await api.get('/api/health');
    expect(res.status).toBe(200);
  });

  it('updates the optional profile name', async () => {
    const phone = uniquePhone();
    const { cookie } = await login(phone);
    const patched = await api.patch(
      '/api/auth/me',
      { name: 'Тест Користувач' },
      { headers: { Cookie: cookie } },
    );
    expect(patched.status).toBe(200);
    expect(patched.data.name).toBe('Тест Користувач');
    const me = await api.get('/api/auth/me', { headers: { Cookie: cookie } });
    expect(me.data.name).toBe('Тест Користувач');
  });

  it('logout revokes the server-side session (FR-AUTH-04)', async () => {
    const phone = uniquePhone();
    const { cookie } = await login(phone);
    const out = await api.post(
      '/api/auth/logout',
      {},
      { headers: { Cookie: cookie } },
    );
    expect(out.status).toBe(200);
    const after = await api.get('/api/auth/me', {
      headers: { Cookie: cookie },
    });
    expect(after.status).toBe(401);
  });
});
