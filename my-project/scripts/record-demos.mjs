// REFERENCE IMPLEMENTATION — automated, headless recording + validation harness.
//
// Replaces the old stack-coupled `record-demos.reference.ts` /
// `record-proof-recordings.reference.ts`. Lessons paid for in a real run:
//   - NEVER use the user's browser and NEVER trigger a Save-As dialog. This runs
//     its OWN background Playwright Chromium, fully headless, no interaction.
//   - "Record" and "prove the requirement" are the SAME step: every clip DRIVES
//     a real flow and ASSERTS the FRs it proves. The assertion IS the validation
//     — a clip that doesn't assert is not evidence.
//   - Pace clips so async content (maps, charts, fetches) actually renders before
//     the screenshot; capture a SETTLED full-page still, not the wrong moment.
//   - Stack-agnostic: needs only a running app at BASE_URL. No DB/ORM imports.
//     Seeding (if any) is a project hook, not baked in here.
//
// Output (consumed by scripts/check-recordings.mjs and the vision-verify workflow):
//   docs/qa/<outDir>/<id>.webm     video
//   docs/qa/<outDir>/<id>.png      settled full-page still
//   docs/qa/<outDir>/<id>.md       explainer (steps -> requirement)
//   docs/qa/<outDir>/manifest.json { results: [{ id, proof, video, screenshot, explainer, asserted }] }
//
// Run: `node scripts/record-demos.mjs`  (env: BASE_URL, OUT_DIR). Requires
// `@playwright/test` (or `playwright`) installed and the app already running.
import { chromium } from "@playwright/test";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const OUT_DIR = join("docs/qa", process.env.OUT_DIR ?? "demo-recordings");
const VIEWPORT = { width: 1280, height: 800 };
const assert = (cond, msg) => {
  if (!cond) throw new Error(`assertion failed: ${msg}`);
};
// `settle` paces a clip so async content renders before we screenshot it.
const settle = async (page, ms = 1500) => {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(ms);
};

// ---- CLIPS: one per capability. Each `run` DRIVES the flow and ASSERTS the FRs
// it proves (replace these with the project's real flows). `proof` lists the ids.
const CLIPS = [
  {
    id: "forgeflow-extended-table-tour",
    title: "Створення та повне оприбуткування замовлення у ForgeFlow",
    description: "Створення замовлення на 24 одиниці, його поява зі статусом «Замовлено», повне оприбуткування, оновлення запасу до 174 кг і рух +24 у журналі.",
    proof: "FR-1, FR-2, FR-8, FR-11, FR-13, FR-18, FR-19, FR-20, FR-22, FR-23, FR-24, FR-35",
    run: async (page) => {
      const scenarioStartedAt = Date.now();
      await page.goto(`${BASE_URL}/login`);
      await settle(page, 2500);
      assert(await page.getByRole("heading", { name: "Вітаємо у ForgeFlow" }).isVisible(), "login is visible");

      await page.getByLabel("Ім’я користувача").fill("test");
      await page.getByLabel("Пароль").fill("test");
      await page.getByRole("button", { name: "Увійти безпечно" }).click();
      await page.waitForURL("**/dashboard");
      await settle(page, 5000);
      assert(await page.getByRole("heading", { name: "Доброго дня, командо" }).isVisible(), "dashboard is visible");
      assert(await page.getByText("Сировина", { exact: true }).isVisible(), "raw valuation is visible");
      assert(await page.getByRole("link", { name: "Огляд" }).getAttribute("aria-current") === "page", "dashboard navigation is persistently active");
      const dashboardText = await page.locator("body").innerText();
      assert(dashboardText.includes("грн"), "dashboard values use the UAH suffix");
      assert(!dashboardText.includes("$") && !dashboardText.includes("USD"), "dashboard contains no dollar sign or USD code");

      await page.getByRole("link", { name: "Закупівлі" }).click();
      await page.waitForURL("**/procurement");
      await settle(page, 3000);
      assert(await page.getByRole("heading", { name: "Керування закупівлями" }).isVisible(), "procurement is visible");
      assert(await page.getByText("Відстеження закупівель").isVisible(), "order tracking is visible");
      assert(await page.getByRole("link", { name: "Закупівлі" }).getAttribute("aria-current") === "page", "procurement navigation is persistently active");

      await page.getByLabel("Постачальник").selectOption("sup_101");
      await page.getByLabel("Матеріал").selectOption("mat_201");
      await page.getByLabel("Кількість", { exact: true }).fill("24");
      await page.getByLabel("Ціна за одиницю").fill("12.50");
      await settle(page, 3000);
      await page.getByRole("button", { name: "Оформити замовлення" }).click();
      await page.waitForURL("**/procurement?success=**");
      await settle(page, 7000);
      const newOrderRow = page.getByRole("row").filter({ hasText: "Сталь-Пром Україна" }).filter({ hasText: "0 / 24" }).first();
      assert(await newOrderRow.isVisible(), "new purchase order appears in the tracking table");
      assert(await newOrderRow.getByText(/300,00 грн/).isVisible(), "new order total is visible in UAH");
      assert(await newOrderRow.getByText("Замовлено", { exact: true }).isVisible(), "new order has ordered status");
      const orderNumber = await newOrderRow.locator("td").first().locator("strong").textContent();
      assert(Boolean(orderNumber), "new order number is visible");

      await newOrderRow.getByRole("spinbutton", { name: `Отримана кількість для ${orderNumber}` }).fill("24");
      await settle(page, 3000);
      await newOrderRow.getByRole("button", { name: "Оприбуткувати" }).click();
      await page.waitForURL("**/procurement?success=**");
      await settle(page, 7000);
      assert(await page.getByText("Надходження оприбутковано та передано на контроль якості.").isVisible(), "receipt success message is visible");
      const receivedOrderRow = page.getByRole("row").filter({ hasText: orderNumber }).first();
      assert(await receivedOrderRow.getByText("Отримано", { exact: true }).isVisible(), "order has received status");
      assert(await receivedOrderRow.getByText("24 / 24", { exact: true }).isVisible(), "order is fully received");

      await page.getByRole("link", { name: "Запаси", exact: true }).click();
      await page.waitForURL("**/inventory");
      await settle(page, 5000);
      const materialRow = page.getByRole("row").filter({ hasText: "Загартований сталевий прут 20 мм" }).first();
      assert(await materialRow.getByText("174 кг", { exact: true }).isVisible(), "received stock increases inventory from 150 to 174");
      assert(await materialRow.locator("span.badge", { hasText: "Контроль якості" }).isVisible(), "received stock is in quality inspection");

      await page.getByRole("link", { name: "Журнал рухів" }).click();
      await page.waitForURL("**/ledger");
      await settle(page, 5000);
      assert(await page.getByRole("heading", { name: "Журнал рухів" }).isVisible(), "ledger is visible");
      const receiptMovement = page.getByRole("row").filter({ hasText: "Надходження за замовленням" }).filter({ hasText: "+24" }).first();
      assert(await receiptMovement.isVisible(), "receipt movement is visible in the ledger");

      // Hold the final proof frame only as long as needed to keep the clip near
      // 57 seconds. main() adds one more 1.5-second settled-frame pause.
      const remainingToTarget = 55_500 - (Date.now() - scenarioStartedAt);
      if (remainingToTarget > 0) await page.waitForTimeout(remainingToTarget);
    },
  },
];

async function ensureServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(BASE_URL);
      if (res.ok || res.status < 500) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`app not reachable at ${BASE_URL} — start it first (this harness never launches the user's browser)`);
}

async function main() {
  await ensureServer();
  if (existsSync(OUT_DIR)) await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(join(OUT_DIR, "raw"), { recursive: true });
  const browser = await chromium.launch(); // headless by default
  const results = [];
  let anyFailed = false;

  for (const clip of CLIPS) {
    const context = await browser.newContext({ viewport: VIEWPORT, recordVideo: { dir: join(OUT_DIR, "raw"), size: VIEWPORT } });
    const page = await context.newPage();
    const recordingStartedAt = Date.now();
    let asserted = true;
    let error = null;
    try {
      await clip.run(page);
      await settle(page); // settle again before the proof still
    } catch (e) {
      asserted = false;
      anyFailed = true;
      error = e.message;
    }
    const shot = join(OUT_DIR, `${clip.id}.png`);
    await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
    const video = page.video();
    await page.close();
    await context.close();
    const videoPath = join(OUT_DIR, `${clip.id}.webm`);
    if (video) await video.saveAs(videoPath).catch(() => {});

    await writeFile(
      join(OUT_DIR, `${clip.id}.md`),
      `# ${clip.title}\n\n${clip.description}\n\n**Підтверджує:** ${clip.proof}\n\n**Результат:** ${asserted ? "підтверджено ✓" : `ПОМИЛКА — ${error}`}\n\n![Знімок інтерфейсу](${clip.id}.png)\n`,
    );
    const durationSeconds = Number(((Date.now() - recordingStartedAt) / 1000).toFixed(1));
    results.push({ id: clip.id, title: clip.title, proof: clip.proof, video: videoPath.replaceAll("\\", "/"), screenshot: shot.replaceAll("\\", "/"), explainer: join(OUT_DIR, `${clip.id}.md`).replaceAll("\\", "/"), asserted, durationSeconds });
    console.log(`${asserted ? "✓" : "✗"} ${clip.id} (${clip.proof})${error ? ` — ${error}` : ""}`);
  }

  await rm(join(OUT_DIR, "raw"), { recursive: true, force: true });
  await writeFile(join(OUT_DIR, "manifest.json"), `${JSON.stringify({ kind: "demo", results }, null, 2)}\n`);
  await browser.close();
  console.log(`\nwrote ${results.length} clip(s) to ${OUT_DIR}. Validate: node scripts/check-recordings.mjs`);
  // A clip whose assertions failed is NOT evidence — fail so it gets fixed and re-recorded.
  process.exit(anyFailed ? 1 : 0);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
