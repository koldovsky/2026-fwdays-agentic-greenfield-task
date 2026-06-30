import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchTodayRates } from "./fetchTodayRates";

const VALID_BODY = [
  { cc: "USD", txt: "Долар США", rate: 44.9229, exchangedate: "30.06.2026" },
  { cc: "EUR", txt: "Євро", rate: 51.1669, exchangedate: "30.06.2026" },
];

function stubFetch(impl: typeof fetch) {
  vi.stubGlobal("fetch", impl);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

/** @trace FR-RATES-01 FR-RATES-05 */
describe("fetchTodayRates", () => {
  it("returns ok:true with mapped rates on a valid 200 response", async () => {
    stubFetch(
      vi.fn(async () => new Response(JSON.stringify(VALID_BODY), { status: 200 })) as unknown as typeof fetch,
    );
    const result = await fetchTodayRates();
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.exchangeDate).toBe("30.06.2026");
      expect(result.rates.map((r) => r.code)).toEqual(["EUR", "USD"]);
    }
  });

  it("returns ok:false on a non-200 response", async () => {
    stubFetch(
      vi.fn(async () => new Response("server error", { status: 500 })) as unknown as typeof fetch,
    );
    expect(await fetchTodayRates()).toEqual({ ok: false });
  });

  it("returns ok:false when fetch rejects (network error)", async () => {
    stubFetch(vi.fn(async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch);
    expect(await fetchTodayRates()).toEqual({ ok: false });
  });

  it("returns ok:false on malformed JSON", async () => {
    stubFetch(
      vi.fn(async () => new Response("not json", { status: 200 })) as unknown as typeof fetch,
    );
    expect(await fetchTodayRates()).toEqual({ ok: false });
  });

  it("returns ok:false when the parsed response has zero rates", async () => {
    stubFetch(
      vi.fn(async () => new Response(JSON.stringify([]), { status: 200 })) as unknown as typeof fetch,
    );
    expect(await fetchTodayRates()).toEqual({ ok: false });
  });

  it("never throws, even on an unexpected exception", async () => {
    stubFetch(vi.fn(async () => {
      throw new TypeError("boom");
    }) as unknown as typeof fetch);
    await expect(fetchTodayRates()).resolves.toEqual({ ok: false });
  });
});
