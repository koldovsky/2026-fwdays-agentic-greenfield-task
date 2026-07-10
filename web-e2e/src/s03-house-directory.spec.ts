import { test, expect } from '@playwright/test';
import { loginViaApi, uniquePhone } from './support/auth';

// S-03 acceptance (FR-HOUSE-01/02, plan v1.6): the houses directory happy
// path and the /login redirect for an already-authenticated user.
test.describe('S-03 houses directory', () => {
  test('directory happy path: empty state → create → edit → delete', async ({
    page,
  }) => {
    await loginViaApi(page, uniquePhone());
    await page.goto('/');

    // reachable from the main navigation
    await page.getByRole('link', { name: 'Будинки' }).click();
    await expect(page).toHaveURL(/\/houses$/);

    // empty state with a clear create action
    await expect(page.getByText('У довіднику поки порожньо')).toBeVisible();

    // create
    await page.getByRole('button', { name: 'Додати будинок' }).click();
    await page.getByLabel('Назва або адреса').fill('Шевченка 12');
    await page.getByLabel('Примітка').fill('перший під’їзд');
    await page.getByRole('button', { name: 'Зберегти' }).click();
    await expect(page.getByText('Шевченка 12')).toBeVisible();
    await expect(page.getByText('перший під’їзд')).toBeVisible();

    // edit the note (FR-HOUSE-01)
    await page.getByRole('button', { name: 'Редагувати будинок' }).click();
    await page.getByLabel('Примітка').fill('оновлена примітка');
    await page.getByRole('button', { name: 'Зберегти' }).click();
    await expect(page.getByText('оновлена примітка')).toBeVisible();
    await expect(page.getByText('перший під’їзд')).toBeHidden();

    // delete with confirm (FR-HOUSE-02 happy path); the confirm dialog title
    // repeats the house name, so assert on the cards, not on bare text
    await page.getByRole('button', { name: 'Видалити будинок' }).click();
    await page.getByRole('button', { name: 'Видалити', exact: true }).click();
    await expect(page.locator('app-house-card')).toHaveCount(0);
    await expect(page.getByText('У довіднику поки порожньо')).toBeVisible();
  });

  test('empty name is rejected by the form before hitting the API', async ({
    page,
  }) => {
    await loginViaApi(page, uniquePhone());
    await page.goto('/houses');

    await page.getByRole('button', { name: 'Додати будинок' }).click();
    await page.getByRole('button', { name: 'Зберегти' }).click();
    await expect(
      page.getByText('Вкажіть назву або адресу будинку'),
    ).toBeVisible();

    // whitespace-only name is normalized and fails inline too (slice-review
    // medium finding): the dialog must stay open, nothing reaches the API
    await page.getByLabel('Назва або адреса').fill('   ');
    await page.getByRole('button', { name: 'Зберегти' }).click();
    await expect(
      page.getByText('Вкажіть назву або адресу будинку'),
    ).toBeVisible();
    // the dialog stays open, nothing is created
    await page.getByRole('button', { name: 'Скасувати' }).click();
    await expect(page.getByText('У довіднику поки порожньо')).toBeVisible();
  });

  test('authenticated user is redirected from /login to home (plan v1.6)', async ({
    page,
  }) => {
    await loginViaApi(page, uniquePhone());
    await page.goto('/login');

    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByText('Профіль')).toBeVisible();
  });
});
