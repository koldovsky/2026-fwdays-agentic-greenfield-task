/**
 * Visual — Reading themes & preferences vs doc/mobile/04-reading-themes-and-preferences.png.
 *
 * doc/mobile/04 is a 2310×946 COMPOSITE of five phones — four themed reader moods + the Display panel
 * (triage T3). It is not a single Playwright screen. Per the plan: the Display sheet is compared against
 * the composite's panel sub-region (Tier-1), and each of the four themes is captured as its own golden
 * (Tier-2) showing the selected-swatch indicator. The book recolor itself is owned + verified by
 * add-reading-preferences (ch8) and the Komga e2e; here we assert the panel chrome + theme selection.
 */
import { resolve } from 'node:path'
import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  MOBILE_VIEWPORT,
  compareToMaket,
  goldenLocator,
  prepareCapture,
  settle,
} from './capture-helper'
import { PIXEL_THRESHOLD, THUMB_WIDTH, TIER1 } from './tolerances'
import { routeEpubFixture } from './maket-seed'

const mobile = (f: string) => resolve(process.cwd(), 'doc/mobile', f)
// The 5th phone's Display sheet within the 2310×946 composite (triage T3).
const PANEL_MAKET_CROP = { x: 1900, y: 398, width: 408, height: 420 } as const
const THEMES = ['Light', 'Sepia', 'Dark', 'Parchment'] as const

async function openPanel(page: Page): Promise<Locator> {
  await page.goto('/book/home-server/pride-and-prejudice')
  await page.getByRole('button', { name: /reading/i }).click()
  await expect(page).toHaveURL(/\/reader\/home-server\/pride-and-prejudice/)
  await expect(page.getByTestId('reader-readout')).toContainText('p.', { timeout: 30_000 })
  await page.getByRole('button', { name: 'Reading preferences' }).click()
  await expect(page.getByTestId('display-panel')).toBeVisible()
  await settle(page, 300)
  return page.locator('[data-testid="display-panel"] section').first()
}

test.describe('visual — Reading themes & preferences (doc/mobile/04)', () => {
  test('Display panel matches the maket (Tier-1) and each theme has a golden (Tier-2)', async ({
    page,
  }, testInfo) => {
    await prepareCapture(page, { viewport: MOBILE_VIEWPORT })
    await routeEpubFixture(page)
    const sheet = await openPanel(page)

    // The maket panel shows Dark selected — match it for the Tier-1 structural compare.
    await page.getByRole('button', { name: 'Dark' }).click()
    await expect(page.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true')
    await settle(page, 200)

    await compareToMaket(page, testInfo, 'readingPreferences', {
      maketPath: mobile('04-reading-themes-and-preferences.png'),
      crop: PANEL_MAKET_CROP,
      target: sheet,
      tolerance: TIER1.readingPreferences,
      thumbWidth: THUMB_WIDTH,
      pixelThreshold: PIXEL_THRESHOLD,
    })

    // Tier-2: one golden per theme (each shows its selected swatch — "selected theme is indicated").
    for (const theme of THEMES) {
      await page.getByRole('button', { name: theme }).click()
      await expect(page.getByRole('button', { name: theme })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
      await settle(page, 150)
      await goldenLocator(sheet, `display-panel-${theme.toLowerCase()}.png`)
    }
  })
})
