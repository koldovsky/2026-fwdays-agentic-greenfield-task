// API auth gate tests for POST /api/tailor/analyze (NFR-SEC-04, FR-WIZARD-01
// revised 2026-07-09). The existing route.test.ts covers the functional path
// for authenticated callers (analysis events, empty-input, rate-limiting).
// This file focuses exclusively on the authenticated-only trust boundary: an
// anonymous caller must receive a coded 401 BEFORE any LLM work or stream is
// opened; a broken session read degrades to anonymous and must also receive a
// 401; an authenticated caller must NOT receive a 401 (the extract path runs).
//
// Mirror of generate/route.auth.test.ts, adapted for the analyze route which
// carries no usage-counter, subscription, or persistence concerns — it only
// gates on userId.
//
// NFR-SEC-04, FR-WIZARD-01, NFR-OBS-01
import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveLlmProvider = vi.hoisted(() => vi.fn());
vi.mock("@/shared/lib/llm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/lib/llm")>();
  return { ...actual, resolveLlmProvider };
});

const currentUserId = vi.hoisted(() => vi.fn());
vi.mock("@/app/auth", () => ({ currentUserId }));

// Stub runAnalysisPhase so the "admitted" test exercises the post-auth path
// without needing a real provider / LLM call. The phase itself is tested in
// full in route.test.ts; here we only verify auth gating, not analysis output.
const runAnalysisPhase = vi.hoisted(() => vi.fn());
vi.mock("@/features/run-tailoring", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/features/run-tailoring")>();
  return { ...actual, runAnalysisPhase };
});

import { POST } from "./route";

const INPUT = {
  cvText: "Навички: React\nБудував застосунки на React.",
  jdText: "Шукаємо React інженера.",
};

function post(body: unknown, ip = "198.51.100.50"): Request {
  return new Request("http://localhost/api/tailor/analyze", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  currentUserId.mockResolvedValue(null); // default: anonymous
  // runAnalysisPhase stub: yields nothing and terminates (happy-path minimal).
  runAnalysisPhase.mockImplementation(async function* () {});
});

describe("POST /api/tailor/analyze — authenticated-only trust boundary (NFR-SEC-04, 2026-07-09)", () => {
  it("rejects an anonymous caller with 401 coded unauthorized BEFORE any LLM work", async () => {
    currentUserId.mockResolvedValue(null);

    const res = await POST(post(INPUT));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
    // The LLM provider is never resolved — no computation, no cost.
    expect(resolveLlmProvider).not.toHaveBeenCalled();
    // The analysis phase is never entered for an anonymous reject.
    expect(runAnalysisPhase).not.toHaveBeenCalled();
  });

  it("rejects an anonymous caller even when the request body is valid (body parse runs first, auth gate still fires)", async () => {
    currentUserId.mockResolvedValue(null);

    const res = await POST(post(INPUT));

    // Auth gate fires regardless of body validity — anonymous is always refused.
    expect(res.status).toBe(401);
    expect(resolveLlmProvider).not.toHaveBeenCalled();
  });

  it("treats a broken session read as anonymous and returns 401 (NFR-OBS-01)", async () => {
    // A session read error degrades to anonymous, which is now rejected.
    // The prior behavior (anonymous throttled but admitted) is gone.
    currentUserId.mockRejectedValue(new Error("AUTH_SECRET is not set"));

    const res = await POST(post(INPUT));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
    // LLM provider is never reached for a broken-session reject.
    expect(resolveLlmProvider).not.toHaveBeenCalled();
  });

  it("does not reject an authenticated caller — the extract path runs (not a 401)", async () => {
    currentUserId.mockResolvedValue("user-authed");
    // Provide a real-enough provider stub so the route can resolve it without
    // throwing (the phase itself is already covered in route.test.ts).
    resolveLlmProvider.mockReturnValue({
      complete: async () => "[]",
    });

    const res = await POST(post(INPUT));

    // 200 streaming NDJSON response — authenticated caller is admitted.
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/x-ndjson");
    // The analysis phase was entered (userId was present).
    expect(runAnalysisPhase).toHaveBeenCalledTimes(1);
    // The LLM provider was resolved — auth gate did not fire.
    expect(resolveLlmProvider).toHaveBeenCalledTimes(1);
  });
});
