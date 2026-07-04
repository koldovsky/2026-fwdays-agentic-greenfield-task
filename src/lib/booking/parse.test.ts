import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseBookingRequest } from "./parse.ts";
import { validateParsedBooking } from "./validate-rules.ts";

const REF = new Date(2026, 6, 3); // 2026-07-03 Friday

describe("parseBookingRequest", () => {
  it("parses between 12 AM and 1 PM window", () => {
    const parsed = parseBookingRequest(
      "Monday between 12 AM and 1 PM 1 slot",
      "tennis",
      REF,
    );

    assert.equal(parsed.windowStart, "00:00");
    assert.equal(parsed.windowEnd, "13:00");
    assert.equal(parsed.slotsRequested, 1);
    assert.equal(
      parsed.ambiguities.some((a) => a.includes("No time window detected")),
      false,
    );
  });

  it("parses screenshot example — Monday next week 11 AM to 12 AM", () => {
    const parsed = parseBookingRequest(
      "Monday next week from 11 AM to 12 AM for 1 slot",
      "tennis",
      REF,
    );

    assert.equal(parsed.date, "2026-07-06");
    assert.equal(parsed.windowStart, "11:00");
    assert.equal(parsed.windowEnd, "12:00");
    assert.equal(parsed.slotDurationMinutes, 45);
    assert.equal(parsed.slotsRequested, 1);
    assert.equal(parsed.courtOrSite, null);
    assert.ok(parsed.ambiguities.some((a) => a.includes("12 AM")));
  });

  it("extracts East court", () => {
    const parsed = parseBookingRequest(
      "Friday morning tennis on East court",
      "tennis",
      REF,
    );
    assert.equal(parsed.courtOrSite, "East Court");
  });

  it("defaults picnic duration to 210 minutes", () => {
    const parsed = parseBookingRequest(
      "July 12 afternoon picnic for 20 people",
      "picnic",
      REF,
    );
    assert.equal(parsed.slotDurationMinutes, 210);
  });
});

describe("validateParsedBooking", () => {
  it("accepts screenshot tennis request on 2026-07-03 reference", () => {
    const parsed = parseBookingRequest(
      "Monday next week from 11 AM to 12 AM for 1 slot",
      "tennis",
      REF,
    );
    const result = validateParsedBooking(parsed, REF);
    assert.equal(result.ok, true);
  });

  it("rejects same-day tennis", () => {
    const parsed = parseBookingRequest("today at 10 AM", "tennis", REF);
    parsed.date = "2026-07-03";
    const result = validateParsedBooking(parsed, REF);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.code === "BC-MHOA-TENNIS-05"));
  });

  it("rejects beyond 7-day advance", () => {
    const parsed = parseBookingRequest("Monday next week", "tennis", REF);
    parsed.date = "2026-07-15";
    const result = validateParsedBooking(parsed, REF);
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.code === "BC-MHOA-TENNIS-04"));
  });
});
