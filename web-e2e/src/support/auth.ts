import { Page, expect } from '@playwright/test';

// Unique per call so per-phone rate limits (FR-AUTH-03) never couple tests
// across parallel workers/browsers.
export function uniquePhone(): string {
  const digits = Math.floor(Math.random() * 10_000_000)
    .toString()
    .padStart(7, '0');
  return `+38067${digits}`;
}

// API-level login (dev SMS mode, ADR-0004): page.request shares the browser
// context cookie jar, so the session cookie lands in the browser.
export async function loginViaApi(page: Page, phone: string): Promise<void> {
  const requested = await page.request.post('/api/auth/otp/request', {
    data: { phone },
  });
  expect(requested.ok()).toBeTruthy();
  const { devCode } = (await requested.json()) as { devCode: string };
  const verified = await page.request.post('/api/auth/otp/verify', {
    data: { phone, code: devCode },
  });
  expect(verified.ok()).toBeTruthy();
}
