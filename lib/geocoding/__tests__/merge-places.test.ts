import { describe, expect, it } from "vitest";

import { mergeAndRankPlaces } from "@/lib/geocoding/merge-places";
import type { GeocodedPlace } from "@/lib/geocoding/types";

const kyiv: GeocodedPlace = {
  id: "1",
  name: "Київ",
  region: "",
  country: "Україна",
  lat: 50.45,
  lon: 30.52,
};

const kentucky: GeocodedPlace = {
  id: "2",
  name: "Кентуккі",
  region: "",
  country: "Сполучені Штати Америки",
  lat: 37.5,
  lon: -85.3,
};

const paris: GeocodedPlace = {
  id: "3",
  name: "Париж",
  region: "Іль-де-Франс",
  country: "Франція",
  lat: 48.86,
  lon: 2.32,
};

describe("mergeAndRankPlaces", () => {
  it("prefers prefix matches for partial Ukrainian queries", () => {
    const results = mergeAndRankPlaces([kentucky], [kyiv], "Ки");

    expect(results[0]?.name).toBe("Київ");
  });

  it("uses Nominatim labels when coordinates overlap Photon", () => {
    const photonParisWrong: GeocodedPlace = {
      id: "photon",
      name: "Париж",
      region: "",
      country: "Россия",
      lat: 48.8588897,
      lon: 2.320041,
    };

    const results = mergeAndRankPlaces([paris], [photonParisWrong], "Париж");

    expect(results).toHaveLength(1);
    expect(results[0]?.country).toBe("Франція");
  });

  it("returns Photon cities when Nominatim has no prefix match", () => {
    const lviv: GeocodedPlace = {
      id: "4",
      name: "Львів",
      region: "",
      country: "Україна",
      lat: 49.84,
      lon: 24.03,
    };

    const results = mergeAndRankPlaces([], [lviv], "Льв");

    expect(results[0]?.name).toBe("Львів");
  });
});
