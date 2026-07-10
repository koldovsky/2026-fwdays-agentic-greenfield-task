import { describe, expect, it } from "vitest";
import type { CityLocation } from "@/lib/city-search/geocoding";
import {
  addPinnedCity,
  canPinCity,
  isPinned,
  MAX_PINNED_CITIES,
  removePinnedCity,
} from "./pins";

const kyiv: CityLocation = {
  id: 703448,
  name: "Kyiv",
  latitude: 50.45466,
  longitude: 30.5238,
  countryCode: "UA",
  country: "Україна",
  region: "Kyiv",
  timezone: "Europe/Kyiv",
  population: 2797553,
  label: "Kyiv, Kyiv, Україна",
  flag: "🇺🇦",
};

const lviv: CityLocation = {
  ...kyiv,
  id: 702550,
  name: "Lviv",
  latitude: 49.8397,
  longitude: 24.0297,
  label: "Lviv, Lviv, Україна",
};
const odesa: CityLocation = {
  ...kyiv,
  id: 698740,
  name: "Odesa",
  latitude: 46.4825,
  longitude: 30.7233,
  label: "Odesa, Odesa, Україна",
};
const kharkiv: CityLocation = {
  ...kyiv,
  id: 706483,
  name: "Kharkiv",
  latitude: 49.9935,
  longitude: 36.2304,
  label: "Kharkiv, Kharkiv, Україна",
};

describe("weekend compare pins", () => {
  // @trace FR-COMPARE-01
  it("adds up to three unique pinned cities", () => {
    expect(MAX_PINNED_CITIES).toBe(3);
    expect(canPinCity([])).toBe(true);

    const one = addPinnedCity([], kyiv);
    const two = addPinnedCity(one, lviv);
    const three = addPinnedCity(two, odesa);
    const blocked = addPinnedCity(three, kharkiv);

    expect(one).toHaveLength(1);
    expect(three).toHaveLength(3);
    expect(blocked).toHaveLength(3);
    expect(isPinned(three, kyiv)).toBe(true);
    expect(addPinnedCity(one, kyiv)).toEqual(one);
  });

  // @trace FR-COMPARE-01
  it("removes pinned cities by coordinate key", () => {
    const pinned = addPinnedCity(addPinnedCity([], kyiv), lviv);
    const next = removePinnedCity(pinned, kyiv);

    expect(next).toEqual([lviv]);
  });
});
