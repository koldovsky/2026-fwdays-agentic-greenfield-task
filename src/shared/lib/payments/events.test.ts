// Event wire-format tests: serialize/parse round-trip and calm rejection of
// malformed webhook bodies (NFR-OBS-01 — parse returns null, never throws).
import { describe, expect, it } from "vitest";
import { parsePaymentsEvent, serializePaymentsEvent } from "./events";
import type { PaymentsEvent } from "./types";

const EVENT: PaymentsEvent = {
  id: "evt_1",
  type: "checkout.completed",
  userId: "u1",
  plan: "pro",
  occurredAt: "2026-07-03T00:00:00.000Z",
};

describe("serializePaymentsEvent / parsePaymentsEvent", () => {
  it("round-trips a valid event", () => {
    expect(parsePaymentsEvent(serializePaymentsEvent(EVENT))).toEqual(EVENT);
  });

  it("returns null for non-JSON input", () => {
    expect(parsePaymentsEvent("not json")).toBeNull();
  });

  it("returns null for JSON that is not an object", () => {
    expect(parsePaymentsEvent('"checkout.completed"')).toBeNull();
    expect(parsePaymentsEvent("null")).toBeNull();
  });

  it("returns null for an unknown event type", () => {
    expect(
      parsePaymentsEvent(JSON.stringify({ ...EVENT, type: "checkout.hacked" })),
    ).toBeNull();
  });

  it("returns null for an unknown plan", () => {
    expect(parsePaymentsEvent(JSON.stringify({ ...EVENT, plan: "enterprise" }))).toBeNull();
  });

  it("returns null for missing or empty required fields", () => {
    expect(parsePaymentsEvent(JSON.stringify({ ...EVENT, id: "" }))).toBeNull();
    expect(parsePaymentsEvent(JSON.stringify({ ...EVENT, userId: undefined }))).toBeNull();
    expect(parsePaymentsEvent(JSON.stringify({ ...EVENT, occurredAt: "someday" }))).toBeNull();
  });
});
