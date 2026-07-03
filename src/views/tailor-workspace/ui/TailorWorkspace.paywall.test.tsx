// Paywall composition in the workspace (task 2.1, FR-PAYWALL-01): the view
// opens widgets/paywall at the two gated points — export without a paid
// entitlement, and a server-emitted rate_limited run — and a paid user
// exports without ever seeing it. TailoringForm is mocked with fake triggers
// (the real limit lives server-side; the form only relays it, so the mock
// exercises exactly the composition seam).
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ua } from "@/shared/lib/i18n";
import type { TailoringRunResult } from "@/features/run-tailoring";

import { TailorWorkspace } from "./TailorWorkspace";

const SCRIPTED_RESULT: TailoringRunResult = {
  checklist: [],
  bullets: [
    {
      id: "blt-included",
      text: "Shipped a React platform.",
      grounding: "grounded",
      includedInExport: true,
    },
    {
      id: "blt-excluded",
      text: "Led a 12-person org.",
      grounding: "overclaim-risk",
      includedInExport: false,
    },
  ],
  matchScore: 68,
};

vi.mock("@/features/run-tailoring", () => ({
  TailoringForm: ({
    onResult,
    onRateLimited,
  }: {
    onResult: (result: TailoringRunResult) => void;
    onRateLimited?: () => void;
  }) => (
    <div>
      <button type="button" onClick={() => onResult(SCRIPTED_RESULT)}>
        fake tailor trigger
      </button>
      <button type="button" onClick={() => onRateLimited?.()}>
        fake rate-limit trigger
      </button>
    </div>
  ),
}));

const paywallRegion = () => screen.queryByRole("region", { name: ua.paywall.regionLabel });

describe("TailorWorkspace paywall (FR-PAYWALL-01)", () => {
  it("intercepts export for a non-paid user — paywall opens, nothing exports", async () => {
    const onExport = vi.fn();
    render(<TailorWorkspace paid={false} onExport={onExport} />);
    await userEvent.click(screen.getByRole("button", { name: "fake tailor trigger" }));

    await userEvent.click(screen.getByRole("button", { name: ua.workspace.exportAction }));

    expect(paywallRegion()).toBeInTheDocument();
    expect(screen.getByText(ua.paywall.exportLead)).toBeInTheDocument();
    expect(onExport).not.toHaveBeenCalled();
  });

  it("lets a paid user export — included bullets only, no paywall (FR-PAYWALL-03)", async () => {
    const onExport = vi.fn();
    render(<TailorWorkspace paid onExport={onExport} />);
    await userEvent.click(screen.getByRole("button", { name: "fake tailor trigger" }));

    await userEvent.click(screen.getByRole("button", { name: ua.workspace.exportAction }));

    expect(paywallRegion()).not.toBeInTheDocument();
    expect(onExport).toHaveBeenCalledTimes(1);
    const exported = onExport.mock.calls[0][0] as string;
    expect(exported).toContain("Shipped a React platform.");
    // Excluded overclaim-risk bullet never reaches the export (BC-HONESTY-02).
    expect(exported).not.toContain("12-person");
  });

  it("opens the paywall when the server rate-limits a run (NFR-COST-02)", async () => {
    render(<TailorWorkspace />);

    await userEvent.click(screen.getByRole("button", { name: "fake rate-limit trigger" }));

    expect(paywallRegion()).toBeInTheDocument();
    expect(screen.getByText(ua.paywall.limitLead)).toBeInTheDocument();
  });

  it("dismiss closes the panel and the gated action stays gated", async () => {
    const onExport = vi.fn();
    render(<TailorWorkspace paid={false} onExport={onExport} />);
    await userEvent.click(screen.getByRole("button", { name: "fake tailor trigger" }));
    await userEvent.click(screen.getByRole("button", { name: ua.workspace.exportAction }));
    expect(paywallRegion()).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: ua.paywall.dismissAction }));

    expect(paywallRegion()).not.toBeInTheDocument();
    expect(onExport).not.toHaveBeenCalled();
  });
});
