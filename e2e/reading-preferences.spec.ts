/**
 * e2e — add-reading-preferences (ch8): the Display panel restyles the BOOK content live through the
 * navigator (readium-css inside the cross-origin reader frame, ADR-013), persists globally, and restores
 * on reopen. Drives the real app — Library -> Book detail -> Read on the fixture connector serving a real
 * EPUB — then opens the "Aa" panel and asserts each control reflows the book: theme changes the spine body
 * background, typeface changes its font-family, the slider enlarges its text, and Scroll flips the foliate
 * flow. Finally it returns to the Library, RELOADS (exercising synchronous localStorage rehydration), and
 * reopens the book: the preferences are restored, the book paints already themed, and the panel reflects
 * them. The book content lives on the reader origin (:5174), cross-origin to the app — its spine iframes
 * are reached via `page.frames()`. Zero console errors throughout; video + screenshot via playwright.config.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test, type Frame, type Page } from '@playwright/test'

const SHOTS = 'loop/artifacts/add-reading-preferences/attempt-1/gate1/playwright'
const READER_ORIGIN = 'http://localhost:5174'
const PENSEES = 'blaise-pascal_pensees.epub'

// Book-canvas colours from reader-css.ts THEME_COLORS (kept in sync there). rgb() is what getComputedStyle
// returns. Light is the default first-paint theme; Sepia is the change under test.
const LIGHT_BG = 'rgb(250, 248, 243)' // #faf8f3
const SEPIA_BG = 'rgb(241, 231, 208)' // #f1e7d0

/** The cross-origin reader frame (its url is `http://localhost:5174/`). */
function readerFrame(page: Page): Frame | undefined {
  return page.frames().find((f) => f.url().startsWith(READER_ORIGIN + '/'))
}

/** The first spine iframe foliate renders — a child frame of the reader frame (its book CSS is injected here). */
async function spineFrame(page: Page): Promise<Frame> {
  for (let i = 0; i < 60; i++) {
    const spine = page.frames().find((f) => {
      const parent = f.parentFrame()
      return parent != null && parent.url().startsWith(READER_ORIGIN)
    })
    if (spine) return spine
    await page.waitForTimeout(100)
  }
  throw new Error('spine frame never attached')
}

async function spineBodyStyle(
  page: Page,
): Promise<{ background: string; fontFamily: string; fontSize: number }> {
  const spine = await spineFrame(page)
  return spine.evaluate(() => {
    const cs = getComputedStyle(document.body)
    return {
      background: cs.backgroundColor,
      fontFamily: cs.fontFamily,
      fontSize: Number.parseFloat(cs.fontSize),
    }
  })
}

/** The foliate renderer's current flow mode, read off the reader frame's <foliate-view>. */
async function rendererFlow(page: Page): Promise<string | null> {
  const frame = readerFrame(page)
  if (!frame) return null
  return frame.evaluate(() => {
    const view = document.querySelector('foliate-view') as {
      renderer?: { getAttribute?: (n: string) => string | null }
    } | null
    return view?.renderer?.getAttribute?.('flow') ?? null
  })
}

async function openReaderFromLibrary(page: Page): Promise<void> {
  await page
    .getByRole('link', { name: /Pride and Prejudice/ })
    .first()
    .click()
  await expect(page).toHaveURL(/\/book\/home-server\/pride-and-prejudice/)
  await page.getByRole('button', { name: /reading/ }).click()
  await expect(page).toHaveURL(/\/reader\/home-server\/pride-and-prejudice/)
  await page
    .locator('[data-testid="reader-mount"] iframe')
    .waitFor({ state: 'attached', timeout: 30_000 })
  await expect(page.getByTestId('reader-readout')).toContainText('p.', { timeout: 30_000 })
}

test.describe('add-reading-preferences — Display panel restyles the book live + persists', () => {
  test('theme/typeface/size/layout reflow the book, persist across reload, and restore on reopen', async ({
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

    // --- Open the book; the default (Light/17pt) preferences are applied on first paint. ----------
    await page.goto('/library')
    await openReaderFromLibrary(page)
    await expect
      .poll(() => spineBodyStyle(page).then((s) => s.background), { timeout: 30_000 })
      .toBe(LIGHT_BG)
    const initial = await spineBodyStyle(page)

    // --- Open the panel from "Aa". -----------------------------------------------------------------
    await page.getByRole('button', { name: 'Reading preferences' }).click()
    await expect(page.getByTestId('display-panel')).toBeVisible()

    // --- Theme: Sepia -> the spine body background becomes warm cream (live, no reload). -----------
    await page.getByRole('button', { name: 'Sepia' }).click()
    await expect
      .poll(() => spineBodyStyle(page).then((s) => s.background), { timeout: 15_000 })
      .toBe(SEPIA_BG)

    // --- Typeface: Literata -> the spine text font-family switches to the Literata stack. ----------
    await page.getByRole('button', { name: 'Literata' }).click()
    await expect
      .poll(() => spineBodyStyle(page).then((s) => s.fontFamily), { timeout: 15_000 })
      .toContain('Literata')

    // --- Text size: 24pt -> the spine text grows. --------------------------------------------------
    await page.getByRole('slider', { name: 'Text size' }).fill('24')
    await expect(page.getByTestId('text-size-label')).toHaveText('24pt')
    await expect
      .poll(() => spineBodyStyle(page).then((s) => s.fontSize), { timeout: 15_000 })
      .toBeGreaterThan(initial.fontSize)

    // --- Layout: Scroll -> the foliate flow flips to scrolled. -------------------------------------
    await page.getByRole('button', { name: 'Scroll' }).click()
    await expect.poll(() => rendererFlow(page), { timeout: 15_000 }).toBe('scrolled')

    await page.screenshot({ path: `${SHOTS}/01-display-panel-sepia-literata.png` })

    // App chrome stays its own design-system parchment — the panel themed the BOOK, not the app.
    await expect(page.getByTestId('display-panel')).toBeVisible()

    // --- Return to Library, RELOAD (drop in-memory state), then reopen the book. ------------------
    await page.getByRole('button', { name: 'Library' }).click()
    await expect(page).toHaveURL(/\/library/)
    await page.reload()
    await expect(page).toHaveURL(/\/library/)
    await openReaderFromLibrary(page)

    // The persisted Sepia theme is applied on first paint (no flash of default Light).
    await expect
      .poll(() => spineBodyStyle(page).then((s) => s.background), { timeout: 30_000 })
      .toBe(SEPIA_BG)

    // The panel reflects every restored preference.
    await page.getByRole('button', { name: 'Reading preferences' }).click()
    await expect(page.getByRole('button', { name: 'Sepia' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(page.getByRole('button', { name: 'Literata' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(page.getByRole('slider', { name: 'Text size' })).toHaveValue('24')
    await expect(page.getByRole('button', { name: 'Scroll' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(page.getByTestId('text-size-label')).toHaveText('24pt')

    await page.screenshot({ path: `${SHOTS}/02-preferences-restored-after-reload.png` })

    expect(consoleErrors, `unexpected console errors: ${consoleErrors.join(' | ')}`).toEqual([])
  })
})
