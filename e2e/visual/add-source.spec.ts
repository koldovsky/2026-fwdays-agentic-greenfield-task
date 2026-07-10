/**
 * Visual — Add a source vs doc/web/05-add-source-desktop.png.
 *
 * The maket shows the Detected step (Komga detected, capability chips, Connect). Detection runs the real
 * server prober, which needs a live Komga — so the Detected-step compare is GATED on Komga reachability
 * (skips, never fails, when down; consistent with the design's serverless-visual intent). The Address
 * step is serverless and always captured as a golden.
 */
import { resolve } from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import {
  compareToMaket,
  goldenLocator,
  prepareCapture,
  settle,
  DESKTOP_VIEWPORT,
} from './capture-helper'
import { PIXEL_THRESHOLD, THUMB_WIDTH, TIER1 } from './tolerances'

const web = (f: string) => resolve(process.cwd(), 'doc/web', f)
const KOMGA_URL = 'http://localhost:25600'
// The centred 36rem modal within the 1300×881 maket.
const MODAL_MAKET_CROP = { x: 360, y: 110, width: 580, height: 670 } as const

async function komgaReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${KOMGA_URL}/api/v1/oauth2/userinfo`, {
      signal: AbortSignal.timeout(2000),
    })
    return res.status < 600 // any HTTP answer means the server is up (401 is expected unauthenticated)
  } catch {
    return false
  }
}

async function openModal(page: Page): Promise<Page> {
  await page.goto('/settings/sources/add')
  await expect(
    page.getByRole('dialog').getByRole('heading', { name: 'Add a source' }),
  ).toBeVisible()
  return page
}

test.describe('visual — Add a source (doc/web/05)', () => {
  test('Address step matches the golden (Tier-2, serverless)', async ({ page }) => {
    await prepareCapture(page, { viewport: DESKTOP_VIEWPORT })
    await openModal(page)
    await settle(page)
    await goldenLocator(page.getByRole('dialog'), 'add-source-address.png')
  })

  test('Detected step matches the maket (Tier-1) and the golden (Tier-2)', async ({
    page,
  }, testInfo) => {
    test.skip(!(await komgaReachable()), 'Komga not provisioned — run pnpm komga:provision')
    await prepareCapture(page, { viewport: DESKTOP_VIEWPORT })
    await openModal(page)

    const modal = page.getByRole('dialog')
    await modal.locator('#add-source-url').fill(KOMGA_URL)
    await expect(modal.getByTestId('adapter-ready')).toBeVisible({ timeout: 15_000 })
    await expect(modal.getByText('Komga server')).toBeVisible()
    await settle(page, 400)

    await compareToMaket(page, testInfo, 'addSource', {
      maketPath: web('05-add-source-desktop.png'),
      crop: MODAL_MAKET_CROP,
      target: modal,
      tolerance: TIER1.addSource,
      thumbWidth: THUMB_WIDTH,
      pixelThreshold: PIXEL_THRESHOLD,
    })

    await goldenLocator(modal, 'add-source-detected.png')
  })
})
