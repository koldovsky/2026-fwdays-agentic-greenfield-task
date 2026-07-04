import { afterEach, describe, expect, it, vi } from "vitest";

import type { RouteConfig } from "@/lib/route-config/types";
import { planRoute } from "@/lib/routing/plan-route";
import osrmFixture from "@/lib/routing/__tests__/fixtures/osrm-route.json";

const validConfig: RouteConfig = {
  start: {
    id: "start",
    name: "Київ",
    region: "Київ",
    country: "Україна",
    lat: 50,
    lon: 30,
  },
  end: {
    id: "end",
    name: "Північ",
    region: "Test",
    country: "Україна",
    lat: 50.9,
    lon: 30,
  },
  restKm: 150,
  dayKm: 400,
};

describe("planRoute", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns an itinerary when OSRM responds successfully", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string) => {
        if (url.includes("overpass-api.de")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ elements: [] }),
          });
        }

        return Promise.resolve({
          ok: true,
          json: async () => osrmFixture,
        });
      }),
    );

    const result = await planRoute(validConfig);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.itinerary.totalDistanceKm).toBeGreaterThan(0);
      expect(result.itinerary.totalDays).toBeGreaterThanOrEqual(1);
      expect(result.itinerary.stops[0].kind).toBe("start");
    }
  });

  it("returns a structured error when OSRM responds with HTTP failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      }),
    );

    const result = await planRoute(validConfig);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("HTTP_ERROR");
    }
  });

  it("returns a structured error when OSRM returns no routes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ code: "Ok", routes: [] }),
      }),
    );

    const result = await planRoute(validConfig);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("NO_ROUTE");
    }
  });

  it("returns a structured error when start or end is missing", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await planRoute({
      ...validConfig,
      start: null,
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("INVALID_CONFIG");
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
