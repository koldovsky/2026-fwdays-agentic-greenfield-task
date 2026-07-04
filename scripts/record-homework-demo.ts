/**
 * Playwright screen recording for homework demo (local stub or STG).
 * Invoked by scripts/record-homework-demo.sh
 */
import fs from "node:fs";
import path from "node:path";

import { chromium } from "playwright";

import { loadSeedAccountsSync } from "@/lib/auth/secrets";

const BASE = (process.env.COLIBRI_STG_URL ?? "http://localhost:3001").replace(/\/$/, "");
const OUT = process.env.COLIBRI_DEMO_OUT ?? path.join(process.cwd(), "docs/demo-video");

async function pause(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

function nextWeekSaturday(): string {
  const d = new Date();
  d.setDate(d.getDate() + 8);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  const user = loadSeedAccountsSync().find((a) => a.role === "user");
  if (!user) throw new Error("No user in .secret");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    baseURL: BASE,
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: OUT, size: { width: 1280, height: 720 } },
  });
  const page = await context.newPage();
  const scheduleDate = nextWeekSaturday();

  // --- Login ---
  await page.goto("/login");
  await page.waitForLoadState("domcontentloaded");
  await page.getByRole("button", { name: "Sign in" }).waitFor({ state: "visible" });
  await pause(1000);
  await page.getByLabel("Username").fill(user.username);
  await page.getByLabel("Password").fill(user.password);
  await pause(400);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 }),
    page.getByRole("button", { name: "Sign in" }).click(),
  ]);
  await pause(1500);

  // --- Home ---
  await pause(1500);

  // --- Book wizard: schedule next week ---
  await page.getByRole("navigation").getByRole("link", { name: "Book", exact: true }).click();
  await page.waitForURL("**/book");
  await pause(2000);

  await page.getByRole("button", { name: /Continue — Who/i }).click();
  await pause(1200);
  await page.getByRole("button").filter({ hasText: "Nataliia" }).first().click();
  await pause(800);
  await page.getByRole("button", { name: /Continue — Pick/i }).click();
  await pause(1500);

  await page.getByRole("tab", { name: "Schedule later" }).click();
  await pause(1200);
  await page.getByLabel("Future booking date").fill(scheduleDate);
  await page.getByRole("button", { name: /Any time \(9 AM – 9 PM\)/i }).click();
  await pause(1500);
  await page.getByRole("button", { name: /Review 1 booking/i }).click();
  await pause(2000);

  await page.getByRole("checkbox").check();
  await pause(800);
  await page.getByRole("button", { name: /Schedule 1 booking/i }).click();
  await pause(3500);

  await expectHeading(page, /Bookings queued/i);
  await pause(2000);

  // --- Scheduled tab ---
  await page.getByRole("link", { name: "View scheduled queue" }).click();
  await page.waitForURL("**/scheduled");
  await pause(4000);

  // --- My bookings (grouped confirmed rows) ---
  await page.getByRole("navigation").getByRole("link", { name: "My bookings" }).click();
  await page.waitForURL("**/bookings");
  await pause(5000);

  // --- Book again: in-window stub submit (Monday tab if visible) ---
  await page.getByRole("navigation").getByRole("link", { name: "Book", exact: true }).click();
  await pause(1500);
  await page.getByRole("button", { name: /Continue — Who/i }).click();
  await pause(800);
  await page.getByRole("button").filter({ hasText: "Max" }).first().click();
  await pause(600);
  await page.getByRole("button", { name: /Continue — Pick/i }).click();
  await pause(1500);

  try {
    await page.getByText("Loading available slots").waitFor({ state: "hidden", timeout: 15_000 });
  } catch {
    /* stub loads fast */
  }

  const tab = page.getByRole("tablist", { name: /Bookable dates/i }).getByRole("tab").first();
  if ((await tab.count()) > 0) {
    await tab.click();
    await pause(1500);
    const slot = page
      .getByRole("list", { name: /available slots/i })
      .locator("button:not([disabled])")
      .first();
    if ((await slot.count()) > 0) {
      await slot.click();
      await pause(1200);
      await page.getByRole("button", { name: /Review 1 booking/i }).click();
      await pause(2000);
      await page.getByRole("checkbox").check();
      await pause(600);
      await page.getByRole("button", { name: /Submit 1 request/i }).click();
      await pause(3500);
      await expectHeading(page, /Booking results/i);
      await pause(2500);
    }
  }

  // --- Scheduled again ---
  await page.getByRole("navigation").getByRole("link", { name: "Scheduled" }).click();
  await pause(3000);

  // --- My bookings again ---
  await page.getByRole("navigation").getByRole("link", { name: "My bookings" }).click();
  await pause(4000);

  await context.close();
  await browser.close();

  const webms = fs
    .readdirSync(OUT)
    .filter((f) => f.endsWith(".webm"))
    .map((f) => ({ f, m: fs.statSync(path.join(OUT, f)).mtimeMs }))
    .sort((a, b) => b.m - a.m);
  if (webms[0]) {
    const dest = path.join(OUT, "walkthrough.webm");
    fs.renameSync(path.join(OUT, webms[0].f), dest);
    console.log(`Saved ${dest}`);
  }
}

async function expectHeading(page: import("playwright").Page, name: RegExp) {
  await page.getByRole("heading", { name }).waitFor({ state: "visible", timeout: 20_000 });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
