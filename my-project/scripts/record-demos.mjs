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
    title: "ForgeFlow extended tour with live table additions",
    proof: "FR-1, FR-2, FR-8, FR-9, FR-10, FR-11, FR-13, FR-14, FR-18, FR-19, FR-20, FR-29, FR-30, FR-35",
    run: async (page) => {
      await page.goto(`${BASE_URL}/login`);
      await settle(page, 2500);
      assert(await page.getByRole("heading", { name: "Welcome to ForgeFlow" }).isVisible(), "login is visible");

      await page.getByLabel("Username").fill("test");
      await page.getByLabel("Password").fill("test");
      await page.getByRole("button", { name: "Sign in securely" }).click();
      await page.waitForURL("**/dashboard");
      await settle(page, 9500);
      assert(await page.getByRole("heading", { name: "Good morning, team" }).isVisible(), "dashboard is visible");
      assert(await page.getByText("Raw materials", { exact: true }).isVisible(), "raw valuation is visible");

      await page.getByRole("link", { name: "Inventory", exact: true }).click();
      await page.waitForURL("**/inventory");
      await settle(page, 4500);
      assert(await page.getByRole("heading", { name: "Inventory & suppliers" }).isVisible(), "inventory is visible");

      await page.getByLabel("Company").fill("Northstar Demo Metals");
      await page.getByLabel("Contact").fill("Marta Demo");
      await page.getByLabel("Email").fill("orders@northstar.demo");
      await page.getByLabel("Phone").fill("+1-555-010-2040");
      await page.getByLabel("Lead time (days)").fill("4");
      await page.getByLabel("Rating").fill("4.9");
      await page.getByRole("button", { name: "Add supplier" }).click();
      await page.waitForURL("**/inventory?success=**");
      await settle(page, 9500);
      assert(await page.getByText("Northstar Demo Metals").isVisible(), "new supplier appears in the table");

      await page.getByRole("link", { name: "Procurement" }).click();
      await page.waitForURL("**/procurement");
      await settle(page, 4000);
      assert(await page.getByRole("heading", { name: "Procurement engine" }).isVisible(), "procurement is visible");
      assert(await page.getByText("Purchase order tracking").isVisible(), "order tracking is visible");

      await page.getByLabel("Supplier").selectOption({ label: "Northstar Demo Metals" });
      await page.getByLabel("Material").selectOption("mat_201");
      await page.getByLabel("Quantity", { exact: true }).fill("24");
      await page.getByLabel("Unit price").fill("12.50");
      await page.getByRole("button", { name: "Issue purchase order" }).click();
      await page.waitForURL("**/procurement?success=**");
      await settle(page, 9500);
      const newOrderRow = page.getByRole("row").filter({ hasText: "Northstar Demo Metals" });
      assert(await newOrderRow.isVisible(), "new purchase order appears in the tracking table");
      assert(await newOrderRow.getByText("$300.00").isVisible(), "new order total is visible");

      await page.getByRole("link", { name: "Manufacturing" }).click();
      await page.waitForURL("**/manufacturing");
      await settle(page, 8500);
      assert(await page.getByRole("heading", { name: "Production control" }).isVisible(), "manufacturing is visible");
      assert(await page.getByText("10-unit material preview").isVisible(), "BOM preview is visible");

      await page.getByRole("link", { name: "Movement ledger" }).click();
      await page.waitForURL("**/ledger");
      await settle(page, 5500);
      assert(await page.getByRole("heading", { name: "Movement ledger" }).isVisible(), "ledger is visible");
      assert(await page.getByText("Production Consumption").first().isVisible(), "movement history is visible");
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
      `# ${clip.title}\n\n**Proves:** ${clip.proof}\n\n**Result:** ${asserted ? "asserted ✓" : `FAILED — ${error}`}\n\n![still](${clip.id}.png)\n`,
    );
    results.push({ id: clip.id, title: clip.title, proof: clip.proof, video: videoPath.replaceAll("\\", "/"), screenshot: shot.replaceAll("\\", "/"), explainer: join(OUT_DIR, `${clip.id}.md`).replaceAll("\\", "/"), asserted });
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
