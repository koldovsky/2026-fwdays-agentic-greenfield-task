/**
 * add-visual-polish-e2e (ch11) — the deterministic capture + two-tier compare helper.
 *
 * Tier 1 (matches-the-maket fidelity): render a screen, diff it against the hand-rendered doc/web or
 * doc/mobile PNG. The maket is *design intent*, not a browser render — fonts, antialiasing, and a ~15px
 * browser-frame inset differ from a live Chromium paint, so a naive full-resolution pixel diff can never
 * reach a meaningful tolerance. We therefore BOX-DOWNSCALE both images to a normalized thumbnail before
 * pixelmatch: at thumbnail scale text blurs into colour blocks and small offsets vanish, so the compare
 * measures *structural + colour* fidelity (the right regions, the right parchment palette, in the right
 * places) — which is what "faithful to the maket" actually means for a hand-drawn reference. A blank,
 * mis-coloured, or mis-laid-out screen still diffs heavily and fails. The per-screen tolerance is the
 * agreed, documented number (see tolerances.ts).
 *
 * Tier 2 (drift gate): Playwright toHaveScreenshot() against committed app-vs-app golden snapshots under
 * a tight tolerance (playwright.config.ts). The golden is the deterministic regression reference; the
 * maket PNG is the design-intent reference — different jobs.
 *
 * Determinism: fixed viewport + deviceScaleFactor:1 (config), `prefers-reduced-motion: reduce` (config +
 * the main.css reduced-motion reset zeroes every transition/animation), and `await document.fonts.ready`
 * before each capture. The clock is intentionally NOT frozen — the fixture connector is already temporal-
 * stable ("Synced just now", null lastSync) and the volatile maket regions (the "Synced 2m ago" pill, the
 * "14 downloaded" count) are masked; freezing would break the app's setInterval sync scheduler.
 */
import { readFileSync } from 'node:fs'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'
import { expect, type Locator, type Page, type TestInfo } from '@playwright/test'

/** Maket app-content area (the desktop PNGs are 1300×881 with an ~85px browser-chrome strip on top). */
export const DESKTOP_VIEWPORT = { width: 1300, height: 796 } as const
/** Phone content area inside the maket's device mock (412×851 minus status bar + bezel). */
export const MOBILE_VIEWPORT = { width: 412, height: 766 } as const

/** Strip the browser chrome (traffic-light dots + URL bar) + annotation label from a desktop maket PNG. */
export const DESKTOP_MAKET_CROP = { x: 0, y: 85, width: 1300, height: 796 } as const
/** Strip the phone bezel + status bar from a mobile maket PNG (content sits inside the device frame). */
export const MOBILE_MAKET_CROP = { x: 10, y: 78, width: 392, height: 745 } as const

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/** Locators whose content varies run-to-run (relative timestamp pill, the offline-count line). */
export function volatileMasks(page: Page): Locator[] {
  return [page.getByTestId('sync-pill'), page.getByTestId('library-counts')]
}

/** The reader's cross-origin book iframe — never deterministic; always masked on reader captures. */
export function readerMask(page: Page): Locator[] {
  return [page.getByTestId('reader-mount')]
}

/** Wait for self-hosted fonts to load + a paint tick so captures never race layout. */
export async function settle(page: Page, extraMs = 200): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready
  })
  await page.waitForTimeout(extraMs)
}

/** Set the viewport + force reduced motion before a capture. */
export async function prepareCapture(
  page: Page,
  opts: { viewport?: { width: number; height: number } } = {},
): Promise<void> {
  if (opts.viewport) await page.setViewportSize(opts.viewport)
  await page.emulateMedia({ reducedMotion: 'reduce' })
}

// ── PNG geometry helpers ───────────────────────────────────────────────────────────────────────

function cropPng(src: PNG, rect: Rect): PNG {
  const out = new PNG({ width: rect.width, height: rect.height })
  // bitblt copies a sub-rectangle; clamp so an over-wide crop can't read OOB.
  const w = Math.min(rect.width, src.width - rect.x)
  const h = Math.min(rect.height, src.height - rect.y)
  PNG.bitblt(src, out, rect.x, rect.y, w, h, 0, 0)
  return out
}

/** Paint a solid rectangle (used to neutralize masked regions in BOTH images before diffing). */
function fillRect(png: PNG, rect: Rect, rgba: [number, number, number, number]): void {
  const x0 = Math.max(0, Math.floor(rect.x))
  const y0 = Math.max(0, Math.floor(rect.y))
  const x1 = Math.min(png.width, Math.ceil(rect.x + rect.width))
  const y1 = Math.min(png.height, Math.ceil(rect.y + rect.height))
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (png.width * y + x) << 2
      png.data[i] = rgba[0]
      png.data[i + 1] = rgba[1]
      png.data[i + 2] = rgba[2]
      png.data[i + 3] = rgba[3]
    }
  }
}

/** Box-average downscale to an exact target size (forces equal dims for two near-aspect images). */
function downscaleTo(src: PNG, tw: number, th: number): PNG {
  const out = new PNG({ width: tw, height: th })
  for (let ty = 0; ty < th; ty++) {
    const sy0 = Math.floor((ty * src.height) / th)
    const sy1 = Math.max(sy0 + 1, Math.floor(((ty + 1) * src.height) / th))
    for (let tx = 0; tx < tw; tx++) {
      const sx0 = Math.floor((tx * src.width) / tw)
      const sx1 = Math.max(sx0 + 1, Math.floor(((tx + 1) * src.width) / tw))
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      let n = 0
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          const i = (src.width * sy + sx) << 2
          r += src.data[i]!
          g += src.data[i + 1]!
          b += src.data[i + 2]!
          a += src.data[i + 3]!
          n++
        }
      }
      const o = (tw * ty + tx) << 2
      out.data[o] = Math.round(r / n)
      out.data[o + 1] = Math.round(g / n)
      out.data[o + 2] = Math.round(b / n)
      out.data[o + 3] = Math.round(a / n)
    }
  }
  return out
}

const MASK_RGBA: [number, number, number, number] = [255, 0, 255, 255] // magenta: identical in both → no diff

export interface MaketCompareOptions {
  /** Absolute or repo-relative path to the doc/web|doc/mobile PNG. */
  maketPath: string
  /** Region of the maket PNG that corresponds to the rendered app content. */
  crop: Rect
  /** Screenshot this locator instead of the full viewport (for component-level compares: panel, modal). */
  target?: Locator
  /** Locators painted out of the APP screenshot (Playwright mask) AND the maket crop. */
  mask?: Locator[]
  /** Agreed per-screen Tier-1 tolerance (fraction of differing thumbnail pixels). */
  tolerance: number
  /** Thumbnail width for the structural downscale (height derived from the crop aspect). */
  thumbWidth?: number
  /** pixelmatch per-pixel colour threshold (0 strict … 1 lax). */
  pixelThreshold?: number
}

export interface MaketCompareResult {
  ratio: number
  diffPixels: number
  total: number
}

/**
 * Tier-1: structural+colour compare of the rendered screen against its maket PNG. Asserts the diff ratio
 * is within `tolerance`; on failure attaches the maket-thumb / app-thumb / diff triptych to the report
 * (never writes into another spec's committed tree) and throws.
 */
export async function compareToMaket(
  page: Page,
  testInfo: TestInfo,
  name: string,
  opts: MaketCompareOptions,
): Promise<MaketCompareResult> {
  const masks = opts.mask ?? []
  // App screenshot — either a single component (no viewport-relative masks) or the full viewport with
  // volatile/non-deterministic regions painted magenta.
  const appBuf = opts.target
    ? await opts.target.screenshot()
    : await page.screenshot({ mask: masks, maskColor: 'rgb(255,0,255)' })
  const appPng = PNG.sync.read(appBuf)

  // Maket: crop to the content region, then paint the SAME masked rectangles magenta so they cancel.
  const maketFull = PNG.sync.read(readFileSync(opts.maketPath))
  const maketCrop = cropPng(maketFull, opts.crop)
  if (!opts.target) {
    for (const locator of masks) {
      const box = await locator.boundingBox()
      if (box) fillRect(maketCrop, box, MASK_RGBA)
    }
  }

  // Normalize both to one thumbnail size (equal dims required by pixelmatch).
  const tw = opts.thumbWidth ?? 170
  const th = Math.max(1, Math.round((tw * opts.crop.height) / opts.crop.width))
  const appThumb = downscaleTo(appPng, tw, th)
  const maketThumb = downscaleTo(maketCrop, tw, th)

  const diff = new PNG({ width: tw, height: th })
  const diffPixels = pixelmatch(maketThumb.data, appThumb.data, diff.data, tw, th, {
    threshold: opts.pixelThreshold ?? 0.2,
  })
  const total = tw * th
  const ratio = diffPixels / total

  // Always record the measured ratio — this is how the per-screen tolerances in tolerances.ts are tuned.
  testInfo.annotations.push({
    type: 'maket-diff',
    description: `${name}: ${(ratio * 100).toFixed(2)}%`,
  })
  console.log(
    `[maket] ${name}: ${(ratio * 100).toFixed(2)}% (tolerance ${(opts.tolerance * 100).toFixed(1)}%)`,
  )

  if (ratio > opts.tolerance) {
    // Attach the maket / app / diff thumbnails to the report — never write into a committed spec tree.
    await testInfo.attach(`${name}-maket`, {
      body: PNG.sync.write(maketThumb),
      contentType: 'image/png',
    })
    await testInfo.attach(`${name}-app`, {
      body: PNG.sync.write(appThumb),
      contentType: 'image/png',
    })
    await testInfo.attach(`${name}-diff`, { body: PNG.sync.write(diff), contentType: 'image/png' })
  }

  // Measurement mode (MAKET_MEASURE=1): record ratios + capture goldens in one pass for tolerance-tuning
  // without the assert aborting the test before the Tier-2 golden is written. Off in CI → the gate is live.
  if (!process.env.MAKET_MEASURE) {
    expect(
      ratio,
      `Tier-1 maket diff for "${name}" was ${(ratio * 100).toFixed(2)}% (tolerance ${(opts.tolerance * 100).toFixed(2)}%). See attached maket/app/diff thumbnails.`,
    ).toBeLessThanOrEqual(opts.tolerance)
  }

  return { ratio, diffPixels, total }
}

/** Tier-2: a committed app-vs-app golden snapshot (the tight CI drift gate). */
export async function goldenScreenshot(
  page: Page,
  name: string,
  opts: { mask?: Locator[]; fullPage?: boolean } = {},
): Promise<void> {
  await expect(page).toHaveScreenshot(name, {
    mask: opts.mask ?? [],
    maskColor: 'rgb(255,0,255)',
    animations: 'disabled',
    fullPage: opts.fullPage ?? false,
  })
}

/** Tier-2 for a single component/region (e.g. the Display panel, the capability-missing modal). */
export async function goldenLocator(
  locator: Locator,
  name: string,
  opts: { mask?: Locator[] } = {},
): Promise<void> {
  await expect(locator).toHaveScreenshot(name, {
    mask: opts.mask ?? [],
    maskColor: 'rgb(255,0,255)',
    animations: 'disabled',
  })
}
