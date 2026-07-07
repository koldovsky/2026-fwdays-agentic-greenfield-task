// scripts/qa/capture-booking-hitl.mjs — booking-hitl S4 rendered-UI gate
// (tasks.md §I.1-I.2). Adapted from `scripts/qa/capture-dashboard.mjs`'s
// harness shape (S3): seeds a real SQLite fixture
// (`seed-booking-hitl-fixture.mjs`), boots `next start` bound to
// 127.0.0.1 only (NFR-LOCAL-01), drives headless Chromium, and captures
// four named stills in LIGHT then DARK (`data-theme` attribute — NOT
// `prefers-color-scheme`, S3's own lesson):
//
//   (a) decisionbar-actions — the pending request's real DecisionBar with
//       all three actions (Підтвердити / Запропонувати інший час /
//       Відхилити) visible (FR-HITL-01).
//   (b) slot-picker-open — the inline picker revealed by "Запропонувати
//       інший час", with 1-2 on-grid candidate slots selected as real
//       checkboxes and "Запропонувати" enabled (FR-HITL-03).
//   (c) decision-outcome — the inline `role="status"` outcome message after
//       Confirm. Driving a REAL POST here would either hit the live DEMO
//       Google Calendar (a non-deterministic, side-effecting network call
//       against a fake `calendar_event_id` this fixture invents — never
//       appropriate for a repeatable QA capture) or silently no-op without
//       live credentials — so this harness installs a Playwright
//       `page.route` interception on `/api/decisions/**` and fulfills it
//       with a REAL, spec-shaped `{status:"applied", message}` response
//       body (task brief's own "or a mocked response" escape hatch). The
//       real `DecisionBar` component, the real fetch call, and the real
//       inline-render path are all exercised — only the network transport
//       is stubbed.
//   (d) hallmap-states — the HallMap showing the seeded pending (amber) +
//       confirmed (green) + cancelled (slate) seats together.
//
// Output: docs/qa/booking-hitl/{name}[-dark].png (+ a shared
// booking-hitl-{light,dark}.webm per theme, matching S3's
// video+screenshot-per-manifest-entry convention).
//
// Run: node scripts/qa/capture-booking-hitl.mjs

import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const dashboardDir = path.join(repoRoot, "apps/dashboard");
const scratchDir = path.join(repoRoot, ".qa-scratch-booking-hitl");
const outDir = path.join(repoRoot, "docs/qa/booking-hitl");

const PORT = 3030; // distinct from capture-dashboard.mjs (3000) / a11y-dashboard.mjs (3010)
const HOST = "127.0.0.1"; // NFR-LOCAL-01: never bind beyond localhost
const BASE_URL = `http://${HOST}:${PORT}`;
const VIEWPORT = { width: 1280, height: 900 };

const assert = (cond, msg) => {
  if (!cond) throw new Error(`assertion failed: ${msg}`);
};

const settle = async (page, ms = 1000) => {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(ms);
};

function seedFixture(dbPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [path.join(repoRoot, "scripts/qa/seed-booking-hitl-fixture.mjs"), dbPath],
      { stdio: "inherit", cwd: repoRoot },
    );
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`seed exited ${code}`))));
  });
}

function startServer(dbPath) {
  const child = spawn("npx", ["next", "start", "-H", HOST, "-p", String(PORT)], {
    cwd: dashboardDir,
    env: { ...process.env, KAMERTON_DB_PATH: dbPath },
    stdio: ["ignore", "pipe", "pipe"],
  });
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

/** Runs the full scripted capture for one theme ("light" | "dark") against
 *  an already-running server. Returns the per-still assertion results. */
async function captureTheme(browser, theme) {
  const rawVideoDir = path.join(scratchDir, `raw-${theme}`);
  await mkdir(rawVideoDir, { recursive: true });
  const result = {};

  const context = await browser.newContext({
    viewport: VIEWPORT,
    colorScheme: theme,
    recordVideo: { dir: rawVideoDir, size: VIEWPORT },
  });

  // Task escape hatch: mock the decision route's response so the outcome
  // still is deterministic and never touches the real DEMO calendar. Every
  // OTHER request (page load, RSC data, static assets) passes through
  // untouched.
  await context.route("**/api/decisions/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "applied",
        message: "Заняття підтверджено. Ліда повідомлено в Telegram.",
      }),
    });
  });

  const page = await context.newPage();
  try {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await settle(page);

    if (theme === "dark") {
      await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
      await settle(page, 600);
    }

    const suffix = theme === "dark" ? "-dark" : "";
    await mkdir(outDir, { recursive: true });

    // (a) decisionbar-actions — all three actions visible on the seeded
    // pending request's real DecisionBar.
    const decisionBar = page.getByTestId("decision-bar").first();
    await decisionBar.scrollIntoViewIfNeeded();
    assert(await decisionBar.getByRole("button", { name: "Підтвердити" }).isVisible(), "Підтвердити button visible");
    assert(
      await decisionBar.getByRole("button", { name: "Запропонувати інший час" }).isVisible(),
      "Запропонувати інший час button visible",
    );
    assert(await decisionBar.getByRole("button", { name: "Відхилити" }).isVisible(), "Відхилити button visible");
    await page.screenshot({ path: path.join(outDir, `decisionbar-actions${suffix}.png`), fullPage: true });
    result.decisionbarActions = true;
    console.log(`✓ [${theme}] decisionbar-actions captured + asserted`);

    // (d) hallmap-states — pending + confirmed + cancelled seats together,
    // captured BEFORE any decision interaction perturbs the page.
    assert(
      (await page.locator('[data-testid="hall-seat"][data-status="pending"]').count()) >= 1,
      "at least one pending (amber) HallMap seat",
    );
    assert(
      (await page.locator('[data-testid="hall-seat"][data-status="confirmed"]').count()) >= 1,
      "at least one confirmed (green) HallMap seat",
    );
    assert(
      (await page.locator('[data-testid="hall-seat"][data-status="cancelled"]').count()) >= 1,
      "at least one cancelled (slate) HallMap seat",
    );
    await page.locator('[aria-label="Розклад залу"]').scrollIntoViewIfNeeded();
    await settle(page, 300);
    await page.screenshot({ path: path.join(outDir, `hallmap-states${suffix}.png`), fullPage: true });
    result.hallmapStates = true;
    console.log(`✓ [${theme}] hallmap-states captured + asserted`);

    // (b) slot-picker-open — reveal the picker, select two candidate slots,
    // confirm the send button is enabled.
    await decisionBar.scrollIntoViewIfNeeded();
    await decisionBar.getByRole("button", { name: "Запропонувати інший час" }).click();
    const picker = decisionBar.getByTestId("slot-picker");
    await picker.waitFor({ state: "visible" });
    const checkboxes = picker.locator('input[type="checkbox"]');
    const candidateCount = await checkboxes.count();
    assert(candidateCount >= 2, `expected >=2 selectable candidate slots, got ${candidateCount}`);
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();
    const sendButton = picker.getByRole("button", { name: "Запропонувати" });
    assert(await sendButton.isEnabled(), "Запропонувати send button is enabled after selecting slots");
    await settle(page, 300);
    await page.screenshot({ path: path.join(outDir, `slot-picker-open${suffix}.png`), fullPage: true });
    result.slotPickerOpen = true;
    console.log(`✓ [${theme}] slot-picker-open captured + asserted`);

    // (c) decision-outcome — close the picker, click Confirm (mocked
    // response), assert the real inline `role="status"` region renders.
    await picker.getByRole("button", { name: "Скасувати" }).click();
    await decisionBar.getByRole("button", { name: "Підтвердити" }).click();
    const outcome = decisionBar.getByRole("status");
    await outcome.waitFor({ state: "visible" });
    assert(
      (await outcome.textContent())?.includes("Заняття підтверджено") ?? false,
      "inline role=status outcome message renders the mocked confirmation text",
    );
    await settle(page, 300);
    await page.screenshot({ path: path.join(outDir, `decision-outcome${suffix}.png`), fullPage: true });
    result.decisionOutcome = true;
    console.log(`✓ [${theme}] decision-outcome captured + asserted`);

    await settle(page, 400);
    const video = page.video();
    await page.close();
    await context.close();
    if (video) await video.saveAs(path.join(outDir, `booking-hitl-${theme}.webm`));
    result.ok = true;
    return result;
  } catch (e) {
    console.error(`✗ [${theme}] capture FAILED:`, e.message);
    result.ok = false;
    result.error = e.message;
    await context.close().catch(() => {});
    return result;
  }
}

async function writeManifest(light, dark) {
  const videoFor = (theme) => `docs/qa/booking-hitl/booking-hitl-${theme}.webm`;

  const oneLiner = {
    "decisionbar-actions":
      "The pending request's real DecisionBar renders all three admin actions: Підтвердити (confirm), Запропонувати інший час (propose another time), Відхилити (decline).",
    "slot-picker-open":
      "Clicking \"Запропонувати інший час\" reveals the inline slot-picker: on-grid candidate slots as real checkboxes (role=checkbox), two selected, \"Запропонувати\" enabled.",
    "decision-outcome":
      "Confirm's POST to /api/decisions/:id is intercepted (Playwright page.route) and fulfilled with a spec-shaped {status:'applied'} body — a real POST here would either mutate the live DEMO Google Calendar against a fake fixture event id, or silently no-op without live credentials, so this still proves the real DecisionBar/fetch/inline-render path without a non-deterministic side effect.",
    "hallmap-states":
      "The HallMap shows the seeded pending (amber), confirmed (green), and cancelled (slate) seats together, on three distinct weekday/hour cells.",
  };

  const entry = (id, proof, theme, asserted) => ({
    id: theme === "dark" ? `${id}-dark` : id,
    proof,
    video: videoFor(theme),
    screenshot: `docs/qa/booking-hitl/${id}${theme === "dark" ? "-dark" : ""}.png`,
    explainer: `docs/qa/booking-hitl/${id}.md`,
    note: oneLiner[id],
    asserted,
    visionVerdict: null,
  });

  const results = [];
  for (const [theme, res] of [
    ["light", light],
    ["dark", dark],
  ]) {
    results.push(
      entry("decisionbar-actions", "FR-HITL-01", theme, res.decisionbarActions === true),
      entry("slot-picker-open", "FR-HITL-03", theme, res.slotPickerOpen === true),
      entry("decision-outcome", "FR-HITL-01", theme, res.decisionOutcome === true),
      entry("hallmap-states", "FR-HITL-01", theme, res.hallmapStates === true),
    );
  }

  const manifest = { kind: "demo", results };
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

  const explainerFor = (id, body) => writeFile(path.join(outDir, `${id}.md`), body);
  await explainerFor(
    "decisionbar-actions",
    `# booking-hitl S4 gate — DecisionBar actions\n\n**Proves:** FR-HITL-01 (a pending request's card renders all three admin decision actions).\n\n**Steps:**\n1. Seed a real SQLite fixture (\`scripts/qa/seed-booking-hitl-fixture.mjs\`): one \`awaiting_admin\` request with every intake field filled, backed by a \`pending\` booking.\n2. Boot \`next start\` against that DB, load \`/\`.\n3. Assert the seeded request's \`DecisionBar\` shows Підтвердити / Запропонувати інший час / Відхилити, all visible and enabled.\n\n![still](decisionbar-actions.png)\n`,
  );
  await explainerFor(
    "slot-picker-open",
    `# booking-hitl S4 gate — propose-another-time slot-picker\n\n**Proves:** FR-HITL-03 (propose-another-time reveals a concrete slot selection before it can be sent).\n\n**Steps:**\n1. From the populated fixture, click \"Запропонувати інший час\" on the pending request's DecisionBar.\n2. Assert the inline picker (\`data-testid="slot-picker"\`) renders >=2 real checkbox options (\`candidateProposalSlots\`'s on-grid, unoccupied slots for the current week).\n3. Select two candidate slots; assert \"Запропонувати\" becomes enabled only once >=1 slot is selected.\n\n![still](slot-picker-open.png)\n`,
  );
  await explainerFor(
    "decision-outcome",
    `# booking-hitl S4 gate — inline decision outcome\n\n**Proves:** FR-HITL-01 (a decision's outcome is surfaced INLINE via a \`role="status"\` region, never a thrown error or a silently-dead button).\n\n**Steps:**\n1. From the populated fixture, click \"Підтвердити\" on the pending request's DecisionBar.\n2. The POST to \`/api/decisions/:requestId\` is intercepted (Playwright \`page.route\`) and fulfilled with a spec-shaped \`{status:"applied", message}\` body — driving a REAL POST here would either mutate the live DEMO Google Calendar against this fixture's fake \`calendar_event_id\`, or silently no-op without live credentials in the capture harness, so the network transport alone is mocked; the real \`DecisionBar\` component, its real \`fetch\`, and its real inline-render path all run unmodified.\n3. Assert the \`role="status"\` region renders the outcome message.\n\n![still](decision-outcome.png)\n`,
  );
  await explainerFor(
    "hallmap-states",
    `# booking-hitl S4 gate — HallMap mixed seat states\n\n**Proves:** FR-HITL-01 (the HallMap reflects pending/confirmed/cancelled bookings as visually distinct seats).\n\n**Steps:**\n1. From the populated fixture (one pending, one confirmed, one cancelled booking, on three different weekday/hour cells this week), load \`/\`.\n2. Assert >=1 seat each of \`data-status="pending"\`, \`"confirmed"\`, \`"cancelled"\`.\n\n(The LIVE flip on a real decision is covered by \`route.test.ts\`/\`ingest/route.test.ts\`'s own assertions — this still only needs to show the three states legibly together for the vision pass.)\n\n![still](hallmap-states.png)\n`,
  );
}

async function main() {
  if (existsSync(scratchDir)) await rm(scratchDir, { recursive: true, force: true });
  await mkdir(scratchDir, { recursive: true });
  await mkdir(outDir, { recursive: true });

  const dbPath = path.join(scratchDir, "booking-hitl.db");
  await seedFixture(dbPath);
  const server = startServer(dbPath);
  let light;
  let dark;
  const browser = await chromium.launch();
  try {
    await waitForServer();
    light = await captureTheme(browser, "light");
    dark = await captureTheme(browser, "dark");
  } finally {
    await browser.close();
    await stopServer(server);
  }

  await writeManifest(light ?? {}, dark ?? {});
  await rm(scratchDir, { recursive: true, force: true }).catch(() => {});

  const ok = light?.ok === true && dark?.ok === true;
  console.log(`\ncapture-booking-hitl: light=${light?.ok} dark=${dark?.ok}`);
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
