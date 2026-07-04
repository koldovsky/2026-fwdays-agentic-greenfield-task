import { describe, expect, it } from "vitest";

import { formatFuelStationName } from "@/lib/poi/format-fuel-station-name";

describe("formatFuelStationName", () => {
  it("prefers the primary name tag", () => {
    expect(formatFuelStationName({ name: "WOG", brand: "WOG" })).toBe("WOG");
  });

  it("falls back to Ukrainian name, brand, then default label", () => {
    expect(formatFuelStationName({ "name:uk": "ОККО" })).toBe("ОККО");
    expect(formatFuelStationName({ brand: "Shell" })).toBe("Shell");
    expect(formatFuelStationName({})).toBe("АЗС");
  });
});
