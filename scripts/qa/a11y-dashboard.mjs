// scripts/qa/a11y-dashboard.mjs — S3 `dashboard` browser gate (tasks.md §7),
// axe-core accessibility check in BOTH light and dark.
//
// `scripts/check-a11y.mjs` (the repo's generic reference gate) switches
// color scheme via Playwright's `colorScheme` context option, which only
// matters for a `prefers-color-scheme` media query. DESIGN.md's dark mode is
// an EXPLICIT `data-theme="dark"` attribute on `<html>` (see
// `apps/dashboard/app/DashboardApp.tsx`/`layout.tsx`), so `colorScheme`
// alone never switches this app's dark palette — this script drives dark
// mode for real via `document.documentElement.setAttribute("data-theme",
// "dark")` before the second axe pass, on the SAME populated page (so the
// only variable between the two passes is the theme, not the data).
//
// Seeds its own populated fixture + boots `next start` (never reuses a
// server the caller may have left running, so this script is runnable
// standalone). Fails on any serious/critical WCAG2A/AA violation.
//
// Run: node scripts/qa/a11y-dashboard.mjs

import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { spawn } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const dashboardDir = path.join(repoRoot, "apps/dashboard");
const scratchDir = path.join(repoRoot, ".qa-scratch-a11y");

const PORT = 3010; // distinct from capture-dashboard.mjs's 3000 so both can run independently
const HOST = "127.0.0.1";
const BASE_URL = `http://${HOST}:${PORT}`;

function seedFixture(dbPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [path.join(repoRoot, "scripts/qa/seed-dashboard-fixture.mjs"), "populated", dbPath],
      { stdio: "inherit", cwd: repoRoot },
    );
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`seed exited ${code}`))));
  });
}

function startServer(dbPath) {
  return spawn("npx", ["next", "start", "-H", HOST, "-p", String(PORT)], {
    cwd: dashboardDir,
    env: { ...process.env, KAMERTON_DB_PATH: dbPath },
    stdio: "ignore",
  });
}

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(BASE_URL);
      if (res.status < 500) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`app not reachable at ${BASE_URL} within 60s`);
}

async function stopServer(child) {
  if (!child) return;
  child.kill("SIGTERM");
  await new Promise((r) => setTimeout(r, 500));
  try {
    child.kill("SIGKILL");
  } catch {}
}

const settle = async (page, ms = 1200) => {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(ms);
};

async function runAxe(page, label) {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  const serious = violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  for (const v of serious) {
    console.error(
      `FAIL [${label}] ${v.id} (${v.impact}, ${v.nodes.length} node(s)): ${v.help}\n  ${v.nodes
        .map((n) => n.target.join(" "))
        .join("\n  ")}`,
    );
  }
  console.log(`[${label}] ${violations.length} total violation(s), ${serious.length} serious/critical.`);
  return serious;
}

async function main() {
  if (existsSync(scratchDir)) await rm(scratchDir, { recursive: true, force: true });
  await mkdir(scratchDir, { recursive: true });
  const dbPath = path.join(scratchDir, "populated.db");
  await seedFixture(dbPath);

  const server = startServer(dbPath);
  let allFailures = [];
  try {
    await waitForServer();
    const browser = await chromium.launch();
    const context = await browser.newContext({ colorScheme: "light" });
    const page = await context.newPage();
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await settle(page);

    const lightFailures = await runAxe(page, "light");
    allFailures = allFailures.concat(lightFailures.map((f) => ({ ...f, scheme: "light" })));

    await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
    await settle(page, 800);
    const darkFailures = await runAxe(page, "dark");
    allFailures = allFailures.concat(darkFailures.map((f) => ({ ...f, scheme: "dark" })));

    await context.close();
    await browser.close();
  } finally {
    await stopServer(server);
    await rm(scratchDir, { recursive: true, force: true }).catch(() => {});
  }

  console.log(`\na11y-dashboard: ${allFailures.length} serious/critical violation(s) across light+dark.`);
  process.exit(allFailures.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
