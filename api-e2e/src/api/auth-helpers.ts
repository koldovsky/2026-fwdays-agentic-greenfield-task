import axios, { AxiosResponse } from 'axios';

// Shared login plumbing for authenticated e2e suites. Runs against the
// served API in dev SMS mode: request-otp answers with devCode (ADR-0004),
// so no SMS gateway and no log scraping is involved. Every test uses its
// own phone number — rate limits are per phone, so tests stay independent.
export const api = axios.create({ validateStatus: () => true });

let phoneCounter = 0;
export function uniquePhone(): string {
  // +38067 + 7 digits built from time+counter, unique across runs
  const suffix = (Date.now() % 1_000_000) * 10 + (phoneCounter++ % 10);
  return `+38067${suffix.toString().padStart(7, '0').slice(-7)}`;
}

export async function requestCode(phone: string): Promise<string> {
  const res = await api.post('/api/auth/otp/request', { phone });
  expect(res.status).toBe(200);
  expect(res.data.devCode).toMatch(/^\d{6}$/);
  return res.data.devCode;
}

function sessionCookie(res: AxiosResponse): string {
  const setCookie = res.headers['set-cookie']?.find((c: string) =>
    c.startsWith('sd_session='),
  );
  expect(setCookie).toBeDefined();
  return (setCookie as string).split(';')[0];
}

export async function login(
  phone: string,
): Promise<{ cookie: string; verifyRes: AxiosResponse }> {
  const code = await requestCode(phone);
  const verifyRes = await api.post('/api/auth/otp/verify', { phone, code });
  expect(verifyRes.status).toBe(200);
  return { cookie: sessionCookie(verifyRes), verifyRes };
}
