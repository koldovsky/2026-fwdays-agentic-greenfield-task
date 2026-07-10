/**
 * e2e — add-book-detail spec (screen 02, happy path + design-fidelity capture).
 *
 * Drives the Book detail screen (doc/web/02-book-detail-desktop.png) on the in-memory fixture connector
 * wired in main.ts: open it from a Library card, verify identity/metadata, the YOUR PROGRESS and SYNCED
 * PER FORMAT cards, and the CHAPTERS placeholder; the "Continue reading" CTA opens the (placeholder)
 * reader route; Back returns to the Library; a sparse book degrades gracefully (title renders, no pills).
 * Captures a screenshot (+ video via playwright.config) as the maker's design-fidelity evidence.
 */
import { expect, test } from '@playwright/test'

const SHOTS = 'loop/artifacts/add-book-detail/attempt-1/gate1/playwright'

test.describe('add-book-detail — e2e happy path', () => {
  test('Library card → detail → identity, progress, per-format, chapters → Continue → reader', async ({
    page,
  }) => {
    await page.goto('/library')

    // Open the maket book from its Keep-reading card (the whole card is a link).
    await page
      .getByRole('link', { name: /Pride and Prejudice/ })
      .first()
      .click()
    await expect(page).toHaveURL(/\/book\/home-server\/pride-and-prejudice/)

    // Identity & metadata from BookMeta.
    await expect(page.getByRole('heading', { name: 'Pride and Prejudice', level: 1 })).toBeVisible()
    await expect(page.getByText('Jane Austen').first()).toBeVisible()
    await expect(page.getByText('home server / fiction / austen')).toBeVisible()
    for (const pill of ['1813', 'English', '432 pages', 'Fiction · Romance']) {
      await expect(page.getByText(pill, { exact: true })).toBeVisible()
    }

    // YOUR PROGRESS card (current format's locator) + SYNCED PER FORMAT explainer.
    await expect(page.getByText('38%')).toBeVisible()
    await expect(page.getByText('about 1h 12m left')).toBeVisible()
    await expect(page.getByText('Last read 2h ago on Phone')).toBeVisible()
    await expect(
      page.getByText(
        'Your EPUB position (Phone) and the PDF (Desktop) keep separate places — progress is keyed per format.',
      ),
    ).toBeVisible()

    // CHAPTERS: count from BookMeta + the graceful placeholder (real TOC arrives with add-format-epub).
    await expect(page.getByText('61 chapters')).toBeVisible()
    await expect(page.getByText('Chapters will be available once the book is opened')).toBeVisible()

    await page.screenshot({ path: `${SHOTS}/02-book-detail.png`, fullPage: true })

    // Continue reading → the format-keyed reader route (placeholder ReaderView until change 7).
    await page.getByRole('button', { name: 'Continue reading' }).click()
    await expect(page).toHaveURL(/\/reader\/home-server\/pride-and-prejudice/)
  })

  test('Back returns to the Library', async ({ page }) => {
    await page.goto('/library')
    await page
      .getByRole('link', { name: /Pride and Prejudice/ })
      .first()
      .click()
    await expect(page).toHaveURL(/\/book\//)

    await page.getByRole('button', { name: 'Back' }).click()
    await expect(page).toHaveURL(/\/library/)
  })

  test('a sparse book degrades gracefully (title renders, no maket pills, Start reading)', async ({
    page,
  }) => {
    await page.goto('/library')
    await page
      .getByRole('link', { name: /Moby-Dick/ })
      .first()
      .click()
    await expect(page).toHaveURL(/\/book\/gutenberg\/moby-dick/)

    await expect(page.getByRole('heading', { name: 'Moby-Dick', level: 1 })).toBeVisible()
    await expect(page.getByText('Herman Melville').first()).toBeVisible()
    // No fixture-detail facts for this title → the maket pills are absent, and the CTA reads "Start reading".
    await expect(page.getByText('1813')).toHaveCount(0)
    await expect(page.getByText('432 pages')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Start reading' })).toBeVisible()
  })
})
