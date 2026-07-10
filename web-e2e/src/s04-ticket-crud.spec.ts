import { test, expect, Page } from '@playwright/test';
import { loginViaApi, uniquePhone } from './support/auth';

// S-04 acceptance (FR-TICKET-01/02/04, FR-HOUSE-02): create a ticket from
// the UI and land on its card, edit executor + due date, and the houses
// screen refusing to delete a house that has a ticket.

async function createHouseViaApi(page: Page, name: string): Promise<number> {
  const res = await page.request.post('/api/houses', { data: { name } });
  expect(res.ok()).toBeTruthy();
  return ((await res.json()) as { id: number }).id;
}

test.describe('S-04 ticket create/edit/card', () => {
  test('create from UI lands on the card with #N and status Нова', async ({
    page,
  }) => {
    await loginViaApi(page, uniquePhone());
    await createHouseViaApi(page, 'Шевченка 12');
    await page.goto('/');

    // reachable from the main navigation
    await page.getByRole('link', { name: 'Нова заявка' }).click();
    await expect(page).toHaveURL(/\/tickets\/new$/);

    await page.getByLabel('Назва', { exact: true }).fill('Тече кран');
    await page.getByLabel('Будинок').click();
    await page.getByRole('option', { name: 'Шевченка 12' }).click();
    await page.getByLabel('Категорія').click();
    await page.getByRole('option', { name: 'Сантехніка' }).click();
    await page.getByLabel('ПІБ заявника').fill('Іван Петренко');
    await page.getByRole('button', { name: 'Зберегти' }).click();

    // the card: number #N, status Нова, the entered attributes
    await expect(page).toHaveURL(/\/tickets\/\d+$/);
    await expect(page.getByText(/#\d+/)).toBeVisible();
    await expect(page.getByText('Тече кран')).toBeVisible();
    await expect(page.getByText('Нова', { exact: true })).toBeVisible();
    await expect(page.getByText('Шевченка 12')).toBeVisible();
    await expect(page.getByText('Сантехніка')).toBeVisible();
    await expect(page.getByText('Іван Петренко')).toBeVisible();
    // priority defaulted (FR-TICKET-01)
    await expect(page.getByText('Звичайна')).toBeVisible();
  });

  test('edit executor and due date from the card', async ({ page }) => {
    await loginViaApi(page, uniquePhone());
    const houseId = await createHouseViaApi(page, 'Франка 3');
    const created = await page.request.post('/api/tickets', {
      data: { title: 'Ліфт стоїть', houseId, category: 'ELEVATOR' },
    });
    expect(created.ok()).toBeTruthy();
    const { id } = (await created.json()) as { id: number };

    await page.goto(`/tickets/${id}`);
    await page.getByRole('link', { name: 'Редагувати заявку' }).click();
    await expect(page).toHaveURL(new RegExp(`/tickets/${id}/edit$`));

    // the form is prefilled with the ticket
    await expect(page.getByLabel('Назва', { exact: true })).toHaveValue(
      'Ліфт стоїть',
    );
    await page.getByLabel('Виконавець').fill('Майстер Петро');
    // the native date adapter parses the ISO form; display is localized
    await page.getByLabel('Цільовий термін').fill('2026-07-20');
    await page.getByRole('button', { name: 'Зберегти' }).click();

    // back on the card with the fresh values (FR-TICKET-01, FR-DUE-01);
    // exact: the S-05 feed repeats the values inside its event sentences
    await expect(page).toHaveURL(new RegExp(`/tickets/${id}$`));
    await expect(
      page.getByText('Майстер Петро', { exact: true }),
    ).toBeVisible();
    await expect(page.getByText('20.07.2026', { exact: true })).toBeVisible();
  });

  test('houses screen refuses deleting a house with a ticket (FR-HOUSE-02)', async ({
    page,
  }) => {
    await loginViaApi(page, uniquePhone());
    const houseId = await createHouseViaApi(page, 'З заявкою 1');
    const created = await page.request.post('/api/tickets', {
      data: { title: 'Заявка', houseId, category: 'OTHER' },
    });
    expect(created.ok()).toBeTruthy();

    await page.goto('/houses');
    await page.getByRole('button', { name: 'Видалити будинок' }).click();
    await page.getByRole('button', { name: 'Видалити', exact: true }).click();

    // understandable refusal, the house stays
    await expect(
      page.getByText('Неможливо видалити: до будинку прив’язані заявки'),
    ).toBeVisible();
    await expect(page.getByText('З заявкою 1')).toBeVisible();
  });

  test('form blocks submit without required fields (Ukrainian errors)', async ({
    page,
  }) => {
    await loginViaApi(page, uniquePhone());
    await createHouseViaApi(page, 'Гончара 5');
    await page.goto('/tickets/new');

    await page.getByRole('button', { name: 'Зберегти' }).click();

    await expect(page).toHaveURL(/\/tickets\/new$/); // nothing submitted
    await expect(page.getByText('Вкажіть назву заявки')).toBeVisible();
    await expect(page.getByText('Оберіть будинок')).toBeVisible();
    await expect(page.getByText('Оберіть категорію')).toBeVisible();
  });

  test('create form starts blank after viewing a ticket (review finding)', async ({
    page,
  }) => {
    await loginViaApi(page, uniquePhone());
    const houseId = await createHouseViaApi(page, 'Сагайдачного 8');
    const created = await page.request.post('/api/tickets', {
      data: {
        title: 'Стара заявка',
        houseId,
        category: 'OTHER',
        executor: 'Хтось',
      },
    });
    expect(created.ok()).toBeTruthy();
    const { id } = (await created.json()) as { id: number };

    // view the ticket, then navigate in-app (no reload) to the create form:
    // the root-singleton facade must not leak the viewed ticket into it
    await page.goto(`/tickets/${id}`);
    await expect(page.getByText('Стара заявка')).toBeVisible();
    await page.getByRole('link', { name: 'На головну' }).click();
    await page.getByRole('link', { name: 'Нова заявка' }).click();
    await expect(page).toHaveURL(/\/tickets\/new$/);

    await expect(page.getByLabel('Назва', { exact: true })).toHaveValue('');
    await expect(page.getByLabel('Виконавець')).toHaveValue('');
  });

  test('empty house directory shows a hint instead of the form', async ({
    page,
  }) => {
    await loginViaApi(page, uniquePhone());
    await page.goto('/tickets/new');

    await expect(
      page.getByText('спершу додайте будинок', { exact: false }),
    ).toBeVisible();
    await page.getByRole('link', { name: 'Перейти до будинків' }).click();
    await expect(page).toHaveURL(/\/houses$/);
  });
});
