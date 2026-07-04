import { describe, expect, it } from "vitest";

import { formatHotelName } from "@/lib/poi/format-hotel-name";

describe("formatHotelName", () => {
  it("prefers the primary name tag", () => {
    expect(formatHotelName({ name: "Hotel Kyiv", brand: "Hilton" })).toBe(
      "Hotel Kyiv",
    );
  });

  it("falls back to Ukrainian name, brand, then default label", () => {
    expect(formatHotelName({ "name:uk": "Готель Україна" })).toBe(
      "Готель Україна",
    );
    expect(formatHotelName({ brand: "Radisson" })).toBe("Radisson");
    expect(formatHotelName({})).toBe("Готель");
  });
});
