import { test, expect, Page } from '@playwright/test';
import { loginViaApi, uniquePhone } from './support/auth';

// S-07 acceptance (FR-ATTACH-01…03, FR-FEED-02, Р-13): add a photo from the
// card → thumbnail, full size and a feed event; a rejected file shows an
// understandable Ukrainian error; delete removes the thumbnail after the
// confirm step and feeds its own event.

// Real 1×1 PNG so the browser actually renders what the API serves back.
const PNG_1PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

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

test.describe('S-07 photo attachments', () => {
  test('adds a photo: thumbnail, full size and a feed event', async ({
    page,
  }) => {
    await loginViaApi(page, uniquePhone());
    const id = await createTicketViaApi(page, 'Розбите вікно');
    await page.goto(`/tickets/${id}`);
    await expect(page.getByText('Фото ще немає')).toBeVisible();

    await page.locator('input[type="file"]').setInputFiles({
      name: 'вікно.png',
      mimeType: 'image/png',
      buffer: PNG_1PX,
    });

    // thumbnail in the grid, served through the API (FR-ATTACH-03)
    const thumb = page.getByRole('button', { name: 'Відкрити фото вікно.png' });
    await expect(thumb).toBeVisible();
    await expect(page.getByText('Фото ще немає')).toHaveCount(0);
    // the ATTACHMENT system event landed in the feed (FR-FEED-02)
    await expect(page.getByText('Додано фото «вікно.png»')).toBeVisible();

    // full size opens in the dialog (FR-ATTACH-02)
    await thumb.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByAltText('вікно.png')).toBeVisible();
    await dialog.getByRole('button', { name: 'Закрити' }).click();
    await expect(dialog).toHaveCount(0);
  });

  test('rejects a non-photo file with an understandable message (Р-13)', async ({
    page,
  }) => {
    await loginViaApi(page, uniquePhone());
    const id = await createTicketViaApi(page, 'Заявка без фото');
    await page.goto(`/tickets/${id}`);

    await page.locator('input[type="file"]').setInputFiles({
      name: 'документ.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.7 fake'),
    });

    await expect(page.getByText('Лише фото JPEG, PNG або WebP')).toBeVisible();
    // nothing was uploaded — the empty state stays (FR-ATTACH-01)
    await expect(page.getByText('Фото ще немає')).toBeVisible();
  });

  test('deletes a photo after the confirm step, with a feed event', async ({
    page,
  }) => {
    await loginViaApi(page, uniquePhone());
    const id = await createTicketViaApi(page, 'Заявка з фото');
    await page.goto(`/tickets/${id}`);
    await page.locator('input[type="file"]').setInputFiles({
      name: 'підвал.png',
      mimeType: 'image/png',
      buffer: PNG_1PX,
    });
    const thumb = page.getByRole('button', {
      name: 'Відкрити фото підвал.png',
    });
    await expect(thumb).toBeVisible();

    // cancelling the confirm keeps the photo
    await page
      .getByRole('button', { name: 'Видалити фото підвал.png' })
      .click();
    await page.getByRole('button', { name: 'Скасувати' }).click();
    await expect(thumb).toBeVisible();

    // confirming removes the thumbnail and feeds the event (FR-ATTACH-02)
    await page
      .getByRole('button', { name: 'Видалити фото підвал.png' })
      .click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Видалити' })
      .click();
    await expect(thumb).toHaveCount(0);
    await expect(page.getByText('Фото ще немає')).toBeVisible();
    await expect(page.getByText('Видалено фото «підвал.png»')).toBeVisible();
  });
});
