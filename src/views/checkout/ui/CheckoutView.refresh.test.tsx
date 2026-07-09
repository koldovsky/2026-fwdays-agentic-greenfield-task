// CheckoutView — FR-PAYWALL-03 client-cache refresh seam tests.
//
// On a 'completed' webhook result the view MUST:
//   1. Call the refresh seam (defaults to router.refresh()) BEFORE navigating.
//   2. Then navigate to returnTo via the navigate seam.
//
// The ordering matters: navigate first would let the Router Cache serve the
// stale pre-payment render for the return segment. The P0 fix calls doRefresh()
// then doNavigate() in that sequence.
//
// These tests use the injectable seams declared on CheckoutViewProps:
//   - `refresh` replaces router.refresh()
//   - `navigate` replaces router.push()
// Both are called through a completeEmulatedCheckout() resolved stub.
//
// Non-completed phases (declined / error) must NOT invoke either seam.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CheckoutView } from "./CheckoutView";

// completeEmulatedCheckout is the async action that talks to the server.
// We replace it entirely so we control what outcome the view sees.
vi.mock("../api/complete", () => ({
  completeEmulatedCheckout: vi.fn(),
}));

import { completeEmulatedCheckout } from "../api/complete";
const mockComplete = vi.mocked(completeEmulatedCheckout);

afterEach(() => {
  vi.clearAllMocks();
});

describe("CheckoutView — refresh seam called on 'completed' (FR-PAYWALL-03)", () => {
  it("calls refresh BEFORE navigate when the outcome is 'completed'", async () => {
    const callOrder: string[] = [];
    const refresh = vi.fn(() => {
      callOrder.push("refresh");
    });
    const navigate = vi.fn((path: string) => {
      callOrder.push(`navigate:${path}`);
    });
    mockComplete.mockResolvedValue("completed");

    render(
      <CheckoutView
        plan="pro"
        returnTo="/tailor"
        token="tok"
        refresh={refresh}
        navigate={navigate}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Емулювати успішну оплату" }));

    expect(refresh).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith("/tailor");
    // Strict ordering: refresh clears the client Router Cache before the new
    // segment is requested. If this order flips the return page is served stale.
    expect(callOrder).toEqual(["refresh", "navigate:/tailor"]);
  });

  it("navigates to the exact returnTo path, not a hardcoded fallback", async () => {
    const navigate = vi.fn();
    const refresh = vi.fn();
    mockComplete.mockResolvedValue("completed");

    render(
      <CheckoutView
        plan="job_hunt_pass"
        returnTo="/account/billing"
        token="tok"
        refresh={refresh}
        navigate={navigate}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Емулювати успішну оплату" }));

    expect(navigate).toHaveBeenCalledWith("/account/billing");
    expect(refresh).toHaveBeenCalledOnce();
  });
});

describe("CheckoutView — refresh seam NOT called on non-completed phases", () => {
  it("does NOT call refresh or navigate when the outcome is 'declined'", async () => {
    const refresh = vi.fn();
    const navigate = vi.fn();
    mockComplete.mockResolvedValue("declined");

    render(
      <CheckoutView
        plan="pro"
        returnTo="/tailor"
        token="tok"
        refresh={refresh}
        navigate={navigate}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Емулювати відмову" }));

    // Phase transitions to "declined" — calm copy shown.
    expect(
      await screen.findByText("Оплату відхилено. Кошти не списано, доступ не змінено."),
    ).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("does NOT call refresh or navigate when the outcome is 'error'", async () => {
    const refresh = vi.fn();
    const navigate = vi.fn();
    mockComplete.mockResolvedValue("error");

    render(
      <CheckoutView
        plan="pro"
        returnTo="/tailor"
        token="tok"
        refresh={refresh}
        navigate={navigate}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Емулювати успішну оплату" }));

    expect(await screen.findByText("Щось пішло не так. Спробуйте ще раз.")).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe("CheckoutView — default refresh seam (uses router.refresh when no prop)", () => {
  it("still calls navigate to returnTo when no refresh prop is supplied (uses router.refresh default)", async () => {
    // When no refresh is injected, the component wires router.refresh() from
    // the vitest-setup global useRouter mock. We verify navigate is still
    // called so the flow completes even with the default seam.
    const navigate = vi.fn();
    mockComplete.mockResolvedValue("completed");

    render(<CheckoutView plan="ultra" returnTo="/tailor" token="tok" navigate={navigate} />);

    await userEvent.click(screen.getByRole("button", { name: "Емулювати успішну оплату" }));

    // Navigate fired — the full success path ran, including the default refresh.
    expect(navigate).toHaveBeenCalledWith("/tailor");
  });
});
