#!/usr/bin/env node
/**
 * Storyboard-driven demo recorder.
 *
 * WHY THIS EXISTS: @playwright/mcp cannot record video. It has no --save-video flag, and
 * `browser.contextOptions.recordVideo` in its config file is silently dropped (verified: the config
 * IS parsed — malformed JSON exits 1 — but no video file is ever written). Playwright's own
 * `recordVideo` context option works fine. So: drive/verify the flow with playwright-mcp, transcribe
 * the confirmed steps into a storyboard, and replay it here to capture the actual video.
 *
 *   node loop/impeccable/record-demo.mjs [storyboard.json]
 *
 * Emits demo.webm (Playwright, VP8) and demo.mp4 (ffmpeg, H.264) into `outDir`.
 *
 * Every step is followed by a pause long enough for a human to read the screen. Clicks are preceded
 * by a visible cursor move + a highlight ring, because Playwright videos do not render a mouse
 * pointer — without this the video looks like things happen at random.
 */
import { chromium } from '@playwright/test'
import { execFile } from 'node:child_process'
import { mkdir, readFile, rename, rm, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { promisify } from 'node:util'

const execFileP = promisify(execFile)
const ROOT = path.resolve(import.meta.dirname, '../..')
const sbPath = path.resolve(process.argv[2] ?? path.join(import.meta.dirname, 'storyboard.json'))
const sb = JSON.parse(await readFile(sbPath, 'utf8'))

const baseUrl = sb.baseUrl ?? 'http://localhost:5183'
const viewport = sb.viewport ?? { width: 1280, height: 800 }
const pause = sb.defaultPauseMs ?? 1800
const outDir = path.resolve(ROOT, sb.outDir ?? 'loop/impeccable/demo')
const rawDir = path.join(outDir, '_raw')

await rm(rawDir, { recursive: true, force: true })
await mkdir(rawDir, { recursive: true })

/** Injected before any page script, so it survives SPA navigation and full reloads. */
const overlayScript = (seed) => `
  ${seed ? `try { localStorage.setItem('edda.seed', ${JSON.stringify(seed)}) } catch {}` : ''}
  (() => {
    const Z = 2147483647
    const el = (tag, css) => { const n = document.createElement(tag); n.style.cssText = css; return n }
    const ready = (fn) => document.body ? fn() : addEventListener('DOMContentLoaded', fn, { once: true })

    let cursor
    window.__demoCursor = (x, y) => ready(() => {
      if (!cursor || !cursor.isConnected) {
        cursor = el('div', \`position:fixed;left:0;top:0;width:22px;height:22px;border-radius:50%;
          background:rgba(20,20,20,.55);border:2px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.45);
          pointer-events:none;z-index:\${Z};transition:transform .45s cubic-bezier(.22,1,.36,1);
          margin:-11px 0 0 -11px\`)
        document.body.appendChild(cursor)
      }
      cursor.style.transform = \`translate(\${x}px, \${y}px)\`
    })

    window.__demoRing = (x, y, w, h) => ready(() => {
      const r = el('div', \`position:fixed;left:\${x}px;top:\${y}px;width:\${w}px;height:\${h}px;
        border:2.5px solid #c2703a;border-radius:8px;pointer-events:none;z-index:\${Z};
        box-shadow:0 0 0 4px rgba(194,112,58,.22);transition:opacity .5s ease-out\`)
      document.body.appendChild(r)
      setTimeout(() => { r.style.opacity = '0' }, 700)
      setTimeout(() => r.remove(), 1300)
    })

    let bar
    window.__demoCaption = (text) => ready(() => {
      if (!bar || !bar.isConnected) {
        bar = el('div', \`position:fixed;left:50%;bottom:34px;transform:translateX(-50%);max-width:78%;
          padding:13px 26px;border-radius:10px;background:rgba(24,22,20,.93);color:#F0EEE9;
          font:500 19px/1.45 Newsreader,Literata,Georgia,serif;text-align:center;pointer-events:none;
          z-index:\${Z};opacity:0;transition:opacity .4s ease-out;
          box-shadow:0 8px 30px rgba(0,0,0,.35)\`)
        document.body.appendChild(bar)
      }
      bar.textContent = text
      requestAnimationFrame(() => { bar.style.opacity = text ? '1' : '0' })
    })
  })()
`

const browser = await chromium.launch({ headless: sb.headless ?? true, slowMo: sb.slowMo ?? 120 })
const ctx = await browser.newContext({
  viewport,
  deviceScaleFactor: 1,
  recordVideo: { dir: rawDir, size: viewport },
})
await ctx.addInitScript(overlayScript(sb.seed))
const page = await ctx.newPage()

// A silent app error mid-take looks identical to a bad selector. Surface both.
page.on('pageerror', (e) => console.error(`  [pageerror] ${e.message.split('\n')[0]}`))
page.on('console', (m) => {
  if (m.type() === 'error') console.error(`  [console.error] ${m.text().slice(0, 160)}`)
})
// Vite's dep pre-bundling reloads the page the first time a lazy chunk pulls a new dependency
// (e.g. pdfjs-dist on the first PDF install). That reload silently resets SPA state mid-take.
page.on('framenavigated', (f) => {
  if (f === page.mainFrame()) console.log(`  [nav] ${f.url()}`)
})

const sleep = (ms) => page.waitForTimeout(ms)
const target = (step) =>
  step.frame ? page.frameLocator(step.frame).locator(step.selector) : page.locator(step.selector)

/** Move the fake cursor onto an element and flash a ring, so the click is legible on video. */
async function focusOn(loc) {
  await loc.scrollIntoViewIfNeeded().catch(() => {})
  const box = await loc.boundingBox().catch(() => null)
  if (!box) return
  const cx = box.x + box.width / 2
  const cy = box.y + box.height / 2
  await page.evaluate(([x, y]) => window.__demoCursor?.(x, y), [cx, cy])
  await sleep(520)
  await page.evaluate(
    ([x, y, w, h]) => window.__demoRing?.(x, y, w, h),
    [box.x, box.y, box.width, box.height],
  )
  await sleep(260)
}

const t0 = Date.now()
let n = 0
let failure = null
try {
  for (const step of sb.steps) {
    n++
    const wait = step.pauseMs ?? pause
    const label =
      step.note ?? step.caption ?? step.selector ?? step.goto ?? step.press ?? step.action ?? ''
    console.log(`[${String(n).padStart(2, '0')}] ${JSON.stringify(step).slice(0, 110)}`)

    if (step.caption !== undefined) {
      await page.evaluate((t) => window.__demoCaption?.(t), step.caption)
      await sleep(step.ms ?? wait)
      continue
    }
    if (step.goto) {
      await page.goto(new URL(step.goto, baseUrl).href, { waitUntil: 'domcontentloaded' })
      await page.waitForLoadState('networkidle').catch(() => {})
      await sleep(wait)
      continue
    }
    if (step.resize) {
      await page.setViewportSize(step.resize)
      await sleep(wait)
      continue
    }
    if (step.waitFor) {
      await target({ ...step, selector: step.waitFor })
        .first()
        .waitFor({ state: 'visible', timeout: step.timeout ?? 30_000 })
      continue
    }
    if (step.wait) {
      await sleep(step.wait)
      continue
    }
    if (step.click) {
      const loc = target({ ...step, selector: step.click }).first()
      await loc.waitFor({ state: 'visible', timeout: step.timeout ?? 30_000 })
      await focusOn(loc)
      await loc.click()
      await sleep(wait)
      continue
    }
    if (step.hover) {
      const loc = target({ ...step, selector: step.hover }).first()
      await focusOn(loc)
      await loc.hover()
      await sleep(wait)
      continue
    }
    if (step.fill) {
      const loc = target({ ...step, selector: step.fill }).first()
      await focusOn(loc)
      await loc.fill(step.value ?? '')
      await sleep(wait)
      continue
    }
    // Typed character-by-character: debounced inputs (the server prober) need real keystrokes, and
    // watching a URL get typed reads far better on video than a value appearing all at once.
    if (step.type) {
      const loc = target({ ...step, selector: step.type }).first()
      await focusOn(loc)
      await loc.click()
      await loc.pressSequentially(step.value ?? '', { delay: step.delayMs ?? 55 })
      await sleep(wait)
      continue
    }
    if (step.press) {
      for (let i = 0; i < (step.times ?? 1); i++) {
        await page.keyboard.press(step.press)
        await sleep(step.betweenMs ?? 900)
      }
      await sleep(wait)
      continue
    }
    if (step.scroll) {
      await page.mouse.wheel(0, step.scroll)
      await sleep(wait)
      continue
    }
    throw new Error(`step ${n}: unrecognized step ${JSON.stringify(step)} (${label})`)
  }

  await page.evaluate(() => window.__demoCaption?.(''))
  await sleep(700)
} catch (err) {
  // Still close the context below — otherwise the partial take is lost and you debug blind.
  failure = err
  console.error(`\n!! step ${n} FAILED: ${err.message.split('\n')[0]}`)
  console.error('   closing context anyway so the partial video is written.')
}

// The video file is only finalized when the CONTEXT closes. Never kill the process before this.
await ctx.close()
await browser.close()

const [raw] = (await readdir(rawDir)).filter((f) => f.endsWith('.webm'))
if (!raw) throw new Error('no video produced — did the context close?')
const webm = path.join(outDir, 'demo.webm')
await rename(path.join(rawDir, raw), webm)
await rm(rawDir, { recursive: true, force: true })

const secs = ((Date.now() - t0) / 1000).toFixed(1)
console.log(`\nwebm: ${webm}  (~${secs}s of interaction)`)

// Playwright's bundled ffmpeg only ships a VP8 encoder, so mp4 needs a real ffmpeg on PATH.
const mp4 = path.join(outDir, 'demo.mp4')
try {
  await execFileP('ffmpeg', [
    ...['-y', '-i', webm],
    ...['-c:v', 'libx264', '-preset', 'slow', '-crf', '20'],
    ...['-pix_fmt', 'yuv420p', '-r', '30', '-movflags', '+faststart'],
    mp4,
  ])
  console.log(`mp4:  ${mp4}`)
} catch (e) {
  console.error(`mp4 conversion FAILED (is ffmpeg on PATH?): ${e.message.split('\n')[0]}`)
  console.error(
    'webm is still valid; convert later with: ffmpeg -i demo.webm -c:v libx264 -pix_fmt yuv420p demo.mp4',
  )
}

if (!existsSync(webm)) throw new Error('demo.webm missing after recording')
if (failure) {
  console.error(
    `\nTAKE INCOMPLETE — step ${n} failed. The video above stops there. Fix the storyboard and re-record.`,
  )
  throw failure
}
