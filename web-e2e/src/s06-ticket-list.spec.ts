import { test, expect, Page } from '@playwright/test';
import { loginViaApi, uniquePhone } from './support/auth';

// S-06 acceptance (FR-LIST-01…04, FR-DUE-02): combined filters with the
// «активні» preset, LIKE search by requester, overdue highlighting in the
// list and on the card, load-more pagination and the URL-carried filter
// state surviving a reload.

async function createHouseViaApi(page: Page, name: string): Promise<number> {
  const res = await page.request.post('/api/houses', { data: { name } });
  expect(res.ok()).toBeTruthy();
  return ((await res.json()) as { id: number }).id;
}

async function createTicketViaApi(
  page: Page,
  body: Record<string, unknown>,
): Promise<number> {
  const res = await page.request.post('/api/tickets', { data: body });
  expect(res.ok()).toBeTruthy();
  return ((await res.json()) as { id: number }).id;
}

async function transitionViaApi(
  page: Page,
  id: number,
  to: string,
): Promise<void> {
  const res = await page.request.post(`/api/tickets/${id}/transition`, {
    data: { to },
  });
  expect(res.ok()).toBeTruthy();
}

// now-24h is in the past in every timezone the suite may run in
const YESTERDAY = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

const rows = (page: Page) => page.locator('a.row');

test.describe('S-06 list, filters, search, overdue', () => {
  test('combines «активні» with a house filter, in-app from home (FR-LIST-02)', async ({
    page,
  }) => {
    await loginViaApi(page, uniquePhone());
    const houseA = await createHouseViaApi(page, 'вул. Шевченка, 12');
    const houseB = await createHouseViaApi(page, 'просп. Свободи, 3');
    await createTicketViaApi(page, {
      title: 'Тече кран',
      houseId: houseA,
      category: 'PLUMBING',
    });
    const elevator = await createTicketViaApi(page, {
      title: 'Ліфт зламався',
      houseId: houseA,
      category: 'ELEVATOR',
    });
    await transitionViaApi(page, elevator, 'IN_PROGRESS');
    const lamp = await createTicketViaApi(page, {
      title: 'Лампа в підвалі',
      houseId: houseB,
      category: 'ELECTRICITY',
    });
    await transitionViaApi(page, lamp, 'REJECTED');

    // in-app navigation: home → «Заявки» (singleton facade state intact)
    await page.goto('/');
    await page.getByRole('link', { name: 'Заявки' }).click();
    await expect(page).toHaveURL(/\/tickets$/);
    await expect(rows(page)).toHaveCount(3);

    await page.getByRole('option', { name: 'Активні' }).click();
    await expect(rows(page)).toHaveCount(2); // the rejected lamp drops out
    await page.getByLabel('Будинок').click();
    await page.getByRole('option', { name: 'вул. Шевченка, 12' }).click();
    await expect(rows(page)).toHaveCount(2); // both active tickets are in A
    await expect(page.getByText('Тече кран')).toBeVisible();
    await expect(page.getByText('Ліфт зламався')).toBeVisible();
    await expect(page).toHaveURL(/status=ACTIVE/);
    await expect(page).toHaveURL(new RegExp(`houseId=${houseA}`));
  });

  test('highlights the overdue row but not its closed twin; the card too (FR-DUE-02)', async ({
    page,
  }) => {
    await loginViaApi(page, uniquePhone());
    const houseId = await createHouseViaApi(page, 'вул. Зелена, 5');
    const overdue = await createTicketViaApi(page, {
      title: 'Прострочений ліфт',
      houseId,
      category: 'ELEVATOR',
      dueDate: YESTERDAY,
    });
    await transitionViaApi(page, overdue, 'IN_PROGRESS');
    const closed = await createTicketViaApi(page, {
      title: 'Закриті двері',
      houseId,
      category: 'COMMON_AREAS',
      dueDate: YESTERDAY,
    });
    await transitionViaApi(page, closed, 'IN_PROGRESS');
    await transitionViaApi(page, closed, 'DONE');
    await transitionViaApi(page, closed, 'CLOSED');

    await page.goto('/tickets');
    await expect(rows(page)).toHaveCount(2);
    // exactly one row is highlighted — the active one with the past term
    await expect(page.locator('a.row.overdue')).toHaveCount(1);
    await expect(page.locator('a.row.overdue')).toContainText(
      'Прострочений ліфт',
    );
    await expect(page.getByText('— прострочено')).toHaveCount(1);

    // in-app: the overdue row opens a card with the same highlight
    await page.locator('a.row.overdue').click();
    await expect(page).toHaveURL(new RegExp(`/tickets/${overdue}$`));
    await expect(page.getByText('Прострочено', { exact: true })).toBeVisible();
  });

  test('search finds tickets by the requester surname (FR-LIST-03)', async ({
    page,
  }) => {
    await loginViaApi(page, uniquePhone());
    const houseId = await createHouseViaApi(page, 'вул. Ринок, 1');
    await createTicketViaApi(page, {
      title: 'Тече кран',
      houseId,
      category: 'PLUMBING',
      requesterName: 'Іван Іваненко',
    });
    await createTicketViaApi(page, {
      title: 'Домофон мовчить',
      houseId,
      category: 'ACCESS_SYSTEMS',
    });

    await page.goto('/tickets');
    await expect(rows(page)).toHaveCount(2);
    await page.getByLabel('Пошук заявок').fill('Іваненко');
    await expect(rows(page)).toHaveCount(1); // after the 300 ms debounce
    await expect(page.getByText('Тече кран')).toBeVisible();
    await expect(page).toHaveURL(/q=/);

    // no matches → an understandable Ukrainian empty state, not a blank
    await page.getByLabel('Пошук заявок').fill('Немає такого');
    await expect(page.getByText('Нічого не знайдено')).toBeVisible();
  });

  test('«Показати ще» appends the next page and vanishes on the last (FR-LIST-04)', async ({
    page,
  }) => {
    await loginViaApi(page, uniquePhone());
    const houseId = await createHouseViaApi(page, 'вул. Довга, 21');
    for (let i = 1; i <= 21; i++) {
      await createTicketViaApi(page, {
        title: `Заявка ${i}`,
        houseId,
        category: 'OTHER',
      });
    }

    await page.goto('/tickets');
    await expect(rows(page)).toHaveCount(20);
    await page.getByRole('button', { name: 'Показати ще' }).click();
    await expect(rows(page)).toHaveCount(21);
    await expect(page.getByRole('button', { name: 'Показати ще' })).toHaveCount(
      0,
    );
  });

  test('a filtered URL survives reload with the controls reflecting it', async ({
    page,
  }) => {
    await loginViaApi(page, uniquePhone());
    const houseId = await createHouseViaApi(page, 'вул. Личаківська, 8');
    const active = await createTicketViaApi(page, {
      title: 'Активний кран',
      houseId,
      category: 'PLUMBING',
    });
    const rejected = await createTicketViaApi(page, {
      title: 'Відхилена лампа',
      houseId,
      category: 'ELECTRICITY',
    });
    await transitionViaApi(page, rejected, 'REJECTED');
    expect(active).toBeGreaterThan(0);

    await page.goto('/tickets?status=ACTIVE&q=кран');
    await expect(rows(page)).toHaveCount(1);
    await expect(page.getByText('Активний кран')).toBeVisible();

    await page.reload();
    await expect(rows(page)).toHaveCount(1);
    await expect(page.getByText('Активний кран')).toBeVisible();
    await expect(page.getByLabel('Пошук заявок')).toHaveValue('кран');
    await expect(page.getByRole('option', { name: 'Активні' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});
