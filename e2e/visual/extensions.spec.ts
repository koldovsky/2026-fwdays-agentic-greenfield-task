/**
 * Visual — Extensions registry vs doc/web/06-extensions-desktop.png + doc/mobile/06-extensions-mobile.png.
 * INSTALLED·3 (bundled OPDS/Komga/EPUB) + AVAILABLE (PDF/Kavita/Calibre/CBZ). Deterministic (registry
 * defaults), so no mask required.
 */
import { resolve } from 'node:path'
import { test, type Page } from '@playwright/test'
import {
  DESKTOP_MAKET_CROP,
  DESKTOP_VIEWPORT,
  MOBILE_VIEWPORT,
  compareToMaket,
  goldenScreenshot,
  prepareCapture,
  settle,
} from './capture-helper'
import { PIXEL_THRESHOLD, THUMB_WIDTH, TIER1 } from './tolerances'

const web = (f: string) => resolve(process.cwd(), 'doc/web', f)

async function gotoExtensions(page: Page): Promise<void> {
  await page.goto('/settings/extensions')
  await page.getByRole('heading', { name: 'Extensions', level: 1 }).waitFor()
  await page.getByTestId('installed-heading').waitFor()
  await settle(page)
}

test.describe('visual — Extensions (doc/web/06, doc/mobile/06)', () => {
  test('desktop matches the maket (Tier-1) and the golden (Tier-2)', async ({ page }, testInfo) => {
    await prepareCapture(page, { viewport: DESKTOP_VIEWPORT })
    await gotoExtensions(page)

    await compareToMaket(page, testInfo, 'extensions', {
      maketPath: web('06-extensions-desktop.png'),
      crop: DESKTOP_MAKET_CROP,
      tolerance: TIER1.extensions,
      thumbWidth: THUMB_WIDTH,
      pixelThreshold: PIXEL_THRESHOLD,
    })

    await goldenScreenshot(page, 'extensions-desktop.png')
  })

  test('mobile matches the golden (Tier-2)', async ({ page }) => {
    await prepareCapture(page, { viewport: MOBILE_VIEWPORT })
    await gotoExtensions(page)
    await goldenScreenshot(page, 'extensions-mobile.png')
  })
})
