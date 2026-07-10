// Behavioral tests for the wizard's analyze form (FR-WIZARD-01, NFR-OBS-01,
// NFR-SEC-04). `streamAnalyze` is mocked with scripted async generators so these
// exercise the form's own state machine, not NDJSON parsing (that's
// stream-analyze.test.ts's job).
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ua } from "@/shared/lib/i18n";
import type { AnalysisEvent } from "../lib/loop";

import { AnalyzeForm } from "./AnalyzeForm";

const streamAnalyzeMock = vi.hoisted(() => vi.fn());
vi.mock("../api/stream-analyze", () => ({ streamAnalyze: streamAnalyzeMock }));

const ANALYSIS_EVENT: Extract<AnalysisEvent, { type: "analysis" }> = {
  type: "analysis",
  checklist: [],
  matchScore: 55,
  cvProfile: { skills: [], sentences: [] },
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

function renderForm(onAnalysis = vi.fn()) {
  render(<AnalyzeForm cvText="my cv text" onCvTextChange={vi.fn()} onAnalysis={onAnalysis} />);
  return onAnalysis;
}

async function fillAndSubmit() {
  await userEvent.type(screen.getByLabelText(ua.workspace.jdLabel), "jd text");
  await userEvent.click(screen.getByRole("button", { name: ua.wizard.analyzeAction }));
}

describe("AnalyzeForm (FR-WIZARD-01)", () => {
  it("hands the analysis (and JD text) up on the terminal analysis event", async () => {
    streamAnalyzeMock.mockImplementation(
      scripted([{ type: "status", phase: "processing" }, ANALYSIS_EVENT]),
    );
    const onAnalysis = renderForm();

    await fillAndSubmit();

    expect(onAnalysis).toHaveBeenCalledTimes(1);
    expect(onAnalysis).toHaveBeenCalledWith(
      expect.objectContaining({ matchScore: 55, clarifyingQuestions: [] }),
      "jd text",
    );
    // The `type` tag is stripped from the payload handed to the view.
    expect(onAnalysis.mock.calls[0][0]).not.toHaveProperty("type");
  });

  it("shows the rate-limited copy inline (analyze cap ≠ paywall)", async () => {
    streamAnalyzeMock.mockImplementation(
      scripted([{ type: "error", code: "rate_limited" }, { type: "status", phase: "failed" }]),
    );
    const onAnalysis = renderForm();

    await fillAndSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent(ua.tailorRun.rateLimited);
    expect(onAnalysis).not.toHaveBeenCalled();
  });

  it("surfaces a calm failure when the stream closes with no terminal event (NFR-OBS-01)", async () => {
    streamAnalyzeMock.mockImplementation(
      scripted([{ type: "status", phase: "queued" }, { type: "status", phase: "processing" }]),
    );
    const onAnalysis = renderForm();

    await fillAndSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent(ua.tailorRun.failed);
    expect(onAnalysis).not.toHaveBeenCalled();
  });

  it("shows an aria-hidden skeleton preview while the analyze run is in flight (NFR-OBS-01)", async () => {
    let releaseNext: (() => void) | undefined;
    streamAnalyzeMock.mockImplementation(() =>
      (async function* () {
        yield { type: "status", phase: "processing" } as const;
        await new Promise<void>((resolve) => {
          releaseNext = resolve;
        });
        yield ANALYSIS_EVENT;
      })(),
    );
    const onAnalysis = renderForm();

    await fillAndSubmit();

    // In-flight: the spoken status is up and the decorative preview renders.
    expect(await screen.findByRole("status")).toHaveTextContent(ua.tailorRun.processing);
    const skeletons = document.querySelectorAll('[aria-hidden="true"] .skeleton');
    expect(skeletons.length).toBeGreaterThan(0);

    releaseNext?.();

    await waitFor(() => expect(onAnalysis).toHaveBeenCalledTimes(1));
    // Once settled, the in-flight preview is gone.
    expect(document.querySelectorAll('[aria-hidden="true"] .skeleton').length).toBe(0);
  });

  it("silently drops a submission with a filled honeypot (NFR-SEC-04)", async () => {
    streamAnalyzeMock.mockClear();
    streamAnalyzeMock.mockImplementation(scripted([ANALYSIS_EVENT]));
    const onAnalysis = renderForm();

    await userEvent.type(screen.getByLabelText(ua.workspace.jdLabel), "jd text");
    const honeypot = document.querySelector('input[name="website"]') as HTMLInputElement;
    fireEvent.change(honeypot, { target: { value: "https://spam.example" } });
    await userEvent.click(screen.getByRole("button", { name: ua.wizard.analyzeAction }));

    expect(streamAnalyzeMock).not.toHaveBeenCalled();
    expect(onAnalysis).not.toHaveBeenCalled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
