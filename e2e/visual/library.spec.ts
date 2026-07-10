/**
 * Visual — Library home vs doc/web/01-library-desktop.png + doc/mobile/01-library-mobile.png.
 * Tier-1 (structural maket compare) on desktop; Tier-2 committed goldens on desktop + mobile. The
 * volatile "Synced …" pill and "… downloaded" count line are masked. Runs on the seeded fixture
 * connector wired in main.ts (no extra seeding — it already mirrors the maket catalog).
 */
import { resolve } from 'node:path'
import { test } from '@playwright/test'
import {
  DESKTOP_MAKET_CROP,
  DESKTOP_VIEWPORT,
  MOBILE_VIEWPORT,
  compareToMaket,
  goldenScreenshot,
  prepareCapture,
  settle,
  volatileMasks,
} from './capture-helper'
import { PIXEL_THRESHOLD, THUMB_WIDTH, TIER1 } from './tolerances'

const web = (f: string) => resolve(process.cwd(), 'doc/web', f)

async function gotoLibrary(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('/library')
  await page.getByRole('heading', { name: 'Your library' }).waitFor()
  // The catalog has resolved once a recently-added cover is on screen (past the loading branch).
  await page.getByText('Frankenstein').first().waitFor()
  await settle(page)
}

test.describe('visual — Library (doc/web/01, doc/mobile/01)', () => {
  test('desktop matches the maket (Tier-1) and the golden (Tier-2)', async ({ page }, testInfo) => {
    await prepareCapture(page, { viewport: DESKTOP_VIEWPORT })
    await gotoLibrary(page)

    await compareToMaket(page, testInfo, 'library', {
      maketPath: web('01-library-desktop.png'),
      crop: DESKTOP_MAKET_CROP,
      mask: volatileMasks(page),
      tolerance: TIER1.library,
      thumbWidth: THUMB_WIDTH,
      pixelThreshold: PIXEL_THRESHOLD,
    })

    await goldenScreenshot(page, 'library-desktop.png', { mask: volatileMasks(page) })
  })

  test('mobile matches the golden (Tier-2)', async ({ page }) => {
    await prepareCapture(page, { viewport: MOBILE_VIEWPORT })
    await gotoLibrary(page)
    await goldenScreenshot(page, 'library-mobile.png', { mask: volatileMasks(page) })
  })
})
