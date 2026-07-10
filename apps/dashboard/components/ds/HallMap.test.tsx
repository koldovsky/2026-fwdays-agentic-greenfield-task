// @vitest-environment jsdom
// Test-first (red): `HallMap` is a typed throwing stub (dashboard tasks.md
// §6.7's red half) — every test below is expected to FAIL against the stub
// until the green half implements the real component. Seats are built via
// `lib/src/dashboard`'s own pure functions (`weekSeatGrid` +
// `hallSeatStatus`) — never hand-rolled fixture objects that could drift
// from the real precedence rule this component must render faithfully.

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { hallSeatStatus, type BookingStatus } from "@kamerton/lib/src/dashboard/hall-status.ts";
import { weekSeatGrid } from "@kamerton/lib/src/dashboard/week-grid.ts";
import { HallMap } from "./HallMap.tsx";
import type { HallMapSeat, PendingQueueEntry } from "../../lib/dashboard-state.ts";

const MONDAY_WEEK_START = "2026-07-06"; // a Monday (this suite's own fixture week)

/** Builds a real `HallMapSeat[]` (`weekSeatGrid` + `hallSeatStatus`, the
 *  SAME pure functions `dashboard-state.ts` uses) with bookings only at the
 *  given `(weekday, hour)` -> statuses map — every other seat is free. */
function fixtureSeats(bookingsBySeat: Record<string, BookingStatus[]>): HallMapSeat[] {
  return weekSeatGrid(MONDAY_WEEK_START).map((seat) => {
    const bookings = (bookingsBySeat[`${seat.weekday}-${seat.hour}`] ?? []).map((status) => ({ status }));
    return { ...seat, status: hallSeatStatus(bookings) };
  });
}

function pendingEntryFor(seat: HallMapSeat, requestId = 1): PendingQueueEntry {
  return {
    requestId,
    leadId: 1,
    telegramChatId: "tg-chat-1",
    studentName: "Оксана",
    studentAge: 9,
    brief: "Учень: Оксана\nВік: 9",
    bookingId: 1,
    calendarEventId: null,
    slotStart: `${seat.slotStartIso}:00`,
    slotEnd: `${seat.slotStartIso}:00`,
  };
}

describe("HallMap (dashboard tasks.md §6.7, @trace FR-DASH-03, @trace BC-SCHEDULE-01)", () => {
  it("renders exactly 5 rows x 10 seats (50 total)", () => {
    const seats = fixtureSeats({});
    render(<HallMap seats={seats} pendingQueue={[]} />);

    expect(screen.getAllByTestId("hall-seat")).toHaveLength(50);
  });

  it("each weekday row header shows its calendar date (DD.MM), not just the weekday", () => {
    const seats = fixtureSeats({});
    render(<HallMap seats={seats} pendingQueue={[]} />);
    // MONDAY_WEEK_START = 2026-07-06 -> Monday row shows 06.07, Friday 10.07.
    expect(screen.getByText("06.07")).toBeInTheDocument();
    expect(screen.getByText("10.07")).toBeInTheDocument();
  });

  it("exposes a valid ARIA grid structure (grid > row > rowheader/gridcell)", () => {
    const seats = fixtureSeats({});
    render(<HallMap seats={seats} pendingQueue={[]} />);

    expect(screen.getByRole("grid", { name: "Розклад залу на тиждень" })).toBeInTheDocument();
    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(5);
    expect(screen.getAllByRole("rowheader")).toHaveLength(5);
    // Every seat button is also exposed as a `gridcell` — the same 50 nodes
    // `data-testid="hall-seat"` already asserts on.
    const gridcells = screen.getAllByRole("gridcell");
    expect(gridcells).toHaveLength(50);
    for (const cell of gridcells) {
      expect(cell.getAttribute("data-testid")).toBe("hall-seat");
    }
  });

  it("each seat's rendered status matches hallSeatStatus's verdict", () => {
    const seats = fixtureSeats({
      "1-10": ["pending"],
      "2-11": ["confirmed"],
      "3-12": ["cancelled"],
      "4-13": ["declined"],
    });
    render(<HallMap seats={seats} pendingQueue={[]} />);

    const rendered = screen.getAllByTestId("hall-seat");
    for (const seatEl of rendered) {
      const expectedStatus = seats.find(
        (s) => `${s.weekday}-${s.hour}` === seatEl.getAttribute("data-seat-key"),
      )!.status;
      expect(seatEl.getAttribute("data-status")).toBe(expectedStatus);
    }

    // Spot-check the precedence outcomes explicitly.
    const pendingSeat = rendered.find((el) => el.getAttribute("data-seat-key") === "1-10")!;
    expect(pendingSeat.getAttribute("data-status")).toBe("pending");
    const confirmedSeat = rendered.find((el) => el.getAttribute("data-seat-key") === "2-11")!;
    expect(confirmedSeat.getAttribute("data-status")).toBe("confirmed");
    const cancelledSeat = rendered.find((el) => el.getAttribute("data-seat-key") === "3-12")!;
    expect(cancelledSeat.getAttribute("data-status")).toBe("cancelled");
    // `declined` also renders the `cancelled` (slate) token per baseline spec.
    const declinedSeat = rendered.find((el) => el.getAttribute("data-seat-key") === "4-13")!;
    expect(declinedSeat.getAttribute("data-status")).toBe("cancelled");
  });

  it("clicking a pending seat opens the corresponding request card with DecisionBar", async () => {
    const seats = fixtureSeats({ "1-10": ["pending"] });
    const pendingSeat = seats.find((s) => s.weekday === 1 && s.hour === 10)!;
    const entry = pendingEntryFor(pendingSeat, 42);

    const user = userEvent.setup();
    render(<HallMap seats={seats} pendingQueue={[entry]} />);

    expect(screen.queryByTestId("decision-bar")).not.toBeInTheDocument();

    const seatEl = screen.getAllByTestId("hall-seat").find((el) => el.getAttribute("data-seat-key") === "1-10")!;
    await user.click(seatEl);

    expect(screen.getByTestId("decision-bar")).toBeInTheDocument();
    expect(screen.getByText("Оксана")).toBeInTheDocument();
  });

  it("a booked seat names its occupant in the hover tooltip (aria-label + title), confirmed included", () => {
    const seats = fixtureSeats({ "2-11": ["confirmed"] }).map((seat) =>
      seat.weekday === 2 && seat.hour === 11 ? { ...seat, occupantName: "Марічка" } : seat,
    );
    render(<HallMap seats={seats} pendingQueue={[]} />);

    const seatEl = screen.getAllByTestId("hall-seat").find((el) => el.getAttribute("data-seat-key") === "2-11")!;
    expect(seatEl.getAttribute("aria-label")).toContain("Марічка");
    expect(seatEl.getAttribute("title")).toContain("Марічка");
    expect(seatEl.getAttribute("aria-label")).toContain("підтверджено");
  });

  it("clicking a CONFIRMED seat opens a read-only detail card (student + slot), without a DecisionBar", async () => {
    const seats = fixtureSeats({ "2-11": ["confirmed"] });
    const seat = seats.find((s) => s.weekday === 2 && s.hour === 11)!;
    const confirmedBookings = [
      { requestId: 5, studentName: "Оленка", studentAge: 7, slotStart: `${seat.slotStartIso}:00`, slotEnd: `${seat.slotStartIso}:00` },
    ];
    const user = userEvent.setup();
    render(<HallMap seats={seats} pendingQueue={[]} confirmedBookings={confirmedBookings} />);

    expect(screen.queryByText("Оленка")).not.toBeInTheDocument();
    const seatEl = screen.getAllByTestId("hall-seat").find((el) => el.getAttribute("data-seat-key") === "2-11")!;
    await user.click(seatEl);

    expect(screen.getByText("Оленка")).toBeInTheDocument();
    // Confirmed is a done deal — no teacher decision to make here.
    expect(screen.queryByTestId("decision-bar")).not.toBeInTheDocument();
  });

  it("clicking a free seat opens no request card", async () => {
    const seats = fixtureSeats({});
    const user = userEvent.setup();
    render(<HallMap seats={seats} pendingQueue={[]} />);

    const freeSeat = screen.getAllByTestId("hall-seat")[0]!;
    expect(freeSeat.getAttribute("data-status")).toBe("free");

    await user.click(freeSeat);

    expect(screen.queryByTestId("decision-bar")).not.toBeInTheDocument();
  });

  it("Saturday/Sunday rows are never present", () => {
    const seats = fixtureSeats({});
    render(<HallMap seats={seats} pendingQueue={[]} />);

    expect(screen.queryByText("Сб")).not.toBeInTheDocument();
    expect(screen.queryByText("Нд")).not.toBeInTheDocument();
  });
});
