// Render test for the tailor-workspace wizard (jsdom), FR-WIZARD-01/05 +
// FR-BULLETS-02 / BC-HONESTY-02. `@/features/run-tailoring` is mocked: AnalyzeForm
// is a fake trigger that fires a scripted analysis, and streamGenerate is a
// scripted async generator — so this test drives the view's state machine
// (analyze → confirm → generate → export) without the real streaming logic
// (that lives in the feature's own tests).
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

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
