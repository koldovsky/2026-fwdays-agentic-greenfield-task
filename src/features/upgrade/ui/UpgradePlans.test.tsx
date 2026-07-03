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
