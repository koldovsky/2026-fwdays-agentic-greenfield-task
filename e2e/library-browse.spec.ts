/**
 * e2e — add-library-browse spec (happy path + design-fidelity capture).
 *
 * Drives the Library home (doc/web/01-library-desktop.png) on the in-memory fixture connector wired
 * in main.ts: header/counts/search/sync-pill → Keep reading readouts & chips → Recently added grid →
 * local search filter → grid/list toggle. Captures a screenshot (and video via playwright.config) as
 * the maker's design-fidelity evidence.
 */
import { expect, test } from '@playwright/test'

const SHOTS = 'loop/artifacts/add-library-browse/attempt-1/gate1/playwright'

test.describe('add-library-browse — e2e happy path', () => {
  test('header, counts, search box, and sync pill render from the fixture', async ({ page }) => {
    await page.goto('/library')

    await expect(page.getByRole('heading', { name: 'Your library', level: 1 })).toBeVisible()
    // ch9 made the offline count registry-driven (the fixture starts with 0 downloads) and the sync pill
    // shows "Synced just now" for a null lastSyncedAt — see e2e/offline-sync.spec.ts. The maket's
    // hardcoded "14 downloaded" / "Synced 2m ago" are no longer the rendered values.
    await expect(page.getByText('342 titles · 3 sources · 0 downloaded for offline')).toBeVisible()
    await expect(page.getByPlaceholder('Search titles, authors…')).toBeVisible()
    await expect(page.getByText('Synced just now')).toBeVisible()

    await page.screenshot({ path: `${SHOTS}/01-library.png`, fullPage: true })
  })

  test('Keep reading row shows the three maket readouts, chips, and volume line', async ({
    page,
  }) => {
    await page.goto('/library')

    await expect(page.getByText('Keep reading')).toBeVisible()
    await expect(page.getByText('See all')).toBeVisible()

    // The title appears on the cover and as the card heading — scope to the first match.
    await expect(page.getByText('Pride and Prejudice').first()).toBeVisible()
    await expect(page.getByText('38% · 1h 12m left')).toBeVisible()
    await expect(page.getByText('page 88 / 192')).toBeVisible()
    await expect(page.getByText('Vol. 4 · R. Okonkwo')).toBeVisible()
    await expect(page.getByText('12% · just started')).toBeVisible()
    await expect(page.getByText('EPUB · komga')).toBeVisible()
    await expect(page.getByText('PDF · calibre')).toBeVisible()
  })

  test('local search filters by title; clearing restores the catalog', async ({ page }) => {
    await page.goto('/library')

    await expect(page.getByText('Frankenstein').first()).toBeVisible()
    const search = page.getByPlaceholder('Search titles, authors…')

    await search.fill('Jane')
    await expect(page.getByText('Jane Eyre').first()).toBeVisible()
    await expect(page.getByText('Frankenstein')).toHaveCount(0)

    await search.fill('')
    await expect(page.getByText('Frankenstein').first()).toBeVisible()
  })

  test('grid/list toggle re-presents the same recently-added entries', async ({ page }) => {
    await page.goto('/library')

    await expect(page.getByText('Recently added')).toBeVisible()
    await page.getByRole('button', { name: 'List' }).click()
    // The same titles survive the switch.
    await expect(page.getByText('Frankenstein').first()).toBeVisible()
    await expect(page.getByText('Jane Eyre').first()).toBeVisible()

    await page.getByRole('button', { name: 'Grid' }).click()
    await expect(page.getByText('Frankenstein').first()).toBeVisible()
  })
})
