import { describe, expect, it } from "vitest";

import { segmentRoute } from "@/lib/route-engine/segment-route";
import { densePolyline } from "@/lib/route-engine/__tests__/fixtures";

describe("segmentRoute performance (NFR-PERF-02)", () => {
  it("segments a dense polyline in under 50 ms", () => {
    const polyline = densePolyline(2000, 0.5);
    const start = performance.now();
    const result = segmentRoute({
      polyline,
      restKm: 150,
      dayKm: 400,
    });
    const elapsedMs = performance.now() - start;

    expect(result.ok).toBe(true);
    expect(elapsedMs).toBeLessThan(50);
  });
});
