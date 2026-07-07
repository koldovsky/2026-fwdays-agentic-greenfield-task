// @vitest-environment jsdom
// Test-first (red): `DecisionBar` is a typed throwing stub (dashboard
// tasks.md §6.6's red half) — every test below is expected to FAIL against
// the stub until the green half implements the real component.

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { DecisionBar } from "./DecisionBar.tsx";

describe("DecisionBar (dashboard tasks.md §6.6, design.md Decision 4)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    cleanup();
  });

  // @trace FR-DASH-01
  it("renders all three decision actions", () => {
    vi.stubGlobal("fetch", vi.fn());
    render(<DecisionBar requestId={1} />);

    expect(screen.getByRole("button", { name: /підтвердити/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /інший час/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /відхилити/i })).toBeInTheDocument();
  });

  it("POSTs to /api/decisions/:requestId on click", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "not_connected", message: "Ще не підключено" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<DecisionBar requestId={42} />);
    await user.click(screen.getByRole("button", { name: /підтвердити/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/decisions/42",
      expect.objectContaining({ method: "POST" }),
    );
  });

  // @trace TC-PROTO-01 (design.md Decision 4: "never a raw 404/500... never silently dead")
  it("renders the stub's 'не підключено' response inline, not as a thrown error", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: "not_connected", message: "Ще не підключено — рішення поки що не передається." }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<DecisionBar requestId={7} />);
    await user.click(screen.getByRole("button", { name: /відхилити/i }));

    await waitFor(() => {
      expect(screen.getByText(/ще не підключено/i)).toBeInTheDocument();
    });
  });

  // S4: retargeted from "Propose another time" (which now opens the inline
  // slot-picker instead of POSTing immediately — see DecisionBar.slot-picker
  // .test.tsx) to Confirm, an immediate-POST action otherwise uncovered for
  // the network-failure path. The obsolete propose-POSTs-immediately
  // assumption was superseded by the FR-HITL-01 slot-picker contract; this
  // change is deliberate, not a silent weakening.
  it("renders a friendly inline message if the request itself fails (network error)", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    const user = userEvent.setup();
    render(<DecisionBar requestId={7} />);
    await user.click(screen.getByRole("button", { name: /підтвердити/i }));

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/спробуйте ще раз/i);
    });
  });
});
