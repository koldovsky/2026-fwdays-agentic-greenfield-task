import { test, expect, Page } from '@playwright/test';
import { loginViaApi, uniquePhone } from './support/auth';

// S-05 acceptance (FR-STATUS-01…03, FR-FEED-01/02, FR-TICKET-03, FR-DUE-01):
// the full lifecycle via card buttons with a system event per step, reopen
// from Виконана, terminal cards without actions, field edits leaving events
// in the feed, and a user note appended from the card.

async function createTicketViaApi(page: Page, title: string): Promise<number> {
  const houseRes = await page.request.post('/api/houses', {
    data: { name: `Дім ${Date.now() % 100000}` },
  });
  expect(houseRes.ok()).toBeTruthy();
  const { id: houseId } = (await houseRes.json()) as { id: number };
  const res = await page.request.post('/api/tickets', {
    data: { title, houseId, category: 'OTHER' },
  });
  expect(res.ok()).toBeTruthy();
  return ((await res.json()) as { id: number }).id;
}

test.describe('S-05 lifecycle and feed', () => {
  test('walks the full lifecycle via card buttons, each step feeds an event', async ({
    page,
  }) => {
    await loginViaApi(page, uniquePhone());
    const id = await createTicketViaApi(page, 'Тече кран');
    await page.goto(`/tickets/${id}`);
    await expect(page.getByText('Нова', { exact: true })).toBeVisible();

    // Нова → В роботі
    await page.getByRole('button', { name: 'Взято в роботу' }).click();
    await expect(page.getByText('В роботі', { exact: true })).toBeVisible();
    // the system event is in the feed: who/from → to, visually an event
    await expect(page.getByText('Статус: Нова → В роботі')).toBeVisible();

    // В роботі → Виконана
    await page.getByRole('button', { name: 'Роботу завершено' }).click();
    await expect(page.getByText('Виконана', { exact: true })).toBeVisible();
    await expect(page.getByText('Статус: В роботі → Виконана')).toBeVisible();

    // Виконана → Закрита; terminal card offers no more actions
    await page.getByRole('button', { name: 'Підтверджено й закрито' }).click();
    await expect(page.getByText('Закрита', { exact: true })).toBeVisible();
    await expect(page.getByText('Статус: Виконана → Закрита')).toBeVisible();
    await expect(
      page.getByRole('region', { name: 'Дії зі статусом' }),
    ).toHaveCount(0);
  });

  test('reopens a done ticket (Виконана → В роботі) from the card', async ({
    page,
  }) => {
    await loginViaApi(page, uniquePhone());
    const id = await createTicketViaApi(page, 'Ліфт стоїть');
    await page.request.post(`/api/tickets/${id}/transition`, {
      data: { to: 'IN_PROGRESS' },
    });
    await page.request.post(`/api/tickets/${id}/transition`, {
      data: { to: 'DONE' },
    });

    await page.goto(`/tickets/${id}`);
    await expect(page.getByText('Виконана', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Повторне відкриття' }).click();
    await expect(page.getByText('В роботі', { exact: true })).toBeVisible();
    await expect(page.getByText('Статус: Виконана → В роботі')).toBeVisible();
  });

  test('field edits leave system events in the feed (FR-TICKET-03, FR-DUE-01)', async ({
    page,
  }) => {
    await loginViaApi(page, uniquePhone());
    const id = await createTicketViaApi(page, 'Домофон мовчить');

    // edit executor + due date through the app form (in-app navigation)
    await page.goto(`/tickets/${id}`);
    await page.getByRole('link', { name: 'Редагувати заявку' }).click();
    await page.getByLabel('Виконавець').fill('Майстер Петро');
    await page.getByLabel('Цільовий термін').fill('2026-07-20');
    await page.getByRole('button', { name: 'Зберегти' }).click();

    // back on the card: both changes are system events in the feed
    await expect(page).toHaveURL(new RegExp(`/tickets/${id}$`));
    await expect(page.getByText('Виконавець: — → Майстер Петро')).toBeVisible();
    await expect(
      page.getByText('Цільовий термін: — → 20.07.2026'),
    ).toBeVisible();
  });

  test('adds a note from the card; notes and events look different', async ({
    page,
  }) => {
    await loginViaApi(page, uniquePhone());
    const id = await createTicketViaApi(page, 'Прибирання');
    await page.request.post(`/api/tickets/${id}/transition`, {
      data: { to: 'IN_PROGRESS' },
    });

    await page.goto(`/tickets/${id}`);
    await page.getByLabel('Новий запис').fill('Дзвонив майстру, прийде завтра');
    await page.getByRole('button', { name: 'Додати запис' }).click();

    // the note appears without a reload, after the earlier system event
    const note = page.locator('li.note');
    await expect(note).toContainText('Дзвонив майстру, прийде завтра');
    const event = page.locator('li.event');
    await expect(event).toContainText('Статус: Нова → В роботі');
    // the input clears once the note landed
    await expect(page.getByLabel('Новий запис')).toHaveValue('');

    // empty submit is blocked with a Ukrainian hint
    await page.getByRole('button', { name: 'Додати запис' }).click();
    await expect(page.getByText('Введіть текст запису')).toBeVisible();
    await expect(note).toHaveCount(1); // nothing appended
  });
});
