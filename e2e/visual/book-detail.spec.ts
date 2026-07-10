/**
 * Visual — Book detail vs doc/web/02-book-detail-desktop.png + doc/mobile/02-book-detail-mobile.png.
 * Pride & Prejudice on the fixture connector (cover, metadata chips, YOUR PROGRESS 38%, SYNCED PER
 * FORMAT, chapters). Deterministic — the fixture's progress is fixed, so no mask is required.
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

async function gotoBookDetail(page: Page): Promise<void> {
  await page.goto('/book/home-server/pride-and-prejudice')
  await page.getByRole('heading', { name: 'Pride and Prejudice', level: 1 }).waitFor()
  await settle(page)
}

test.describe('visual — Book detail (doc/web/02, doc/mobile/02)', () => {
  test('desktop matches the maket (Tier-1) and the golden (Tier-2)', async ({ page }, testInfo) => {
    await prepareCapture(page, { viewport: DESKTOP_VIEWPORT })
    await gotoBookDetail(page)

    await compareToMaket(page, testInfo, 'bookDetail', {
      maketPath: web('02-book-detail-desktop.png'),
      crop: DESKTOP_MAKET_CROP,
      tolerance: TIER1.bookDetail,
      thumbWidth: THUMB_WIDTH,
      pixelThreshold: PIXEL_THRESHOLD,
    })

    await goldenScreenshot(page, 'book-detail-desktop.png')
  })

  test('mobile matches the golden (Tier-2)', async ({ page }) => {
    await prepareCapture(page, { viewport: MOBILE_VIEWPORT })
    await gotoBookDetail(page)
    await goldenScreenshot(page, 'book-detail-mobile.png')
  })
})
