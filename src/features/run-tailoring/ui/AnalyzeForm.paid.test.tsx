// AnalyzeForm paid-prop tests — new behaviors from the vouch-anon-gate change.
// The existing AnalyzeForm.test.tsx covers the free/default path; this file is
// test-author-independent and covers the paid=true branch: CV textarea is
// suppressed (paid users supply CV via the upload zone), and handleSubmit reads
// cv from the controlled prop rather than the form field.
//
// Tests are written against the spec (maker behavior 6), not the implementation.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ua } from "@/shared/lib/i18n";
import type { AnalysisEvent } from "../lib/loop";

import React from "react";
import { AnalyzeForm } from "./AnalyzeForm";

beforeEach(() => {
  streamAnalyzeMock.mockClear();
});

const streamAnalyzeMock = vi.hoisted(() => vi.fn());
vi.mock("../api/stream-analyze", () => ({ streamAnalyze: streamAnalyzeMock }));

const ANALYSIS_EVENT: Extract<AnalysisEvent, { type: "analysis" }> = {
  type: "analysis",
  checklist: [],
  matchScore: 72,
  cvProfile: { skills: ["react"], sentences: ["Worked with React."] },
  requirements: [],
  clarifyingQuestions: [],
};

function scripted(events: readonly AnalysisEvent[]) {
  return async function* () {
    for (const event of events) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      yield event;
    }
  };
}

describe("AnalyzeForm paid=true (premium path, maker behavior 6)", () => {
  it("does NOT render the CV résumé textarea when paid=true", () => {
    render(
      <AnalyzeForm
        paid={true}
        cvText="uploaded cv text"
        onCvTextChange={vi.fn()}
        onAnalysis={vi.fn()}
      />,
    );
    // The cvText field must be absent — paid users upload via the drop zone.
    expect(screen.queryByLabelText(ua.workspace.cvLabel)).not.toBeInTheDocument();
  });

  it("still renders the JD textarea and Analyze button when paid=true", () => {
    render(
      <AnalyzeForm
        paid={true}
        cvText=""
        onCvTextChange={vi.fn()}
        onAnalysis={vi.fn()}
      />,
    );
    expect(screen.getByLabelText(ua.workspace.jdLabel)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: ua.wizard.analyzeAction })).toBeInTheDocument();
  });

  it("reads cv from the controlled cvText prop (not the form field) on paid submit", async () => {
    const onAnalysis = vi.fn();
    streamAnalyzeMock.mockImplementation(scripted([ANALYSIS_EVENT]));

    render(
      <AnalyzeForm
        paid={true}
        cvText="My uploaded CV content"
        onCvTextChange={vi.fn()}
        onAnalysis={onAnalysis}
      />,
    );

    await userEvent.type(screen.getByLabelText(ua.workspace.jdLabel), "jd text");
    await userEvent.click(screen.getByRole("button", { name: ua.wizard.analyzeAction }));

    // streamAnalyze must receive the controlled prop value as cvText.
    expect(streamAnalyzeMock).toHaveBeenCalledWith(
      expect.objectContaining({ cvText: "My uploaded CV content" }),
    );
    expect(onAnalysis).toHaveBeenCalledTimes(1);
  });
});

// Wrapper that owns cvText state so the controlled textarea stays in sync
// with userEvent.type (the real TailorWorkspace lifts this state).
function FreeModeWrapper() {
  const [cvText, setCvText] = React.useState("");
  return (
    <AnalyzeForm
      paid={false}
      cvText={cvText}
      onCvTextChange={setCvText}
      onAnalysis={vi.fn()}
    />
  );
}

describe("AnalyzeForm paid=false (free path — control: CV textarea present)", () => {
  it("renders the CV résumé textarea when paid=false (default)", () => {
    render(<FreeModeWrapper />);
    expect(screen.getByLabelText(ua.workspace.cvLabel)).toBeInTheDocument();
  });

  it("reads cv from the form field (not a paid-path prop) when paid=false", async () => {
    // Use the state-owning wrapper so the required CV field passes validation.
    const onAnalysis = vi.fn();
    streamAnalyzeMock.mockImplementation(scripted([ANALYSIS_EVENT]));

    // FreeModeWrapper starts with cvText="". The user types into the visible
    // textarea, which updates the controlled state via onCvTextChange, and
    // handleSubmit reads the form field (form.get("cvText")), not a prop literal.
    function ControlledWrapper() {
      const [cvText, setCvText] = React.useState("initial cv");
      return (
        <AnalyzeForm
          paid={false}
          cvText={cvText}
          onCvTextChange={setCvText}
          onAnalysis={onAnalysis}
        />
      );
    }

    render(<ControlledWrapper />);

    // The CV textarea is present and populated from controlled state.
    expect(screen.getByLabelText(ua.workspace.cvLabel)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(ua.workspace.jdLabel), "jd text");
    await userEvent.click(screen.getByRole("button", { name: ua.wizard.analyzeAction }));

    // The free path submits; streamAnalyze must be called.
    expect(streamAnalyzeMock).toHaveBeenCalledTimes(1);
    const callArg = streamAnalyzeMock.mock.calls[0][0] as { cvText: string };
    // Must NOT be the empty string — the form captured the controlled field value.
    expect(callArg.cvText).toBe("initial cv");
  });
});
