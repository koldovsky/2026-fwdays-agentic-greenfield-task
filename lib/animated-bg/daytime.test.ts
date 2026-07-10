import { describe, expect, it } from "vitest";
import { isLocationDaytime } from "./daytime";

// @trace FR-ANIM-02
describe("isLocationDaytime", () => {
  const sunrise = "2026-06-27T05:02";
  const sunset = "2026-06-27T21:11";

  it("returns true at local noon for the location timezone", () => {
    const noon = new Date("2026-06-27T10:00:00.000Z");

    expect(isLocationDaytime(noon, sunrise, sunset, "Europe/Kyiv")).toBe(true);
  });

  it("returns false after local sunset for the location timezone", () => {
    const lateEvening = new Date("2026-06-27T20:00:00.000Z");

    expect(isLocationDaytime(lateEvening, sunrise, sunset, "Europe/Kyiv")).toBe(false);
  });

  it("defaults to daytime when sun times are missing", () => {
    expect(isLocationDaytime(new Date(), null, null, "Europe/Kyiv")).toBe(true);
  });
});
