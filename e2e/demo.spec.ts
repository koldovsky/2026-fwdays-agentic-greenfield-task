import { expect, test } from "@playwright/test";

// ---------------------------------------------------------------------------
// Vouch product demo — a Playwright test that DRIVES the app to record a video.
// Output: test-results/**/video.webm  →  `yarn demo:convert`  →  public/demo.mp4.
//
// Two modes:
//   default          — drives the REAL analyze/generate pipeline (needs .env +
//                       ANTHROPIC_API_KEY + local DB). Types are always correct;
//                       slower, real spend.
//   DEMO_MOCK=1       — route-mocks the tailoring API with canned NDJSON so the
//                       capture is fast, deterministic and free. If the app's
//                       response types drift, update MOCK_* below (shapes traced
//                       from features/run-tailoring + widgets/checklist-panel).
//
// Selectors are from the recon map: /tailor, name=cvText / name=jdText, the
// Analyze submit button (wizard.analyzeAction), POST /api/tailor/{analyze,generate}
// (NDJSON streams ending {type:"analysis"} / {type:"result",result}).
// ---------------------------------------------------------------------------

const MOCK = process.env.DEMO_MOCK === "1";

const SAMPLE_CV = `Olena Koваль — Senior Backend Engineer
7 years building payment systems. Led a team of 4.
- Designed and shipped a Node.js + PostgreSQL billing service handling 2M req/day.
- Cut checkout latency 40% by introducing Redis caching and query batching.
- Mentored 3 junior engineers; owned on-call and incident response.
Skills: Node.js, TypeScript, PostgreSQL, Redis, AWS, Docker, Kubernetes.`;

const SAMPLE_JD = `Senior Backend Engineer — Fintech
We need a senior engineer to own our payments platform.
Requirements: 5+ years backend, Node.js, PostgreSQL, distributed systems,
Kubernetes, and experience mentoring engineers. Nice to have: Go, Kafka.`;

// Minimal NDJSON fixtures for DEMO_MOCK. Field names traced from the recon; if a
// render looks empty, reconcile these against the real AnalysisResult /
// TailoringRunResult / ChecklistRow / Bullet types and re-run.
const MOCK_ANALYSIS =
  JSON.stringify({ type: "progress", label: "Reading requirements" }) +
  "\n" +
  JSON.stringify({
    type: "analysis",
    checklist: [
      { id: "r1", requirement: "5+ years backend", status: "met" },
      { id: "r2", requirement: "Node.js", status: "met" },
      { id: "r3", requirement: "PostgreSQL", status: "met" },
      { id: "r4", requirement: "Kubernetes", status: "partial" },
      { id: "r5", requirement: "Go", status: "gap" },
    ],
    score: 78,
    careerStage: "senior",
  }) +
  "\n";

const MOCK_RESULT =
  JSON.stringify({ type: "progress", label: "Grounding bullets" }) +
  "\n" +
  JSON.stringify({
    type: "result",
    result: {
      matchScore: 78,
      careerStage: "senior",
      checklist: [
        { id: "r1", requirement: "5+ years backend", status: "met" },
        { id: "r4", requirement: "Kubernetes", status: "partial" },
        { id: "r5", requirement: "Go", status: "gap" },
      ],
      bullets: [
        {
          id: "b1",
          text: "Shipped a Node.js + PostgreSQL billing service handling 2M req/day.",
          grounding: "grounded",
          includedInExport: true,
        },
        {
          id: "b2",
          text: "Ran a distributed Kafka pipeline across a 12-person platform team.",
          grounding: "overclaim-risk",
          includedInExport: false,
        },
      ],
    },
  }) +
  "\n";

// On-screen caption overlay — narrates each beat so the raw clip reads on its own.
async function caption(page: import("@playwright/test").Page, text: string) {
  await page.evaluate((msg) => {
    let bar = document.getElementById("demo-caption");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "demo-caption";
      bar.style.cssText =
        "position:fixed;left:0;right:0;bottom:0;z-index:2147483647;padding:20px 32px;" +
        "font:600 26px/1.3 system-ui,-apple-system,sans-serif;color:#fff;" +
        "background:#0c6e5d;box-shadow:0 -8px 24px rgba(0,0,0,.25)";
      document.body.appendChild(bar);
    }
    bar.textContent = msg;
  }, text);
  await page.waitForTimeout(1600);
}

test("vouch product demo", async ({ page }) => {
  if (MOCK) {
    await page.route("**/api/tailor/analyze", (r) =>
      r.fulfill({ status: 200, headers: { "content-type": "application/x-ndjson" }, body: MOCK_ANALYSIS }),
    );
    await page.route("**/api/tailor/generate", (r) =>
      r.fulfill({ status: 200, headers: { "content-type": "application/x-ndjson" }, body: MOCK_RESULT }),
    );
  }

  // 1 — Idea, on the landing page.
  await page.goto("/");
  await caption(page, "Vouch — an honest resume tailor. It never invents experience.");
  await page.waitForTimeout(1200);

  // 2 — The tailor workspace (anonymous can run one free tailoring, FR-ONBOARD-01).
  await page.goto("/tailor");
  await caption(page, "Paste your CV and the job description.");
  await page.fill('textarea[name="cvText"]', SAMPLE_CV);
  await page.fill('textarea[name="jdText"]', SAMPLE_JD);
  await page.waitForTimeout(800);

  // 3 — Analyze → grounded coverage checklist + match score.
  await caption(page, "Analyze — a deterministic, grounded coverage checklist.");
  const analyze = page.getByRole("button", { name: /Проаналізувати|Analyze/i });
  await Promise.all([
    page.waitForResponse("**/api/tailor/analyze").catch(() => null),
    analyze.click(),
  ]);
  await page.waitForTimeout(2500);
  await caption(page, "Met, partial, gap — exactly where you stand. No invented coverage.");
  await page.waitForTimeout(1500);

  // 4 — Generate → grounded bullets, with an overclaim flagged + excluded.
  // Best-effort: the generate trigger label may differ per build — try a few.
  const genNames = [/Адаптувати|Tailor|Згенерувати|Generate|Продовжити|Continue/i];
  for (const name of genNames) {
    const btn = page.getByRole("button", { name });
    if (await btn.first().isVisible().catch(() => false)) {
      await Promise.all([
        page.waitForResponse("**/api/tailor/generate").catch(() => null),
        btn.first().click().catch(() => null),
      ]);
      break;
    }
  }
  await page.waitForTimeout(2500);
  await caption(page, "Overclaim bullets are flagged and left out of the export by default.");
  // Surface the honesty badge if present (non-fatal if the wizard shape differs).
  await page
    .getByText(/виключено з експорту|excluded from export/i)
    .first()
    .scrollIntoViewIfNeeded()
    .catch(() => null);
  await page.waitForTimeout(2000);

  // 5 — Export surface (PDF / DOCX / cover letter).
  await caption(page, "Export a grounded resume, a cover letter, PDF or DOCX. Ukrainian or English.");
  await page.waitForTimeout(1800);
  await caption(page, "Honesty is the product.");
  await page.waitForTimeout(1500);

  // Assert the run at least reached the workspace (keeps the recording meaningful).
  await expect(page).toHaveURL(/\/tailor/);
});
