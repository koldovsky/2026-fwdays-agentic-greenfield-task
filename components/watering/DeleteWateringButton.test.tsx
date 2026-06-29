// RED (Phase 4b) — component test for the watering delete-with-confirm control
// (task 1.8), written from the spec BEFORE the implementation. Asserts the
// FR-WATER-05 / SC-5 / NFR-USA-02 contract: deletion is NEVER one-click — the
// first click only reveals an explicit confirm step, and the delete action fires
// ONLY after the user confirms. Cancelling dismisses the prompt without invoking
// the action (the "Cancel deletion" scenario). The control is keyboard-operable
// with accessible labels (SC-6). A not-found result (the row was already removed
// elsewhere) reconciles the stale list via router.refresh. Imports fail until the
// component + the lib/watering delete action + the uk.watering copy block exist.
//
// @trace FR-WATER-05
// @trace SC-5
// @trace SC-6
// @trace NFR-USA-02
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ActionResult } from "@/lib/forms/result";
import { uk } from "@/lib/i18n/uk";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh }),
}));

const deleteWateringAction =
  vi.fn<(id: number, plantId?: number) => Promise<ActionResult>>();
vi.mock("@/lib/watering/actions", () => ({
  deleteWateringAction: (id: number, plantId?: number) =>
    deleteWateringAction(id, plantId),
}));

import { DeleteWateringButton } from "@/components/watering/DeleteWateringButton";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("<DeleteWateringButton> — confirm-before-action (FR-WATER-05, SC-5, NFR-USA-02)", () => {
  it("does not invoke the delete action on the first (reveal) click", async () => {
    const user = userEvent.setup();
    deleteWateringAction.mockResolvedValue({ ok: true });
    render(<DeleteWateringButton id={7} plantId={3} />);

    // First click only reveals the confirm step — no destructive call yet.
    await user.click(screen.getByRole("button", { name: uk.watering.delete }));
    expect(deleteWateringAction).not.toHaveBeenCalled();

    // The explicit confirm + cancel controls and the prompt are now shown.
    expect(screen.getByText(uk.watering.deleteConfirmPrompt)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: uk.watering.deleteConfirm }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: uk.watering.deleteCancel }),
    ).toBeInTheDocument();
  });

  it("invokes the delete action with the correct id only after the explicit confirm click", async () => {
    const user = userEvent.setup();
    deleteWateringAction.mockResolvedValue({ ok: true });
    render(<DeleteWateringButton id={7} plantId={3} />);

    await user.click(screen.getByRole("button", { name: uk.watering.delete }));
    await user.click(
      screen.getByRole("button", { name: uk.watering.deleteConfirm }),
    );

    expect(deleteWateringAction).toHaveBeenCalledTimes(1);
    expect(deleteWateringAction).toHaveBeenCalledWith(7, 3);
  });

  it("cancelling the confirm step dismisses it without invoking the action (Cancel deletion)", async () => {
    const user = userEvent.setup();
    render(<DeleteWateringButton id={7} plantId={3} />);

    await user.click(screen.getByRole("button", { name: uk.watering.delete }));
    await user.click(
      screen.getByRole("button", { name: uk.watering.deleteCancel }),
    );

    expect(deleteWateringAction).not.toHaveBeenCalled();
    // Back to the initial single delete affordance.
    expect(
      screen.getByRole("button", { name: uk.watering.delete }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(uk.watering.deleteConfirmPrompt),
    ).not.toBeInTheDocument();
  });

  it("is keyboard-operable: confirm fires via the keyboard, not only the mouse (SC-6, NFR-A11Y-04)", async () => {
    const user = userEvent.setup();
    deleteWateringAction.mockResolvedValue({ ok: true });
    render(<DeleteWateringButton id={7} plantId={3} />);

    // Reveal the confirm step by activating the delete control via the keyboard.
    screen.getByRole("button", { name: uk.watering.delete }).focus();
    await user.keyboard("{Enter}");

    // Activate the confirm control via the keyboard.
    screen.getByRole("button", { name: uk.watering.deleteConfirm }).focus();
    await user.keyboard("{Enter}");

    expect(deleteWateringAction).toHaveBeenCalledTimes(1);
    expect(deleteWateringAction).toHaveBeenCalledWith(7, 3);
  });

  it("refreshes the list on a not-found result so the stale row reconciles", async () => {
    const user = userEvent.setup();
    // The row was already deleted elsewhere: the action reports not-found.
    deleteWateringAction.mockResolvedValue({
      ok: false,
      formError: uk.watering.notFound,
    });
    render(<DeleteWateringButton id={7} plantId={3} />);

    await user.click(screen.getByRole("button", { name: uk.watering.delete }));
    await user.click(
      screen.getByRole("button", { name: uk.watering.deleteConfirm }),
    );

    // The not-found message surfaces inline AND the list is refreshed to drop the
    // stale row (reconcile with server state).
    expect(await screen.findByText(uk.watering.notFound)).toBeInTheDocument();
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });
});
