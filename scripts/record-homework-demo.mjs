// Homework demo video (~90 s): product walkthrough + agentic-engineering slides.
// Run: npm run dev (terminal 1), then npm run qa:record-homework (terminal 2)
import { chromium } from "@playwright/test";
import { existsSync } from "node:fs";
import { mkdir, writeFile, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import {
  OUT_DIR,
  VOICE_SEGMENTS,
  muxVideoAudio,
  synthesizeVoice,
  webmToMp4,
} from "./homework-demo-media.mjs";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const VIEWPORT = { width: 1280, height: 800 };

const CAPTIONS = [
  { text: "Weather Explorer — чи варто їхати на вихідні за погодою.", ms: 5000 },
  { text: "Оберіть місто — сім днів прогнозу й comfort score.", ms: 8000 },
  { text: "Вихідні виділені — зелений означає «можна їхати».", ms: 6000 },
  { text: "Карта OpenStreetMap — клік змінює локацію.", ms: 7000 },
  { text: "Порівняйте до трьох міст на суботу й неділю.", ms: 8000 },
];

async function ensureServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const res = await fetch(BASE_URL);
      if (res.ok || res.status < 500) return;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`app not reachable at ${BASE_URL} — run npm run dev first`);
}

async function showCaption(page, text) {
  await page.evaluate((t) => {
    let el = document.getElementById("homework-caption");
    if (!el) {
      el = document.createElement("div");
      el.id = "homework-caption";
      el.style.cssText =
        "position:fixed;bottom:28px;left:50%;transform:translateX(-50%);max-width:88%;background:rgba(15,20,25,0.9);color:#e8edf4;padding:16px 22px;border-radius:14px;font:20px/1.45 Segoe UI,system-ui,sans-serif;z-index:99999;text-align:center;pointer-events:none;box-shadow:0 8px 32px rgba(0,0,0,0.35);";
      document.body.appendChild(el);
    }
    el.textContent = t;
    el.style.display = "block";
  }, text);
}

async function hideCaption(page) {
  await page.evaluate(() => {
    const el = document.getElementById("homework-caption");
    if (el) el.style.display = "none";
  });
}

async function settle(page, ms = 2000) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(ms);
}

async function selectCity(page, query) {
  const search = page.getByRole("searchbox", { name: "Пошук міста" });
  await search.fill(query);
  await page.waitForTimeout(700);
  const suggestion = page.locator("button").filter({ hasText: query }).first();
  await suggestion.waitFor({ state: "visible", timeout: 15000 });
  await suggestion.click();
  await settle(page, 4500);
}

async function runDemo(page) {
  await page.goto(`${BASE_URL}/`);
  await settle(page);

  await showCaption(page, CAPTIONS[0].text);
  await page.waitForTimeout(CAPTIONS[0].ms);

  await showCaption(page, CAPTIONS[1].text);
  await selectCity(page, "Київ");

  await showCaption(page, CAPTIONS[2].text);
  await page.getByText("Вихідні", { exact: true }).first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(CAPTIONS[2].ms);

  await showCaption(page, CAPTIONS[3].text);
  const map = page.locator(".leaflet-container");
  await map.waitFor({ state: "visible", timeout: 20000 });
  const box = await map.boundingBox();
  if (box) await page.mouse.click(box.x + 60, box.y + box.height - 60);
  await settle(page, CAPTIONS[3].ms);

  await showCaption(page, CAPTIONS[4].text);
  await page.getByRole("button", { name: "Закріпити місто" }).click();
  await selectCity(page, "Львів");
  await page.getByRole("button", { name: "Закріпити місто" }).click();
  await page.locator("label").filter({ hasText: "Порівняти вихідні" }).getByRole("checkbox").check();
  await settle(page, CAPTIONS[4].ms);

  await hideCaption(page);
  await page.goto(`${BASE_URL}/homework-demo-slides.html`);
  await page.waitForTimeout(22000);
}

async function cleanupRawVideos() {
  const names = await readdir(OUT_DIR);
  await Promise.all(
    names
      .filter((name) => name.startsWith("page@") && name.endsWith(".webm"))
      .map((name) => rm(join(OUT_DIR, name), { force: true })),
  );
}

async function main() {
  await ensureServer();
  await mkdir(OUT_DIR, { recursive: true });

  const rawDir = join(OUT_DIR, "raw");
  await mkdir(rawDir, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: rawDir, size: VIEWPORT },
  });
  const page = await context.newPage();

  await runDemo(page);

  const rawVideo = page.video();
  const webmPath = join(OUT_DIR, "homework-demo.webm");
  await page.close();
  if (rawVideo) await rawVideo.saveAs(webmPath);
  await context.close();
  await browser.close();

  await rm(rawDir, { recursive: true, force: true });
  await cleanupRawVideos();

  const audioPath = join(OUT_DIR, "homework-demo-voice.mp3");
  const finalPath = join(OUT_DIR, "homework-demo-final.mp4");

  let hasAudio = false;
  try {
    await synthesizeVoice(VOICE_SEGMENTS, audioPath);
    hasAudio = existsSync(audioPath);
  } catch (e) {
    console.warn("voiceover skipped:", e instanceof Error ? e.message : e);
    console.warn("retry voice only: npm run qa:mux-homework-voice");
  }

  if (hasAudio && existsSync(webmPath)) {
    await muxVideoAudio(webmPath, audioPath, finalPath);
    console.log(`wrote ${finalPath} (with voiceover)`);
  } else if (existsSync(webmPath)) {
    await webmToMp4(webmPath, finalPath);
    console.log(`wrote ${finalPath} (no voiceover)`);
  }

  await writeFile(
    join(OUT_DIR, "README.md"),
    `# Homework demo video

- **Author:** Vitalii Yurkov
- **Product:** Weather Explorer

## Files

| File | Purpose |
|------|---------|
| \`homework-demo-final.mp4\` | Submit / upload to YouTube (unlisted) |
| \`homework-demo.webm\` | Raw Playwright capture |
| \`homework-demo-voice.mp3\` | Ukrainian TTS voiceover |

## Regenerate

\`\`\`bash
npm run dev                  # terminal 1
npm run qa:record-homework   # screen + voice + mux
npm run qa:mux-homework-voice  # voice + mux only (keeps existing .webm)
\`\`\`

Requires: Playwright Chromium, ffmpeg, Python with \`edge-tts\` (\`pip install edge-tts\`).
Optional: \`PYTHON=/path/to/python.exe\` if auto-detect fails.
`,
  );

  console.log(`\nDone → ${finalPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
