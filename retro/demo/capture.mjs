// Phase 2 (PLAN.md): render slides → out/slides/.
// Static beats → PNG stills; animated Act-IV beats → webm recorded for the beat's audio
// duration (from out/audio/timings.json). Usage: node capture.mjs
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, renameSync } from 'node:fs';

const STILLS = ['I.1', 'I.2', 'I.3', 'I.4', 'III.1', 'III.2', 'C.1'];
const ANIMATED = ['IV.1', 'IV.2', 'IV.3', 'IV.4'];
const SLIDES = new URL('slides/', import.meta.url).href;
const OUT = new URL('out/slides/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const timings = JSON.parse(readFileSync(new URL('out/audio/timings.json', import.meta.url), 'utf8'));
const durOf = (id) => timings.find((t) => t.id === id).duration;

const browser = await chromium.launch();

for (const id of STILLS) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(`${SLIDES}${id}.html`);
  await page.waitForTimeout(300); // fonts
  await page.screenshot({ path: `${OUT}${id}.png` });
  await page.close();
  console.log(`still  ${id}.png`);
}

for (const id of ANIMATED) {
  const dur = durOf(id);
  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: OUT, size: { width: 1920, height: 1080 } },
  });
  const page = await ctx.newPage();
  await page.goto(`${SLIDES}${id}.html?dur=${dur - 0.8}`); // finish slightly before the cut
  await page.waitForTimeout((dur + 0.5) * 1000);
  const video = page.video();
  await ctx.close();
  renameSync(await video.path(), `${OUT}${id}.webm`);
  console.log(`anim   ${id}.webm (${dur}s)`);
}

await browser.close();
