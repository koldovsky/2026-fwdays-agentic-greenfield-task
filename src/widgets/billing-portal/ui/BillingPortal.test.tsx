// BillingPortal tests (tasks 3.1–3.3): the three billing states —
// active (plan + renewal + invoices + cancel, FR-BILLING-01), canceled
// (downgrade at period end, FR-BILLING-02), and free / after a failed payment
// (calm note + retry CTA, no partial access, FR-BILLING-03).
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { SubscriptionAccess } from "@/entities/subscription";
import { ua } from "@/shared/lib/i18n";
import { BillingPortal } from "./BillingPortal";

const NOW = () => new Date("2026-07-02T12:00:00.000Z");

const activePro: SubscriptionAccess = {
  plan: "pro",
  status: "active",
  currentPeriodEnd: "2026-08-01T12:00:00.000Z",
};

describe("BillingPortal — active plan (FR-BILLING-01)", () => {
  it("shows the current plan, next renewal date, invoice history, and cancel", () => {
    render(<BillingPortal subscription={activePro} now={NOW} />);

    expect(screen.getByText(ua.billing.planName.pro)).toBeInTheDocument();
    expect(screen.getByText(ua.billing.renewsOnLabel)).toBeInTheDocument();
    expect(screen.getByText("2026-08-01")).toBeInTheDocument();
    // Synthetic invoice: period start, amount, settled status.
    expect(screen.getByText("2026-07-02")).toBeInTheDocument();
    expect(screen.getByText("$12")).toBeInTheDocument();
    expect(screen.getByText(ua.billing.invoicePaidLabel)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: ua.billing.cancelAction })).toBeInTheDocument();
    // A paid user is not offered the upgrade chooser.
    expect(
      screen.queryByRole("button", { name: ua.upgrade.chooseAction.pro }),
    ).not.toBeInTheDocument();
  });

  it("labels the Job-hunt Pass period as an expiry, not a renewal", () => {
    render(
      <BillingPortal subscription={{ ...activePro, plan: "job_hunt_pass" }} now={NOW} />,
    );
    expect(screen.getByText(ua.billing.expiresOnLabel)).toBeInTheDocument();
    expect(screen.queryByText(ua.billing.renewsOnLabel)).not.toBeInTheDocument();
  });

  it("cancel requests cancellation then refreshes the server-resolved state", async () => {
    const cancel = vi.fn().mockResolvedValue("ok" as const);
    const refresh = vi.fn();
    render(<BillingPortal subscription={activePro} now={NOW} cancel={cancel} refresh={refresh} />);

    await userEvent.click(screen.getByRole("button", { name: ua.billing.cancelAction }));

    expect(cancel).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("keeps the state and shows calm copy when cancellation fails (NFR-OBS-01)", async () => {
    const cancel = vi.fn().mockResolvedValue("error" as const);
    const refresh = vi.fn();
    render(<BillingPortal subscription={activePro} now={NOW} cancel={cancel} refresh={refresh} />);

    await userEvent.click(screen.getByRole("button", { name: ua.billing.cancelAction }));

    expect(await screen.findByRole("alert")).toHaveTextContent(ua.billing.cancelError);
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("BillingPortal — canceled (FR-BILLING-02)", () => {
  const canceledPro: SubscriptionAccess = { ...activePro, status: "canceled" };

  it("shows access-until and the downgrade note; no second cancel", () => {
    render(<BillingPortal subscription={canceledPro} now={NOW} />);

    // Still on the paid plan until period end.
    expect(screen.getByText(ua.billing.planName.pro)).toBeInTheDocument();
    expect(screen.getByText(ua.billing.accessUntilLabel)).toBeInTheDocument();
    expect(screen.getByText("2026-08-01")).toBeInTheDocument();
    expect(screen.getByText(ua.billing.canceledNote)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: ua.billing.cancelAction }),
    ).not.toBeInTheDocument();
  });

  it("renders Free once the canceled period lapses, invoices still readable", () => {
    render(
      <BillingPortal
        subscription={{ ...canceledPro, currentPeriodEnd: "2026-06-01T00:00:00.000Z" }}
        now={NOW}
      />,
    );

    expect(screen.getByText(ua.billing.planName.free)).toBeInTheDocument();
    // History does not disappear on downgrade (FR-BILLING-01).
    expect(screen.getByText("$12")).toBeInTheDocument();
    // Export/upgrade path is offered again.
    expect(screen.getByRole("button", { name: ua.upgrade.chooseAction.pro })).toBeInTheDocument();
  });
});

describe("BillingPortal — free / failed payment (FR-BILLING-03)", () => {
  it("a user with no subscription row is plainly Free with a retry CTA and no partial access", () => {
    render(<BillingPortal subscription={null} now={NOW} />);

    expect(screen.getByText(ua.billing.planName.free)).toBeInTheDocument();
    expect(screen.getByText(ua.billing.freeNote)).toBeInTheDocument();
    expect(screen.getByText(ua.billing.upgradeTitle)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: ua.upgrade.chooseAction.pro })).toBeInTheDocument();
    // No paid-plan remnants: no renewal, no cancel, no invoices.
    expect(screen.queryByText(ua.billing.renewsOnLabel)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: ua.billing.cancelAction }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(ua.billing.noInvoices)).toBeInTheDocument();
  });
});
