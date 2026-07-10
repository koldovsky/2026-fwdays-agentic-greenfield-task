/**
 * Gate-2 e2e — add-app-shell spec.
 *
 * Drives the plan's e2e scenario (happy path) and captures a video + screenshots as evidence.
 * Written by the Gate-2 checker agent (independent from the maker).
 *
 * Scenario (from plan.md):
 *   open /home → parchment shell + sidebar (Edda wordmark, Home active, SOURCES, Add source, footer)
 *   → click Library (active moves, sidebar persists)
 *   → click Settings (sidebar → SETTINGS, SOURCES gone)
 *   → click General (active moves)
 *   → navigate /reader/home-server/book-42/epub → sidebar absent, full-bleed
 *
 * Screenshots: shell, settings, reader (baseline for change-11 regression).
 */
import { expect, test } from '@playwright/test'

test.describe('add-app-shell — e2e happy path', () => {
  test('parchment shell + sidebar renders on /home', async ({ page }) => {
    await page.goto('/home')

    // Parchment invariant: body background = rgb(240, 238, 233) ≡ #F0EEE9
    const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    expect(bodyBg).toBe('rgb(240, 238, 233)')

    // Sidebar — Edda wordmark (the RouterLink wrapping the wordmark renders as <a>)
    await expect(page.getByRole('link', { name: 'Edda' })).toBeVisible()

    // Primary nav links present
    await expect(page.getByRole('link', { name: 'Home' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Library' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Search' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Downloads' })).toBeVisible()

    // SOURCES region present (non-settings route)
    await expect(page.getByText('Sources', { exact: true })).toBeVisible()
    await expect(page.getByText('Add source')).toBeVisible()

    // Footer links (Extensions + Settings)
    await expect(page.getByRole('link', { name: 'Extensions' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible()

    // Home is the active nav item
    const homeLink = page.getByRole('link', { name: 'Home' })
    await expect(homeLink).toHaveAttribute('aria-current', 'page')

    await page.screenshot({
      path: 'loop/artifacts/add-app-shell/attempt-1/gate2/playwright/01-home-shell.png',
    })
  })

  test('active nav item moves to Library after clicking Library', async ({ page }) => {
    await page.goto('/home')

    await page.getByRole('link', { name: 'Library' }).click()
    await page.waitForURL('**/library')

    // Active item moved
    const libraryLink = page.getByRole('link', { name: 'Library' })
    await expect(libraryLink).toHaveAttribute('aria-current', 'page')

    // Sidebar still present (persistent chrome)
    await expect(page.getByRole('link', { name: 'Edda' })).toBeVisible()
    await expect(page.getByText('Sources', { exact: true })).toBeVisible()
  })

  test('Settings sidebar: SETTINGS region replaces SOURCES after clicking Settings', async ({
    page,
  }) => {
    await page.goto('/home')

    // Click the "Settings" footer link (navigates to /settings/general)
    // There are two links with "Settings" text: the nav item and the footer link.
    // The footer link is inside the sidebar footer div; use the one that goes to /settings/general.
    await page.getByRole('link', { name: 'Settings' }).last().click()
    await page.waitForURL('**/settings/**')

    // SETTINGS section header visible
    await expect(page.getByText('Settings', { exact: true }).first()).toBeVisible()

    // Settings sub-items visible
    await expect(page.getByRole('link', { name: 'Extensions' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Reading' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'General' })).toBeVisible()

    // SOURCES region + Add source must be gone
    await expect(page.getByText('Sources', { exact: true })).not.toBeVisible()
    await expect(page.getByText('Add source')).not.toBeVisible()

    await page.screenshot({
      path: 'loop/artifacts/add-app-shell/attempt-1/gate2/playwright/02-settings-sidebar.png',
    })
  })

  test('General becomes active when navigating to /settings/general', async ({ page }) => {
    await page.goto('/settings/general')

    const generalLink = page.getByRole('link', { name: 'General' })
    await expect(generalLink).toHaveAttribute('aria-current', 'page')
  })

  test('reader route is full-bleed — no aside/sidebar in the DOM', async ({ page }) => {
    await page.goto('/reader/home-server/book-42/epub')

    // No sidebar element in the DOM at all
    const aside = page.locator('aside')
    await expect(aside).not.toBeAttached()

    // The full-bleed reader shell renders its own top bar (implemented in add-reader-navigation).
    // (`epub` is not a real media type, so the renderer reports it cannot open — the shell still shows.)
    await expect(page.getByRole('button', { name: 'Library', exact: true })).toBeVisible()

    // Reader still has parchment bg (full-bleed canvas, not void)
    const bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
    expect(bodyBg).toBe('rgb(240, 238, 233)')

    await page.screenshot({
      path: 'loop/artifacts/add-app-shell/attempt-1/gate2/playwright/03-reader-full-bleed.png',
    })
  })

  test('parchment body bg invariant is rgb(240, 238, 233) (#F0EEE9) on every shell route', async ({
    page,
  }) => {
    for (const path of ['/home', '/library', '/search', '/settings/extensions']) {
      await page.goto(path)
      const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor)
      expect(bg, `body bg on ${path}`).toBe('rgb(240, 238, 233)')
    }
  })
})
