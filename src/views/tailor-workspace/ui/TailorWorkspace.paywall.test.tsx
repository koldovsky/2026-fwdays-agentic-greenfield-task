// Paywall composition in the wizard (FR-PAYWALL-01, NFR-COST-02): the view opens
// widgets/paywall at the two gated points — export without a paid entitlement,
// and a `rate_limited` GENERATION run — and a paid user exports without seeing
// it. run-tailoring is mocked: AnalyzeForm fires a scripted analysis and
// streamGenerate is a scripted async generator (the real budget limit lives
// server-side; the client only relays the rate_limited event).
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ua } from "@/shared/lib/i18n";
import type { AnalysisResult, TailoringRunResult } from "@/features/run-tailoring";

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
  await screen.findByRole("button", { name: ua.workspace.exportAction });
}

describe("TailorWorkspace paywall (FR-PAYWALL-01)", () => {
  it("intercepts export for a non-paid user — paywall opens, nothing exports", async () => {
    streamGenerateMock.mockImplementation(scriptedGen(RESULT_EVENTS));
    const onExport = vi.fn();
    render(<TailorWorkspace paid={false} onExport={onExport} />);

    await reachExport();
    await userEvent.click(screen.getByRole("button", { name: ua.workspace.exportAction }));

    expect(paywallRegion()).toBeInTheDocument();
    expect(screen.getByText(ua.paywall.exportLead)).toBeInTheDocument();
    expect(onExport).not.toHaveBeenCalled();
  });

  it("lets a paid user export — included bullets only, no paywall (FR-PAYWALL-03)", async () => {
    streamGenerateMock.mockImplementation(scriptedGen(RESULT_EVENTS));
    const onExport = vi.fn();
    render(<TailorWorkspace paid onExport={onExport} />);

    await reachExport();
    await userEvent.click(screen.getByRole("button", { name: ua.workspace.exportAction }));

    expect(paywallRegion()).not.toBeInTheDocument();
    expect(onExport).toHaveBeenCalledTimes(1);
    const exported = onExport.mock.calls[0][0] as string;
    expect(exported).toContain("Shipped a React platform.");
    // Excluded overclaim-risk bullet never reaches the export (BC-HONESTY-02).
    expect(exported).not.toContain("12-person");
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
    const onExport = vi.fn();
    render(<TailorWorkspace paid={false} onExport={onExport} />);

    await reachExport();
    await userEvent.click(screen.getByRole("button", { name: ua.workspace.exportAction }));
    expect(paywallRegion()).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: ua.paywall.dismissAction }));

    expect(paywallRegion()).not.toBeInTheDocument();
    expect(onExport).not.toHaveBeenCalled();
  });
});
