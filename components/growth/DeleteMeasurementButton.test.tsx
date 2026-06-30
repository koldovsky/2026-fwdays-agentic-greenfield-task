// Component test for the measurement delete-with-confirm control (task 1.7).
// Asserts the FR-GROWTH-04 / NFR-USA-02 contract: deletion is NEVER one-click —
// the first click only reveals an explicit confirm step, and the delete action
// fires ONLY after the user confirms. Cancelling dismisses the prompt without
// invoking the action (the "Cancel deletion" scenario). A not-found result (the
// row was already removed elsewhere) reconciles the stale list via router.refresh.
//
// @trace FR-GROWTH-04
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

const deleteMeasurementAction =
  vi.fn<(id: number, plantId?: number) => Promise<ActionResult>>();
vi.mock("@/lib/growth/actions", () => ({
  deleteMeasurementAction: (id: number, plantId?: number) =>
    deleteMeasurementAction(id, plantId),
}));

import { DeleteMeasurementButton } from "@/components/growth/DeleteMeasurementButton";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("<DeleteMeasurementButton> — confirm-before-action (FR-GROWTH-04, NFR-USA-02)", () => {
  it("does not invoke the delete action on the first (reveal) click", async () => {
    const user = userEvent.setup();
    deleteMeasurementAction.mockResolvedValue({ ok: true });
    render(<DeleteMeasurementButton id={7} plantId={3} />);

    // First click only reveals the confirm step — no destructive call yet.
    await user.click(screen.getByRole("button", { name: uk.growth.delete }));
    expect(deleteMeasurementAction).not.toHaveBeenCalled();

    // The explicit confirm + cancel controls and the prompt are now shown.
    expect(screen.getByText(uk.growth.deleteConfirmPrompt)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: uk.growth.deleteConfirm }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: uk.growth.deleteCancel }),
    ).toBeInTheDocument();
  });

  it("invokes the delete action with the correct id only after the explicit confirm click", async () => {
    const user = userEvent.setup();
    deleteMeasurementAction.mockResolvedValue({ ok: true });
    render(<DeleteMeasurementButton id={7} plantId={3} />);

    await user.click(screen.getByRole("button", { name: uk.growth.delete }));
    await user.click(
      screen.getByRole("button", { name: uk.growth.deleteConfirm }),
    );

    expect(deleteMeasurementAction).toHaveBeenCalledTimes(1);
    expect(deleteMeasurementAction).toHaveBeenCalledWith(7, 3);
  });

  it("cancelling the confirm step dismisses it without invoking the action", async () => {
    const user = userEvent.setup();
    render(<DeleteMeasurementButton id={7} plantId={3} />);

    await user.click(screen.getByRole("button", { name: uk.growth.delete }));
    await user.click(
      screen.getByRole("button", { name: uk.growth.deleteCancel }),
    );

    expect(deleteMeasurementAction).not.toHaveBeenCalled();
    // Back to the initial single delete affordance.
    expect(
      screen.getByRole("button", { name: uk.growth.delete }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(uk.growth.deleteConfirmPrompt),
    ).not.toBeInTheDocument();
  });

  it("refreshes the list on a not-found result so the stale row reconciles", async () => {
    const user = userEvent.setup();
    // The row was already deleted elsewhere: the action reports not-found.
    deleteMeasurementAction.mockResolvedValue({
      ok: false,
      formError: uk.growth.notFound,
    });
    render(<DeleteMeasurementButton id={7} plantId={3} />);

    await user.click(screen.getByRole("button", { name: uk.growth.delete }));
    await user.click(
      screen.getByRole("button", { name: uk.growth.deleteConfirm }),
    );

    // The not-found message surfaces inline AND the list is refreshed to drop
    // the stale row (reconcile with server state).
    expect(await screen.findByText(uk.growth.notFound)).toBeInTheDocument();
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });
});
