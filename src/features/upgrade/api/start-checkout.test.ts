// startCheckout tests (task 2.1): calm result union in every failure shape —
// no exception ever escapes to the UI (NFR-OBS-01).
import { afterEach, describe, expect, it, vi } from "vitest";
import { startCheckout } from "./start-checkout";

function stubFetch(response: { status?: number; ok: boolean; json?: unknown }) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status ?? (response.ok ? 200 : 500),
    json: async () => response.json ?? {},
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("startCheckout", () => {
  it("posts the plan + returnTo and returns the checkout url", async () => {
    const fetchMock = stubFetch({ ok: true, json: { checkoutUrl: "/checkout?token=t" } });

    const result = await startCheckout("pro", "/tailor");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/payments/checkout",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ plan: "pro", returnTo: "/tailor" }),
      }),
    );
    expect(result).toEqual({ ok: true, checkoutUrl: "/checkout?token=t" });
  });

  it("maps 401 to unauthenticated so the UI can route to sign-in", async () => {
    stubFetch({ ok: false, status: 401 });
    expect(await startCheckout("pro", "/tailor")).toEqual({
      ok: false,
      code: "unauthenticated",
    });
  });

  it("maps any other failure status to a calm error", async () => {
    stubFetch({ ok: false, status: 503 });
    expect(await startCheckout("job_hunt_pass", "/tailor")).toEqual({ ok: false, code: "error" });
  });

  it("treats a malformed success body as an error", async () => {
    stubFetch({ ok: true, json: { nope: true } });
    expect(await startCheckout("pro", "/tailor")).toEqual({ ok: false, code: "error" });
  });

  it("never throws on a network failure (NFR-OBS-01)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await startCheckout("pro", "/tailor")).toEqual({ ok: false, code: "error" });
  });
});
