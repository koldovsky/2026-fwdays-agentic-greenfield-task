// scripts/qa/a11y-kb-learning.mjs — kb-learning S5 rendered-UI gate
// (tasks.md §G.3). Adapted from `scripts/qa/a11y-booking-hitl.mjs`'s
// harness: axe-core (wcag2a+wcag2aa) against the POPULATED Question-inbox
// route (open + answered/failed + answered/pending rows together — the
// state the task brief calls out for particular attention: answer-form
// label/focus order, `aria-live` on the outcome message, the failed/sending
// state's non-color-only cue, contrast), in BOTH light and dark
// (`data-theme`, not `prefers-color-scheme` — S3's own lesson).
//
// Seeds its own fixture (`seed-kb-learning-fixture.mjs populated`) + boots
// `next start` bound to 127.0.0.1 only (NFR-LOCAL-01); fails on any
// serious/critical WCAG2A/AA violation.
//
// Run: node scripts/qa/a11y-kb-learning.mjs

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
const scratchDir = path.join(repoRoot, ".qa-scratch-a11y-kb-learning");

const PORT = 3034; // distinct from every other qa script's port
const HOST = "127.0.0.1";
const BASE_URL = `http://${HOST}:${PORT}`;

function seedFixture(dbPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [path.join(repoRoot, "scripts/qa/seed-kb-learning-fixture.mjs"), "populated", dbPath],
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

const settle = async (page, ms = 1000) => {
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

/** Puts the open question's answer form into its inline-validation-error
 *  state (empty submit) — the state the task brief calls out for a11y
 *  attention (label/focus order, `role="alert"`). */
async function triggerValidationError(page) {
  const section = page.locator('section[aria-label="Питання лідів"]');
  const openRow = section.locator("li", { hasText: "Скільки коштує одне заняття для дорослого?" });
  await openRow.getByRole("button", { name: "Надіслати" }).click();
  await openRow.getByRole("alert").waitFor({ state: "visible" });
  await settle(page, 300);
}

async function main() {
  if (existsSync(scratchDir)) await rm(scratchDir, { recursive: true, force: true });
  await mkdir(scratchDir, { recursive: true });
  const dbPath = path.join(scratchDir, "kb-learning.db");
  await seedFixture(dbPath);

  const server = startServer(dbPath);
  let allFailures = [];
  try {
    await waitForServer();
    const browser = await chromium.launch();

    // LIGHT
    {
      const context = await browser.newContext({ colorScheme: "light" });
      const page = await context.newPage();
      await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
      await settle(page);

      const closedFailures = await runAxe(page, "light-closed");
      allFailures = allFailures.concat(closedFailures.map((f) => ({ ...f, scheme: "light-closed" })));

      await triggerValidationError(page);
      const errorFailures = await runAxe(page, "light-validation-error");
      allFailures = allFailures.concat(errorFailures.map((f) => ({ ...f, scheme: "light-validation-error" })));

      await context.close();
    }

    // DARK
    {
      const context = await browser.newContext({ colorScheme: "dark" });
      const page = await context.newPage();
      await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
      await settle(page);
      await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
      await settle(page, 800);

      const closedFailures = await runAxe(page, "dark-closed");
      allFailures = allFailures.concat(closedFailures.map((f) => ({ ...f, scheme: "dark-closed" })));

      await triggerValidationError(page);
      const errorFailures = await runAxe(page, "dark-validation-error");
      allFailures = allFailures.concat(errorFailures.map((f) => ({ ...f, scheme: "dark-validation-error" })));

      await context.close();
    }

    await browser.close();
  } finally {
    await stopServer(server);
    await rm(scratchDir, { recursive: true, force: true }).catch(() => {});
  }

  console.log(
    `\na11y-kb-learning: ${allFailures.length} serious/critical violation(s) across light+dark, closed+validation-error.`,
  );
  process.exit(allFailures.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
