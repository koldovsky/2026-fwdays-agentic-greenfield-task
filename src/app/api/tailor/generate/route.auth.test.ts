// API auth gate tests for POST /api/tailor/generate (NFR-SEC-04, FR-ONBOARD-01
// revised 2026-07-09). The existing route.test.ts covers the full gating matrix
// for authenticated callers; this file focuses exclusively on the authenticated-
// only trust boundary: anonymous callers must receive a coded 401 BEFORE any
// LLM work or stream is opened.
//
// These tests reconcile the prior "anonymous-can-tailor" contract (where an
// anonymous caller would flow through the anon per-IP window) to the revised
// spec: /api/tailor/generate is now authenticated-only. Anonymous callers are
// rejected synchronously with {error:'unauthorized'} and status 401.
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

const VALID_BODY = {
  cvProfile: { skills: ["react"], sentences: ["Будував застосунки на React."] },
  requirements: [{ id: "r1", text: "React", importance: "must-have", keywords: ["react"] }],
  jobDescription: "Шукаємо React інженера.",
  confirmedAnswers: [],
  checklist: [],
  matchScore: 0,
};

function post(body: unknown, ip = "198.51.100.200"): Request {
  return new Request("http://localhost/api/tailor/generate", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  currentUserId.mockResolvedValue(null); // default: anonymous
  usageCounterRepo.reserve.mockResolvedValue(true);
  subscriptionRepo.get.mockResolvedValue(null);
  jobDescriptionRepo.save.mockResolvedValue({ id: "jd-1" });
  tailoringRepo.createPending.mockResolvedValue("t-1");
  tailoringRepo.updateStatus.mockResolvedValue(undefined);
});

describe("POST /api/tailor/generate — authenticated-only trust boundary (NFR-SEC-04, 2026-07-09)", () => {
  it("rejects an anonymous caller with 401 coded unauthorized BEFORE any LLM work", async () => {
    currentUserId.mockResolvedValue(null);

    const res = await POST(post(VALID_BODY));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
    // Stream is never opened for an anonymous reject.
    expect(resolveLlmProvider).not.toHaveBeenCalled();
    // No persistence attempt for an anonymous reject.
    expect(tailoringRepo.createPending).not.toHaveBeenCalled();
  });

  it("rejects an anonymous caller even with a valid body (body parsing happens before the auth check, auth gate still fires)", async () => {
    currentUserId.mockResolvedValue(null);

    const res = await POST(post(VALID_BODY));

    expect(res.status).toBe(401);
    expect(usageCounterRepo.reserve).not.toHaveBeenCalled();
  });

  it("treats a broken session read as anonymous and returns 401 (NFR-OBS-01)", async () => {
    currentUserId.mockRejectedValue(new Error("AUTH_SECRET is not set"));

    const res = await POST(post(VALID_BODY));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
    expect(resolveLlmProvider).not.toHaveBeenCalled();
  });

  it("does not reject an authenticated free user — reserve path runs (not a 401)", async () => {
    currentUserId.mockResolvedValue("user-free");
    usageCounterRepo.reserve.mockResolvedValue(true);
    // Minimal stub to avoid real generation.
    resolveLlmProvider.mockReturnValue({ generate: async function* () {} });

    const res = await POST(post(VALID_BODY));

    // 200 streaming response — authenticated user is admitted (gated by counter).
    expect(res.status).toBe(200);
    expect(usageCounterRepo.reserve).toHaveBeenCalledWith("user-free", expect.any(Number));
  });
});
