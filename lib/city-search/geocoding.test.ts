import { describe, expect, it } from "vitest";
import {
  buildGeocodingUrl,
  countryCodeToFlag,
  getEnterAutoSelection,
  normalizeGeocodingResponse,
  selectedLocationToSearchParams,
  shouldRequestGeocoding,
} from "./geocoding";
import { uk } from "@/lib/i18n/uk";

const rawBerlin = {
  id: 2950159,
  name: "Berlin",
  latitude: 52.52437,
  longitude: 13.41053,
  country_code: "DE",
  country: "Німеччина",
  admin1: "Berlin",
  timezone: "Europe/Berlin",
  population: 3426354,
};

describe("city-search geocoding helpers", () => {
  // @trace FR-SEARCH-01
  it("skips short queries and builds Open-Meteo geocoding URLs", () => {
    expect(buildGeocodingUrl("")).toBeNull();
    expect(buildGeocodingUrl("L")).toBeNull();

    const url = buildGeocodingUrl("Львів");

    expect(url?.origin).toBe("https://geocoding-api.open-meteo.com");
    expect(url?.pathname).toBe("/v1/search");
    expect(url?.searchParams.get("name")).toBe("Львів");
    expect(url?.searchParams.get("count")).toBe("5");
    expect(url?.searchParams.get("language")).toBe("uk");
    expect(url?.searchParams.get("format")).toBe("json");
    expect(shouldRequestGeocoding("Львів")).toBe(true);
  });

  // @trace FR-SEARCH-02
  it("normalizes suggestions with readable labels and optional flags", () => {
    const [location] = normalizeGeocodingResponse({ results: [rawBerlin] });

    expect(location).toMatchObject({
      id: 2950159,
      name: "Berlin",
      latitude: 52.52437,
      longitude: 13.41053,
      countryCode: "DE",
      country: "Німеччина",
      region: "Berlin",
      timezone: "Europe/Berlin",
      label: "Berlin, Berlin, Німеччина",
      flag: "🇩🇪",
    });
    expect(countryCodeToFlag("UA")).toBe("🇺🇦");
    expect(countryCodeToFlag("")).toBeNull();
  });

  // @trace FR-SEARCH-03
  it("serializes selected locations to URL search params", () => {
    const [location] = normalizeGeocodingResponse({ results: [rawBerlin] });
    const params = selectedLocationToSearchParams(location);

    expect(params.toString()).toBe("lat=52.52437&lon=13.41053&name=Berlin");
    expect(shouldRequestGeocoding("Berlin", location)).toBe(false);
  });

  // @trace FR-SEARCH-04
  it("auto-selects only one visible suggestion on Enter", () => {
    const [location] = normalizeGeocodingResponse({ results: [rawBerlin] });

    expect(getEnterAutoSelection([location])).toBe(location);
    expect(getEnterAutoSelection([location, { ...location, id: 2 }])).toBeNull();
    expect(getEnterAutoSelection([])).toBeNull();
  });

  // @trace FR-SEARCH-05
  it("keeps empty-result feedback inline and Ukrainian-first", () => {
    expect(normalizeGeocodingResponse({}).length).toBe(0);
    expect(normalizeGeocodingResponse({ results: [] }).length).toBe(0);
    expect(uk.citySearch.emptyResults).toBe("Нічого не знайдено");
  });
});
