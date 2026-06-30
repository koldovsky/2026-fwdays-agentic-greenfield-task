import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchHistory } from "./fetchHistory";

const VALID_BODY = [
  { exchangedate: "30.06.2026", cc: "USD", rate: 44.8478 },
  { exchangedate: "29.06.2026", cc: "USD", rate: 44.8596 },
];

function stubFetch(impl: typeof fetch) {
  vi.stubGlobal("fetch", impl);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

/** @trace FR-HISTORY-02 FR-HISTORY-03 */
describe("fetchHistory", () => {
  it("returns ok:true with mapped points on a valid 200 response", async () => {
    stubFetch(
      vi.fn(async () => new Response(JSON.stringify(VALID_BODY), { status: 200 })) as unknown as typeof fetch,
    );
    const result = await fetchHistory("USD", new Date("2026-06-30T10:00:00Z"));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.points).toHaveLength(2);
  });

  it("requests the correct ~30-day window and currency code", async () => {
    let capturedUrl = "";
    stubFetch(vi.fn(async (input: RequestInfo | URL) => {
      capturedUrl = String(input);
      return new Response(JSON.stringify(VALID_BODY), { status: 200 });
    }) as unknown as typeof fetch);
    await fetchHistory("USD", new Date("2026-06-30T10:00:00Z"));
    expect(capturedUrl).toContain("start=20260601");
    expect(capturedUrl).toContain("end=20260630");
    expect(capturedUrl).toContain("valcode=USD");
  });

  it("returns ok:false on a non-200 response", async () => {
    stubFetch(
      vi.fn(async () => new Response("server error", { status: 500 })) as unknown as typeof fetch,
    );
    expect(await fetchHistory("USD", new Date())).toEqual({ ok: false });
  });

  it("returns ok:false when fetch rejects (network error)", async () => {
    stubFetch(vi.fn(async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch);
    expect(await fetchHistory("USD", new Date())).toEqual({ ok: false });
  });

  it("returns ok:false on malformed JSON", async () => {
    stubFetch(
      vi.fn(async () => new Response("not json", { status: 200 })) as unknown as typeof fetch,
    );
    expect(await fetchHistory("USD", new Date())).toEqual({ ok: false });
  });

  it("returns ok:true with an empty points array on a genuinely empty 200 response (FR-HISTORY-03: distinct from a failure)", async () => {
    stubFetch(
      vi.fn(async () => new Response(JSON.stringify([]), { status: 200 })) as unknown as typeof fetch,
    );
    expect(await fetchHistory("ZZZ", new Date())).toEqual({ ok: true, points: [] });
  });

  it("never throws, even on an unexpected exception", async () => {
    stubFetch(vi.fn(async () => {
      throw new TypeError("boom");
    }) as unknown as typeof fetch);
    await expect(fetchHistory("USD", new Date())).resolves.toEqual({ ok: false });
  });
});
