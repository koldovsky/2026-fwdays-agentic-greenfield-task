/**
 * a11y — keyboard operability + focus management (visual-fidelity §"Keyboard navigation and
 * accessibility"): logical focus order, Enter to activate, reader paging by keyboard, modal focus-trap
 * + Escape-to-close, and accessible names on icon-only controls.
 */
import { expect, test, type Page } from '@playwright/test'
import { routeEpubFixture } from '../visual/maket-seed'

async function openReader(page: Page): Promise<void> {
  await page.goto('/book/home-server/pride-and-prejudice')
  await page.getByRole('button', { name: /reading/i }).click()
  await expect(page.getByTestId('reader-readout')).toContainText('p.', { timeout: 30_000 })
}

test.describe('a11y — keyboard navigation', () => {
  test('Tab reaches focusable controls in order; Enter on a book card navigates', async ({
    page,
  }) => {
    await page.goto('/library')
    await page.getByText('Frankenstein').first().waitFor()

    // A handful of Tabs lands on real focusable controls (no trap, no dead stops).
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Tab')
      const tag = await page.evaluate(() => document.activeElement?.tagName ?? null)
      expect(['A', 'BUTTON', 'INPUT']).toContain(tag)
    }

    // Enter on a focused book card navigates to its detail.
    await page
      .getByRole('link', { name: /Frankenstein/ })
      .first()
      .focus()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/book\//)
  })

  test('icon-only controls expose accessible names', async ({ page }) => {
    await routeEpubFixture(page)
    await openReader(page)
    await expect(page.getByRole('button', { name: 'Previous page' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Next page' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Reading preferences' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Table of contents' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Bookmark this position' })).toBeVisible()
  })

  test('reader pages with the keyboard (ArrowRight advances the position)', async ({ page }) => {
    await routeEpubFixture(page)
    await openReader(page)
    const readout = page.getByTestId('reader-readout')
    const before = await readout.textContent()
    await page.locator('body').press('ArrowRight')
    await expect.poll(async () => readout.textContent(), { timeout: 15_000 }).not.toBe(before)
  })

  test('Add-source modal traps focus and Escape closes it', async ({ page }) => {
    await page.goto('/settings/sources/add')
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: 'Add a source' })).toBeVisible()

    // Native <dialog> showModal() keeps focus inside: after several Tabs the active element is in-dialog.
    for (let i = 0; i < 8; i++) await page.keyboard.press('Tab')
    const inDialog = await page.evaluate(() => {
      const el = document.activeElement
      return !!el && !!el.closest('dialog')
    })
    expect(inDialog).toBe(true)

    await page.keyboard.press('Escape')
    await expect(page).toHaveURL(/\/library/)
  })

  test('Capability-missing sheet traps focus and Escape closes it', async ({ page }) => {
    await page.route('**/fixtures/the-picture-of-dorian-gray.pdf', (route) =>
      route.fulfill({ status: 200, contentType: 'application/pdf', body: '%PDF-1.4' }),
    )
    await page.goto('/library')
    await page
      .getByRole('link', { name: /Dorian Gray/ })
      .first()
      .click()
    await page.getByRole('button', { name: /read/i }).first().click()
    const heading = page.getByRole('heading', { name: 'Install PDF support?' })
    await expect(heading).toBeVisible({ timeout: 15_000 })

    const inDialog = await page.evaluate(() => !!document.activeElement?.closest('dialog'))
    expect(inDialog).toBe(true)

    await page.keyboard.press('Escape')
    await expect(heading).toBeHidden()
  })
})
