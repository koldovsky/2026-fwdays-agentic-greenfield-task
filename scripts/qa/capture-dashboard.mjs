// scripts/qa/capture-dashboard.mjs — S3 `dashboard` browser gate (tasks.md
// §7). Standalone Playwright harness (not `record-demos.mjs`'s generic
// CLIPS loop — this needs project-specific DB seeding + AG-UI ingest driving
// between screenshots) that:
//
//   1. Seeds an EMPTY SQLite fixture, boots `next start` against it, drives
//      the browser to the empty-state dashboard, asserts both Ukrainian
//      empty states + 50 free HallMap seats, screenshots full-page.
//   2. Seeds a POPULATED fixture, boots `next start` against it, drives the
//      browser, POSTs a live AG-UI turn to `/api/agui/ingest` to prove
//      FR-DASH-01's streamed text, asserts ChatStream/RequestCard/queue/
//      HallMap all show real data, screenshots full-page in LIGHT then DARK
//      (`data-theme="dark"` per DESIGN.md — NOT `prefers-color-scheme`).
//
// Output: docs/qa/dashboard/{empty-state,populated-state,populated-state-dark}.png
// Never launches the user's browser; fully headless background Chromium.
//
// Run: node scripts/qa/capture-dashboard.mjs

import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const dashboardDir = path.join(repoRoot, "apps/dashboard");
const scratchDir = path.join(repoRoot, ".qa-scratch");
const outDir = path.join(repoRoot, "docs/qa/dashboard");

const PORT = 3000;
const HOST = "127.0.0.1";
const BASE_URL = `http://${HOST}:${PORT}`;
const VIEWPORT = { width: 1280, height: 900 };

const assert = (cond, msg) => {
  if (!cond) throw new Error(`assertion failed: ${msg}`);
};

const settle = async (page, ms = 1500) => {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(ms);
};

function seedFixture(mode, dbPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [path.join(repoRoot, "scripts/qa/seed-dashboard-fixture.mjs"), mode, dbPath],
      { stdio: "inherit", cwd: repoRoot },
    );
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`seed exited ${code}`))));
  });
}

function startServer(dbPath) {
  const child = spawn(
    "npx",
    ["next", "start", "-H", HOST, "-p", String(PORT)],
    {
      cwd: dashboardDir,
      env: { ...process.env, KAMERTON_DB_PATH: dbPath },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let out = "";
  child.stdout.on("data", (d) => (out += d.toString()));
  child.stderr.on("data", (d) => (out += d.toString()));
  child.__log = () => out;
  return child;
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

async function postAguiEvent(event) {
  const res = await fetch(`${BASE_URL}/api/agui/ingest`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(event),
  });
  assert(res.ok, `ingest POST failed for ${event.type}: ${res.status}`);
}

async function captureEmptyState(browser) {
  const dbPath = path.join(scratchDir, "empty.db");
  const rawVideoDir = path.join(scratchDir, "raw-empty");
  await mkdir(rawVideoDir, { recursive: true });
  await seedFixture("empty", dbPath);
  const server = startServer(dbPath);
  let context;
  try {
    await waitForServer();
    context = await browser.newContext({
      viewport: VIEWPORT,
      colorScheme: "light",
      recordVideo: { dir: rawVideoDir, size: VIEWPORT },
    });
    const page = await context.newPage();
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await settle(page);

    assert(
      await page.getByText("Поки що тихо — розмов немає").isVisible(),
      "empty conversations state text is visible",
    );
    assert(
      await page.getByText("Заявок, що очікують рішення, немає").isVisible(),
      "empty pending-queue state text is visible",
    );
    const seats = page.locator('[data-testid="hall-seat"]');
    const seatCount = await seats.count();
    assert(seatCount === 50, `expected 50 HallMap seats, got ${seatCount}`);
    const freeSeats = page.locator('[data-testid="hall-seat"][data-status="free"]');
    const freeCount = await freeSeats.count();
    assert(freeCount === 50, `expected 50 free HallMap seats, got ${freeCount}`);

    await mkdir(outDir, { recursive: true });
    await page.screenshot({ path: path.join(outDir, "empty-state.png"), fullPage: true });
    await settle(page, 500);
    const video = page.video();
    await page.close();
    await context.close();
    if (video) await video.saveAs(path.join(outDir, "empty-state.webm"));
    console.log("✓ empty-state captured + asserted");
    return { asserted: true };
  } catch (e) {
    console.error("✗ empty-state FAILED:", e.message);
    console.error(server.__log?.());
    if (context) await context.close().catch(() => {});
    return { asserted: false, error: e.message };
  } finally {
    await stopServer(server);
  }
}

async function capturePopulatedState(browser) {
  const dbPath = path.join(scratchDir, "populated.db");
  const rawVideoDir = path.join(scratchDir, "raw-populated");
  await mkdir(rawVideoDir, { recursive: true });
  await seedFixture("populated", dbPath);
  const server = startServer(dbPath);
  const result = { lightAsserted: false, darkAsserted: false };
  let context;
  try {
    await waitForServer();

    // Read back the seeded lead's telegram_chat_id to use as the AG-UI threadId.
    const { openDatabase } = await import("@kamerton/db");
    const db = openDatabase(dbPath);
    const lead = db.prepare(`SELECT * FROM leads LIMIT 1`).get();
    db.close();
    assert(lead !== undefined, "seeded lead row exists");
    const threadId = lead.telegram_chat_id;

    context = await browser.newContext({
      viewport: VIEWPORT,
      colorScheme: "light",
      recordVideo: { dir: rawVideoDir, size: VIEWPORT },
    });
    const page = await context.newPage();
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await settle(page);

    // Drive a live AG-UI turn to prove FR-DASH-01's streamed text.
    const runId = "qa-run-1";
    const messageId = "qa-msg-1";
    const chatText = "Дякую! Записала вас на перше заняття, скоро підтвердимо час.";
    await postAguiEvent({ type: "RUN_STARTED", threadId, runId });
    await postAguiEvent({ type: "TEXT_MESSAGE_START", threadId, messageId });
    await postAguiEvent({ type: "TEXT_MESSAGE_CONTENT", messageId, delta: chatText });
    await postAguiEvent({ type: "TEXT_MESSAGE_END", messageId });
    await postAguiEvent({ type: "RUN_FINISHED", threadId, runId });

    await settle(page, 2000);

    assert(await page.getByText(chatText).isVisible(), "streamed ChatStream message text is visible");
    assert(await page.getByText("Софійка", { exact: false }).first().isVisible(), "RequestCard shows the seeded student name");
    assert(
      await page.getByText("Черга очікування · 1").isVisible(),
      "pending queue header shows count 1",
    );
    assert(
      (await page.locator('[data-testid="hall-seat"][data-status="pending"]').count()) >= 1,
      "at least one amber (pending) HallMap seat",
    );
    assert(
      (await page.locator('[data-testid="hall-seat"][data-status="confirmed"]').count()) >= 1,
      "at least one green (confirmed) HallMap seat",
    );
    assert(
      (await page.locator('[data-testid="hall-seat"][data-status="cancelled"]').count()) >= 1,
      "at least one slate (cancelled) HallMap seat",
    );
    const rowCount = await page.locator('[role="row"]').count();
    assert(rowCount === 5, `expected 5 HallMap weekday rows, got ${rowCount}`);

    await mkdir(outDir, { recursive: true });
    await page.screenshot({ path: path.join(outDir, "populated-state.png"), fullPage: true });
    result.lightAsserted = true;
    console.log("✓ populated-state (light) captured + asserted");

    // Dark mode: DESIGN.md's explicit data-theme attribute, not a media query.
    await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
    await settle(page, 800);
    await page.screenshot({ path: path.join(outDir, "populated-state-dark.png"), fullPage: true });
    result.darkAsserted = true;
    console.log("✓ populated-state (dark) captured");

    await settle(page, 500);
    const video = page.video();
    await page.close();
    await context.close();
    if (video) await video.saveAs(path.join(outDir, "populated-state.webm"));
    return result;
  } catch (e) {
    console.error("✗ populated-state FAILED:", e.message);
    console.error(server.__log?.());
    if (context) await context.close().catch(() => {});
    result.error = e.message;
    return result;
  } finally {
    await stopServer(server);
  }
}

async function writeManifest(empty, populated) {
  const emptyExplainer = `# S3 dashboard gate — empty state

**Proves:** FR-DASH-01 (dashboard renders a live, real-time view of leads/
requests/schedule — including its explicit, friendly EMPTY states, never a
blank region or an endless spinner).

**Steps:**
1. Seed a fresh SQLite DB with the schema only (zero \`leads\`/\`requests\`/
   \`bookings\` rows) via \`scripts/qa/seed-dashboard-fixture.mjs empty\`.
2. Boot \`next start\` against that DB and load \`/\` in a headless browser.
3. Assert both Ukrainian empty-state messages are visible: "Поки що тихо —
   розмов немає" (conversations) and "Заявок, що очікують рішення, немає"
   (pending queue).
4. Assert the HallMap renders exactly 50 seats (5 weekdays x 10 hourly
   slots), all with \`data-status="free"\`.

**Result:** ${empty.asserted ? "asserted ✓" : `FAILED — ${empty.error}`}

![still](empty-state.png)
`;

  const populatedExplainer = `# S3 dashboard gate — populated state

**Proves:** FR-DASH-01 (live streamed conversation text + request-card
fields), FR-DASH-03 (HallMap reflects real booking statuses: pending/
confirmed/cancelled).

**Steps:**
1. Seed a populated SQLite DB (\`scripts/qa/seed-dashboard-fixture.mjs
   populated\`): one lead + one \`awaiting_admin\` request with every intake
   field filled, plus three bookings this week — \`pending\` (linked to the
   request via \`request_id\`), \`confirmed\`, and \`cancelled\`, each on a
   different weekday/hour.
2. Boot \`next start\` against that DB and load \`/\`.
3. POST a live AG-UI turn to \`/api/agui/ingest\` for the seeded lead's
   \`telegram_chat_id\` thread: \`RUN_STARTED\` -> \`TEXT_MESSAGE_START\` ->
   \`TEXT_MESSAGE_CONTENT\` (a Ukrainian sentence) -> \`TEXT_MESSAGE_END\` ->
   \`RUN_FINISHED\`.
4. Assert: the streamed sentence is visible in the \`ChatStream\`; the
   \`RequestCard\` shows the seeded student name; the pending-queue header
   reads "Черга очікування · 1"; the HallMap shows >=1 \`pending\` (amber),
   >=1 \`confirmed\` (green), >=1 \`cancelled\` (slate) seat across exactly 5
   weekday rows.
5. Screenshot full-page in LIGHT mode, then switch dark mode the way
   DESIGN.md specifies it (an explicit \`data-theme="dark"\` attribute on
   \`<html>\`, NOT \`prefers-color-scheme\`) and screenshot again
   (\`populated-state-dark.png\`, supplementary artifact for the axe/vision
   passes — not a separate manifest entry).

**Result:** ${populated.lightAsserted && populated.darkAsserted ? "asserted ✓" : `FAILED — ${populated.error ?? "see log"}`}

![still](populated-state.png)
`;

  await writeFile(path.join(outDir, "empty-state.md"), emptyExplainer);
  await writeFile(path.join(outDir, "populated-state.md"), populatedExplainer);

  const manifest = {
    kind: "demo",
    results: [
      {
        id: "empty-state",
        proof: "FR-DASH-01",
        video: "docs/qa/dashboard/empty-state.webm",
        screenshot: "docs/qa/dashboard/empty-state.png",
        explainer: "docs/qa/dashboard/empty-state.md",
        asserted: empty.asserted === true,
      },
      {
        id: "populated-state",
        proof: ["FR-DASH-01", "FR-DASH-03"],
        video: "docs/qa/dashboard/populated-state.webm",
        screenshot: "docs/qa/dashboard/populated-state.png",
        explainer: "docs/qa/dashboard/populated-state.md",
        asserted: populated.lightAsserted === true && populated.darkAsserted === true,
      },
    ],
  };
  await writeFile(path.join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
}

async function main() {
  if (existsSync(scratchDir)) await rm(scratchDir, { recursive: true, force: true });
  await mkdir(scratchDir, { recursive: true });
  await mkdir(outDir, { recursive: true });

  const browser = await chromium.launch();
  const empty = await captureEmptyState(browser);
  const populated = await capturePopulatedState(browser);
  await browser.close();

  await writeManifest(empty, populated);

  await rm(scratchDir, { recursive: true, force: true }).catch(() => {});

  const ok = empty.asserted && populated.lightAsserted && populated.darkAsserted;
  console.log(`\ncapture-dashboard: empty=${empty.asserted} populated-light=${populated.lightAsserted} populated-dark=${populated.darkAsserted}`);
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
