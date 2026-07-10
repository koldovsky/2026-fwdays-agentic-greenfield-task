import { test, expect } from '@playwright/test';
import { loginViaApi, uniquePhone } from './support/auth';

// S-01 acceptance: the walking skeleton is alive — SPA renders and
// /api/health is green against a real MySQL (see openspec app-skeleton spec).
// Since S-02 the home page sits behind the auth guard, so the check logs in.
test.describe('S-01 walking skeleton', () => {
  test('hello page renders and shows green health status', async ({ page }) => {
    await loginViaApi(page, uniquePhone());
    await page.goto('/');

    await expect(page).toHaveTitle('Сервіс-деск Mini');
    await expect(page.getByText('Вітаємо!')).toBeVisible();
    await expect(page.getByRole('status')).toHaveText(
      /Сервіс працює, база даних доступна/,
    );
  });

  test('health endpoint reports ok/up through the app origin', async ({
    request,
  }) => {
    const res = await request.get('/api/health');

    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok', db: 'up' });
  });

  test('deep link falls back to the SPA', async ({ page }) => {
    await page.goto('/some/route/that/does/not/exist');

    // SPA fallback serves index.html; the app shell renders
    await expect(page).toHaveTitle('Сервіс-деск Mini');
  });

  test('unknown API route stays a JSON 404, not the SPA page', async ({
    request,
  }) => {
    const res = await request.get('/api/does-not-exist');

    expect(res.status()).toBe(404);
    expect(res.headers()['content-type']).toContain('application/json');
    expect(await res.json()).toMatchObject({ statusCode: 404 });
  });
});
