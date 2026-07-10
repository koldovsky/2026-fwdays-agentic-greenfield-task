import { test, expect } from '@playwright/test';
import { loginViaApi, uniquePhone } from './support/auth';

// S-02 acceptance (FR-AUTH-01…04): login via phone → SMS code (dev mode
// exposes the code in the request-otp response), durable session, logout.
test.describe('S-02 OTP authentication', () => {
  test('unauthenticated visitor is redirected to the login screen', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText('Вхід до Сервіс-деску')).toBeVisible();
  });

  test('login happy path: phone → code → app with profile', async ({
    page,
  }) => {
    const phone = uniquePhone();
    await page.goto('/login');

    await page.getByLabel('Номер телефону').fill(phone);
    const otpResponse = page.waitForResponse('**/api/auth/otp/request');
    await page.getByRole('button', { name: 'Отримати код' }).click();
    const { devCode } = (await (await otpResponse).json()) as {
      devCode: string;
    };

    await page.getByLabel('Код з SMS').fill(devCode);
    await page.getByRole('button', { name: 'Увійти' }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText('Профіль')).toBeVisible();
    await expect(page.getByText(phone)).toBeVisible();
  });

  test('wrong code shows an understandable error (FR-AUTH-02)', async ({
    page,
  }) => {
    const phone = uniquePhone();
    await page.goto('/login');
    await page.getByLabel('Номер телефону').fill(phone);
    await page.getByRole('button', { name: 'Отримати код' }).click();

    await page.getByLabel('Код з SMS').fill('000000');
    await page.getByRole('button', { name: 'Увійти' }).click();
    // 1-in-a-million flake guard: the random real code could be 000000
    await expect(page.getByRole('alert')).toHaveText(
      /Невірний код|Забагато невдалих спроб/,
    );
  });

  test('repeat code request within 60s shows the rate-limit message (FR-AUTH-03)', async ({
    page,
  }) => {
    const phone = uniquePhone();
    await page.goto('/login');
    await page.getByLabel('Номер телефону').fill(phone);
    await page.getByRole('button', { name: 'Отримати код' }).click();
    await expect(page.getByLabel('Код з SMS')).toBeVisible();

    await page.getByRole('button', { name: 'Надіслати код ще раз' }).click();
    await expect(page.getByRole('alert')).toHaveText(/Зачекайте хвилину/);
  });

  test('session survives a page reload (FR-AUTH-04)', async ({ page }) => {
    const phone = uniquePhone();
    await loginViaApi(page, phone);
    await page.goto('/');
    await expect(page.getByText('Профіль')).toBeVisible();

    await page.reload();
    await expect(page.getByText('Профіль')).toBeVisible();
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('logout ends the session and returns to login (FR-AUTH-04)', async ({
    page,
  }) => {
    const phone = uniquePhone();
    await loginViaApi(page, phone);
    await page.goto('/');

    await page.getByRole('button', { name: 'Вийти' }).click();
    await expect(page).toHaveURL(/\/login$/);

    // the guard sends the now-anonymous visitor back to login
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('profile name can be saved and persists', async ({ page }) => {
    const phone = uniquePhone();
    await loginViaApi(page, phone);
    await page.goto('/');

    await page.getByLabel(/Імʼя/).fill('Ольга');
    await page.getByRole('button', { name: 'Зберегти' }).click();
    await page.reload();
    await expect(page.getByLabel(/Імʼя/)).toHaveValue('Ольга');
  });
});
