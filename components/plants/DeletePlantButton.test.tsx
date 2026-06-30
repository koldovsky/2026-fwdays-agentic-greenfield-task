// Component test for the delete-with-confirm control (task 1.6). Asserts the
// SC-5 / NFR-USA-02 contract: deletion is NEVER one-click — the first click only
// reveals an explicit confirm step, and the delete action fires ONLY after the
// user confirms. Cancelling dismisses the prompt without invoking the action.
//
// @trace FR-PLANT-07
// @trace NFR-USA-02
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ActionResult } from "@/lib/forms/result";
import { uk } from "@/lib/i18n/uk";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const deletePlantAction = vi.fn<(id: number) => Promise<ActionResult>>();
vi.mock("@/lib/plants/actions", () => ({
  deletePlantAction: (id: number) => deletePlantAction(id),
}));

import { DeletePlantButton } from "@/components/plants/DeletePlantButton";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("<DeletePlantButton> — confirm-before-action (SC-5, NFR-USA-02)", () => {
  it("does not invoke the delete action on the first (reveal) click", async () => {
    const user = userEvent.setup();
    deletePlantAction.mockResolvedValue({ ok: true });
    render(<DeletePlantButton id={7} />);

    // First click only reveals the confirm step — no destructive call yet.
    await user.click(screen.getByRole("button", { name: uk.plants.delete }));
    expect(deletePlantAction).not.toHaveBeenCalled();

    // The explicit confirm + cancel controls and the prompt are now shown.
    expect(screen.getByText(uk.plants.deleteConfirmPrompt)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: uk.plants.deleteConfirm }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: uk.plants.deleteCancel }),
    ).toBeInTheDocument();
  });

  it("invokes the delete action only after the explicit confirm click", async () => {
    const user = userEvent.setup();
    deletePlantAction.mockResolvedValue({ ok: true });
    render(<DeletePlantButton id={7} />);

    await user.click(screen.getByRole("button", { name: uk.plants.delete }));
    await user.click(
      screen.getByRole("button", { name: uk.plants.deleteConfirm }),
    );

    expect(deletePlantAction).toHaveBeenCalledTimes(1);
    expect(deletePlantAction).toHaveBeenCalledWith(7);
  });

  it("cancelling the confirm step dismisses it without invoking the action", async () => {
    const user = userEvent.setup();
    render(<DeletePlantButton id={7} />);

    await user.click(screen.getByRole("button", { name: uk.plants.delete }));
    await user.click(
      screen.getByRole("button", { name: uk.plants.deleteCancel }),
    );

    expect(deletePlantAction).not.toHaveBeenCalled();
    // Back to the initial single delete affordance.
    expect(
      screen.getByRole("button", { name: uk.plants.delete }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(uk.plants.deleteConfirmPrompt),
    ).not.toBeInTheDocument();
  });
});
