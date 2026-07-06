// GET /api/tailoring — paid-gated history list (FR-HISTORY-01, FR-TAILOR-04).
// currentUserId + the db repos are mocked; hasPaidAccess runs for real, so the
// paid case supplies an active subscription shape.
import { beforeEach, describe, expect, it, vi } from "vitest";

const currentUserId = vi.hoisted(() => vi.fn());
vi.mock("@/app/auth", () => ({ currentUserId }));

const subscriptionRepo = vi.hoisted(() => ({ get: vi.fn() }));
const tailoringRepo = vi.hoisted(() => ({ listByUser: vi.fn(), findById: vi.fn() }));
vi.mock("@/shared/lib/db", () => ({
  createSubscriptionRepo: () => subscriptionRepo,
  createTailoringRepo: () => tailoringRepo,
}));
vi.mock("@/shared/lib/db/pg", () => ({ getDb: vi.fn(() => ({})) }));

import { GET } from "./route";

const PAID = {
  id: "s1",
  userId: "u-1",
  plan: "pro",
  status: "active",
  currentPeriodEnd: "2999-01-01T00:00:00.000Z",
};

const SUMMARY = {
  id: "t-1",
  jobTitle: "Senior Engineer",
  matchScore: 80,
  createdAt: "2026-07-01T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  currentUserId.mockResolvedValue("u-1");
  subscriptionRepo.get.mockResolvedValue(PAID);
  tailoringRepo.listByUser.mockResolvedValue([SUMMARY]);
});

describe("GET /api/tailoring", () => {
  it("returns the paid user's history summaries scoped to their id", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ tailorings: [SUMMARY] });
    expect(tailoringRepo.listByUser).toHaveBeenCalledWith("u-1");
  });

  it("401s an anonymous caller", async () => {
    currentUserId.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
    expect(tailoringRepo.listByUser).not.toHaveBeenCalled();
  });

  // persist-tailoring-lifecycle: history is open to ALL logged-in users; the
  // paid gate is removed. A free caller (no subscription) gets 200 + their list.
  it("returns the free user's history summaries — history is auth-only, not paid-only", async () => {
    subscriptionRepo.get.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ tailorings: [SUMMARY] });
    expect(tailoringRepo.listByUser).toHaveBeenCalledWith("u-1");
  });

  // persist-tailoring-lifecycle: the history read path no longer consults the
  // subscription repo at all — it is auth-only. A broken subscription lookup
  // is irrelevant here; the read succeeds for any authenticated user regardless
  // of subscription state.
  it("succeeds when subscription repo is unavailable — read path is auth-only, not subscription-gated", async () => {
    subscriptionRepo.get.mockRejectedValue(new Error("db down"));
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ tailorings: [SUMMARY] });
  });

  it("returns a calm coded 500 on a read error (NFR-OBS-01)", async () => {
    tailoringRepo.listByUser.mockRejectedValue(new Error("boom"));
    const res = await GET();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "history_failed" });
  });
});
