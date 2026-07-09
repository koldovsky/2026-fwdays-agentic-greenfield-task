// UpgradePlans tests (task 2.1, FR-PAYWALL-02/03): both plans offered, the
// chosen plan + returnTo reach the server, navigation follows the returned
// checkout url, anonymous users are routed to sign-in, failures stay calm.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ua } from "@/shared/lib/i18n";
import { UpgradePlans } from "./UpgradePlans";

function stubFetch(response: { status?: number; ok: boolean; json?: unknown }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status ?? (response.ok ? 200 : 500),
    json: async () => response.json ?? {},
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("UpgradePlans (FR-PAYWALL-02)", () => {
  it("offers both purchasable plans with landing-consistent pricing copy", () => {
    render(<UpgradePlans navigate={vi.fn()} />);

    expect(screen.getByText(ua.checkout.planName.pro)).toBeInTheDocument();
    expect(screen.getByText(ua.checkout.planPrice.pro)).toBeInTheDocument();
    expect(screen.getByText(ua.checkout.planName.job_hunt_pass)).toBeInTheDocument();
    expect(screen.getByText(ua.checkout.planPrice.job_hunt_pass)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: ua.upgrade.chooseAction.pro })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: ua.upgrade.chooseAction.job_hunt_pass }),
    ).toBeInTheDocument();
  });

  it("sends the chosen plan + returnTo and navigates to the checkout url (FR-PAYWALL-03)", async () => {
    const fetchMock = stubFetch({ ok: true, json: { checkoutUrl: "/checkout?token=t1" } });
    const navigate = vi.fn();
    render(<UpgradePlans returnTo="/tailor" navigate={navigate} />);

    await userEvent.click(screen.getByRole("button", { name: ua.upgrade.chooseAction.pro }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/payments/checkout",
      expect.objectContaining({
        body: JSON.stringify({ plan: "pro", returnTo: "/tailor" }),
      }),
    );
    expect(navigate).toHaveBeenCalledWith("/checkout?token=t1");
  });

  it("routes an anonymous chooser to sign-in", async () => {
    stubFetch({ ok: false, status: 401 });
    const navigate = vi.fn();
    render(<UpgradePlans returnTo="/tailor" navigate={navigate} />);

    await userEvent.click(
      screen.getByRole("button", { name: ua.upgrade.chooseAction.job_hunt_pass }),
    );

    expect(navigate).toHaveBeenCalledWith("/sign-in");
  });

  it("shows calm error copy and stays put when checkout cannot start (NFR-OBS-01)", async () => {
    stubFetch({ ok: false, status: 503 });
    const navigate = vi.fn();
    render(<UpgradePlans returnTo="/tailor" navigate={navigate} />);

    await userEvent.click(screen.getByRole("button", { name: ua.upgrade.chooseAction.pro }));

    expect(await screen.findByRole("alert")).toHaveTextContent(ua.upgrade.error);
    expect(navigate).not.toHaveBeenCalled();
    // Buttons are usable again for a retry.
    expect(screen.getByRole("button", { name: ua.upgrade.chooseAction.pro })).not.toBeDisabled();
  });
});

// Task 6.1 — three paid plans, benefit <ul>, ultra primary button, startCheckout dispatch
// (FR-PAYWALL-02, FR-SALES-03)
describe("UpgradePlans — three paid plans with Ultra featured (task 6.1)", () => {
  it("renders all three paid plans: pro, ultra, and job_hunt_pass", () => {
    render(<UpgradePlans navigate={vi.fn()} />);

    expect(screen.getByText(ua.checkout.planName.pro)).toBeInTheDocument();
    expect(screen.getByText(ua.checkout.planName.ultra)).toBeInTheDocument();
    expect(screen.getByText(ua.checkout.planName.job_hunt_pass)).toBeInTheDocument();
  });

  it("each plan renders its benefits as <li> items inside a <ul> (no single-sentence fallback)", () => {
    render(<UpgradePlans navigate={vi.fn()} />);

    const lists = document.querySelectorAll("ul");
    // There must be at least three <ul>s (one per plan)
    expect(lists.length).toBeGreaterThanOrEqual(3);

    // Every plan benefit string from the UA dictionary must appear as a list item
    for (const plan of ["pro", "ultra", "job_hunt_pass"] as const) {
      for (const benefit of ua.upgrade.planFeature[plan]) {
        expect(screen.getByText(benefit)).toBeInTheDocument();
        // The text node's parent (or ancestor) is an <li>
        const el = screen.getByText(benefit);
        expect(el.closest("li")).not.toBeNull();
      }
    }
  });

  it("the Ultra button uses the primary variant and the other two use secondary", () => {
    render(<UpgradePlans navigate={vi.fn()} />);

    const ultraBtn = screen.getByRole("button", { name: ua.upgrade.chooseAction.ultra });
    const proBtn = screen.getByRole("button", { name: ua.upgrade.chooseAction.pro });
    const passBtn = screen.getByRole("button", { name: ua.upgrade.chooseAction.job_hunt_pass });

    // The Button component applies `bg-brand` for the primary variant and `bg-surface-card`
    // for secondary (see shared/ui/button/ui/Button.tsx variantClass map). Check via class.
    expect(ultraBtn.className).toContain("bg-brand");
    expect(proBtn.className).not.toContain("bg-brand");
    expect(passBtn.className).not.toContain("bg-brand");
  });

  it("choosing pro calls startCheckout with plan='pro'", async () => {
    const fetchMock = stubFetch({ ok: true, json: { checkoutUrl: "/checkout?token=t_pro" } });
    const navigate = vi.fn();
    render(<UpgradePlans returnTo="/billing" navigate={navigate} />);

    await userEvent.click(screen.getByRole("button", { name: ua.upgrade.chooseAction.pro }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/payments/checkout",
      expect.objectContaining({
        body: JSON.stringify({ plan: "pro", returnTo: "/billing" }),
      }),
    );
  });

  it("choosing ultra calls startCheckout with plan='ultra'", async () => {
    const fetchMock = stubFetch({ ok: true, json: { checkoutUrl: "/checkout?token=t_ultra" } });
    const navigate = vi.fn();
    render(<UpgradePlans returnTo="/billing" navigate={navigate} />);

    await userEvent.click(screen.getByRole("button", { name: ua.upgrade.chooseAction.ultra }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/payments/checkout",
      expect.objectContaining({
        body: JSON.stringify({ plan: "ultra", returnTo: "/billing" }),
      }),
    );
  });

  it("choosing job_hunt_pass calls startCheckout with plan='job_hunt_pass'", async () => {
    const fetchMock = stubFetch({ ok: true, json: { checkoutUrl: "/checkout?token=t_pass" } });
    const navigate = vi.fn();
    render(<UpgradePlans returnTo="/billing" navigate={navigate} />);

    await userEvent.click(
      screen.getByRole("button", { name: ua.upgrade.chooseAction.job_hunt_pass }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/payments/checkout",
      expect.objectContaining({
        body: JSON.stringify({ plan: "job_hunt_pass", returnTo: "/billing" }),
      }),
    );
  });
});
