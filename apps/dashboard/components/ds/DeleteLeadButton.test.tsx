// @vitest-environment jsdom
// Test-first (red): `DeleteLeadButton` is a typed throwing stub (dashboard
// tasks.md §6.8's red half) — every test below is expected to FAIL against
// the stub until the green half implements the real two-step confirm.

import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeleteLeadButton } from "./DeleteLeadButton.tsx";

describe("DeleteLeadButton (dashboard tasks.md §6.8, @trace NFR-PRIV-02)", () => {
  it("a single click does NOT call the delete route — it opens a confirmation step", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<DeleteLeadButton leadId={1} />);
    await user.click(screen.getByRole("button", { name: /видалити ліда/i }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("delete-lead-confirm")).toBeInTheDocument();

    vi.unstubAllGlobals();
  });

  it("confirming calls DELETE /api/leads/:id", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ status: "ok" }) });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<DeleteLeadButton leadId={7} />);
    await user.click(screen.getByRole("button", { name: /видалити ліда/i }));
    await user.click(screen.getByRole("button", { name: /так, видалити/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/leads/7", expect.objectContaining({ method: "DELETE" }));
    });

    vi.unstubAllGlobals();
  });

  it("dismissing the confirmation leaves the lead unchanged (no fetch call)", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<DeleteLeadButton leadId={3} />);
    await user.click(screen.getByRole("button", { name: /видалити ліда/i }));
    expect(screen.getByTestId("delete-lead-confirm")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /скасувати/i }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByTestId("delete-lead-confirm")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /видалити ліда/i })).toBeInTheDocument();

    vi.unstubAllGlobals();
  });

  it("surfaces a deterministic inline error on a failed deletion, never a raw crash", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({ error: "Не вдалося видалити подію в календарі. Спробуйте ще раз." }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<DeleteLeadButton leadId={9} />);
    await user.click(screen.getByRole("button", { name: /видалити ліда/i }));
    await user.click(screen.getByRole("button", { name: /так, видалити/i }));

    await waitFor(() => {
      expect(screen.getByText(/не вдалося видалити подію в календарі/i)).toBeInTheDocument();
    });
    // Still retryable — the confirm step's own confirm button remains.
    expect(screen.getByRole("button", { name: /так, видалити/i })).toBeInTheDocument();

    vi.unstubAllGlobals();
  });
});
