/**
 * responsive — no overlap/clipping/horizontal overflow across phone/tablet/desktop, and the phone
 * layouts matched to the doc/mobile baselines (visual-fidelity §"Responsive layout").
 *
 * The phone layout uses the responsive BottomNav (doc/mobile/*); the sidebar is hidden < md. The RTL
 * comic-reader scenario is committed as test.fixme — CBZ has no loader yet (triage T2), so the maket
 * cannot be rendered; it unskips when the CBZ format ships.
 */
import { resolve } from 'node:path'
import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  MOBILE_MAKET_CROP,
  MOBILE_VIEWPORT,
  compareToMaket,
  prepareCapture,
  readerMask,
  settle,
  volatileMasks,
} from '../visual/capture-helper'
import { PIXEL_THRESHOLD, THUMB_WIDTH, TIER1 } from '../visual/tolerances'
import { routeEpubFixture } from '../visual/maket-seed'

const mobile = (f: string) => resolve(process.cwd(), 'doc/mobile', f)

const VIEWPORTS = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1300, height: 796 },
] as const

const SHELL_ROUTES = [
  '/library',
  '/book/home-server/pride-and-prejudice',
  '/settings/extensions',
  '/downloads',
  '/settings/sources/add',
] as const

async function assertNoHorizontalOverflow(page: Page, label: string): Promise<void> {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement
    return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth }
  })
  // Sub-pixel rounding tolerance of 1px; anything beyond is a real horizontal scrollbar.
  expect(overflow.scrollWidth, `horizontal overflow at ${label}`).toBeLessThanOrEqual(
    overflow.clientWidth + 1,
  )
}

test.describe('responsive — no horizontal overflow across widths', () => {
  for (const vp of VIEWPORTS) {
    for (const route of SHELL_ROUTES) {
      test(`${vp.name} (${vp.width}px) · ${route}`, async ({ page }) => {
        await prepareCapture(page, { viewport: { width: vp.width, height: vp.height } })
        await page.goto(route)
        await page.waitForLoadState('networkidle')
        await settle(page, 100)
        await assertNoHorizontalOverflow(page, `${vp.name} ${route}`)
      })
    }
  }
})

test.describe('responsive — phone layouts match the mobile maket', () => {
  test('Library (doc/mobile/01) within Tier-1 tolerance', async ({ page }, testInfo) => {
    await prepareCapture(page, { viewport: MOBILE_VIEWPORT })
    await page.goto('/library')
    await page.getByText('Frankenstein').first().waitFor()
    await settle(page)
    await compareToMaket(page, testInfo, 'libraryMobile', {
      maketPath: mobile('01-library-mobile.png'),
      crop: MOBILE_MAKET_CROP,
      mask: volatileMasks(page),
      tolerance: TIER1.libraryMobile,
      thumbWidth: THUMB_WIDTH,
      pixelThreshold: PIXEL_THRESHOLD,
    })
  })

  test('Book detail (doc/mobile/02) within Tier-1 tolerance', async ({ page }, testInfo) => {
    await prepareCapture(page, { viewport: MOBILE_VIEWPORT })
    await page.goto('/book/home-server/pride-and-prejudice')
    await page.getByRole('heading', { name: 'Pride and Prejudice', level: 1 }).waitFor()
    await settle(page)
    await compareToMaket(page, testInfo, 'bookDetailMobile', {
      maketPath: mobile('02-book-detail-mobile.png'),
      crop: MOBILE_MAKET_CROP,
      tolerance: TIER1.bookDetailMobile,
      thumbWidth: THUMB_WIDTH,
      pixelThreshold: PIXEL_THRESHOLD,
    })
  })

  test('EPUB reader (doc/mobile/03-reader-mobile-epub) within Tier-1 tolerance', async ({
    page,
  }, testInfo) => {
    await prepareCapture(page, { viewport: MOBILE_VIEWPORT })
    await routeEpubFixture(page)
    await page.goto('/book/home-server/pride-and-prejudice')
    await page.getByRole('button', { name: /reading/i }).click()
    await expect(page.getByTestId('reader-readout')).toContainText('p.', { timeout: 30_000 })
    await settle(page, 400)
    await compareToMaket(page, testInfo, 'readerMobile', {
      maketPath: mobile('03-reader-mobile-epub.png'),
      crop: { x: 10, y: 78, width: 392, height: 745 },
      mask: readerMask(page),
      tolerance: TIER1.readerMobile,
      thumbWidth: THUMB_WIDTH,
      pixelThreshold: PIXEL_THRESHOLD,
    })
  })

  // Triage T2: the RTL comic reader (doc/mobile/03-reader-comic-cbz-rtl.png) needs a CBZ loader, which
  // does not exist yet (CBZ is "available" only). Committed but skipped until the CBZ format spec ships.
  test.fixme('comic reader advances right-to-left (doc/mobile/03-reader-comic-cbz-rtl)', () => {
    // When CBZ ships: open a CBZ on the fixture, assert the reader lays out RTL and compare to the maket.
  })
})

/**
 * responsive — coarse-pointer (touch) tap targets meet the 44px minimum (impeccable cycle 2 "adapt";
 * loop/impeccable/cycles/02/audit.md P3). The `.tap-target` utility (main.css) grows the TOUCH hit area
 * via an invisible `::after` gated behind `@media (pointer: coarse)` — it never fires in the `chromium`
 * `visual`/`responsive` projects above, all of which use `devices['Desktop Chrome']` (`hasTouch: false`),
 * so those golden/maket comparisons stay pixel-identical. Exercising the rule for real therefore needs a
 * PURPOSE-BUILT context with `hasTouch: true` (confirmed live: `Emulation.setEmulatedMedia` alone, without
 * `hasTouch`, does NOT flip `(pointer: coarse)` in this Chromium build) — hence `browser.newContext(...)`
 * here rather than the shared `page` fixture.
 */
test.describe('responsive — coarse-pointer tap targets reach the 44px minimum', () => {
  const TOUCH_VIEWPORT = { width: 412, height: 900 } as const

  async function seedFixture(page: Page): Promise<void> {
    await page.addInitScript(() => window.localStorage.setItem('edda.seed', 'fixture'))
  }

  /** The bigger of the element's own box and its coarse-pointer `::after` hit-area (main.css `.tap-target`). */
  async function hitBoxHeight(locator: Locator): Promise<number> {
    return locator.evaluate((el) => {
      const rect = el.getBoundingClientRect()
      const after = getComputedStyle(el, '::after')
      const pseudoHeight = after.content !== 'none' ? Number.parseFloat(after.height) : 0
      return Math.max(rect.height, Number.isFinite(pseudoHeight) ? pseudoHeight : 0)
    })
  }

  test('Library: search field, Grid/List toggle, and "See all" all reach 44px', async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      baseURL,
      viewport: TOUCH_VIEWPORT,
      hasTouch: true,
      isMobile: true,
    })
    const page = await context.newPage()
    await seedFixture(page)
    await page.goto('/library')
    await page.waitForLoadState('networkidle')
    await settle(page, 100)

    const controls: Array<[string, Locator]> = [
      ['search field', page.locator('#library-search')],
      ['Grid toggle', page.getByRole('button', { name: 'Grid' })],
      ['List toggle', page.getByRole('button', { name: 'List' })],
      ['"See all" link', page.getByRole('link', { name: 'See all' })],
    ]
    for (const [label, locator] of controls) {
      expect(await hitBoxHeight(locator), `${label} tap height`).toBeGreaterThanOrEqual(44)
    }

    await context.close()
  })

  test('Reader chrome: Library back, Table of contents, Bookmark, and Aa all reach 44px', async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      baseURL,
      viewport: TOUCH_VIEWPORT,
      hasTouch: true,
      isMobile: true,
    })
    const page = await context.newPage()
    await seedFixture(page)
    await routeEpubFixture(page)
    await page.goto('/book/home-server/pride-and-prejudice')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: /reading/i }).click()
    await expect(page.getByTestId('reader-readout')).toContainText('p.', { timeout: 30_000 })
    await settle(page, 200)

    const controls: Array<[string, Locator]> = [
      ['Library back', page.getByRole('button', { name: 'Library' })],
      ['Table of contents', page.getByRole('button', { name: 'Table of contents' })],
      ['Bookmark', page.getByRole('button', { name: 'Bookmark this position' })],
      ['Aa (Reading preferences)', page.getByRole('button', { name: 'Reading preferences' })],
    ]
    for (const [label, locator] of controls) {
      expect(await hitBoxHeight(locator), `${label} tap height`).toBeGreaterThanOrEqual(44)
    }

    await context.close()
  })

  test('a fine (mouse) pointer never grows the hit area — the coarse-pointer rule stays inert on desktop', async ({
    page,
  }) => {
    // The default `page` fixture here inherits the responsive project's `devices['Desktop Chrome']`
    // (`hasTouch: false`), the same as every other gate — this is the guard that the technique cannot
    // silently start inflating desktop hit targets.
    await page.goto('/library')
    await page.waitForLoadState('networkidle')
    await settle(page, 100)
    const pseudoContent = await page
      .getByRole('button', { name: 'Grid' })
      .evaluate((el) => getComputedStyle(el, '::after').content)
    expect(pseudoContent).toBe('none')
  })
})

/**
 * responsive — NO interactive control is occluded by the BottomNav at phone width (impeccable cycle 2,
 * regression guard). This is the exact bug class that a +8px tap-target change once introduced: the
 * Library Grid/List toggle sat straddling the bottom of the internally-scrolled `<main>` (whose viewport
 * ends at the BottomNav's top edge), and growing the header pushed the toggle's CENTRE across that edge,
 * so `elementFromPoint(centre)` resolved to the nav's tab rather than the toggle — a visible control that
 * navigates somewhere else when tapped.
 *
 * The rule: for every control that is at least PARTIALLY visible within main's scroll viewport (its top is
 * above the nav's top edge, so some of it shows and it invites a tap), its own centre must hit itself or a
 * descendant — never a different element — AND its effective tap height (own box or the coarse `.tap-target`
 * ::after, whichever is larger) must reach 44px. Controls entirely below the fold (scrolled off, e.g. a
 * lower extension row on first paint) are excluded: they are not visible, are reachable by scrolling, and
 * are fully tappable once scrolled into view (verified live). Needs `hasTouch: true` to flip
 * `(pointer: coarse)`, so a dedicated context, not the shared Desktop-Chrome `page`.
 */
test.describe('responsive — no interactive control is occluded at phone width', () => {
  const TOUCH_VIEWPORT = { width: 412, height: 900 } as const
  // Shell routes that render the BottomNav on phone (the reader route is full-bleed — no nav, no fold).
  const ROUTES = [
    '/library',
    '/settings/extensions',
    '/book/home-server/pride-and-prejudice',
  ] as const

  for (const route of ROUTES) {
    test(`${route}: every visible control is tappable at its centre and ≥44px`, async ({
      browser,
      baseURL,
    }) => {
      const context = await browser.newContext({
        baseURL,
        viewport: TOUCH_VIEWPORT,
        hasTouch: true,
        isMobile: true,
      })
      const page = await context.newPage()
      await page.addInitScript(() => window.localStorage.setItem('edda.seed', 'fixture'))
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      await settle(page, 150)

      const violations = await page.evaluate(() => {
        const nav = document.querySelector('[data-testid="bottom-nav"]')
        const foldTop = nav ? nav.getBoundingClientRect().top : window.innerHeight
        const controls = [
          ...document.querySelectorAll('button, a[href], input, [role="switch"], select, textarea'),
        ]
        const out: string[] = []
        for (const el of controls) {
          const r = el.getBoundingClientRect()
          if (r.width === 0 || r.height === 0) continue
          // Partially visible = some of it is above the nav's top edge, so a user can see & tap it.
          const partiallyVisible = r.top < foldTop && r.bottom > 0
          if (!partiallyVisible) continue
          const cx = r.left + r.width / 2
          const cy = r.top + r.height / 2
          const hit = document.elementFromPoint(cx, cy)
          const tappable = !!hit && (el.contains(hit) || hit === el)
          const after = getComputedStyle(el, '::after')
          const pseudoH = after.content !== 'none' ? Number.parseFloat(after.height) : 0
          const tapH = Math.max(r.height, Number.isFinite(pseudoH) ? pseudoH : 0)
          const label =
            el.getAttribute('aria-label') ||
            el.id ||
            (el.textContent || '').trim().slice(0, 24) ||
            el.tagName
          if (!tappable) {
            out.push(
              `OCCLUDED: "${label}" centre resolves to <${hit ? hit.tagName.toLowerCase() : 'null'}>`,
            )
          } else if (tapH < 43.5) {
            out.push(`SMALL: "${label}" tap height ${Math.round(tapH)}px < 44`)
          }
        }
        return out
      })

      expect(violations, `occluded/undersized controls on ${route}`).toEqual([])
      await context.close()
    })
  }
})
