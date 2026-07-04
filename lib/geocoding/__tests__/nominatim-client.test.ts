import { describe, expect, it } from "vitest";

import { normalizeNominatimResult } from "@/lib/geocoding/nominatim-client";

describe("normalizeNominatimResult", () => {
  it("maps Ukrainian labels for international cities", () => {
    const place = normalizeNominatimResult(
      {
        place_id: 97554783,
        lat: "48.8588897",
        lon: "2.3200410",
        name: "Париж",
        address: {
          city: "Париж",
          state: "Іль-де-Франс",
          country: "Франція",
        },
      },
      0,
    );

    expect(place).toEqual({
      id: "97554783",
      name: "Париж",
      region: "Іль-де-Франс",
      country: "Франція",
      lat: 48.8588897,
      lon: 2.320041,
    });
  });

  it("keeps Ukrainian domestic places", () => {
    const place = normalizeNominatimResult(
      {
        place_id: 421866528,
        lat: "50.4500336",
        lon: "30.5241361",
        name: "Київ",
        address: {
          city: "Київ",
          country: "Україна",
        },
      },
      0,
    );

    expect(place?.name).toBe("Київ");
    expect(place?.country).toBe("Україна");
  });

  it("returns null for invalid coordinates", () => {
    expect(normalizeNominatimResult({ lat: "bad", lon: "2" }, 0)).toBeNull();
  });
});
