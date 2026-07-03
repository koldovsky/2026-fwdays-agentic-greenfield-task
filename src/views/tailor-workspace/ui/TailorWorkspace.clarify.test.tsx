// Clarify path through the wizard (FR-WIZARD-02/03/04): when the analysis has
// clarifying questions, confirm routes through the clarify step, and the
// user's answered questions are threaded into the generation request as
// confirmed-answer evidence (mapped question text + answer). Both run-tailoring
// and clarify-tailoring are mocked so this test isolates the view's routing +
// toConfirmedAnswers wiring.
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ua } from "@/shared/lib/i18n";
import type { AnalysisResult, TailoringRunResult } from "@/features/run-tailoring";
import type { ClarifyingAnswer } from "@/entities/clarifying-question";

import { TailorWorkspace } from "./TailorWorkspace";

const SCRIPTED_ANALYSIS: AnalysisResult = {
  matchScore: 50,
  cvProfile: { skills: [], sentences: [] },
  requirements: [],
  checklist: [],
  clarifyingQuestions: [
    { id: "q-graphql", requirementText: "GraphQL knowledge", text: "Do you have GraphQL experience?" },
  ],
};

const SCRIPTED_RESULT: TailoringRunResult = { checklist: [], bullets: [], matchScore: 50 };

const streamGenerateMock = vi.hoisted(() => vi.fn());

vi.mock("@/features/run-tailoring", () => ({
  AnalyzeForm: ({ onAnalysis }: { onAnalysis: (a: AnalysisResult, jd: string) => void }) => (
    <button type="button" onClick={() => onAnalysis(SCRIPTED_ANALYSIS, "jd text")}>
      fake analyze
    </button>
  ),
  streamGenerate: streamGenerateMock,
}));

vi.mock("@/features/clarify-tailoring", () => ({
  ClarifyingQuestions: ({ onSubmit }: { onSubmit: (a: readonly ClarifyingAnswer[]) => void }) => (
    <button
      type="button"
      onClick={() =>
        onSubmit([{ questionId: "q-graphql", status: "answered", answerText: "Two years on a production API" }])
      }
    >
      fake clarify submit
    </button>
  ),
}));

function scriptedGen(events: readonly unknown[]) {
  return () =>
    (async function* () {
      for (const event of events) {
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
        yield event;
      }
    })();
}

describe("TailorWorkspace clarify path (FR-WIZARD-02/04)", () => {
  it("routes confirm → clarify and threads answered questions into generation", async () => {
    streamGenerateMock.mockImplementation(
      scriptedGen([{ type: "result", result: SCRIPTED_RESULT }, { type: "status", phase: "done" }]),
    );
    render(<TailorWorkspace />);

    await userEvent.click(screen.getByRole("button", { name: "fake analyze" }));
    // Questions exist → confirm proceeds to the clarify step, not straight to generate.
    await userEvent.click(screen.getByRole("button", { name: ua.wizard.confirmAction }));
    await userEvent.click(screen.getByRole("button", { name: "fake clarify submit" }));

    await waitFor(() => expect(streamGenerateMock).toHaveBeenCalledTimes(1));
    // Only the answered question becomes evidence, carrying the question TEXT.
    expect(streamGenerateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        confirmedAnswers: [
          { question: "Do you have GraphQL experience?", answer: "Two years on a production API" },
        ],
      }),
    );
  });
});
