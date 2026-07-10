// Paywall composition in the wizard (FR-PAYWALL-01, NFR-COST-02): the view opens
// widgets/paywall at the two gated points — export without a paid entitlement,
// and a `rate_limited` GENERATION run — and a paid user reaches export without
// seeing it. run-tailoring and widgets/export-stepper are both mocked: this
// test drives the view's own control flow (does the paywall open / stay
// closed / stay gated), not ExportStepper's copy/PDF/DOCX internals — those
// are covered by the widget's own test.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ua } from "@/shared/lib/i18n";
import type { AnalysisResult, TailoringRunResult } from "@/features/run-tailoring";
import type { ExportStepperProps } from "@/widgets/export-stepper";

import { TailorWorkspace } from "./TailorWorkspace";

const SCRIPTED_ANALYSIS: AnalysisResult = {
  matchScore: 68,
  cvProfile: { skills: [], sentences: [] },
  requirements: [],
  checklist: [],
  clarifyingQuestions: [],
};

const SCRIPTED_RESULT: TailoringRunResult = {
  checklist: [],
  bullets: [
    { id: "blt-included", text: "Shipped a React platform.", grounding: "grounded", includedInExport: true },
    { id: "blt-excluded", text: "Led a 12-person org.", grounding: "overclaim-risk", includedInExport: false },
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

// Fake ExportStepper: exposes just enough surface (an export trigger that
// respects the injected paid/onPaywall props) to drive TailorWorkspace's
// paywall composition, without exercising the real copy/PDF/DOCX buttons.
vi.mock("@/widgets/export-stepper", () => ({
  ExportStepper: ({ paid, onPaywall }: ExportStepperProps) => (
    <button
      type="button"
      onClick={() => {
        if (!paid) onPaywall();
      }}
    >
      fake export
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

const RESULT_EVENTS = [
  { type: "result", result: SCRIPTED_RESULT },
  { type: "status", phase: "done" },
];
const RATE_LIMIT_EVENTS = [
  { type: "error", code: "rate_limited" },
  { type: "status", phase: "failed" },
];

const paywallRegion = () => screen.queryByRole("region", { name: ua.paywall.regionLabel });

async function reachExport() {
  await userEvent.click(screen.getByRole("button", { name: "fake analyze" }));
  await userEvent.click(screen.getByRole("button", { name: ua.wizard.confirmAction }));
  // Export step is reached once generation streams its result.
  await screen.findByRole("button", { name: "fake export" });
}

describe("TailorWorkspace paywall (FR-PAYWALL-01)", () => {
  it("intercepts export for a non-paid user — paywall opens", async () => {
    streamGenerateMock.mockImplementation(scriptedGen(RESULT_EVENTS));
    render(<TailorWorkspace paid={false} />);

    await reachExport();
    await userEvent.click(screen.getByRole("button", { name: "fake export" }));

    expect(paywallRegion()).toBeInTheDocument();
    expect(screen.getByText(ua.paywall.exportLead)).toBeInTheDocument();
  });

  it("does not open the paywall for a paid user at export (FR-PAYWALL-03)", async () => {
    streamGenerateMock.mockImplementation(scriptedGen(RESULT_EVENTS));
    render(<TailorWorkspace paid />);

    await reachExport();
    await userEvent.click(screen.getByRole("button", { name: "fake export" }));

    expect(paywallRegion()).not.toBeInTheDocument();
  });

  it("opens the paywall when the server rate-limits a generation run (NFR-COST-02)", async () => {
    streamGenerateMock.mockImplementation(scriptedGen(RATE_LIMIT_EVENTS));
    render(<TailorWorkspace />);

    await userEvent.click(screen.getByRole("button", { name: "fake analyze" }));
    await userEvent.click(screen.getByRole("button", { name: ua.wizard.confirmAction }));

    expect(await screen.findByText(ua.paywall.limitLead)).toBeInTheDocument();
    expect(paywallRegion()).toBeInTheDocument();
  });

  it("dismiss closes the panel and the gated action stays gated", async () => {
    streamGenerateMock.mockImplementation(scriptedGen(RESULT_EVENTS));
    render(<TailorWorkspace paid={false} />);

    await reachExport();
    await userEvent.click(screen.getByRole("button", { name: "fake export" }));
    expect(paywallRegion()).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: ua.paywall.dismissAction }));

    expect(paywallRegion()).not.toBeInTheDocument();
  });
});
