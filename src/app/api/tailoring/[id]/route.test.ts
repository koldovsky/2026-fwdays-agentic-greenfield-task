// GET /api/tailoring/:id — owner-scoped re-open (FR-HISTORY-02, NFR-SEC-02 IDOR).
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

// A well-formed uuid so the route's UUID_RE guard lets the request through to
// the mocked repo (the ownership/read branches under test live past that guard).
const VALID_ID = "11111111-1111-4111-8111-111111111111";

function record(userId: string) {
  return {
    id: VALID_ID,
    userId,
    cvProfileId: null,
    jobDescriptionId: "jd-1",
    jobTitle: "Senior Engineer",
    matchScore: 80,
    createdAt: "2026-07-01T00:00:00.000Z",
    checklist: [{ requirement: "React", importance: "must", status: "met", rationale: "ok" }],
    bullets: [{ text: "Shipped", grounding: "met", included: true }],
  };
}

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  currentUserId.mockResolvedValue("u-1");
  subscriptionRepo.get.mockResolvedValue(PAID);
});

describe("GET /api/tailoring/:id", () => {
  it("returns the full tailoring when the paid caller owns it", async () => {
    tailoringRepo.findById.mockResolvedValue(record("u-1"));
    const res = await GET(new Request(`http://localhost/api/tailoring/${VALID_ID}`), ctx(VALID_ID));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tailoring.id).toBe(VALID_ID);
    expect(body.tailoring.bullets).toHaveLength(1);
  });

  it("404s a tailoring owned by another user without disclosing existence (IDOR)", async () => {
    tailoringRepo.findById.mockResolvedValue(record("someone-else"));
    const res = await GET(new Request(`http://localhost/api/tailoring/${VALID_ID}`), ctx(VALID_ID));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not_found" });
    // Reached the repo (past the uuid guard), so this genuinely tests the
    // ownership branch, not the malformed-id guard.
    expect(tailoringRepo.findById).toHaveBeenCalledWith(VALID_ID);
  });

  it("404s a missing (but well-formed) id (same response as not-owned)", async () => {
    tailoringRepo.findById.mockResolvedValue(null);
    const uuid = "00000000-0000-4000-8000-000000000000";
    const res = await GET(new Request(`http://localhost/api/tailoring/${uuid}`), ctx(uuid));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not_found" });
    expect(tailoringRepo.findById).toHaveBeenCalledWith(uuid);
  });

  it("404s a malformed non-uuid id without touching the repo (calm, not a 500)", async () => {
    const res = await GET(new Request("http://localhost/api/tailoring/not-a-uuid"), ctx("not-a-uuid"));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not_found" });
    expect(tailoringRepo.findById).not.toHaveBeenCalled();
  });

  it("401s an anonymous caller before any read", async () => {
    currentUserId.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost/api/tailoring/t-1"), ctx("t-1"));
    expect(res.status).toBe(401);
    expect(tailoringRepo.findById).not.toHaveBeenCalled();
  });

  // persist-tailoring-lifecycle: history is open to ALL logged-in users; the
  // paid gate is removed. A free caller (no subscription) is admitted — they
  // get 200 if they own the row, or 404 if the row is missing/not theirs.
  it("admits a signed-in free user — history is auth-only, not paid-only", async () => {
    subscriptionRepo.get.mockResolvedValue(null);
    tailoringRepo.findById.mockResolvedValue(record("u-1"));
    const res = await GET(new Request(`http://localhost/api/tailoring/${VALID_ID}`), ctx(VALID_ID));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tailoring.id).toBe(VALID_ID);
    expect(tailoringRepo.findById).toHaveBeenCalledWith(VALID_ID);
  });

  it("returns a calm coded 500 on a read error (NFR-OBS-01)", async () => {
    tailoringRepo.findById.mockRejectedValue(new Error("boom"));
    const res = await GET(new Request(`http://localhost/api/tailoring/${VALID_ID}`), ctx(VALID_ID));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "history_failed" });
  });
});
