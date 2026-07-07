// @vitest-environment jsdom
// Test-first (red): the DecisionBar SLOT-PICKER for "Propose another time"
// (booking-hitl S4, review-gate CRITICAL finding — "Propose another time"
// currently POSTs `slots:[]` immediately with no selection UI at all, so
// the action can never succeed end-to-end against the real
// `/api/decisions/[requestId]` contract, `@trace FR-HITL-01`,
// `@trace FR-HITL-03`). This whole file is expected to FAIL against the
// current 3-button, immediate-POST `DecisionBar` until the real inline
// picker (green half) ships — same red-first discipline, render/fetch-mock
// idioms as `DecisionBar.test.tsx`.
//
// CONTRACT PINNED HERE (the green implementation must satisfy):
//   1. Clicking "Запропонувати інший час" reveals an inline slot-picker
//      (`data-testid="slot-picker"`) and does NOT immediately POST.
//   2. Every candidate slot (`DecisionBarProps.candidateSlots`) is offered
//      as a selectable `role="checkbox"` option.
//   3. Selecting >=1 candidate then clicking "Запропонувати" POSTs
//      `{action:"propose_another_time", slots:[...selected]}`.
//   4. With ZERO selected, "Запропонувати" is disabled and no POST fires.
//   5. `{status:"invalid", code:"SLOT_UNAVAILABLE", slot}` renders an
//      inline Ukrainian error naming the slot; `{status:"applied"}` shows
//      success and collapses the picker.
//   6. Confirm/Decline are UNCHANGED — still POST immediately, unaffected
//      by the picker (no regression to `DecisionBar.test.tsx`'s own
//      coverage of those two buttons).

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { DecisionBar } from "./DecisionBar.tsx";
import type { Slot } from "@kamerton/lib/src/slots/grid.ts";

const CANDIDATE_SLOTS: Slot[] = [
  { start: "2026-07-06T10:00", end: "2026-07-06T11:00" },
  { start: "2026-07-06T11:00", end: "2026-07-06T12:00" },
];

function mockFetchResolving(body: unknown) {
  return vi.fn().mockResolvedValue({ ok: true, json: async () => body });
}

describe("DecisionBar slot-picker (booking-hitl S4, review-gate CRITICAL fix)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    cleanup();
  });

  // @trace FR-HITL-03
  it("reveals an inline slot-picker on 'Propose another time' instead of POSTing immediately", async () => {
    const fetchMock = mockFetchResolving({ status: "not_connected" });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<DecisionBar requestId={1} candidateSlots={CANDIDATE_SLOTS} />);

    await user.click(screen.getByRole("button", { name: /інший час/i }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByTestId("slot-picker")).toBeInTheDocument();
  });

  // @trace FR-HITL-01, FR-HITL-03
  it("offers every candidate slot as a selectable checkbox option", async () => {
    const fetchMock = mockFetchResolving({ status: "not_connected" });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<DecisionBar requestId={1} candidateSlots={CANDIDATE_SLOTS} />);

    await user.click(screen.getByRole("button", { name: /інший час/i }));

    expect(screen.getAllByRole("checkbox")).toHaveLength(CANDIDATE_SLOTS.length);
  });

  // @trace FR-HITL-01, FR-HITL-03 — the review-gate CRITICAL fix itself:
  // the POST body must actually carry the selected slot(s), never `[]`.
  it("POSTs the selected slots to /api/decisions/:requestId on 'Send proposal'", async () => {
    const fetchMock = mockFetchResolving({ status: "applied" });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<DecisionBar requestId={42} candidateSlots={CANDIDATE_SLOTS} />);

    await user.click(screen.getByRole("button", { name: /інший час/i }));
    await user.click(screen.getAllByRole("checkbox")[0]!);
    await user.click(screen.getByRole("button", { name: /запропонувати/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/decisions/42",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ action: "propose_another_time", slots: [CANDIDATE_SLOTS[0]] }),
      }),
    );
  });

  // @trace FR-HITL-03 — the review-gate CRITICAL finding's original failure
  // mode: `slots:[]` must never reach the server; the client guards it too.
  it("disables 'Send proposal' with zero candidates selected and never POSTs", async () => {
    const fetchMock = mockFetchResolving({ status: "not_connected" });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<DecisionBar requestId={1} candidateSlots={CANDIDATE_SLOTS} />);

    await user.click(screen.getByRole("button", { name: /інший час/i }));
    const sendButton = screen.getByRole("button", { name: /запропонувати/i });
    expect(sendButton).toBeDisabled();

    await user.click(sendButton);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // @trace FR-HITL-03, BC-LANG-01
  it("shows an inline Ukrainian error naming the slot on a SLOT_UNAVAILABLE response", async () => {
    const fetchMock = mockFetchResolving({
      status: "invalid",
      code: "SLOT_UNAVAILABLE",
      message: "Час 06.07 о 10:00 уже зайнятий або утримується іншим лідом. Оберіть інший варіант.",
      slot: CANDIDATE_SLOTS[0],
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<DecisionBar requestId={1} candidateSlots={CANDIDATE_SLOTS} />);

    await user.click(screen.getByRole("button", { name: /інший час/i }));
    await user.click(screen.getAllByRole("checkbox")[0]!);
    await user.click(screen.getByRole("button", { name: /запропонувати/i }));

    await waitFor(() => {
      expect(screen.getByText(/уже зайнятий/i)).toBeInTheDocument();
    });
    // The picker itself stays open so the admin can pick a different slot.
    expect(screen.getByTestId("slot-picker")).toBeInTheDocument();
  });

  // @trace FR-HITL-01, FR-HITL-04
  it("shows success and collapses the picker on an applied response", async () => {
    const fetchMock = mockFetchResolving({ status: "applied" });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<DecisionBar requestId={1} candidateSlots={CANDIDATE_SLOTS} />);

    await user.click(screen.getByRole("button", { name: /інший час/i }));
    await user.click(screen.getAllByRole("checkbox")[0]!);
    await user.click(screen.getByRole("button", { name: /запропонувати/i }));

    await waitFor(() => {
      expect(screen.queryByTestId("slot-picker")).not.toBeInTheDocument();
    });
    expect(screen.getByRole("status")).toHaveTextContent(/запропон/i);
  });

  // Regression guard (no bug fixed yet — pins the "only propose_another_time
  // is gated" boundary so a future picker change cannot silently start
  // gating Confirm too): Confirm still POSTs immediately.
  it("still POSTs Confirm immediately, unaffected by the picker", async () => {
    const fetchMock = mockFetchResolving({ status: "applied" });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<DecisionBar requestId={9} candidateSlots={CANDIDATE_SLOTS} />);

    await user.click(screen.getByRole("button", { name: /підтвердити/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/decisions/9",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ action: "confirm" }) }),
    );
    expect(screen.queryByTestId("slot-picker")).not.toBeInTheDocument();
  });

  // Regression guard, same reasoning as above: Decline still POSTs
  // immediately.
  it("still POSTs Decline immediately, unaffected by the picker", async () => {
    const fetchMock = mockFetchResolving({ status: "applied" });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<DecisionBar requestId={9} candidateSlots={CANDIDATE_SLOTS} />);

    await user.click(screen.getByRole("button", { name: /відхилити/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/decisions/9",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ action: "decline" }) }),
    );
    expect(screen.queryByTestId("slot-picker")).not.toBeInTheDocument();
  });
});
