// Phase-6 demo recording + validation harness for «Поливайко».
//
// Adapted from the reference harness. Lessons it keeps:
//   - It runs its OWN background headless Playwright Chromium — NEVER the user's
//     browser, never a Save-As dialog, no interaction.
//   - "Record" and "prove the requirement" are the SAME step: every clip DRIVES
//     a real flow and ASSERTS the FRs it proves. A clip that doesn't assert is
//     not evidence.
//   - It paces clips so async content (the Recharts SVGs) settles before the
//     SETTLED full-page screenshot.
//
// «Поливайко»-specific lifecycle (so recordings never touch dev data):
//   - It seeds a DEDICATED demo SQLite file (DEMO_DATABASE_URL, default
//     data/demo.db) via scripts/seed-demo-db.mjs — the SAME migrations + the
//     SAME deterministic fixture as the E2E layer — and boots its OWN
//     `next start` on a DEDICATED port (DEMO_PORT, default 3200) handed that
//     same DATABASE_URL. So it reads exactly what we seeded, on its own port,
//     against its own DB file — never the developer's data/app.db nor the
//     E2E data/e2e.db. It tears the server down on exit.
//   - The app UI is Ukrainian: clips drive + assert by the real uk copy
//     (mirrored here as plain strings so this .mjs needs no TS import).
//
// Output (consumed by scripts/check-recordings.mjs + the vision-verify workflow):
//   docs/qa/demo-recordings/<id>.webm     video
//   docs/qa/demo-recordings/<id>.png      settled full-page still
//   docs/qa/demo-recordings/<id>.md       explainer (steps -> requirement)
//   docs/qa/demo-recordings/manifest.json { kind, results: [{ id, proof, video, screenshot, explainer, asserted }] }
//
// Run: `node scripts/record-demos.mjs`
//   env: DEMO_PORT, DEMO_DATABASE_URL, SKIP_BUILD=1 (reuse an existing .next),
//        BASE_URL (drive an already-running server; then no build/seed/teardown).
import { chromium } from "@playwright/test";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { join } from "node:path";

const OUT_DIR = join("docs/qa", process.env.OUT_DIR ?? "demo-recordings");
const PORT = process.env.DEMO_PORT ?? "3200";
const DEMO_DB_URL = process.env.DEMO_DATABASE_URL ?? "file:./data/demo.db";
// When BASE_URL is set, drive that already-running server (CI/local debug) and
// skip our own build/seed/boot/teardown. Otherwise we own the full lifecycle.
const EXTERNAL_BASE_URL = process.env.BASE_URL ?? null;
const BASE_URL = EXTERNAL_BASE_URL ?? `http://localhost:${PORT}`;

// One desktop viewport for the content clips; the responsive clip overrides it.
const DESKTOP = { width: 1280, height: 800 };
const MOBILE = { width: 360, height: 780 };

const assert = (cond, msg) => {
  if (!cond) throw new Error(`assertion failed: ${msg}`);
};
// `settle` paces a clip so async content (the Recharts SVGs) renders before we
// screenshot it.
const settle = async (page, ms = 1500) => {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(ms);
};

// ---- Ukrainian copy the clips drive + assert by (mirrors lib/i18n/uk.ts; this
// .mjs deliberately avoids the TS import so it stays a plain node script).
const UK = {
  listTitle: "Мої рослини",
  add: "Додати рослину",
  save: "Зберегти",
  edit: "Редагувати",
  editTitle: "Редагувати рослину",
  addTitle: "Нова рослина",
  nameLabel: "Назва",
  speciesLabel: "Вид",
  intervalLabel: "Інтервал поливу (днів)",
  summaryLabel: "Сьогодні полити",
  sectionTitle: "Потребують поливу",
  waterNow: "Полити зараз",
  brand: "Поливайко",
  growthAdd: "Записати вимірювання",
  growthHeightLabel: "Висота (см)",
  growthUnit: "см",
  growthSectionTitle: "Вимірювання росту",
  wateringAdd: "Записати полив",
  wateringNoteLabel: "Нотатка",
  wateringSectionTitle: "Поливи",
  growthChartTitle: "Графік росту рослини",
  wateringChartTitle: "Графік поливів рослини",
};

// ---- CLIPS: one per capability. Each `run` DRIVES the flow and ASSERTS the FRs
// it proves. `proof` lists the ids (check-traceability reads them; the assertion
// IS the evidence check-recordings gates on via asserted:true).
const CLIPS = [
  {
    id: "reminder-home",
    title: "Reminder home: due summary count + due section, water-now decrements",
    proof: "FR-REM-03, FR-REM-04, FR-REM-05",
    viewport: DESKTOP,
    run: async (page) => {
      await page.goto(BASE_URL);
      await settle(page);

      // FR-REM-03: the «Сьогодні полити» summary card is present. The seed
      // guarantees AT LEAST 3 due plants (overdue + soon + never-watered); we
      // assert the count derives from the due rows rather than a hardcoded
      // number, because the recording DB is shared across clips/runs and a
      // bespoke plant-crud plant can add to the due total (drift-proof, still
      // meaningful — FR-REM-07 ties the count to the SAME derived status).
      assert(
        await page.getByText(UK.summaryLabel).isVisible(),
        "summary card label «Сьогодні полити» is visible (FR-REM-03)",
      );

      // FR-REM-04: the «Потребують поливу» section lists due rows, each with a
      // «Полити зараз» action, ordered most-overdue first.
      assert(
        await page.getByRole("heading", { name: UK.sectionTitle }).isVisible(),
        "«Потребують поливу» section heading is visible (FR-REM-04)",
      );
      const dueBefore = await page
        .getByRole("button", { name: UK.waterNow })
        .count();
      assert(
        dueBefore >= 3,
        `at least 3 due «Полити зараз» rows present (seed guarantees 3), got ${dueBefore} (FR-REM-04)`,
      );

      // FR-REM-03: the big summary count equals the number of due rows (the same
      // derived status drives both — FR-REM-07).
      const summary = page.locator("div", { hasText: UK.summaryLabel }).last();
      assert(
        await summary
          .getByText(String(dueBefore), { exact: true })
          .isVisible(),
        `summary count reads ${dueBefore} (matches the due-row count) (FR-REM-03)`,
      );

      // FR-REM-05: water the first (most-urgent) due plant -> it leaves the due
      // list and the count decrements by exactly one.
      await page.getByRole("button", { name: UK.waterNow }).first().click();
      const expected = dueBefore - 1;
      await page
        .locator("div", { hasText: UK.summaryLabel })
        .last()
        .getByText(String(expected), { exact: true })
        .waitFor({ state: "visible" });
      const dueAfter = await page
        .getByRole("button", { name: UK.waterNow })
        .count();
      assert(
        dueAfter === expected,
        `after water-now exactly one row left the list (${dueBefore} -> ${dueAfter}, expected ${expected}) (FR-REM-05)`,
      );
      assert(
        await page
          .locator("div", { hasText: UK.summaryLabel })
          .last()
          .getByText(String(expected), { exact: true })
          .isVisible(),
        `summary count decremented to ${expected} (FR-REM-05)`,
      );
    },
  },
  {
    id: "plant-crud",
    title: "Plant CRUD: add -> appears -> open detail -> edit",
    proof: "FR-PLANT-01, FR-PLANT-05, FR-PLANT-06",
    viewport: DESKTOP,
    run: async (page) => {
      const name = `Демо-запис рослини ${Date.now()}`;
      const editedName = `${name} (оновлено)`;

      // FR-PLANT-01: add a plant via /plants/new.
      await page.goto(`${BASE_URL}/plants/new`);
      await settle(page, 500);
      await page.getByLabel(UK.nameLabel).fill(name);
      await page.getByLabel(UK.speciesLabel).fill("Crassula ovata");
      await page.getByLabel(UK.intervalLabel).fill("5");
      await page.getByRole("button", { name: UK.save }).click();

      // It appears on the list as a card heading (FR-PLANT-01).
      await page
        .getByRole("heading", { name, level: 2 })
        .waitFor({ state: "visible" });
      assert(
        await page.getByRole("heading", { name, level: 2 }).isVisible(),
        "new plant card appears on the list (FR-PLANT-01)",
      );

      // FR-PLANT-05: open the detail view by clicking the card link.
      await page.getByRole("link", { name: new RegExp(name) }).first().click();
      await page
        .getByRole("heading", { name, level: 1 })
        .waitFor({ state: "visible" });
      assert(
        await page.getByRole("heading", { name, level: 1 }).isVisible(),
        "plant detail view opens with the plant name as <h1> (FR-PLANT-05)",
      );

      // FR-PLANT-06: edit the name.
      await page.getByRole("link", { name: UK.edit }).click();
      await page
        .getByRole("heading", { name: UK.editTitle })
        .waitFor({ state: "visible" });
      await page.getByLabel(UK.nameLabel).fill(editedName);
      await page.getByRole("button", { name: UK.save }).click();
      await page
        .getByRole("heading", { name: editedName, level: 1 })
        .waitFor({ state: "visible" });
      assert(
        await page
          .getByRole("heading", { name: editedName, level: 1 })
          .isVisible(),
        "edited name persists on the detail view (FR-PLANT-06)",
      );
      await settle(page);
    },
  },
  {
    id: "growth-and-watering",
    title: "Growth + watering: lists render, log one of each -> appears",
    proof: "FR-GROWTH-01, FR-GROWTH-02, FR-WATER-01, FR-WATER-03",
    viewport: DESKTOP,
    run: async (page) => {
      const healthyId = await resolveSeededPlantId(page);
      await page.goto(`${BASE_URL}/plants/${healthyId}`);
      await settle(page);

      // FR-GROWTH-02 + FR-WATER-03: both lists render (the seed gave this plant
      // measurements + waterings). Assert the section headings are present.
      assert(
        await page
          .getByRole("heading", { name: UK.growthSectionTitle })
          .isVisible(),
        "«Вимірювання росту» section renders (FR-GROWTH-02)",
      );
      assert(
        await page
          .getByRole("heading", { name: UK.wateringSectionTitle })
          .isVisible(),
        "«Поливи» section renders (FR-WATER-03)",
      );

      // FR-GROWTH-01: log a measurement (decimal comma 37,3 -> 37.3 см).
      await page.getByLabel(UK.growthHeightLabel).fill("37,3");
      await page.getByRole("button", { name: UK.growthAdd }).click();
      await page
        .getByText(`37.3 ${UK.growthUnit}`)
        .waitFor({ state: "visible" });
      assert(
        await page.getByText(`37.3 ${UK.growthUnit}`).isVisible(),
        "new measurement «37.3 см» appears in the list (FR-GROWTH-01)",
      );

      // FR-WATER-01: log a watering with a distinctive note.
      const note = `Демо полив ${Date.now()}`;
      await page.getByLabel(UK.wateringNoteLabel).fill(note);
      await page.getByRole("button", { name: UK.wateringAdd }).click();
      await page.getByText(note).waitFor({ state: "visible" });
      assert(
        await page.getByText(note).isVisible(),
        "new watering note appears in the list (FR-WATER-01)",
      );
      await settle(page);
    },
  },
  {
    id: "charts",
    title: "Charts: growth + watering Recharts SVGs render on a seeded plant",
    proof: "FR-CHART-01, FR-CHART-02",
    viewport: DESKTOP,
    run: async (page) => {
      const healthyId = await resolveSeededPlantId(page);
      await page.goto(`${BASE_URL}/plants/${healthyId}`);
      // Give Recharts/ResponsiveContainer time to measure + paint the SVGs.
      await settle(page, 2500);

      // FR-CHART-02: the growth chart figure renders with an <svg>.
      const growth = page.getByRole("figure", { name: UK.growthChartTitle });
      assert(await growth.isVisible(), "growth chart <figure> present (FR-CHART-02)");
      assert(
        (await growth.locator("svg").count()) > 0,
        "growth chart renders a Recharts <svg> (FR-CHART-02)",
      );

      // FR-CHART-01: the watering chart figure renders with an <svg>.
      const watering = page.getByRole("figure", { name: UK.wateringChartTitle });
      assert(
        await watering.isVisible(),
        "watering chart <figure> present (FR-CHART-01)",
      );
      assert(
        (await watering.locator("svg").count()) > 0,
        "watering chart renders a Recharts <svg> (FR-CHART-01)",
      );
      await settle(page);
    },
  },
  {
    id: "design-system",
    title: "Design system: «Поливайко» paper-theme home, brand wordmark, cards, status pills",
    proof: "FR-DS-01, FR-DS-03, FR-DS-05, FR-DS-06",
    viewport: DESKTOP,
    run: async (page) => {
      await page.goto(BASE_URL);
      await settle(page);

      // FR-DS-05: the «Поливайко» brand wordmark in the shell header.
      assert(
        (await page.getByText(UK.brand).count()) > 0,
        "«Поливайко» brand wordmark is present (FR-DS-05)",
      );

      // FR-DS-03 + FR-DS-06: plant cards render (links to detail) with status
      // pills — assert at least one card link + one status pill label is shown.
      const cardLinks = page.locator('a[href^="/plants/"]');
      assert(
        (await cardLinks.count()) > 0,
        "plant cards render as links to detail (FR-DS-03)",
      );
      const pillCount = await page
        .getByText(/Здорова|Скоро полив|Потребує поливу/)
        .count();
      assert(
        pillCount > 0,
        "status pills (forest/clay palette) render on the cards (FR-DS-06)",
      );
      // FR-DS-01: the design tokens are the theme — the home heading uses them.
      assert(
        await page
          .getByRole("heading", { name: UK.listTitle, level: 1 })
          .isVisible(),
        "themed home heading «Мої рослини» renders (FR-DS-01)",
      );
      await settle(page);
    },
  },
  {
    id: "responsive-360",
    title: "Responsive: home is usable at 360px with no horizontal overflow",
    proof: "NFR-COMPAT-01",
    viewport: MOBILE,
    run: async (page) => {
      await page.goto(BASE_URL);
      await settle(page);

      // NFR-COMPAT-01: key controls visible + no horizontal overflow at 360px.
      assert(
        await page
          .getByRole("heading", { name: UK.listTitle, level: 1 })
          .isVisible(),
        "home heading visible at 360px (NFR-COMPAT-01)",
      );
      assert(
        await page.getByRole("link", { name: UK.add }).first().isVisible(),
        "«Додати рослину» control visible at 360px (NFR-COMPAT-01)",
      );
      assert(
        await page.getByText(UK.summaryLabel).isVisible(),
        "summary card visible at 360px (NFR-COMPAT-01)",
      );
      const overflow = await page.evaluate(() => {
        const el = document.scrollingElement ?? document.documentElement;
        return el.scrollWidth - el.clientWidth;
      });
      assert(
        overflow <= 2,
        `no horizontal overflow at 360px (overflow=${overflow}px) (NFR-COMPAT-01)`,
      );
      await settle(page);
    },
  },
];

/**
 * Resolve a seeded plant id by navigating the seeded home and opening the first
 * plant card — robust to whatever ids the demo seed assigned (the harness owns a
 * fresh DB, so ids are not hardcoded).
 */
async function resolveSeededPlantId(page) {
  await page.goto(BASE_URL);
  await settle(page, 800);
  // Prefer the richly-seeded «Здорова на підвіконні» demo plant — it carries 2
  // measurements + 2 waterings, so both charts show a real multi-point curve in
  // the still (not the single-point bespoke plant-crud plant). Fall back to the
  // first numeric /plants/{id} link if the named card isn't found.
  const seededHref = await page
    .getByRole("link", { name: /Здорова на підвіконні/ })
    .first()
    .getAttribute("href")
    .catch(() => null);
  const seeded = seededHref && seededHref.match(/^\/plants\/(\d+)(?:[/?#]|$)/);
  if (seeded) return seeded[1];

  // Fallback: read every /plants/* href and pick the first NUMERIC id — the
  // «Додати рослину» control also links to /plants/new (non-numeric), so a
  // naive `.first()` would grab that and fail the id regex.
  const hrefs = await page
    .locator('a[href^="/plants/"]')
    .evaluateAll((els) => els.map((el) => el.getAttribute("href")));
  for (const href of hrefs) {
    const m = href && href.match(/^\/plants\/(\d+)(?:[/?#]|$)/);
    if (m) return m[1];
  }
  throw new Error("could not resolve a seeded plant id from the home grid");
}

// ---- server lifecycle (skipped when BASE_URL points at an external server) ----
async function ensureReachable(url) {
  for (let i = 0; i < 180; i++) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status < 500) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`app not reachable at ${url} — server did not come up in time`);
}

function run(cmd, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: "inherit",
      env: { ...process.env, ...env },
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} ${args.join(" ")} exited ${code}`)),
    );
  });
}

async function startOwnServer() {
  // 1) Seed the dedicated demo DB (migrations + deterministic fixture). tsx
  //    resolves the @/ alias + TS imports in scripts/seed-demo-db.mjs.
  console.log(`[demo] seeding ${DEMO_DB_URL} …`);
  await run("node", ["--import", "tsx", "scripts/seed-demo-db.mjs"], {
    DEMO_DATABASE_URL: DEMO_DB_URL,
  });

  // 2) Build (unless SKIP_BUILD reuses an existing .next).
  if (process.env.SKIP_BUILD !== "1") {
    console.log("[demo] building …");
    await run("npm", ["run", "build"], { DATABASE_URL: DEMO_DB_URL });
  } else {
    console.log("[demo] SKIP_BUILD=1 — reusing existing .next");
  }

  // 3) Start `next start` on the dedicated port with the demo DB.
  console.log(`[demo] starting next on :${PORT} (DB=${DEMO_DB_URL}) …`);
  const server = spawn("npm", ["run", "start", "--", "-p", PORT], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: DEMO_DB_URL, PORT },
  });
  await ensureReachable(BASE_URL);
  return server;
}

async function main() {
  let server = null;
  if (!EXTERNAL_BASE_URL) {
    server = await startOwnServer();
  } else {
    console.log(`[demo] driving external server at ${BASE_URL}`);
    await ensureReachable(BASE_URL);
  }

  if (existsSync(OUT_DIR)) await rm(OUT_DIR, { recursive: true, force: true });
  await mkdir(join(OUT_DIR, "raw"), { recursive: true });
  const browser = await chromium.launch(); // headless by default
  const results = [];
  let anyFailed = false;

  try {
    for (const clip of CLIPS) {
      const viewport = clip.viewport ?? DESKTOP;
      const context = await browser.newContext({
        viewport,
        recordVideo: { dir: join(OUT_DIR, "raw"), size: viewport },
      });
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
        `# ${clip.title}\n\n**Proves:** ${clip.proof}\n\n**Viewport:** ${viewport.width}x${viewport.height}\n\n**Result:** ${asserted ? "asserted ✓" : `FAILED — ${error}`}\n\n![still](${clip.id}.png)\n`,
      );
      results.push({
        id: clip.id,
        title: clip.title,
        proof: clip.proof,
        video: videoPath.replaceAll("\\", "/"),
        screenshot: shot.replaceAll("\\", "/"),
        explainer: join(OUT_DIR, `${clip.id}.md`).replaceAll("\\", "/"),
        asserted,
      });
      console.log(`${asserted ? "✓" : "✗"} ${clip.id} (${clip.proof})${error ? ` — ${error}` : ""}`);
    }
  } finally {
    await rm(join(OUT_DIR, "raw"), { recursive: true, force: true }).catch(() => {});
    await browser.close().catch(() => {});
    if (server) {
      server.kill("SIGTERM");
    }
  }

  await writeFile(
    join(OUT_DIR, "manifest.json"),
    `${JSON.stringify({ kind: "demo", results }, null, 2)}\n`,
  );
  console.log(`\nwrote ${results.length} clip(s) to ${OUT_DIR}. Validate: node scripts/check-recordings.mjs`);
  // A clip whose assertions failed is NOT evidence — fail so it gets fixed and
  // re-recorded.
  process.exit(anyFailed ? 1 : 0);
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
