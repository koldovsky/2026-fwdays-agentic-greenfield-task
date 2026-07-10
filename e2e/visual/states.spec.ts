/**
 * Visual — interactive & cross-screen states (visual-fidelity §"Asynchronous and connectivity states",
 * §"Pointer and focus interaction feedback", §"Library and reader view modes").
 *
 * The async/connectivity states that are hard to force on the in-memory fixture are driven through the
 * routed EPUB (delayed bytes → loading; invalid bytes → error) and Playwright connectivity control
 * (setOffline → OfflineBanner). Empty uses the Downloads view; the interactive states use the real
 * controls. The component-level render of every state is additionally unit-tested by its owning change.
 */
import { expect, test, type Page } from '@playwright/test'
import { goldenScreenshot, prepareCapture, settle, DESKTOP_VIEWPORT } from './capture-helper'
import { routeEpubFixture } from './maket-seed'

async function openReaderFromDetail(page: Page): Promise<void> {
  await page.goto('/book/home-server/pride-and-prejudice')
  await page.getByRole('button', { name: /reading/i }).click()
  await expect(page).toHaveURL(/\/reader\/home-server\/pride-and-prejudice/)
}

test.describe('visual states — async / connectivity', () => {
  test('loading: a styled spinner shows while the book opens', async ({ page }) => {
    await prepareCapture(page, { viewport: DESKTOP_VIEWPORT })
    // Delay the book bytes so the reader's loading state is observable.
    await page.route('**/fixtures/pride-and-prejudice.epub', async (route) => {
      await new Promise((r) => setTimeout(r, 1500))
      const { readFileSync } = await import('node:fs')
      const { resolve } = await import('node:path')
      route.fulfill({
        status: 200,
        contentType: 'application/epub+zip',
        body: readFileSync(resolve(process.cwd(), 'test-epubs', 'blaise-pascal_pensees.epub')),
      })
    })
    await openReaderFromDetail(page)
    await expect(page.getByTestId('reader-loading')).toBeVisible()
    await expect(page.getByText('Opening book…')).toBeVisible()
  })

  test('error: a styled error state with a retry/back affordance shows when the book fails', async ({
    page,
  }) => {
    await prepareCapture(page, { viewport: DESKTOP_VIEWPORT })
    // Serve invalid EPUB bytes → foliate fails to parse → the reader error state.
    await page.route('**/fixtures/pride-and-prejudice.epub', (route) =>
      route.fulfill({ status: 200, contentType: 'application/epub+zip', body: 'not-an-epub' }),
    )
    await openReaderFromDetail(page)
    await expect(page.getByTestId('reader-error')).toBeVisible({ timeout: 30_000 })
    const back = page.getByRole('button', { name: /back to library/i })
    await expect(back).toBeVisible()
    await back.click()
    await expect(page).toHaveURL(/\/library/)
  })

  test('empty: the Downloads view shows a styled empty state with guidance', async ({ page }) => {
    await prepareCapture(page, { viewport: DESKTOP_VIEWPORT })
    await page.goto('/downloads')
    await expect(page.getByRole('heading', { name: 'No downloads yet' })).toBeVisible()
    await settle(page)
    await goldenScreenshot(page, 'downloads-empty.png')
  })

  test('offline: the OfflineBanner appears when the network drops and hides on reconnect', async ({
    page,
    context,
  }) => {
    await prepareCapture(page, { viewport: DESKTOP_VIEWPORT })
    await page.goto('/library')
    await page.getByRole('heading', { name: 'Your library' }).waitFor()
    await expect(page.getByTestId('offline-banner')).toBeHidden()

    await context.setOffline(true)
    await expect(page.getByTestId('offline-banner')).toBeVisible()
    await settle(page)
    await goldenScreenshot(page, 'library-offline-banner.png', {
      mask: [page.getByTestId('sync-pill'), page.getByTestId('library-counts')],
    })

    await context.setOffline(false)
    await expect(page.getByTestId('offline-banner')).toBeHidden()
  })
})

test.describe('visual states — pointer & focus feedback', () => {
  test('a visible focus ring is rendered when a control is keyboard-focused', async ({ page }) => {
    await prepareCapture(page, { viewport: DESKTOP_VIEWPORT })
    await page.goto('/library')
    await page.getByRole('heading', { name: 'Your library' }).waitFor()

    await page.keyboard.press('Tab')
    const focus = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null
      if (!el) return null
      const cs = getComputedStyle(el)
      return { tag: el.tagName, outlineStyle: cs.outlineStyle, outlineWidth: cs.outlineWidth }
    })
    expect(focus).not.toBeNull()
    expect(['A', 'BUTTON', 'INPUT']).toContain(focus!.tag)
    expect(focus!.outlineStyle).not.toBe('none')
    expect(parseFloat(focus!.outlineWidth)).toBeGreaterThanOrEqual(1)
  })

  test('hover changes a nav item background (hover affordance)', async ({ page }) => {
    await prepareCapture(page, { viewport: DESKTOP_VIEWPORT })
    await page.goto('/library')
    const search = page.getByRole('link', { name: 'Search' })
    const before = await search.evaluate((el) => getComputedStyle(el).backgroundColor)
    await search.hover()
    const after = await search.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(after).not.toBe(before)
  })
})

test.describe('visual states — view modes', () => {
  test('library grid↔list toggle re-lays-out the recently-added section and toggles back', async ({
    page,
  }) => {
    await prepareCapture(page, { viewport: DESKTOP_VIEWPORT })
    await page.goto('/library')
    await page.getByText('Frankenstein').first().waitFor()

    // Grid → List: the same entries re-render in the list layout (viewMode is transient view state).
    await page.getByRole('button', { name: 'List' }).click()
    await expect(page.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText('Frankenstein').first()).toBeVisible()

    // Toggling back restores the grid.
    await page.getByRole('button', { name: 'Grid' }).click()
    await expect(page.getByRole('button', { name: 'Grid' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText('Frankenstein').first()).toBeVisible()
  })

  test('reader paged↔scroll toggle flips the layout control', async ({ page }) => {
    await prepareCapture(page, { viewport: DESKTOP_VIEWPORT })
    await routeEpubFixture(page)
    await openReaderFromDetail(page)
    await expect(page.getByTestId('reader-readout')).toContainText('p.', { timeout: 30_000 })
    await page.getByRole('button', { name: 'Reading preferences' }).click()

    await page.getByRole('button', { name: 'Scroll' }).click()
    await expect(page.getByRole('button', { name: 'Scroll' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await page.getByRole('button', { name: 'Paged' }).click()
    await expect(page.getByRole('button', { name: 'Paged' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })
})
