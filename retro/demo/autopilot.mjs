// Phase 2 (PLAN.md): live-demo capture — Act II (beats II.1–II.4, one continuous take)
// and Act III.3 (self-hosting). Actions are paced to the narration durations in
// out/audio/timings.json. Requires the reference host running (default http://localhost:5173).
// Usage: node autopilot.mjs [baseURL]
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:5173';
const OUT = new URL('out/video/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const timings = JSON.parse(readFileSync(new URL('out/audio/timings.json', import.meta.url), 'utf8'));
const durOf = (id) => timings.find((t) => t.id === id).duration;

const G_PALETTE = '/@fs' + new URL('../../packages/editor-core/src/codec/generators/G_palette.json', import.meta.url).pathname;

const browser = await chromium.launch({ headless: true });

async function newRecordingPage() {
  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: OUT, size: { width: 1920, height: 1080 } },
  });
  const page = await ctx.newPage();
  page.on('dialog', (d) => d.accept()); // never hang on a native confirm()
  const ctxStart = Date.now();
  await page.goto(BASE);
  await page.waitForFunction(() => /Engine:\s*ready/.test(document.body.innerText), null, { timeout: 90_000 });
  await page.waitForTimeout(600);
  return { ctx, page, ctxStart };
}

async function blockBox(page, text) {
  const box = await page.evaluate((t) => {
    const norm = (s) => s.replace(/ /g, ' ');
    const label = [...document.querySelectorAll('.blocklyText')].find((e) => norm(e.textContent).includes(t));
    if (!label) return null;
    const r = label.closest('.blocklyDraggable').getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, text);
  if (!box) throw new Error(`block "${text}" not found`);
  return box;
}

async function drag(page, from, to, ms = 1300) {
  const steps = Math.round(ms / 16);
  await page.mouse.move(from.x, from.y, { steps: 20 });
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    const k = 0.5 - Math.cos((i / steps) * Math.PI) / 2;
    await page.mouse.move(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k);
    await page.waitForTimeout(16);
  }
  await page.mouse.up();
}

// ---- Act II: one continuous take, paced to beat boundaries -------------------
{
  const { ctx, page, ctxStart } = await newRecordingPage();
  const clock0 = Date.now();
  const offset = (clock0 - ctxStart) / 1000; // trim this much off the video head at assembly
  let cum = 0;
  const until = async (sec) => { const ms = clock0 + sec * 1000 - Date.now(); if (ms > 0) await page.waitForTimeout(ms); };

  // II.1 — load the example
  await page.mouse.move(1670, 88, { steps: 25 });
  await page.getByLabel('Load example').selectOption({ label: 'Swap the keys and values of a dict' });
  await page.waitForTimeout(400);
  await page.mouse.move(700, 400, { steps: 30 });
  cum += durOf('II.1'); await until(cum);

  // II.2 — Run → ✓, then live block edit (detach + restore)
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await page.waitForTimeout(1600); // let the ✓ land
  const home = await blockBox(page, 'Current value (value)');
  const away = { x: home.x + 330, y: home.y + 230 };
  await drag(page, home, away, 1500);
  await page.waitForTimeout(900);
  await drag(page, await blockBox(page, 'Current value (value)'), home, 1500);
  cum += durOf('II.2'); await until(cum);

  // II.3 — reverse direction: edit the JSON text, blocks follow
  const ta = page.locator('textarea[aria-label="Generated template JSON"]');
  await ta.click();
  await ta.fill('{"$": "map", "key": {"$": "value"}, "value": {"$": "attr", "name": "code"}}');
  cum += durOf('II.3'); await until(cum);

  // II.4 — calm hold on the wide shot
  await page.mouse.move(760, 420, { steps: 40 });
  cum += durOf('II.4'); await until(cum + 0.4);

  const video = page.video();
  await ctx.close();
  renameSync(await video.path(), `${OUT}act2.webm`);
  writeFileSync(`${OUT}act2-meta.json`, JSON.stringify({ offset: +offset.toFixed(2), duration: +cum.toFixed(2) }));
  console.log(`act2.webm  offset=${offset.toFixed(2)}s  duration=${cum.toFixed(2)}s`);
}

// ---- Act III.3: the editor opens its own palette generator -------------------
{
  const { ctx, page, ctxStart } = await newRecordingPage();
  const clock0 = Date.now();
  const offset = (clock0 - ctxStart) / 1000;
  await page.evaluate(async (path) => {
    const text = await (await fetch(path)).text();
    const ta = document.querySelector('textarea[aria-label="Generated template JSON"]');
    Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(ta, text);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }, G_PALETTE);
  await page.waitForFunction(() => document.querySelectorAll('.blocklyDraggable').length > 100, null, { timeout: 15_000 });
  await page.mouse.move(700, 500, { steps: 30 });
  const dur = durOf('III.3') + 1;
  await page.waitForTimeout(dur * 1000);
  const video = page.video();
  await ctx.close();
  renameSync(await video.path(), `${OUT}act3.webm`);
  writeFileSync(`${OUT}act3-meta.json`, JSON.stringify({ offset: +offset.toFixed(2), duration: +dur.toFixed(2) }));
  console.log(`act3.webm  offset=${offset.toFixed(2)}s`);
}

await browser.close();
