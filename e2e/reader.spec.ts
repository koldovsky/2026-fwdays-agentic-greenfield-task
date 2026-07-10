/**
 * e2e — add-reader-origin-isolation (ADR-013): the Reader screen renders book content on a SEPARATE
 * origin (:5174) behind an app<->frame postMessage bridge, so a malicious EPUB physically cannot reach
 * the app origin's `edda.creds.*`. Both run as real dev servers via playwright.config's two webServers.
 *
 * Test A (benign, design fidelity + behaviour): drive the real app — Library -> Book detail -> Read ->
 * /reader — on the fixture connector serving a real EPUB (the small Pensées fixture, routed in for the
 * maket book). Assert the book renders inside a CROSS-ORIGIN iframe (src on the reader origin, not the
 * app), that paging (chevron, ArrowRight) moves the position over the bridge, and that "← Library"
 * returns AND tears the iframe down — with no console errors. Captures a screenshot (+ video).
 *
 * Test B (negative security, origin isolation): render a single-spine EPUB whose `<script>` tries to
 * steal the app's seeded connector credential via `window.top.localStorage` (the app is cross-origin to
 * the reader frame). Assert BOTH WAYS: the script DID run (it recorded the block in its own reader-frame
 * origin: BLOCKED = 'blocked-SecurityError') AND it was DENIED (the app origin's STOLEN stays null and
 * the credential is intact). This is the credential-exfil class closed by construction — the four prior
 * sanitiser-bypass vectors (SVG-root / forged media-type / manifest drift / loadBlob) are all moot
 * because nothing the in-frame script does can reach the app origin.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Buffer } from 'node:buffer'
import { expect, test, type Frame, type Page } from '@playwright/test'
import {
  XSS_BLOCKED_KEY,
  XSS_CREDS_KEY,
  XSS_CREDS_VALUE,
  XSS_STOLEN_KEY,
  buildSingleSpineXssEpub,
} from './helpers/epub-fixture'

const SHOTS = 'loop/artifacts/add-reader-origin-isolation/attempt-1/gate1/playwright'
const READER_ORIGIN = 'http://localhost:5174'
const PENSEES = 'blaise-pascal_pensees.epub'

/** The cross-origin reader frame (its url is `http://localhost:5174/`; the blob spine iframes are not). */
function readerFrame(page: Page): Frame | undefined {
  return page.frames().find((f) => f.url().startsWith(READER_ORIGIN + '/'))
}

test.describe('add-reader-origin-isolation — Reader on a separate origin (real Chromium)', () => {
  test('Test A — benign EPUB paginates inside the cross-origin frame, then tears down', async ({
    page,
  }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('favicon')) consoleErrors.push(msg.text())
    })
    page.on('pageerror', (error) => consoleErrors.push(error.message))

    const bytes = readFileSync(resolve(process.cwd(), 'test-epubs', PENSEES))
    await page.route('**/fixtures/pride-and-prejudice.epub', (route) =>
      route.fulfill({ status: 200, contentType: 'application/epub+zip', body: bytes }),
    )

    await page.goto('/library')
    await page
      .getByRole('link', { name: /Pride and Prejudice/ })
      .first()
      .click()
    await expect(page).toHaveURL(/\/book\/home-server\/pride-and-prejudice/)
    await page.getByRole('button', { name: /reading/ }).click()
    await expect(page).toHaveURL(/\/reader\/home-server\/pride-and-prejudice/)

    // Book content renders in a CROSS-ORIGIN iframe — NOT a foliate-view on the app origin.
    const frameEl = page.locator('[data-testid="reader-mount"] iframe')
    await frameEl.waitFor({ state: 'attached', timeout: 30_000 })
    const src = await frameEl.getAttribute('src')
    expect(src, 'reader iframe is served from the reader origin').toBe(READER_ORIGIN)
    expect(new URL(src!).origin).not.toBe(new URL(page.url()).origin)

    // Top bar identity comes from connector metadata (app origin), independent of the framed content.
    await expect(page.getByTestId('reader-title')).toHaveText('Pride and Prejudice')

    // The position bar (app origin) is driven by `locatorChanged` over the bridge.
    const readout = page.getByTestId('reader-readout')
    await expect(readout).toContainText('p.', { timeout: 30_000 })

    const settle = async (): Promise<string> => {
      let previous = (await readout.textContent()) ?? ''
      for (let i = 0; i < 15; i++) {
        await page.waitForTimeout(200)
        const current = (await readout.textContent()) ?? ''
        if (current === previous) return current
        previous = current
      }
      return previous
    }

    await settle()
    await page.screenshot({ path: `${SHOTS}/01-reader-cross-origin-frame.png` })

    // The folio readout ("p. N") comes from foliate's paginated `location.current`, which advances every
    // few turns even though the rendered page turns on EVERY input — so assert NET FORWARD progress: turn
    // until the folio moves past `from` (bounded, so a genuinely stuck reader still fails). Each turn
    // crosses the async cross-origin bridge.
    const pageNo = async (): Promise<number> => {
      const match = ((await readout.textContent()) ?? '').match(/p\.\s*(\d+)/)
      return match ? Number(match[1]) : 0
    }
    const advancePast = async (from: number, turn: () => Promise<void>): Promise<void> => {
      for (let i = 0; i < 12; i++) {
        await turn()
        await page.waitForTimeout(500)
        if ((await pageNo()) > from) return
      }
      expect(await pageNo(), `reader did not advance past page ${from}`).toBeGreaterThan(from)
    }

    // The Next chevron pages forward — a direct navigator.next() forwarded over the bridge.
    const startPage = await pageNo()
    await advancePast(startPage, () => page.getByRole('button', { name: 'Next page' }).click())

    // ArrowRight pages forward too — the app's window keydown → navigator.next() over the bridge.
    const afterChevron = await pageNo()
    await advancePast(afterChevron, () => page.locator('body').press('ArrowRight'))

    // ← Library returns AND tears the navigator down — the cross-origin iframe is removed.
    await page.getByRole('button', { name: 'Library' }).click()
    await expect(page).toHaveURL(/\/library/)
    await expect(page.locator('[data-testid="reader-mount"] iframe')).toHaveCount(0)

    expect(consoleErrors, `unexpected console errors: ${consoleErrors.join(' | ')}`).toEqual([])
  })

  test('Test B — a book script cannot read the app origin credential (both ways)', async ({
    page,
  }) => {
    const probe = Buffer.from(buildSingleSpineXssEpub())
    await page.route('**/fixtures/pride-and-prejudice.epub', (route) =>
      route.fulfill({ status: 200, contentType: 'application/epub+zip', body: probe }),
    )

    await page.goto('/library')
    // Seed the connector credential on the APP origin BEFORE the book opens.
    await page.evaluate(
      ([key, value]) => localStorage.setItem(key, value),
      [XSS_CREDS_KEY, XSS_CREDS_VALUE],
    )

    // Navigate to the reader through the UI (robust route encoding): Library -> detail -> Read.
    await page
      .getByRole('link', { name: /Pride and Prejudice/ })
      .first()
      .click()
    await expect(page).toHaveURL(/\/book\/home-server\/pride-and-prejudice/)
    await page.getByRole('button', { name: /reading/ }).click()
    await expect(page).toHaveURL(/\/reader\/home-server\/pride-and-prejudice/)

    // The book renders in the cross-origin reader frame; its single spine script runs on open.
    const frameEl = page.locator('[data-testid="reader-mount"] iframe')
    await frameEl.waitFor({ state: 'attached', timeout: 30_000 })
    expect(await frameEl.getAttribute('src')).toBe(READER_ORIGIN)

    // Give the spine script time to load + run (+ one defensive page turn).
    const frame = readerFrame(page)
    expect(frame, 'reader frame attached').toBeTruthy()
    await expect
      .poll(async () => frame!.evaluate((k) => localStorage.getItem(k), XSS_BLOCKED_KEY), {
        timeout: 30_000,
      })
      .toBe('blocked-SecurityError')

    // (1) The script EXECUTED and was BLOCKED — recorded in its OWN (reader-frame) origin.
    const blocked = await frame!.evaluate((k) => localStorage.getItem(k), XSS_BLOCKED_KEY)
    expect(blocked, 'the in-frame script ran and was denied by the same-origin policy').toBe(
      'blocked-SecurityError',
    )

    // (2) The app origin is untouched: nothing was stolen, and the credential is intact.
    const appState = await page.evaluate(
      ([stolenKey, credsKey]) => ({
        stolen: localStorage.getItem(stolenKey),
        creds: localStorage.getItem(credsKey),
      }),
      [XSS_STOLEN_KEY, XSS_CREDS_KEY],
    )
    expect(appState.stolen, 'nothing was written to the app origin').toBeNull()
    expect(appState.creds, 'the connector credential is intact on the app origin').toBe(
      XSS_CREDS_VALUE,
    )
  })
})
