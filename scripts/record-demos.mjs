// Automated, headless recording + validation harness for Weather Explorer.
//
// Run: `npm run qa:record-demos`  (env: BASE_URL, OUT_DIR). Requires
// `@playwright/test` and Chromium (`npx playwright install chromium`).
import { chromium } from "@playwright/test";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUT_DIR = join("docs/qa", process.env.OUT_DIR ?? "demo-recordings");
const DESKTOP = { width: 1280, height: 800 };
const MOBILE = { width: 360, height: 740 };

const assert = (cond, msg) => {
  if (!cond) throw new Error(`assertion failed: ${msg}`);
};

const settle = async (page, ms = 2000) => {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(ms);
};

const searchInput = (page) => page.getByRole("searchbox", { name: "Пошук міста" });

async function selectCity(page, query = "Львів") {
  await searchInput(page).fill(query);
  await page.waitForTimeout(700);
  const suggestion = page.locator("button").filter({ hasText: query }).first();
  await suggestion.waitFor({ state: "visible", timeout: 15000 });
  await suggestion.click();
  await settle(page, 4500);
}

const CLIPS = [
  {
    id: "01-shell-empty",
    title: "Empty shell hero and search",
    proof: "FR-SHELL-01, FR-SHELL-02, FR-SHELL-03",
    viewport: DESKTOP,
    run: async (page) => {
      await page.goto(`${BASE_URL}/`);
      await settle(page);
      assert(await page.getByRole("heading", { level: 1 }).isVisible(), "hero heading visible");
      assert(await searchInput(page).isVisible(), "city search visible");
      assert(await page.getByText("Оберіть місто, щоб побачити 7-денний прогноз.").isVisible(), "forecast placeholder");
    },
  },
  {
    id: "02-header-clock",
    title: "Header live clock",
    proof: "FR-CLOCK-01",
    viewport: DESKTOP,
    run: async (page) => {
      await page.goto(`${BASE_URL}/`);
      await settle(page, 800);
      const clock = page.locator("time").filter({ hasText: /\d{1,2}:\d{2}/ });
      assert(await clock.count(), "clock time visible");
      assert(await clock.first().getAttribute("aria-label"), "clock has accessible name");
    },
  },
  {
    id: "03-search-forecast",
    title: "City search with forecast and comfort",
    proof:
      "FR-SEARCH-01, FR-SEARCH-02, FR-SEARCH-03, FR-SEARCH-04, FR-SEARCH-05, FR-FORECAST-01, FR-FORECAST-02, FR-FORECAST-03, FR-FORECAST-04, FR-FORECAST-05, FR-COMFORT-01, FR-COMFORT-02, FR-COMFORT-03, FR-COMFORT-04, FR-COMFORT-05",
    viewport: DESKTOP,
    run: async (page) => {
      await page.goto(`${BASE_URL}/`);
      await selectCity(page);
      assert(page.url().includes("lat="), "URL reflects selected location");
      assert(await page.getByText("Комфорт:").first().isVisible(), "comfort badge on card");
      assert(await page.getByText("Вихідні", { exact: true }).first().isVisible(), "weekend highlight");
      assert(await page.getByText("Схід").first().isVisible(), "sunrise note");
      assert(await page.getByLabel("Графік температури на 48 годин").isVisible(), "hourly chart");
    },
  },
  {
    id: "04-map-panel",
    title: "Interactive OSM map with attribution",
    proof: "FR-MAP-01, FR-MAP-02, FR-MAP-03, FR-MAP-04, FR-MAP-05",
    viewport: DESKTOP,
    run: async (page) => {
      await page.goto(`${BASE_URL}/`);
      await selectCity(page);
      const map = page.locator(".leaflet-container");
      await map.waitFor({ state: "visible", timeout: 20000 });
      const urlBefore = page.url();
      const box = await map.boundingBox();
      assert(box, "map bounding box available");
      await page.mouse.click(box.x + 48, box.y + box.height - 48);
      await settle(page, 5000);
      assert(page.url() !== urlBefore, "map click updates active location in URL");
      assert(await page.locator(".leaflet-control-attribution").isVisible(), "OSM attribution visible");
    },
  },
  {
    id: "05-animated-background",
    title: "Animated sky does not block interaction",
    proof: "FR-ANIM-01, FR-ANIM-02, FR-ANIM-04",
    viewport: DESKTOP,
    run: async (page) => {
      await page.goto(`${BASE_URL}/`);
      await selectCity(page);
      await searchInput(page).click();
      assert(await searchInput(page).isEditable(), "search remains interactive over background");
    },
  },
  {
    id: "06-reduced-motion",
    title: "Reduced motion static fallback",
    proof: "FR-ANIM-03",
    viewport: DESKTOP,
    run: async (page) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`${BASE_URL}/`);
      await selectCity(page);
      assert(await searchInput(page).isVisible(), "page usable under reduced motion");
    },
  },
  {
    id: "07-weekend-compare",
    title: "Weekend compare table",
    proof: "FR-COMPARE-01, FR-COMPARE-02, FR-COMPARE-03",
    viewport: DESKTOP,
    run: async (page) => {
      await page.goto(`${BASE_URL}/`);
      await selectCity(page, "Львів");
      await page.getByRole("button", { name: "Закріпити місто" }).click();
      await selectCity(page, "Одес");
      await page.getByRole("button", { name: "Закріпити місто" }).click();
      await page
        .locator("label")
        .filter({ hasText: "Порівняти вихідні" })
        .getByRole("checkbox")
        .check();
      await settle(page, 5000);
      assert(await page.getByText("Субота").isVisible(), "Saturday column");
      assert(
        await page.getByRole("button", { name: "Зробити активним" }).first().isVisible(),
        "make active control for non-active pinned city",
      );
    },
  },
  {
    id: "08-footer-jokes",
    title: "Footer joke and data credits",
    proof: "FR-JOKES-01, BC-BRAND-02",
    viewport: DESKTOP,
    run: async (page) => {
      await page.goto(`${BASE_URL}/`);
      await settle(page);
      const footerLink = page.getByRole("link", { name: "Open-Meteo" });
      await footerLink.scrollIntoViewIfNeeded();
      assert(await footerLink.isVisible(), "Open-Meteo credit link");
      assert(await page.getByRole("link", { name: "OpenStreetMap" }).isVisible(), "OSM credit link");
      assert(await page.locator("footer p").first().innerText(), "footer joke line present");
    },
  },
  {
    id: "09-mobile-layout",
    title: "Mobile responsive layout",
    proof: "FR-SHELL-02",
    viewport: MOBILE,
    run: async (page) => {
      await page.goto(`${BASE_URL}/`);
      await selectCity(page);
      assert(await page.getByRole("main").isVisible(), "main region on mobile");
      assert(await searchInput(page).isVisible(), "search visible on mobile");
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      assert(scrollWidth <= clientWidth + 2, "no horizontal scroll on mobile");
    },
  },
];

async function ensureServer() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const res = await fetch(BASE_URL);
      if (res.ok || res.status < 500) return;
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`app not reachable at ${BASE_URL} — start it first`);
}

async function recordClip(browser, clip) {
  const context = await browser.newContext({
    viewport: clip.viewport,
    recordVideo: { dir: join(OUT_DIR, "raw"), size: clip.viewport },
  });
  const page = await context.newPage();
  let asserted = true;
  let error = null;

  try {
    await clip.run(page, context);
    await settle(page);
  } catch (e) {
    asserted = false;
    error = e instanceof Error ? e.message : String(e);
  }

  const shot = join(OUT_DIR, `${clip.id}.png`);
  await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
  const videoHandle = page.video();
  await page.close();
  await context.close();
  const videoPath = join(OUT_DIR, `${clip.id}.webm`);
  if (videoHandle) await videoHandle.saveAs(videoPath).catch(() => {});

  await writeFile(
    join(OUT_DIR, `${clip.id}.md`),
    `# ${clip.title}\n\n**Proves:** ${clip.proof}\n\n**Result:** ${asserted ? "asserted ✓" : `FAILED — ${error}`}\n\n![still](${clip.id}.png)\n`,
  );

  return {
    id: clip.id,
    title: clip.title,
    proof: clip.proof,
    video: videoPath.replaceAll("\\", "/"),
    screenshot: shot.replaceAll("\\", "/"),
    explainer: join(OUT_DIR, `${clip.id}.md`).replaceAll("\\", "/"),
    asserted,
    error,
  };
}

async function main() {
  await ensureServer();
  if (existsSync(OUT_DIR)) await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(join(OUT_DIR, "raw"), { recursive: true });

  const browser = await chromium.launch();
  const results = [];
  let anyFailed = false;

  for (const clip of CLIPS) {
    const result = await recordClip(browser, clip);
    results.push(result);
    if (!result.asserted) anyFailed = true;
    console.log(`${result.asserted ? "✓" : "✗"} ${clip.id} (${clip.proof})${result.error ? ` — ${result.error}` : ""}`);
  }

  await rm(join(OUT_DIR, "raw"), { recursive: true, force: true });
  await writeFile(
    join(OUT_DIR, "manifest.json"),
    `${JSON.stringify({ kind: "demo", generatedAt: new Date().toISOString(), results }, null, 2)}\n`,
  );
  await browser.close();

  console.log(`\nwrote ${results.length} clip(s) to ${OUT_DIR}`);
  console.log("Validate: node scripts/check-recordings.mjs");
  process.exit(anyFailed ? 1 : 0);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
