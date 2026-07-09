// Route-level tests for POST /api/tailor/generate (FR-WIZARD-01/04,
// NFR-OBS-01, and the add-security-hardening gates: NFR-COST-02,
// NFR-SEC-04). Only resolveLlmProvider is mocked (spread importOriginal,
// override that one fn) so the real generation phase, prompt builders, and
// parsers run unchanged against the fake provider — no ANTHROPIC_API_KEY, no
// network. The session (currentUserId) and the usage-counter repo are
// mocked; the anonymous per-IP limiter runs for real against its
// module-level in-memory store (the SAME store /api/tailor uses, since both
// share one NFR-COST-02 budget key namespace — design.md's budget-gating
// call), so every test uses its own IP to stay isolated.
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FREE_TAILORING_LIMIT } from "@/entities/usage-counter";
import type { GenerationEvent } from "@/features/run-tailoring";
import { createFakeProvider, fakeGeneration, fakeGrounding } from "@/shared/lib/llm/testing/fake-provider";

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
// persist-tailoring-lifecycle: the route now calls createPending+updateStatus
// for all logged-in users (not save); save is kept in the mock for backward
// compat with any test that may still reference it.
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
  // Persist runs inside a transaction; the fake just invokes the callback with a
  // stand-in tx so the mocked repos (which ignore their arg) still record calls.
  withTransaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn({})),
}));

import { POST } from "./route";

const REQUIREMENT = { id: "r1", text: "React", importance: "must-have" as const, keywords: ["react"] };

const VALID_BODY = {
  cvProfile: { skills: ["react"], sentences: ["Будував застосунки на React."] },
  requirements: [REQUIREMENT],
  jobDescription: "Шукаємо React інженера.",
  confirmedAnswers: [],
  checklist: [
    {
      requirement: REQUIREMENT,
      item: { status: "met", rationale: "Підтверджено досвідом у резюме" },
    },
  ],
  matchScore: 100,
};

/** A fully-grounded single-bullet script so a real run produces a result. */
function groundedProvider() {
  return createFakeProvider({
    generation: fakeGeneration([
      { id: "b1", text: "Побудував застосунок на React.", sourceSentence: "Будував застосунки на React." },
    ]),
    grounding: fakeGrounding([
      { bulletId: "b1", label: "grounded", evidence: "Будував застосунки на React." },
    ]),
  });
}

function post(body: unknown, ip: string): Request {
  return new Request("http://localhost/api/tailor/generate", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

async function readNdjson(res: Response): Promise<GenerationEvent[]> {
  const text = await res.text();
  return text
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line) as GenerationEvent);
}

beforeEach(() => {
  vi.clearAllMocks();
  currentUserId.mockResolvedValue(null);
  usageCounterRepo.increment.mockResolvedValue(undefined);
  usageCounterRepo.reserve.mockResolvedValue(true);
  usageCounterRepo.release.mockResolvedValue(undefined);
  subscriptionRepo.get.mockResolvedValue(null); // default: never paid (Free)
  jobDescriptionRepo.save.mockResolvedValue({ id: "jd-1" });
  tailoringRepo.save.mockResolvedValue({ id: "t-1" });
  tailoringRepo.createPending.mockResolvedValue("t-pending-1");
  tailoringRepo.updateStatus.mockResolvedValue(undefined);
});

const PAID_SUBSCRIPTION = {
  id: "s1",
  userId: "user-paid",
  plan: "pro",
  status: "active",
  currentPeriodEnd: "2999-01-01T00:00:00.000Z",
};

describe("POST /api/tailor/generate", () => {
  // Authenticated-only (user decision 2026-07-09): tests use an authenticated
  // free user as the baseline to reach the streaming path.
  it("streams NDJSON events ending in a result (FR-WIZARD-01/04)", async () => {
    currentUserId.mockResolvedValue("user-authed");
    resolveLlmProvider.mockReturnValue(groundedProvider());

    const res = await POST(post(VALID_BODY, "203.0.113.30"));

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/x-ndjson");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("cache-control")).toBe("no-store");

    const events = await readNdjson(res);
    const result = events.find((e) => e.type === "result");
    expect(result?.type).toBe("result");
    if (result?.type === "result") {
      expect(result.result.bullets).toHaveLength(1);
      expect(result.result.checklist).toHaveLength(1);
      expect(result.result.matchScore).toBe(100);
    }
  });

  it("rejects a non-JSON body with 400 invalid_body", async () => {
    const res = await POST(
      new Request("http://localhost/api/tailor/generate", { method: "POST", body: "not json" }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_body" });
    expect(resolveLlmProvider).not.toHaveBeenCalled();
  });

  it("fails calm on a malformed cvProfile/requirements without calling the LLM, and refunds the reservation (NFR-OBS-01)", async () => {
    // Reconciled (2026-07-09): the test now uses an authenticated free user.
    // The retry assertion previously depended on the anon per-IP window; it
    // now uses a fresh authenticated user id so the reserve gate admits it.
    currentUserId.mockResolvedValue("user-malformed");
    resolveLlmProvider.mockReturnValue(groundedProvider());
    const ip = "203.0.113.31";

    const malformed = await POST(post({ ...VALID_BODY, cvProfile: null }, ip));
    const malformedEvents = await readNdjson(malformed);
    expect(malformedEvents).toContainEqual({ type: "error", code: "failed" });
    expect(malformedEvents.at(-1)).toEqual({ type: "status", phase: "failed" });
    expect(malformedEvents.find((e) => e.type === "result")).toBeUndefined();
    expect(resolveLlmProvider).not.toHaveBeenCalled();

    // The malformed attempt's reservation was released, so the same
    // authenticated user can still succeed on a well-formed retry.
    usageCounterRepo.reserve.mockResolvedValue(true); // reset after the release
    const retry = await POST(post(VALID_BODY, ip));
    const retryEvents = await readNdjson(retry);
    expect(retryEvents.find((e) => e.type === "result")).toBeDefined();
  });
});

describe("POST /api/tailor/generate gating (NFR-COST-02, NFR-SEC-04)", () => {
  // Reconciled (2026-07-09): anonymous callers are rejected with 401 before
  // reaching the per-IP window. Detailed 401 assertions live in
  // generate/route.auth.test.ts. Tests below cover the per-account free logic.

  it("rejects an anonymous caller outright with 401 (NFR-SEC-04, 2026-07-09)", async () => {
    const res = await POST(post(VALID_BODY, "198.51.100.40"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
    expect(resolveLlmProvider).not.toHaveBeenCalled();
  });

  it("anonymous concurrent requests all receive 401 (auth gate fires before any throttle)", async () => {
    const ip = "198.51.100.41";
    const responses = await Promise.all(Array.from({ length: 5 }, () => POST(post(VALID_BODY, ip))));
    for (const res of responses) {
      expect(res.status).toBe(401);
    }
    expect(resolveLlmProvider).not.toHaveBeenCalled();
  });

  it("an anonymous failed run returns 401, not a coded failure event (auth gate fires first)", async () => {
    resolveLlmProvider.mockImplementation(() => { throw new Error("boom"); });
    const res = await POST(post(VALID_BODY, "198.51.100.42"));
    expect(res.status).toBe(401);
    expect(resolveLlmProvider).not.toHaveBeenCalled();
  });

  it("blocks a logged-in free user at the lifetime limit before the LLM", async () => {
    currentUserId.mockResolvedValue("user-1");
    usageCounterRepo.reserve.mockResolvedValue(false); // already at the limit

    const res = await POST(post(VALID_BODY, "198.51.100.43"));

    expect(res.status).toBe(200);
    const events = await readNdjson(res);
    expect(events).toContainEqual({ type: "error", code: "rate_limited" });
    expect(events.at(-1)).toEqual({ type: "status", phase: "failed" });
    expect(resolveLlmProvider).not.toHaveBeenCalled();
    expect(usageCounterRepo.increment).not.toHaveBeenCalled();
    expect(usageCounterRepo.release).not.toHaveBeenCalled();
  });

  it("reserves a logged-in free user's budget atomically before the LLM runs, and doesn't double-charge on success", async () => {
    currentUserId.mockResolvedValue("user-2");
    resolveLlmProvider.mockReturnValue(groundedProvider());

    const res = await POST(post(VALID_BODY, "198.51.100.44"));

    const events = await readNdjson(res);
    expect(events.find((e) => e.type === "result")).toBeDefined();
    expect(usageCounterRepo.reserve).toHaveBeenCalledTimes(1);
    expect(usageCounterRepo.reserve).toHaveBeenCalledWith("user-2", FREE_TAILORING_LIMIT);
    expect(usageCounterRepo.increment).not.toHaveBeenCalled();
    expect(usageCounterRepo.release).not.toHaveBeenCalled();
  });

  it("releases a logged-in free user's reservation when the run fails (FR-TAILOR-03)", async () => {
    currentUserId.mockResolvedValue("user-3");
    resolveLlmProvider.mockImplementation(() => {
      throw new Error("boom");
    });

    const res = await POST(post(VALID_BODY, "198.51.100.45"));

    const events = await readNdjson(res);
    expect(events.at(-1)).toEqual({ type: "status", phase: "failed" });
    expect(events.find((e) => e.type === "result")).toBeUndefined();
    expect(usageCounterRepo.reserve).toHaveBeenCalledWith("user-3", FREE_TAILORING_LIMIT);
    expect(usageCounterRepo.release).toHaveBeenCalledWith("user-3");
    expect(usageCounterRepo.increment).not.toHaveBeenCalled();
  });

  it("lifts the lifetime cap for an active paid subscription, unlimited but tallied", async () => {
    currentUserId.mockResolvedValue("user-paid");
    subscriptionRepo.get.mockResolvedValue({
      id: "s1",
      userId: "user-paid",
      plan: "pro",
      status: "active",
      currentPeriodEnd: "2999-01-01T00:00:00.000Z",
    });
    resolveLlmProvider.mockReturnValue(groundedProvider());

    const res = await POST(post(VALID_BODY, "198.51.100.46"));

    const events = await readNdjson(res);
    expect(events.find((e) => e.type === "result")).toBeDefined();
    // Paid is unlimited: the reservation gate is skipped entirely...
    expect(usageCounterRepo.reserve).not.toHaveBeenCalled();
    // ...but successful runs are still tallied (non-gating, no reservation).
    expect(usageCounterRepo.increment).toHaveBeenCalledWith("user-paid");
  });

  it("treats a broken session read as anonymous and returns 401 (NFR-OBS-01, 2026-07-09)", async () => {
    // A session read error degrades to null userId, which is rejected 401 —
    // the prior behavior (admitted on the anonymous per-IP window) is gone.
    currentUserId.mockRejectedValue(new Error("AUTH_SECRET is not set"));
    resolveLlmProvider.mockReturnValue(groundedProvider());

    const res = await POST(post(VALID_BODY, "198.51.100.47"));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
    expect(resolveLlmProvider).not.toHaveBeenCalled();
    expect(usageCounterRepo.reserve).not.toHaveBeenCalled();
    expect(usageCounterRepo.increment).not.toHaveBeenCalled();
  });
});

describe("POST /api/tailor/generate history persistence (add-tailoring-history, FR-TAILOR-04)", () => {
  // persist-tailoring-lifecycle: paid users now persist via createPending at
  // START + updateStatus('complete') on result — not via save. The JD row is
  // still created first (required for the FK). Detailed payload assertions for
  // the new lifecycle path (createPending/updateStatus) live in
  // generate-lifecycle.route.test.ts; this test verifies the wiring is active
  // for paid users and that the JD row is still saved.
  it("persists a paid user's tailoring via createPending+updateStatus (not save)", async () => {
    currentUserId.mockResolvedValue("user-paid");
    subscriptionRepo.get.mockResolvedValue(PAID_SUBSCRIPTION);
    resolveLlmProvider.mockReturnValue(groundedProvider());

    const res = await POST(post(VALID_BODY, "198.51.100.60"));
    expect((await readNdjson(res)).find((e) => e.type === "result")).toBeDefined();

    // JD row still persisted (FK for the pending row).
    expect(jobDescriptionRepo.save).toHaveBeenCalledWith("user-paid", VALID_BODY.jobDescription);
    // New lifecycle path: createPending called at START, updateStatus('complete') on result.
    expect(tailoringRepo.createPending).toHaveBeenCalledTimes(1);
    expect(tailoringRepo.updateStatus).toHaveBeenCalledWith("t-pending-1", "complete", expect.objectContaining({
      matchScore: 100,
    }));
    // save is never called on the new path.
    expect(tailoringRepo.save).not.toHaveBeenCalled();
  });

  // persist-tailoring-lifecycle: persistence is now for ALL logged-in users,
  // including free users — the old paid-only guard is removed (FR-TAILOR-04).
  it("persists history for a logged-in free user via createPending+updateStatus", async () => {
    currentUserId.mockResolvedValue("user-free");
    resolveLlmProvider.mockReturnValue(groundedProvider());

    const res = await POST(post(VALID_BODY, "198.51.100.61"));
    expect((await readNdjson(res)).find((e) => e.type === "result")).toBeDefined();

    // JD row created (FK for pending row) and createPending called at START.
    expect(jobDescriptionRepo.save).toHaveBeenCalledWith("user-free", VALID_BODY.jobDescription);
    expect(tailoringRepo.createPending).toHaveBeenCalledTimes(1);
    // Completed run: updateStatus flipped to 'complete'.
    expect(tailoringRepo.updateStatus).toHaveBeenCalledWith("t-pending-1", "complete", expect.objectContaining({
      matchScore: 100,
    }));
    // Old save path is gone.
    expect(tailoringRepo.save).not.toHaveBeenCalled();
  });

  // Reconciled (2026-07-09): anonymous runs now return 401 instead of reaching
  // the stream path — persistence is moot because the route short-circuits.
  it("does not persist history for an anonymous caller (rejected 401 before the stream, NFR-SEC-04)", async () => {
    resolveLlmProvider.mockReturnValue(groundedProvider());

    const res = await POST(post(VALID_BODY, "198.51.100.62"));

    // 401 means the stream was never opened and no persistence attempt was made.
    expect(res.status).toBe(401);
    expect(tailoringRepo.createPending).not.toHaveBeenCalled();
    expect(tailoringRepo.save).not.toHaveBeenCalled();
  });

  // persist-tailoring-lifecycle: updateStatus (not save) is the new best-effort
  // persistence call; a throw from it must not alter the result already streamed.
  it("still returns the full result when history persistence throws (best-effort, NFR-OBS-01)", async () => {
    currentUserId.mockResolvedValue("user-paid");
    subscriptionRepo.get.mockResolvedValue(PAID_SUBSCRIPTION);
    resolveLlmProvider.mockReturnValue(groundedProvider());
    tailoringRepo.updateStatus.mockRejectedValue(new Error("db down"));

    const res = await POST(post(VALID_BODY, "198.51.100.63"));

    const events = await readNdjson(res);
    // The result already streamed — an updateStatus failure never turns it into
    // a failure event, and the paid tally still ran.
    expect(events.find((e) => e.type === "result")).toBeDefined();
    expect(events.find((e) => e.type === "error")).toBeUndefined();
    expect(usageCounterRepo.increment).toHaveBeenCalledWith("user-paid");
  });
});

// add-premium-pdf-attach (T5): the attach is server-gated on paid entitlement,
// feeds the GENERATION pass only, and never reaches grounding (BC-HONESTY-01/02,
// FR-PAYWALL-02, NFR-SEC-04). "%PDF-1.4\n" base64 = a valid PDF; "hello world"
// base64 fails the magic-byte sniff.
const PDF_ATTACHMENT = { mediaType: "application/pdf", dataBase64: "JVBERi0xLjQK" };
const NON_PDF_ATTACHMENT = { mediaType: "application/pdf", dataBase64: "aGVsbG8gd29ybGQ=" };

function userAttachmentsOf(provider: ReturnType<typeof groundedProvider>, phase: "generation" | "grounding") {
  return provider.calls
    .filter((c) => c.phase === phase)
    .map((c) => c.prompt.messages.find((m) => m.role === "user")?.attachments);
}

describe("POST /api/tailor/generate PDF attachment (add-premium-pdf-attach T5)", () => {
  it("paid caller: the PDF reaches the generation pass only, never grounding (BC-HONESTY-01/02)", async () => {
    currentUserId.mockResolvedValue("user-paid");
    subscriptionRepo.get.mockResolvedValue(PAID_SUBSCRIPTION);
    const provider = groundedProvider();
    resolveLlmProvider.mockReturnValue(provider);

    const res = await POST(post({ ...VALID_BODY, attachment: PDF_ATTACHMENT }, "198.51.100.70"));
    expect((await readNdjson(res)).find((e) => e.type === "result")).toBeDefined();

    // Generation saw the document block…
    const genAttachments = userAttachmentsOf(provider, "generation");
    expect(genAttachments).toHaveLength(1);
    expect(genAttachments[0]).toEqual([{ kind: "pdf", mediaType: "application/pdf", dataBase64: "JVBERi0xLjQK" }]);
    const genCall = provider.calls.find((c) => c.phase === "generation");
    expect(genCall?.payload).toContain("Оригінал резюме (PDF)");

    // …grounding never did (isolation holds end-to-end).
    for (const attachments of userAttachmentsOf(provider, "grounding")) {
      expect(attachments).toBeUndefined();
    }
  });

  it("anonymous caller: rejected with 401 — PDF never reaches generation (NFR-SEC-04, 2026-07-09)", async () => {
    // Reconciled: anonymous is rejected at the auth gate before the stream opens;
    // the attached PDF never reaches generation (even text-only degradation is
    // now moot because the caller is rejected entirely).
    const provider = groundedProvider();
    resolveLlmProvider.mockReturnValue(provider);

    const res = await POST(post({ ...VALID_BODY, attachment: PDF_ATTACHMENT }, "198.51.100.71"));

    expect(res.status).toBe(401);
    // The provider was never called — no generation, no attachment processing.
    expect(provider.calls).toHaveLength(0);
  });

  it("logged-in free caller: an attached PDF is ignored (server-side entitlement, not a client flag)", async () => {
    currentUserId.mockResolvedValue("user-free");
    const provider = groundedProvider();
    resolveLlmProvider.mockReturnValue(provider);

    const res = await POST(post({ ...VALID_BODY, attachment: PDF_ATTACHMENT }, "198.51.100.72"));
    expect((await readNdjson(res)).find((e) => e.type === "result")).toBeDefined();

    expect(userAttachmentsOf(provider, "generation")[0]).toBeUndefined();
  });

  it("paid caller: a non-PDF attachment (spoofed MIME) is rejected via magic-byte sniff (NFR-SEC-04)", async () => {
    currentUserId.mockResolvedValue("user-paid");
    subscriptionRepo.get.mockResolvedValue(PAID_SUBSCRIPTION);
    const provider = groundedProvider();
    resolveLlmProvider.mockReturnValue(provider);

    const res = await POST(post({ ...VALID_BODY, attachment: NON_PDF_ATTACHMENT }, "198.51.100.73"));
    expect((await readNdjson(res)).find((e) => e.type === "result")).toBeDefined();

    // Rejected → the run proceeds text-only, no document block.
    expect(userAttachmentsOf(provider, "generation")[0]).toBeUndefined();
  });
});
