// Test-first (red): lib/src/slots/hold.ts's createHold/releaseHold bodies
// are Not-implemented throwing stubs (tasks.md 4.2's red half) — every test
// below is expected to FAIL against the stub, for the right reason (the
// stub's throw), until 4.2's green half implements the real logic.
//
// Contract this test file pins down (design.md Decision 1 §"hold-lifecycle
// semantics", Decision 4, spec.md "Choosing a slot creates a soft hold..."):
//   - createHold(port, { slot, summary, description? }) re-checks
//     port.freeBusy() for exactly `slot` before creating a tentative event.
//   - No collision -> port.createTentative(...) is called, booking would
//     move to `pending` (owned by the caller), result is
//     { status: "held", eventId }.
//   - Collision (a manually-created event OR another lead's now-existing
//     tentative event occupying the interval) -> NO createTentative call,
//     result is { status: "collision" } — same code path for both variants
//     (spec.md's hold-race scenario is explicitly "the same code path as
//     the manual-event collision above").
//   - releaseHold(port, eventId) deletes the tentative event, freeing the
//     slot for subsequent freeBusy checks (spec.md "delete on cancel").
import { describe, expect, it } from "vitest";
import { createHold, releaseHold } from "./hold.ts";
import { FakeCalendarPort } from "./fake-calendar.ts";
import { kyivWallClockToUtc } from "./timezone.ts";

describe("createHold", () => {
  // @trace FR-SLOT-02
  it("moves a slot to held when free/busy is re-checked clean and no collision is found", async () => {
    const port = new FakeCalendarPort();

    const result = await createHold(port, {
      slot: { start: "2026-07-08T15:00", end: "2026-07-08T16:00" }, // Wednesday
      summary: "Пробне заняття — лід",
      description: "Заброньовано агентом, очікує підтвердження вчителя",
    });

    expect(result.status).toBe("held");
    if (result.status === "held") {
      expect(typeof result.eventId).toBe("string");
      expect(result.eventId.length).toBeGreaterThan(0);
      // The tentative event is real in the fake calendar, for exactly that
      // interval — subsequent free-slot computations must see it as busy.
      const event = port.getEvent(result.eventId);
      expect(event).toBeDefined();
      expect(event?.status).toBe("tentative");
    }
    expect(port.eventCount()).toBe(1);
  });

  // @trace FR-SLOT-02
  it("hold collision: a manual calendar event appeared over the slot since the offer was computed — no tentative event is created, booking does not move to pending", async () => {
    const port = new FakeCalendarPort();
    const slot = { start: "2026-07-08T15:00", end: "2026-07-08T16:00" }; // Wednesday

    // The teacher manually added an event over this exact interval AFTER
    // the free-slot proposal was computed (spec.md "hold collision" scenario).
    port.addManualBusy({
      start: kyivWallClockToUtc(slot.start),
      end: kyivWallClockToUtc(slot.end),
    });

    const result = await createHold(port, {
      slot,
      summary: "Пробне заняття — лід",
    });

    expect(result.status).toBe("collision");
    expect(result).not.toHaveProperty("eventId");
    // No tentative event was created for the colliding lead.
    expect(port.eventCount()).toBe(0);
  });

  // @trace FR-SLOT-02
  it("hold race: two leads pick the same offered slot concurrently — lead A's hold succeeds, lead B's re-check then finds lead A's tentative event and collides on the SAME code path as a manual-event collision", async () => {
    const port = new FakeCalendarPort();
    const slot = { start: "2026-07-09T11:00", end: "2026-07-09T12:00" }; // Thursday

    const leadA = await createHold(port, {
      slot,
      summary: "Пробне заняття — лід А",
    });
    expect(leadA.status).toBe("held");

    // Lead B's hold code re-checks free/busy before creating its own
    // tentative event and finds lead A's now-existing tentative event.
    const leadB = await createHold(port, {
      slot,
      summary: "Пробне заняття — лід Б",
    });

    expect(leadB.status).toBe("collision");
    // Lead A's hold and tentative event are unaffected.
    expect(port.eventCount()).toBe(1);
    if (leadA.status === "held") {
      expect(port.getEvent(leadA.eventId)?.status).toBe("tentative");
    }
  });

  // @trace FR-SLOT-02
  it("does not call createTentative at all when a collision is detected (no orphan event, no partial hold)", async () => {
    const port = new FakeCalendarPort();
    const slot = { start: "2026-07-10T13:00", end: "2026-07-10T14:00" }; // Friday
    port.addManualBusy({
      start: kyivWallClockToUtc(slot.start),
      end: kyivWallClockToUtc(slot.end),
    });

    const before = port.eventCount();
    await createHold(port, { slot, summary: "Пробне заняття" });
    const after = port.eventCount();

    expect(after).toBe(before);
  });
});

describe("releaseHold", () => {
  // @trace FR-SLOT-02
  it("delete on cancel: releasing a held slot removes the tentative event and frees the slot again", async () => {
    const port = new FakeCalendarPort();
    const slot = { start: "2026-07-08T17:00", end: "2026-07-08T18:00" }; // Wednesday

    const held = await createHold(port, { slot, summary: "Пробне заняття" });
    expect(held.status).toBe("held");
    if (held.status !== "held") return;

    await releaseHold(port, held.eventId);

    expect(port.getEvent(held.eventId)).toBeUndefined();
    expect(port.eventCount()).toBe(0);

    // The slot is free again — a subsequent hold attempt for the same
    // interval must succeed (no lingering collision from the cancelled hold).
    const rebooked = await createHold(port, { slot, summary: "Інший лід" });
    expect(rebooked.status).toBe("held");
  });
});
