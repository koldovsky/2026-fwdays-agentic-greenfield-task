// API auth gate tests for POST /api/tailor (NFR-SEC-04, FR-ONBOARD-01 revised
// 2026-07-09). The existing route.test.ts covers the full gating matrix for
// authenticated callers; this file focuses exclusively on the new authenticated-
// only trust boundary: anonymous callers must receive a coded 401 BEFORE any
// LLM work, regardless of per-IP rate state.
//
// These tests reconcile the prior "anonymous-can-tailor" contract to the revised
// spec: /api/tailor is now authenticated-only. Anonymous callers are rejected
// synchronously with {error:'unauthorized'} and status 401; the LLM provider is
// never resolved for such requests.
import { beforeEach, describe, expect, it, vi } from "vitest";

const resolveLlmProvider = vi.hoisted(() => vi.fn());
vi.mock("@/shared/lib/llm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/lib/llm")>();
  return { ...actual, resolveLlmProvider };
});

const currentUserId = vi.hoisted(() => vi.fn());
vi.mock("@/app/auth", () => ({ currentUserId }));

const usageCounterRepo = vi.hoisted(() => ({
  increment: vi.fn(),
  reserve: vi.fn(),
  release: vi.fn(),
}));
const subscriptionRepo = vi.hoisted(() => ({ get: vi.fn() }));
const jobDescriptionRepo = vi.hoisted(() => ({ save: vi.fn() }));
const tailoringRepo = vi.hoisted(() => ({
  save: vi.fn(),
  createPending: vi.fn(),
  updateStatus: vi.fn(),
}));
vi.mock("@/shared/lib/db", () => ({
  createUsageCounterRepo: () => usageCounterRepo,
  createSubscriptionRepo: () => subscriptionRepo,
  createJobDescriptionRepo: () => jobDescriptionRepo,
  createTailoringRepo: () => tailoringRepo,
}));
vi.mock("@/shared/lib/db/pg", () => ({
  getDb: vi.fn(() => ({})),
  withTransaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
}));

import { POST } from "./route";

const INPUT = {
  cvText: "Навички: React\nБудував застосунки на React.",
  jdText: "Шукаємо React інженера.",
};

function post(body: unknown, ip = "198.51.100.1"): Request {
  return new Request("http://localhost/api/tailor", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  currentUserId.mockResolvedValue(null); // default: anonymous
  usageCounterRepo.reserve.mockResolvedValue(true);
  usageCounterRepo.increment.mockResolvedValue(undefined);
  usageCounterRepo.release.mockResolvedValue(undefined);
  subscriptionRepo.get.mockResolvedValue(null);
  jobDescriptionRepo.save.mockResolvedValue({ id: "jd-1" });
  tailoringRepo.createPending.mockResolvedValue("t-1");
  tailoringRepo.updateStatus.mockResolvedValue(undefined);
});

describe("POST /api/tailor — authenticated-only trust boundary (NFR-SEC-04, 2026-07-09)", () => {
  it("rejects an anonymous caller with 401 coded unauthorized BEFORE any LLM work", async () => {
    currentUserId.mockResolvedValue(null);

    const res = await POST(post(INPUT));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
    // The LLM provider is never resolved — no computation, no cost.
    expect(resolveLlmProvider).not.toHaveBeenCalled();
  });

  it("rejects an anonymous caller even when the counter would allow it (limit check never reached)", async () => {
    currentUserId.mockResolvedValue(null);
    usageCounterRepo.reserve.mockResolvedValue(true);

    const res = await POST(post(INPUT));

    expect(res.status).toBe(401);
    // The usage counter reserve is never called for an anonymous reject.
    expect(usageCounterRepo.reserve).not.toHaveBeenCalled();
    expect(resolveLlmProvider).not.toHaveBeenCalled();
  });

  it("treats a broken session read as anonymous and returns 401 (NFR-OBS-01)", async () => {
    // A session read error must degrade to anonymous, which is now rejected.
    // The prior behavior (anonymous = throttled but admitted) is gone.
    currentUserId.mockRejectedValue(new Error("AUTH_SECRET is not set"));

    const res = await POST(post(INPUT));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
    expect(resolveLlmProvider).not.toHaveBeenCalled();
  });

  it("admits an authenticated free user (reserve path runs, not a 401)", async () => {
    currentUserId.mockResolvedValue("user-free");
    // reserve returns true → run admitted (LLM may be called; we're not testing that here).
    usageCounterRepo.reserve.mockResolvedValue(true);
    resolveLlmProvider.mockReturnValue({
      // Minimal provider stub: resolves immediately with no calls.
      generate: async function* () {},
    });

    const res = await POST(post(INPUT));

    // 200 streaming response — not a 401.
    expect(res.status).toBe(200);
    expect(usageCounterRepo.reserve).toHaveBeenCalledWith("user-free", expect.any(Number));
  });
});
