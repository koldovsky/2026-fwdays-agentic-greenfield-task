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

import { ANON_TAILORING_LIMIT, FREE_TAILORING_LIMIT } from "@/entities/usage-counter";
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
// add-tailoring-history: the paid path persists to history via these repos.
const jobDescriptionRepo = vi.hoisted(() => ({ save: vi.fn() }));
const tailoringRepo = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock("@/shared/lib/db", () => ({
  createUsageCounterRepo: () => usageCounterRepo,
  createSubscriptionRepo: () => subscriptionRepo,
  createJobDescriptionRepo: () => jobDescriptionRepo,
  createTailoringRepo: () => tailoringRepo,
}));
vi.mock("@/shared/lib/db/pg", () => ({ getDb: vi.fn(() => ({})) }));

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
});

const PAID_SUBSCRIPTION = {
  id: "s1",
  userId: "user-paid",
  plan: "pro",
  status: "active",
  currentPeriodEnd: "2999-01-01T00:00:00.000Z",
};

describe("POST /api/tailor/generate", () => {
  it("streams NDJSON events ending in a result (FR-WIZARD-01/04)", async () => {
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
    resolveLlmProvider.mockReturnValue(groundedProvider());
    const ip = "203.0.113.31";

    const malformed = await POST(post({ ...VALID_BODY, cvProfile: null }, ip));
    const malformedEvents = await readNdjson(malformed);
    expect(malformedEvents).toContainEqual({ type: "error", code: "failed" });
    expect(malformedEvents.at(-1)).toEqual({ type: "status", phase: "failed" });
    expect(malformedEvents.find((e) => e.type === "result")).toBeUndefined();
    expect(resolveLlmProvider).not.toHaveBeenCalled();

    // The malformed attempt's reservation was released, so the same
    // anonymous IP (ANON_TAILORING_LIMIT === 1) can still succeed.
    const retry = await POST(post(VALID_BODY, ip));
    const retryEvents = await readNdjson(retry);
    expect(retryEvents.find((e) => e.type === "result")).toBeDefined();
  });
});

describe("POST /api/tailor/generate gating (NFR-COST-02, NFR-SEC-04)", () => {
  it("blocks an anonymous second run from the same IP with a calm rate_limited stream", async () => {
    resolveLlmProvider.mockReturnValue(groundedProvider());
    const ip = "198.51.100.40";
    const first = await POST(post(VALID_BODY, ip));
    expect((await readNdjson(first)).find((e) => e.type === "result")).toBeDefined();

    resolveLlmProvider.mockClear();
    const second = await POST(post(VALID_BODY, ip));

    expect(second.status).toBe(200);
    const events = await readNdjson(second);
    expect(events).toContainEqual({ type: "error", code: "rate_limited" });
    expect(events.at(-1)).toEqual({ type: "status", phase: "failed" });
    expect(events.find((e) => e.type === "result")).toBeUndefined();
    expect(resolveLlmProvider).not.toHaveBeenCalled();
  });

  it("caps concurrent anonymous requests from the same IP at the limit", async () => {
    resolveLlmProvider.mockReturnValue(groundedProvider());
    const ip = "198.51.100.41";

    const responses = await Promise.all(Array.from({ length: 5 }, () => POST(post(VALID_BODY, ip))));
    const allEvents = await Promise.all(responses.map(readNdjson));
    const successCount = allEvents.filter((events) => events.some((e) => e.type === "result")).length;

    expect(successCount).toBe(ANON_TAILORING_LIMIT);
  });

  it("releases the anonymous reservation on a failed run and lets a retry succeed (FR-TAILOR-03)", async () => {
    resolveLlmProvider.mockImplementation(() => {
      throw new Error("boom");
    });
    const ip = "198.51.100.42";
    const failed = await POST(post(VALID_BODY, ip));
    expect(await readNdjson(failed)).toContainEqual({ type: "error", code: "failed" });

    resolveLlmProvider.mockReturnValue(groundedProvider());
    const retry = await POST(post(VALID_BODY, ip));
    const events = await readNdjson(retry);
    expect(events.find((e) => e.type === "result")).toBeDefined();
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

  it("treats a broken session read as anonymous instead of failing (NFR-OBS-01)", async () => {
    currentUserId.mockRejectedValue(new Error("AUTH_SECRET is not set"));
    resolveLlmProvider.mockReturnValue(groundedProvider());

    const res = await POST(post(VALID_BODY, "198.51.100.47"));

    expect(res.status).toBe(200);
    const events = await readNdjson(res);
    expect(events.find((e) => e.type === "result")).toBeDefined();
    expect(usageCounterRepo.reserve).not.toHaveBeenCalled();
    expect(usageCounterRepo.increment).not.toHaveBeenCalled();
  });
});

describe("POST /api/tailor/generate history persistence (add-tailoring-history, FR-TAILOR-04)", () => {
  it("persists a paid user's tailoring with mapped inputs and no CV linkage", async () => {
    currentUserId.mockResolvedValue("user-paid");
    subscriptionRepo.get.mockResolvedValue(PAID_SUBSCRIPTION);
    resolveLlmProvider.mockReturnValue(groundedProvider());

    const res = await POST(post(VALID_BODY, "198.51.100.60"));
    expect((await readNdjson(res)).find((e) => e.type === "result")).toBeDefined();

    // JD row persisted for the FK, with the caller + the JD text.
    expect(jobDescriptionRepo.save).toHaveBeenCalledWith("user-paid", VALID_BODY.jobDescription);
    // Tailoring persisted: no CV linkage (cvProfileId null), score + mapped
    // checklist importance (must-have→must) and bullet grounding (grounded→met).
    expect(tailoringRepo.save).toHaveBeenCalledTimes(1);
    const saved = tailoringRepo.save.mock.calls[0][0];
    expect(saved).toMatchObject({
      userId: "user-paid",
      cvProfileId: null,
      jobDescriptionId: "jd-1",
      matchScore: 100,
    });
    expect(saved.checklist[0]).toMatchObject({ requirement: "React", importance: "must", status: "met" });
    expect(saved.bullets[0]).toMatchObject({ grounding: "met", included: true });
  });

  it("does not persist history for a logged-in free user", async () => {
    currentUserId.mockResolvedValue("user-free");
    resolveLlmProvider.mockReturnValue(groundedProvider());

    const res = await POST(post(VALID_BODY, "198.51.100.61"));
    expect((await readNdjson(res)).find((e) => e.type === "result")).toBeDefined();

    expect(tailoringRepo.save).not.toHaveBeenCalled();
    expect(jobDescriptionRepo.save).not.toHaveBeenCalled();
  });

  it("does not persist history for an anonymous run", async () => {
    resolveLlmProvider.mockReturnValue(groundedProvider());

    const res = await POST(post(VALID_BODY, "198.51.100.62"));
    expect((await readNdjson(res)).find((e) => e.type === "result")).toBeDefined();

    expect(tailoringRepo.save).not.toHaveBeenCalled();
  });

  it("still returns the full result when history persistence throws (best-effort, NFR-OBS-01)", async () => {
    currentUserId.mockResolvedValue("user-paid");
    subscriptionRepo.get.mockResolvedValue(PAID_SUBSCRIPTION);
    resolveLlmProvider.mockReturnValue(groundedProvider());
    tailoringRepo.save.mockRejectedValue(new Error("db down"));

    const res = await POST(post(VALID_BODY, "198.51.100.63"));

    const events = await readNdjson(res);
    // The result already streamed — a save failure never turns it into a
    // failure event, and the paid tally still ran.
    expect(events.find((e) => e.type === "result")).toBeDefined();
    expect(events.find((e) => e.type === "error")).toBeUndefined();
    expect(usageCounterRepo.increment).toHaveBeenCalledWith("user-paid");
  });
});
