// Capture settled PNG stills for vision-verify (no video). Writes manifest.json.
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = process.env.E2E_PORT ?? "3200";
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = join(root, "docs/qa/vision-stills");

const clips = [
  {
    id: "recommendations-home",
    proof: "FR-SCORE-02, FR-SCORE-03, FR-UX-01",
    requirement:
      "Recommendations grid shows program cards with chance %, uncertainty band, and text category pills (not color-only); global honesty disclaimer visible in shell.",
    path: "/",
    settle: async (page) => {
      await page.getByRole("heading", { name: "Оціни свої шанси на бюджет" }).waitFor();
      await page.getByRole("region", { name: "Рекомендації" }).waitFor();
    },
  },
  {
    id: "program-detail",
    proof: "FR-DETAIL-01, BC-HONESTY-01",
    requirement:
      "Detail modal shows competitive score breakdown, cutoff history bars, category advice, and uncertainty band text.",
    path: "/",
    settle: async (page) => {
      await page.getByLabel(/Детальніше:/).first().click();
      await page.getByRole("dialog").getByText("Як склався твій бал").waitFor();
      await page.getByRole("dialog").getByText(/не гарантія|діапазоном/i).scrollIntoViewIfNeeded();
    },
  },
  {
    id: "comparison-table",
    proof: "FR-COMPARE-01, NFR-A11Y-01",
    requirement:
      "Comparison table lists 2+ programs with chance % and text category label; advice names a priority-1 pick.",
    path: "/",
    settle: async (page) => {
      const add = page.getByRole("button", { name: /Додати до порівняння:/ });
      await add.nth(0).click();
      await add.nth(1).click();
      await page.getByRole("tab", { name: /Порівняння/ }).click();
      await page.getByRole("table").waitFor();
      await page.getByText(/пріоритетом 1/i).waitFor();
    },
  },
];

async function ensureBuilt() {
  const { existsSync } = await import("node:fs");
  if (!existsSync(join(root, ".next/BUILD_ID"))) {
    const { spawnSync } = await import("node:child_process");
    const r = spawnSync("npm", ["run", "build"], { cwd: root, stdio: "inherit", shell: true });
    if (r.status !== 0) process.exit(r.status ?? 1);
  }
}

async function main() {
  await ensureBuilt();
  mkdirSync(OUT, { recursive: true });

  const { spawn } = await import("node:child_process");
  const server = spawn("npx", ["next", "start", `-p`, PORT], {
    cwd: root,
    stdio: "ignore",
    shell: true,
  });

  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(BASE);
      if (res.status < 500) break;
    } catch {
      /* wait */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  const browser = await chromium.launch();
  const results = [];

  try {
    for (const clip of clips) {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "uk-UA" });
      const page = await ctx.newPage();
      await page.addInitScript(() => {
        try {
          localStorage.removeItem("prokhidnyi:profile:v1");
        } catch {}
      });
      await page.goto(BASE + clip.path, { waitUntil: "domcontentloaded" });
      await clip.settle(page);
      await page.waitForTimeout(300);
      const png = join(OUT, `${clip.id}.png`);
      await page.screenshot({ path: png, fullPage: false });
      results.push({
        id: clip.id,
        proof: clip.proof,
        requirement: clip.requirement,
        screenshot: `docs/qa/vision-stills/${clip.id}.png`,
        explainer: `${clip.id}.md`,
      });
      writeFileSync(
        join(OUT, `${clip.id}.md`),
        `# ${clip.id}\n\nProves: ${clip.proof}\n\n${clip.requirement}\n`,
      );
      await ctx.close();
    }
  } finally {
    await browser.close();
    server.kill("SIGTERM");
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    kind: "vision-stills",
    clips: results,
  };
  writeFileSync(join(OUT, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`recorded ${results.length} still(s) → ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
