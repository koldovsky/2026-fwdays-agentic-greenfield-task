// Burned-caption PNGs: one transparent 1920×1080 overlay per beat, styled like the slides.
// (This ffmpeg build has no libass/drawtext — captions are burned via timed overlay filters.)
// Also emits the ffmpeg -filter_complex_script for assemble.sh. Usage: node gen-captions.mjs
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const timings = JSON.parse(readFileSync(new URL('out/audio/timings.json', import.meta.url), 'utf8'));
const OUT = new URL('out/captions/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const html = (text) => `<!doctype html><html><body style="margin:0;width:1920px;height:1080px;
  display:flex;align-items:flex-end;justify-content:center;background:transparent">
  <div style="margin-bottom:44px;max-width:1500px;text-align:center;
    font:600 40px -apple-system,'Helvetica Neue',sans-serif;color:#f2ede9;
    text-shadow:0 2px 6px rgba(0,0,0,.9),0 0 3px rgba(0,0,0,.9);
    background:rgba(10,13,17,.55);padding:14px 34px;border-radius:12px">${text}</div>
</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
for (const t of timings) {
  await page.setContent(html(t.caption));
  await page.waitForTimeout(80);
  await page.screenshot({ path: `${OUT}${t.id}.png`, omitBackground: true });
}
await browser.close();
console.log(`${timings.length} caption overlays → out/captions/`);
