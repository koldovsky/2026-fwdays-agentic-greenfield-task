// tests/integration/slots — task 5.4: calendar-outage path against a
// deliberately broken credential path, exercised end-to-end through the
// REAL googleapis SDK stack (a genuine ENOENT reading a nonexistent
// service-account key file, then google-auth-library/googleapis's own
// error surface) — not just propose.test.ts's in-memory
// FakeCalendarPort-throws-on-demand fixture. Confirms NFR-REL-01's
// deterministic apology path fires end-to-end.
//
// Never touches the real `.env`: the broken path is passed as a
// `GoogleCalendarPort` constructor override (buildGoogleCalendarPort's
// `overrides` param) — every other test file's real credentials stay
// untouched.
import { describe, expect, it } from "vitest";
import { CALENDAR_UNAVAILABLE_APOLOGY, proposeSlots } from "@kamerton/lib/src/slots/propose.ts";
import { buildGoogleCalendarPort, requireEnv } from "./helpers/env";

const A_REQUEST = {
  from: "2026-08-03", // any future Monday — the request never reaches a live network call successfully.
  days: 14,
  preferences: {
    weekdays: ["Tue", "Thu"],
    timeWindow: { start: "16:00", end: "20:00" },
  },
};

function buildBrokenPort() {
  return buildGoogleCalendarPort({
    keyFile: "/nonexistent/path/kamerton-itest-broken-key.json",
    calendarId: requireEnv("GOOGLE_CALENDAR_ID"),
  });
}

describe("proposeSlots — real calendar-outage path via a broken credential file (5.4)", () => {
  // @trace NFR-REL-01
  it("returns calendar_unavailable with the exact deterministic apology and the retained request", async () => {
    const result = await proposeSlots(buildBrokenPort(), A_REQUEST);

    expect(result.status).toBe("calendar_unavailable");
    if (result.status === "calendar_unavailable") {
      expect(result.apology).toBe(CALENDAR_UNAVAILABLE_APOLOGY);
      expect(result.retainedRequest).toEqual(A_REQUEST);
    }
  });

  // @trace NFR-REL-01
  it("produces no unhandled promise rejection even though the underlying SDK call fails", async () => {
    let unhandled: unknown;
    const onUnhandledRejection = (reason: unknown): void => {
      unhandled = reason;
    };
    process.on("unhandledRejection", onUnhandledRejection);

    try {
      const result = await proposeSlots(buildBrokenPort(), A_REQUEST);
      expect(result.status).toBe("calendar_unavailable");
      // Give the microtask/macrotask queue a tick — if the SDK stack left
      // any dangling rejected promise uncaught, it surfaces here.
      await new Promise((resolve) => setTimeout(resolve, 50));
    } finally {
      process.off("unhandledRejection", onUnhandledRejection);
    }

    expect(unhandled).toBeUndefined();
  });
});
