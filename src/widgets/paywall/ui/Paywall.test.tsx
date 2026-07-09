// Paywall widget tests (task 2.1, FR-PAYWALL-01/02): reason-specific copy at
// both interception points, both plans on offer, dismiss leaves the action
// gated (it only closes the panel).
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ua } from "@/shared/lib/i18n";
import { Paywall } from "./Paywall";

describe("Paywall (FR-PAYWALL-01/02)", () => {
  it("intercepts export with export-specific copy and offers both plans", () => {
    render(<Paywall reason="export" />);

    expect(screen.getByRole("region", { name: ua.paywall.regionLabel })).toBeInTheDocument();
    expect(screen.getByText(ua.paywall.title)).toBeInTheDocument();
    expect(screen.getByText(ua.paywall.exportLead)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: ua.upgrade.chooseAction.pro })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: ua.upgrade.chooseAction.job_hunt_pass }),
    ).toBeInTheDocument();
  });

  it("intercepts a second tailoring with limit-specific copy", () => {
    render(<Paywall reason="tailoring-limit" />);
    expect(screen.getByText(ua.paywall.limitLead)).toBeInTheDocument();
    expect(screen.queryByText(ua.paywall.exportLead)).not.toBeInTheDocument();
  });

  it("dismiss calls onDismiss and is absent without a handler", async () => {
    const onDismiss = vi.fn();
    const { rerender } = render(<Paywall reason="export" onDismiss={onDismiss} />);

    await userEvent.click(screen.getByRole("button", { name: ua.paywall.dismissAction }));
    expect(onDismiss).toHaveBeenCalledTimes(1);

    rerender(<Paywall reason="export" />);
    expect(
      screen.queryByRole("button", { name: ua.paywall.dismissAction }),
    ).not.toBeInTheDocument();
  });
});
