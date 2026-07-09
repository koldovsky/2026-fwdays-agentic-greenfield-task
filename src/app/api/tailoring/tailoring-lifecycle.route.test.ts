// Tests for persist-tailoring-lifecycle access changes to the history routes
// (task 6.3): free logged-in users can now read history (paid gate removed);
// anonymous callers get 401; pending/failed rows are absent from the list;
// IDOR returns 404 not 403; non-uuid id returns 404.
//
// GET /api/tailoring (list)
//   - free logged-in user gets 200 (paid gate removed)
//   - anonymous gets 401
//   - only status='complete' rows appear (pending/failed absent — enforced by repo)
//
// GET /api/tailoring/[id] (detail)
//   - free logged-in user gets 200 on an owned complete record
//   - anonymous gets 401
//   - a record owned by another user returns 404 (IDOR, NFR-SEC-02 — not 403)
//   - a non-uuid id returns 404
//
// FR-HISTORY-01/02, FR-TAILOR-04, NFR-SEC-02
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Shared mocks
// ---------------------------------------------------------------------------

const currentUserId = vi.hoisted(() => vi.fn());
vi.mock("@/app/auth", () => ({ currentUserId }));

// The route no longer uses subscriptionRepo — but some test scenarios import
// paid-user.ts which only reads currentUserId. We mock subscriptionRepo for
// completeness in case the route still resolves it transitively.
const subscriptionRepo = vi.hoisted(() => ({ get: vi.fn() }));
const tailoringRepo = vi.hoisted(() => ({ listByUser: vi.fn(), findById: vi.fn() }));
vi.mock("@/shared/lib/db", () => ({
  createSubscriptionRepo: () => subscriptionRepo,
  createTailoringRepo: () => tailoringRepo,
}));
vi.mock("@/shared/lib/db/pg", () => ({ getDb: vi.fn(() => ({})) }));

// ---------------------------------------------------------------------------
// Task 6.3a — GET /api/tailoring list
// ---------------------------------------------------------------------------

import { GET as getList } from "./route";

// A well-formed UUID so the repo call is exercised.
const VALID_ID = "22222222-2222-4222-8222-222222222222";

const COMPLETE_SUMMARY = {
  id: VALID_ID,
  jobTitle: "Senior Engineer",
  matchScore: 80,
  createdAt: "2026-07-01T00:00:00.000Z",
};

describe("GET /api/tailoring list (task 6.3, FR-HISTORY-01)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUserId.mockResolvedValue("u-free");
    subscriptionRepo.get.mockResolvedValue(null); // free user
    tailoringRepo.listByUser.mockResolvedValue([COMPLETE_SUMMARY]);
  });

  it("free logged-in user gets 200 — paid gate removed (FR-TAILOR-04)", async () => {
    const res = await getList();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ tailorings: [COMPLETE_SUMMARY] });
    expect(tailoringRepo.listByUser).toHaveBeenCalledWith("u-free");
  });

  it("anonymous caller gets 401 — auth gate still enforced", async () => {
    currentUserId.mockResolvedValue(null);
    const res = await getList();
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
    expect(tailoringRepo.listByUser).not.toHaveBeenCalled();
  });

  it("only complete rows appear — pending and failed rows absent (repo enforces status filter)", async () => {
    // The repo's listByUser already filters to status='complete'. The route
    // delegates entirely to the repo; this test verifies the route does NOT
    // inject additional filtering that would accidentally surface pending rows,
    // and that if the repo returns only complete rows, the response reflects that.
    tailoringRepo.listByUser.mockResolvedValue([COMPLETE_SUMMARY]);

    const res = await getList();
    expect(res.status).toBe(200);
    const { tailorings } = await res.json();
    // Every item returned must be the complete summary — no pending/failed items.
    for (const t of tailorings) {
      expect(t).toMatchObject({ id: expect.any(String), matchScore: expect.anything() });
      // No status field should leak into the API response.
      expect((t as Record<string, unknown>).status).toBeUndefined();
    }
    expect(tailorings).toHaveLength(1);
  });

  it("returns an empty list when the user has no complete tailorings", async () => {
    tailoringRepo.listByUser.mockResolvedValue([]);
    const res = await getList();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ tailorings: [] });
  });

  it("returns a calm coded 500 on a read error (NFR-OBS-01)", async () => {
    tailoringRepo.listByUser.mockRejectedValue(new Error("db exploded"));
    const res = await getList();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "history_failed" });
  });

  it("broken session read degrades to 401 (strict, NFR-OBS-01)", async () => {
    currentUserId.mockRejectedValue(new Error("AUTH_SECRET not set"));
    const res = await getList();
    expect(res.status).toBe(401);
    expect(tailoringRepo.listByUser).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Task 6.3b — GET /api/tailoring/[id] detail
// ---------------------------------------------------------------------------

import { GET as getDetail } from "./[id]/route";

function tailoringRecord(userId: string) {
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

describe("GET /api/tailoring/[id] detail (task 6.3, FR-HISTORY-02, NFR-SEC-02)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentUserId.mockResolvedValue("u-free");
    subscriptionRepo.get.mockResolvedValue(null); // free user
  });

  it("free logged-in user gets 200 on an owned complete record — paid gate removed", async () => {
    tailoringRepo.findById.mockResolvedValue(tailoringRecord("u-free"));

    const res = await getDetail(
      new Request(`http://localhost/api/tailoring/${VALID_ID}`),
      ctx(VALID_ID),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tailoring.id).toBe(VALID_ID);
    expect(body.tailoring.bullets).toHaveLength(1);
  });

  it("anonymous caller gets 401 before any repo access", async () => {
    currentUserId.mockResolvedValue(null);

    const res = await getDetail(
      new Request(`http://localhost/api/tailoring/${VALID_ID}`),
      ctx(VALID_ID),
    );

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
    expect(tailoringRepo.findById).not.toHaveBeenCalled();
  });

  it("IDOR: record owned by another user returns 404, not 403 (NFR-SEC-02)", async () => {
    tailoringRepo.findById.mockResolvedValue(tailoringRecord("someone-else"));

    const res = await getDetail(
      new Request(`http://localhost/api/tailoring/${VALID_ID}`),
      ctx(VALID_ID),
    );

    // Must be 404 — never 403 — so the existence of another user's record
    // is not disclosed.
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not_found" });
    // The repo WAS called (past the uuid guard) — this tests the ownership
    // branch, not the malformed-id guard.
    expect(tailoringRepo.findById).toHaveBeenCalledWith(VALID_ID);
  });

  it("non-uuid id returns 404 without touching the repo", async () => {
    const res = await getDetail(
      new Request("http://localhost/api/tailoring/not-a-uuid"),
      ctx("not-a-uuid"),
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not_found" });
    expect(tailoringRepo.findById).not.toHaveBeenCalled();
  });

  it("missing (well-formed) id returns 404 (same as not-owned — no existence disclosure)", async () => {
    tailoringRepo.findById.mockResolvedValue(null);
    const missingId = "00000000-0000-4000-8000-000000000000";

    const res = await getDetail(
      new Request(`http://localhost/api/tailoring/${missingId}`),
      ctx(missingId),
    );

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not_found" });
    expect(tailoringRepo.findById).toHaveBeenCalledWith(missingId);
  });

  it("returns a calm coded 500 on a read error (NFR-OBS-01)", async () => {
    tailoringRepo.findById.mockRejectedValue(new Error("db error"));

    const res = await getDetail(
      new Request(`http://localhost/api/tailoring/${VALID_ID}`),
      ctx(VALID_ID),
    );

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "history_failed" });
  });

  it("broken session read degrades to 401 (NFR-OBS-01)", async () => {
    currentUserId.mockRejectedValue(new Error("AUTH_SECRET not set"));

    const res = await getDetail(
      new Request(`http://localhost/api/tailoring/${VALID_ID}`),
      ctx(VALID_ID),
    );

    expect(res.status).toBe(401);
    expect(tailoringRepo.findById).not.toHaveBeenCalled();
  });
});
