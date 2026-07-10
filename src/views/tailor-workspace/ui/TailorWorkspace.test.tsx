// Render test for the tailor-workspace wizard (jsdom), FR-WIZARD-01/05 +
// FR-BULLETS-02 / BC-HONESTY-02. `@/features/run-tailoring` is mocked: AnalyzeForm
// is a fake trigger that fires a scripted analysis, and streamGenerate is a
// scripted async generator — so this test drives the view's state machine
// (analyze → confirm → generate → export) without the real streaming logic
// (that lives in the feature's own tests).
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ua } from "@/shared/lib/i18n";
import type { AnalysisResult, TailoringRunResult } from "@/features/run-tailoring";

import { TailorWorkspace } from "./TailorWorkspace";

const SCRIPTED_ANALYSIS: AnalysisResult = {
  matchScore: 68,
  cvProfile: { skills: [], sentences: [] },
  requirements: [
    { id: "req-react", text: "5+ years of commercial React experience", importance: "must-have", keywords: ["react"] },
  ],
  checklist: [
    {
      requirement: {
        id: "req-react",
        text: "5+ years of commercial React experience",
        importance: "must-have",
        keywords: ["react"],
      },
      item: { status: "met", rationale: "The résumé confirms six years of React in production." },
    },
  ],
  clarifyingQuestions: [],
  careerStage: "senior",
};

const SCRIPTED_RESULT: TailoringRunResult = {
  checklist: SCRIPTED_ANALYSIS.checklist,
  bullets: [
    {
      id: "blt-platform",
      text: "Led development of a React platform serving 200k monthly users.",
      grounding: "grounded",
      includedInExport: true,
    },
    {
      id: "blt-team",
      text: "Led a team of ten engineers across three countries.",
      grounding: "overclaim-risk",
      includedInExport: false,
    },
  ],
  matchScore: 68,
};

const streamGenerateMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/run-tailoring", () => ({
  AnalyzeForm: ({ onAnalysis }: { onAnalysis: (a: AnalysisResult, jd: string) => void }) => (
    <button type="button" onClick={() => onAnalysis(SCRIPTED_ANALYSIS, "jd text")}>
      fake analyze
    </button>
  ),
  streamGenerate: streamGenerateMock,
}));

/** Async generator of scripted generation events, one macrotask apart. */
function scriptedGen(events: readonly unknown[]) {
  return () =>
    (async function* () {
      for (const event of events) {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        yield event;
      }
    })();
}

const RESULT_EVENTS = [
  { type: "result", result: SCRIPTED_RESULT },
  { type: "status", phase: "done" },
];

const overclaimBullet = SCRIPTED_RESULT.bullets.find((b) => b.grounding === "overclaim-risk")!;

async function analyze() {
  await userEvent.click(screen.getByRole("button", { name: "fake analyze" }));
}
async function proceed() {
  await userEvent.click(screen.getByRole("button", { name: ua.wizard.confirmAction }));
}

describe("TailorWorkspace wizard (FR-WIZARD-01/05)", () => {
  it("renders the analyze intro before any analysis", () => {
    render(<TailorWorkspace />);
    expect(screen.getByText(ua.workspace.emptyState)).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: ua.result.regionLabel })).not.toBeInTheDocument();
  });

  it("shows the match score at confirm before any bullet is generated (FR-WIZARD-01)", async () => {
    streamGenerateMock.mockImplementation(scriptedGen(RESULT_EVENTS));
    render(<TailorWorkspace />);

    await analyze();

    // Confirm step: score + checklist shown, paused — no bullets yet.
    expect(screen.getByText(String(SCRIPTED_ANALYSIS.matchScore))).toBeInTheDocument();
    expect(screen.queryByText(overclaimBullet.text)).not.toBeInTheDocument();

    await proceed();

    // Generation completed → export step shows the bullets.
    expect(await screen.findByText(overclaimBullet.text)).toBeInTheDocument();
  });

  it("forwards the analyze-phase careerStage into the generate request (§3.5 wizard flow)", async () => {
    // Regression: the split analyze→generate flow must not drop the inferred
    // stage at the client boundary, or the seniority call runs in analysis and
    // its result is silently discarded (generation gets no tone calibration).
    streamGenerateMock.mockImplementation(scriptedGen(RESULT_EVENTS));
    render(<TailorWorkspace />);

    await analyze();
    await proceed();
    await screen.findByText(overclaimBullet.text);

    // (mocks aren't cleared between tests in this file — assert the latest call).
    const lastCall = streamGenerateMock.mock.calls.at(-1);
    expect(lastCall?.[0]).toMatchObject({ careerStage: "senior" });
  });

  it("toggling an overclaim-risk bullet at export updates its included state", async () => {
    streamGenerateMock.mockImplementation(scriptedGen(RESULT_EVENTS));
    render(<TailorWorkspace />);

    await analyze();
    await proceed();

    const row = (await screen.findByText(overclaimBullet.text)).closest("li") as HTMLElement;
    const toggle = within(row).getByRole("checkbox");

    // Seeded excluded by default (BC-HONESTY-02).
    expect(toggle).not.toBeChecked();

    await userEvent.click(toggle);

    expect(within(row).getByRole("checkbox")).toBeChecked();
  });
});

// ---------------------------------------------------------------------------
// Persisted tailoringId threading (server-side-export-gate, T5 #8, BC-HONESTY-02):
// the `persisted` SSE event carries the pending row's id; the workspace must
// hold it and forward it to ExportStepper's résumé-export request so the
// server can enforce the bullet-membership honesty gate. `@/features/export-resume`
// is NOT mocked in this file, so ExportStepper's `requestExport` runs for
// real — only the global `fetch` it calls is stubbed here.
// ---------------------------------------------------------------------------
describe("TailorWorkspace: persisted tailoringId → export request (server-side-export-gate, T5 #8)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("forwards the tailoringId from a `persisted` event into the PDF export request body", async () => {
    const eventsWithPersisted = [{ type: "persisted", tailoringId: "t-999" }, ...RESULT_EVENTS];
    streamGenerateMock.mockImplementation(scriptedGen(eventsWithPersisted));
    const fetchMock = vi.fn().mockResolvedValue(new Response(new Blob(["pdf"]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<TailorWorkspace paid />);
    await analyze();
    await proceed();
    await screen.findByText(overclaimBullet.text);

    await userEvent.click(screen.getByRole("button", { name: ua.export.pdfAction }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/export/pdf");
    const sentBody = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(sentBody.tailoringId).toBe("t-999");
  });

  it("omits tailoringId from the export request when no `persisted` event was streamed (non-breaking fallback)", async () => {
    streamGenerateMock.mockImplementation(scriptedGen(RESULT_EVENTS));
    const fetchMock = vi.fn().mockResolvedValue(new Response(new Blob(["pdf"]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<TailorWorkspace paid />);
    await analyze();
    await proceed();
    await screen.findByText(overclaimBullet.text);

    await userEvent.click(screen.getByRole("button", { name: ua.export.pdfAction }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const sentBody = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(sentBody).not.toHaveProperty("tailoringId");
  });

  it("clears a prior run's tailoringId when a new generation starts (never exports against a stale run)", async () => {
    const eventsWithPersisted = [{ type: "persisted", tailoringId: "t-old" }, ...RESULT_EVENTS];
    streamGenerateMock.mockImplementation(scriptedGen(eventsWithPersisted));
    const fetchMock = vi.fn().mockResolvedValue(new Response(new Blob(["pdf"]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<TailorWorkspace paid />);
    await analyze();
    await proceed();
    await screen.findByText(overclaimBullet.text);

    // Start over clears local state, including the persisted tailoringId.
    await userEvent.click(screen.getByRole("button", { name: ua.wizard.startOverAction }));

    // Second run streams the SAME events again but a real re-run scenario would
    // not necessarily re-emit `persisted` before result events resolve; verify
    // the state was reset by re-driving without a persisted event this time.
    streamGenerateMock.mockImplementation(scriptedGen(RESULT_EVENTS));
    await analyze();
    await proceed();
    await screen.findByText(overclaimBullet.text);

    await userEvent.click(screen.getByRole("button", { name: ua.export.pdfAction }));

    const lastCall = fetchMock.mock.calls.at(-1) as [string, RequestInit];
    const sentBody = JSON.parse(lastCall[1].body as string) as Record<string, unknown>;
    expect(sentBody).not.toHaveProperty("tailoringId");
  });
});
