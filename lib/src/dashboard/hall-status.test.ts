// Test-first (red): lib/src/dashboard/hall-status.ts is a typed throwing
// stub — `hallSeatStatus` is not implemented yet (tasks.md section 2.1).
//
// Contract this test file pins down (design.md Decision 3, baseline spec's
// HallMap requirement "Concert-hall week schedule"):
//   `hallSeatStatus(bookings: { status: BookingStatus }[]) -> SeatStatus` is
//   PURE and resolves ONE seat's rendered color from ALL of its bookings
//   this week by precedence, highest wins:
//     confirmed > pending > cancelled/declined (both render "cancelled") > free
//   A seat whose only bookings are released (cancelled/declined) renders
//   "cancelled" — it NEVER reverts to "free".
import { describe, expect, it } from "vitest";
import { hallSeatStatus } from "./hall-status.ts";

describe("hallSeatStatus (FR-DASH-03)", () => {
  // @trace FR-DASH-03
  it("renders \"free\" for a seat with zero bookings", () => {
    expect(hallSeatStatus([])).toBe("free");
  });

  // @trace FR-DASH-03
  it("renders \"cancelled\" for a seat whose only booking is cancelled — never reverts to free", () => {
    expect(hallSeatStatus([{ status: "cancelled" }])).toBe("cancelled");
  });

  // @trace FR-DASH-03
  it("renders \"cancelled\" for a seat whose only booking is declined — never reverts to free", () => {
    expect(hallSeatStatus([{ status: "declined" }])).toBe("cancelled");
  });

  // @trace FR-DASH-03
  it("renders \"pending\" for a seat with both a cancelled and a pending booking (pending beats cancelled)", () => {
    expect(hallSeatStatus([{ status: "cancelled" }, { status: "pending" }])).toBe("pending");
  });

  // @trace FR-DASH-03
  it("renders \"confirmed\" for a seat with both a pending and a confirmed booking (confirmed beats pending)", () => {
    expect(hallSeatStatus([{ status: "pending" }, { status: "confirmed" }])).toBe("confirmed");
  });

  // @trace FR-DASH-03
  it("full precedence table: confirmed > pending > cancelled/declined > free, regardless of input order", () => {
    // confirmed wins over every other status present, in any order.
    expect(
      hallSeatStatus([
        { status: "declined" },
        { status: "confirmed" },
        { status: "pending" },
        { status: "cancelled" },
      ]),
    ).toBe("confirmed");

    // pending wins over cancelled/declined when no confirmed booking exists.
    expect(hallSeatStatus([{ status: "declined" }, { status: "pending" }])).toBe("pending");
    expect(hallSeatStatus([{ status: "cancelled" }, { status: "pending" }])).toBe("pending");

    // cancelled/declined (both slate) win over free (i.e. over having no
    // higher-precedence booking) when that is all a seat has.
    expect(hallSeatStatus([{ status: "cancelled" }, { status: "declined" }])).toBe("cancelled");
  });
});
