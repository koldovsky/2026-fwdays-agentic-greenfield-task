/**
 * Visual — Reader two-page spread vs doc/web/03-reader-desktop-epub-spread.png.
 *
 * The reader renders book content on a SEPARATE origin (:5174) behind the postMessage bridge (ADR-013),
 * and book bytes come from the routed EPUB fixture (bytes bypass the SW — ADR-005). The book iframe is
 * non-deterministic across runs, so the reader-mount is ALWAYS masked: the compare/golden assert the app
 * CHROME (top bar, edge chevrons, position scrubber + readout), which is what ch11 owns. The book recolor
 * itself is covered by add-reading-preferences (ch8).
 */
import { resolve } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import {
  DESKTOP_VIEWPORT,
  compareToMaket,
  goldenScreenshot,
  prepareCapture,
  readerMask,
  settle,
} from './capture-helper'
import { PIXEL_THRESHOLD, THUMB_WIDTH, TIER1 } from './tolerances'
import { routeEpubFixture } from './maket-seed'

const web = (f: string) => resolve(process.cwd(), 'doc/web', f)
const READER_MAKET_CROP = { x: 0, y: 85, width: 1300, height: 794 } as const

async function openReader(page: Page): Promise<void> {
  await page.goto('/book/home-server/pride-and-prejudice')
  await page.getByRole('button', { name: /reading/i }).click()
  await expect(page).toHaveURL(/\/reader\/home-server\/pride-and-prejudice/)
  await page
    .locator('[data-testid="reader-mount"] iframe')
    .waitFor({ state: 'attached', timeout: 30_000 })
  await expect(page.getByTestId('reader-readout')).toContainText('p.', { timeout: 30_000 })
  await settle(page, 400)
}

test.describe('visual — Reader spread (doc/web/03)', () => {
  test('desktop chrome matches the maket (Tier-1) and the golden (Tier-2)', async ({
    page,
  }, testInfo) => {
    await prepareCapture(page, { viewport: DESKTOP_VIEWPORT })
    await routeEpubFixture(page)
    await openReader(page)

    await compareToMaket(page, testInfo, 'reader', {
      maketPath: web('03-reader-desktop-epub-spread.png'),
      crop: READER_MAKET_CROP,
      mask: readerMask(page),
      tolerance: TIER1.reader,
      thumbWidth: THUMB_WIDTH,
      pixelThreshold: PIXEL_THRESHOLD,
    })

    await goldenScreenshot(page, 'reader-desktop.png', { mask: readerMask(page) })
  })
})
