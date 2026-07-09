// Test-first (red): lib/src/slots/propose.ts's proposeSlots/holdWithRecovery
// bodies are Not-implemented throwing stubs (tasks.md 5.1/5.2's red half) —
// every test below is expected to FAIL against the stub, for the right
// reason (the stub's throw), until 5.1/5.2's green half implements the real
// logic. hold.ts and hold.test.ts are NOT touched by this file — the
// existing 5 hold-lifecycle tests stay exactly as they are.
//
// Contract this test file pins down (spec.md "Calendar API failure degrades
// deterministically", NFR-REL-01, propose.ts's own header contract):
//   - proposeSlots(port, request): on a CalendarPort error (freeBusy) during
//     proposal, returns { status: "calendar_unavailable", apology, retainedRequest }
//     instead of throwing; `apology` is EXACTLY the exported
//     CALENDAR_UNAVAILABLE_APOLOGY constant, produced with no LLM call;
//     `retainedRequest` deep-equals the caller's original request.
//   - holdWithRecovery(port, request): wraps hold.ts's createHold; on a
//     CalendarPort error during the hold (freeBusy re-check OR
//     createTentative), returns { status: "failed", apology, retainedRequest }
//     — no orphan tentative event is created (fake's eventCount stays 0) and
//     the lead's slot choice is preserved for retry. On success, createHold's
//     own "held"/"collision" result passes through unchanged.
//
// `FailingCalendarPort` below is TEST-ONLY infrastructure for this file: a
// thin CalendarPort wrapper around a real FakeCalendarPort (fake-calendar.ts
// is not modified) that can be told to throw on freeBusy and/or
// createTentative, to simulate a Google Calendar API failure without any
// network call.
import { describe, expect, it } from "vitest";
import {
  CALENDAR_UNAVAILABLE_APOLOGY,
  holdWithRecovery,
  proposeSlots,
  type ProposeRequest,
} from "./propose.ts";
import { FakeCalendarPort } from "./fake-calendar.ts";
import {
  CalendarApiError,
  CalendarTimeoutError,
  type BusyInterval,
  type CalendarPort,
} from "./calendar-port.ts";
import type { HoldRequest } from "./hold.ts";
import { kyivWallClockToUtc } from "./timezone.ts";

class FailingCalendarPort implements CalendarPort {
  constructor(
    private readonly inner: FakeCalendarPort,
    private readonly opts: {
      failFreeBusy?: () => never;
      failCreateTentative?: () => never;
    } = {},
  ) {}

  async freeBusy(range: { start: string; end: string }): Promise<BusyInterval[]> {
    if (this.opts.failFreeBusy) {
      this.opts.failFreeBusy();
    }
    return this.inner.freeBusy(range);
  }

  async createTentative(
    slot: { start: string; end: string },
    summary: string,
    description?: string,
  ): Promise<{ eventId: string }> {
    if (this.opts.failCreateTentative) {
      this.opts.failCreateTentative();
    }
    return this.inner.createTentative(slot, summary, description);
  }

  async upgradeToConfirmed(eventId: string, brief: string): Promise<void> {
    return this.inner.upgradeToConfirmed(eventId, brief);
  }

  async deleteEvent(eventId: string): Promise<void> {
    return this.inner.deleteEvent(eventId);
  }

  async busyEventsInRange(
    range: { start: string; end: string },
  ): Promise<{ eventId: string; start: string; end: string }[]> {
    return this.inner.busyEventsInRange(range);
  }

  /** Test-only helper mirroring FakeCalendarPort's own — used to assert "no
   *  orphan event was created" through the wrapper. */
  eventCount(): number {
    return this.inner.eventCount();
  }
}

const A_PROPOSE_REQUEST: ProposeRequest = {
  from: "2026-07-06", // Monday
  days: 14,
  preferences: {
    weekdays: ["Tue", "Thu"],
    timeWindow: { start: "16:00", end: "20:00" },
  },
};

describe("proposeSlots — past-time cutoff (never offer a slot that has already started)", () => {
  // @trace FR-SLOT-01
  it("excludes every slot at or before `now`, so a lead is never offered a time in the past", async () => {
    const port = new FakeCalendarPort(); // all free
    const now = "2026-07-08T14:37"; // Wednesday mid-afternoon (a real clock time, not on a grid hour)
    const result = await proposeSlots(port, {
      from: "2026-07-06",
      days: 14,
      preferences: { weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri"], timeWindow: { start: "10:00", end: "20:00" } },
      now,
    });

    expect(result.status).toBe("ok");
    if (result.status === "ok") {
      expect(result.slots.length).toBeGreaterThan(0);
      for (const slot of result.slots) {
        // ISO "YYYY-MM-DDTHH:mm" compares lexicographically as chronologically.
        expect(slot.start > now).toBe(true);
      }
    }
  });
});

describe("proposeSlots — CALENDAR_UNAVAILABLE_APOLOGY constant (NFR-REL-01, BC-LANG-01, BC-BRAND-01)", () => {
  // @trace NFR-REL-01
  it("is Ukrainian-only: contains no Latin-alphabet (English) letters", () => {
    expect(CALENDAR_UNAVAILABLE_APOLOGY).not.toMatch(/[a-zA-Z]/);
  });

  // @trace NFR-REL-01
  it("kindly invites retrying shortly, with no tech jargon and no pressure vocabulary (DESIGN.md voice rules)", () => {
    expect(CALENDAR_UNAVAILABLE_APOLOGY).toMatch(/спробуйте/i);
    expect(CALENDAR_UNAVAILABLE_APOLOGY).toMatch(/хвилин/i);
    const banned = [
      "API",
      "сервер",
      "помилка з'єднання",
      "останнє місце",
      "тільки сьогодні",
      "поспішайте",
    ];
    for (const phrase of banned) {
      expect(CALENDAR_UNAVAILABLE_APOLOGY).not.toContain(phrase);
    }
  });

  // @trace NFR-REL-01
  it("is a non-empty deterministic string constant, not a function (no LLM/async involvement possible)", () => {
    expect(typeof CALENDAR_UNAVAILABLE_APOLOGY).toBe("string");
    expect(CALENDAR_UNAVAILABLE_APOLOGY.length).toBeGreaterThan(0);
  });
});

describe("proposeSlots — free/busy fetch failure during proposal (5.1)", () => {
  // @trace NFR-REL-01
  it("CalendarTimeoutError during freeBusy: returns calendar_unavailable with the exact apology constant and the retained original request", async () => {
    const port = new FailingCalendarPort(new FakeCalendarPort(), {
      failFreeBusy: () => {
        throw new CalendarTimeoutError();
      },
    });

    const result = await proposeSlots(port, A_PROPOSE_REQUEST);

    expect(result.status).toBe("calendar_unavailable");
    if (result.status === "calendar_unavailable") {
      expect(result.apology).toBe(CALENDAR_UNAVAILABLE_APOLOGY);
      expect(result.retainedRequest).toEqual(A_PROPOSE_REQUEST);
    }
  });

  // @trace NFR-REL-01
  it("CalendarApiError during freeBusy: returns calendar_unavailable with the exact apology constant and the retained original request", async () => {
    const port = new FailingCalendarPort(new FakeCalendarPort(), {
      failFreeBusy: () => {
        throw new CalendarApiError("simulated 500", { status: 500 });
      },
    });

    const result = await proposeSlots(port, A_PROPOSE_REQUEST);

    expect(result.status).toBe("calendar_unavailable");
    if (result.status === "calendar_unavailable") {
      expect(result.apology).toBe(CALENDAR_UNAVAILABLE_APOLOGY);
      expect(result.retainedRequest).toEqual(A_PROPOSE_REQUEST);
    }
  });

  // @trace NFR-REL-01
  it("does not throw or produce an unhandled rejection — resolves cleanly to a calendar_unavailable result", async () => {
    const port = new FailingCalendarPort(new FakeCalendarPort(), {
      failFreeBusy: () => {
        throw new CalendarApiError("simulated 503", { status: 503 });
      },
    });

    await expect(proposeSlots(port, A_PROPOSE_REQUEST)).resolves.toMatchObject({
      status: "calendar_unavailable",
    });
  });

  // @trace NFR-REL-01
  it("succeeds normally (status 'ok') when freeBusy does not fail — the wrapper only intercepts calendar errors", async () => {
    const result = await proposeSlots(new FakeCalendarPort(), A_PROPOSE_REQUEST);
    expect(result.status).toBe("ok");
  });
});

describe("holdWithRecovery — tentative-event creation failure during a hold (5.2)", () => {
  // @trace NFR-REL-01
  // @trace FR-SLOT-02
  it("CalendarTimeoutError during createTentative: booking does not move to pending, no orphan hold event, apology + retained slot choice returned", async () => {
    const port = new FailingCalendarPort(new FakeCalendarPort(), {
      failCreateTentative: () => {
        throw new CalendarTimeoutError();
      },
    });
    const request: HoldRequest = {
      slot: { start: "2026-07-08T15:00", end: "2026-07-08T16:00" }, // Wednesday
      summary: "Пробне заняття — лід",
    };

    const result = await holdWithRecovery(port, request);

    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.apology).toBe(CALENDAR_UNAVAILABLE_APOLOGY);
      expect(result.retainedRequest).toEqual(request);
    }
    // No orphan hold: no tentative event exists without its booking, per
    // spec.md ("no hold exists without its tentative event").
    expect(port.eventCount()).toBe(0);
  });

  // @trace NFR-REL-01
  // @trace FR-SLOT-02
  it("CalendarApiError during createTentative: booking does not move to pending, no orphan hold event, apology + retained slot choice returned", async () => {
    const port = new FailingCalendarPort(new FakeCalendarPort(), {
      failCreateTentative: () => {
        throw new CalendarApiError("simulated 500", { status: 500 });
      },
    });
    const request: HoldRequest = {
      slot: { start: "2026-07-09T11:00", end: "2026-07-09T12:00" }, // Thursday
      summary: "Пробне заняття — лід",
    };

    const result = await holdWithRecovery(port, request);

    expect(result.status).toBe("failed");
    if (result.status === "failed") {
      expect(result.apology).toBe(CALENDAR_UNAVAILABLE_APOLOGY);
      expect(result.retainedRequest).toEqual(request);
    }
    expect(port.eventCount()).toBe(0);
  });

  // @trace NFR-REL-01
  it("does not throw or produce an unhandled rejection — resolves cleanly to a failed result", async () => {
    const port = new FailingCalendarPort(new FakeCalendarPort(), {
      failCreateTentative: () => {
        throw new CalendarTimeoutError();
      },
    });

    await expect(
      holdWithRecovery(port, {
        slot: { start: "2026-07-10T13:00", end: "2026-07-10T14:00" }, // Friday
        summary: "Пробне заняття",
      }),
    ).resolves.toMatchObject({ status: "failed" });
  });

  // @trace FR-SLOT-02
  it("passes through createHold's 'held' result unchanged when there is no calendar failure", async () => {
    const port = new FakeCalendarPort();
    const request: HoldRequest = {
      slot: { start: "2026-07-08T17:00", end: "2026-07-08T18:00" }, // Wednesday
      summary: "Пробне заняття",
    };

    const result = await holdWithRecovery(port, request);

    expect(result.status).toBe("held");
    expect(port.eventCount()).toBe(1);
  });

  // @trace FR-SLOT-02
  it("passes through createHold's 'collision' result unchanged when there is no calendar failure", async () => {
    const inner = new FakeCalendarPort();
    const collidingSlot = { start: "2026-07-10T10:00", end: "2026-07-10T11:00" }; // Friday
    // A manual calendar event already occupies the exact requested interval
    // (spec.md "hold collision" scenario) — no failure injection needed,
    // this exercises the wrapper's success-path pass-through of "collision".
    inner.addManualBusy({
      start: kyivWallClockToUtc(collidingSlot.start),
      end: kyivWallClockToUtc(collidingSlot.end),
    });
    const port = new FailingCalendarPort(inner, {});
    const request: HoldRequest = { slot: collidingSlot, summary: "Пробне заняття" };

    const result = await holdWithRecovery(port, request);

    expect(result.status).toBe("collision");
    expect(port.eventCount()).toBe(0);
  });
});
