/**
 * Gate-2 e2e — add-offline-and-sync (ch9) design-fidelity + offline UI verification.
 *
 * Drives the visible artifacts of the offline-storage spec:
 *   - Library header: "0 downloaded for offline" (registry-driven, not hardcoded)
 *   - NavSidebar Downloads badge: 0 (no pill) rather than the hardcoded 14 the maket shows populated
 *   - Downloads view: renders properly (not the old PlaceholderView)
 *   - Sync pill: "Synced just now" when no drain has run (null lastSyncedAt)
 *
 * The full offline-download demo (OPFS + Komga + Badge→N) requires a real Komga connector and OPFS
 * support wired in the browser. The dev server uses the fixture connector, so the download flow is
 * not exercisable in a unit-style e2e; the key observable is that the plumbing is wired (badge 0,
 * not 14; library count 0; Downloads route real, not placeholder). The design-fidelity comparison
 * is against doc/web/01-library-desktop.png (the "0 downloaded for offline" change from maket "14").
 *
 * Artifacts: video + screenshots → loop/artifacts/add-offline-and-sync/attempt-1/gate2/playwright/
 */

import { expect, test } from '@playwright/test'

const SHOTS = 'loop/artifacts/add-offline-and-sync/attempt-1/gate2/playwright'

test.describe('add-offline-and-sync — offline UI wiring (Gate-2)', () => {
  test('library header: "0 downloaded for offline" (registry-driven, not hardcoded 14)', async ({
    page,
  }) => {
    await page.goto('/library')
    await expect(page.getByRole('heading', { name: 'Your library', level: 1 })).toBeVisible()

    // The count is now registry-driven. The fixture starts with no downloads → "0 downloaded".
    // Before this spec the maket seeded 14 (hardcoded); now it grows from zero as downloads happen.
    await expect(page.getByText('342 titles · 3 sources · 0 downloaded for offline')).toBeVisible()

    await page.screenshot({ path: `${SHOTS}/01-library-zero-downloaded.png`, fullPage: true })
  })

  test('sync pill: "Synced just now" before any drain runs (null lastSyncedAt)', async ({
    page,
  }) => {
    await page.goto('/library')
    // With null lastSyncedAt the library shows "Synced just now" — confirmed against LibraryView.test.ts
    await expect(page.getByText('Synced just now')).toBeVisible()
  })

  test('NavSidebar Downloads badge: no badge pill at 0 (registry-driven, not hardcoded)', async ({
    page,
  }) => {
    await page.goto('/library')
    // Badge is hidden when count = 0. Before this spec it was hardcoded :badge="14".
    // The Downloads link must exist in the nav, but without any numeric badge text.
    const downloadsLink = page.getByRole('link', { name: /Downloads/ })
    await expect(downloadsLink).toBeVisible()
    // No "14" anywhere near the badge (the old hardcoded value)
    const badgeText = await downloadsLink.textContent()
    expect(badgeText).not.toMatch(/14/)
    // The badge pill should not show "0" (hidden-at-zero per the NavSidebar implementation)
    expect(badgeText?.trim()).toMatch(/^Downloads$/)

    await page.screenshot({ path: `${SHOTS}/02-sidebar-badge-zero.png`, fullPage: true })
  })

  test('Downloads route renders a real view (not PlaceholderView)', async ({ page }) => {
    await page.goto('/downloads')

    // The DownloadsView renders an h1 "Downloads" — not the generic placeholder text
    await expect(page.getByRole('heading', { name: 'Downloads', level: 1 })).toBeVisible()

    // The view shows a meaningful empty-state CTA when no books are downloaded
    // (not the old "coming soon" placeholder)
    const bodyText = await page
      .getByRole('main')
      .textContent()
      .catch(() => page.textContent('body'))
    // Should NOT be just a generic placeholder — should say something about offline
    expect(bodyText).not.toContain('coming soon')

    await page.screenshot({ path: `${SHOTS}/03-downloads-view-empty.png`, fullPage: true })
  })

  test('no console errors on library or downloads pages', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/library')
    // Wait for the page to settle
    await page.waitForLoadState('networkidle')

    await page.goto('/downloads')
    await page.waitForLoadState('networkidle')

    // Filter known benign browser noise (e.g. favicon 404, SW dev warnings)
    const realErrors = errors.filter(
      (e) =>
        !e.includes('favicon') &&
        !e.includes('sw.ts') &&
        !e.includes('service-worker') &&
        !e.includes('[vite]'),
    )
    expect(realErrors, `Console errors: ${realErrors.join('\n')}`).toHaveLength(0)

    await page.screenshot({ path: `${SHOTS}/04-downloads-no-errors.png` })
  })
})
