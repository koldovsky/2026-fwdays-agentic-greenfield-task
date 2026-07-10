import { describe, expect, it } from "vitest";
import {
  allFooterJokesValidTone,
  buildFooterJokeSeed,
  pickFooterJoke,
} from "./jokes";

const sampleLocation = {
  id: 1,
  name: "Львів",
  latitude: 49.84,
  longitude: 24.03,
  countryCode: "UA",
  country: "Україна",
  region: "Львівська область",
  timezone: "Europe/Kyiv",
  population: 717000,
  label: "Львів, Україна",
  flag: "🇺🇦",
};

// @trace FR-JOKES-01
describe("pickFooterJoke", () => {
  it("returns the same joke for the same location and date seed", () => {
    const seed = buildFooterJokeSeed(sampleLocation, new Date("2026-06-27T12:00:00.000Z"));

    expect(pickFooterJoke(seed)).toBe(pickFooterJoke(seed));
  });

  it("can vary jokes across different location seeds", () => {
    const jokes = new Set(
      [0, 1, 2, 3, 4, 5, 6, 7].map((index) =>
        pickFooterJoke({
          latitude: 40 + index,
          longitude: 20 + index,
          date: "2026-06-27",
          name: "Місто",
        }),
      ),
    );

    expect(jokes.size).toBeGreaterThan(1);
  });

  it("keeps calm Ukrainian jokes without exclamation marks", () => {
    expect(allFooterJokesValidTone()).toBe(true);
  });
});
