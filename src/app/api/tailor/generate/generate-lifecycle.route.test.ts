// Tests for persist-tailoring-lifecycle wiring in POST /api/tailor/generate
// (tasks 4.3, 5.4 — generate route).
//
// Task 4.3 (counter timing — generate route):
//   - free logged-in user blocked BEFORE LLM call when counter is exhausted
//   - pre-LLM clean failure (malformed body) releases the reservation
//   - provider-resolution throw before llmStarted releases the reservation
//   - paid user is never gated by the counter (only non-gating tally)
//
// Task 5.4 (persist-on-start wiring — generate route):
//   - logged-in free user: createPending called before LLM, updateStatus('complete')
//     on result, updateStatus('failed') on non-result outcome
//   - throwing createPending does NOT abort the stream
//   - throwing updateStatus after the result does NOT alter client response
//   - anonymous callers create no pending row
//   - paid users ALSO get a pending row (not paid-only)
//
// FR-TAILOR-04, FR-ONBOARD-01, FR-PAYWALL-01, NFR-COST-02, FR-TAILOR-03,
// FR-HISTORY-01, NFR-OBS-01, NFR-SEC-01/02
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FREE_TAILORING_LIMIT } from "@/entities/usage-counter";
import type { GenerationEvent } from "@/features/run-tailoring";
import { createFakeProvider, fakeGeneration, fakeGrounding } from "@/shared/lib/llm/testing/fake-provider";

// ---------------------------------------------------------------------------
// Mocks — mirrors the existing generate/route.test.ts setup, extended with
// createPending/updateStatus on tailoringRepo.
// ---------------------------------------------------------------------------

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
  createPending: vi.fn(),
  updateStatus: vi.fn(),
  save: vi.fn(),
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

// ---------------------------------------------------------------------------
// Test fixtures — identical to existing generate/route.test.ts
// ---------------------------------------------------------------------------

const REQUIREMENT = {
  id: "r1",
  text: "React",
  importance: "must-have" as const,
  keywords: ["react"],
};

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

function groundedProvider() {
  return createFakeProvider({
    generation: fakeGeneration([
      {
        id: "b1",
        text: "Побудував застосунок на React.",
        sourceSentence: "Будував застосунки на React.",
      },
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

const PAID_SUBSCRIPTION = {
  id: "s1",
  userId: "user-paid",
  plan: "pro",
  status: "active",
  currentPeriodEnd: "2999-01-01T00:00:00.000Z",
};

let ipCounter = 200; // different range from the /api/tailor test file
function freshIp() {
  return `10.1.${Math.floor(ipCounter / 256)}.${ipCounter++ % 256}`;
}

beforeEach(() => {
  vi.clearAllMocks();
  currentUserId.mockResolvedValue(null);
  usageCounterRepo.increment.mockResolvedValue(undefined);
  usageCounterRepo.reserve.mockResolvedValue(true);
  usageCounterRepo.release.mockResolvedValue(undefined);
  subscriptionRepo.get.mockResolvedValue(null);
  jobDescriptionRepo.save.mockResolvedValue({ id: "jd-gen-lifecycle-1" });
  tailoringRepo.createPending.mockResolvedValue("gen-pending-id-1");
  tailoringRepo.updateStatus.mockResolvedValue(undefined);
  tailoringRepo.save.mockResolvedValue({ id: "t-gen-lifecycle-1" });
});

// ---------------------------------------------------------------------------
// Task 4.3 — counter timing (generate route)
// ---------------------------------------------------------------------------

describe("POST /api/tailor/generate — counter timing (task 4.3, NFR-COST-02, FR-ONBOARD-01)", () => {
  it("free user with exhausted counter is blocked BEFORE the LLM", async () => {
    currentUserId.mockResolvedValue("gen-user-exhausted");
    usageCounterRepo.reserve.mockResolvedValue(false);

    const res = await POST(post(VALID_BODY, freshIp()));

    expect(res.status).toBe(200);
    const events = await readNdjson(res);
    expect(events).toContainEqual({ type: "error", code: "rate_limited" });
    expect(events.at(-1)).toEqual({ type: "status", phase: "failed" });
    expect(resolveLlmProvider).not.toHaveBeenCalled();
    expect(usageCounterRepo.reserve).toHaveBeenCalledWith("gen-user-exhausted", FREE_TAILORING_LIMIT);
    // No persistence attempted when rate-limited.
    expect(tailoringRepo.createPending).not.toHaveBeenCalled();
  });

  it("pre-LLM clean failure (malformed body) returns 400 and does not invoke reserve or LLM", async () => {
    currentUserId.mockResolvedValue("gen-user-malformed");

    const res = await POST(
      new Request("http://localhost/api/tailor/generate", {
        method: "POST",
        headers: { "x-forwarded-for": freshIp() },
        body: "not json",
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_body" });
    expect(resolveLlmProvider).not.toHaveBeenCalled();
    expect(usageCounterRepo.reserve).not.toHaveBeenCalled();
  });

  it("provider-resolution throw (pre-LLM clean failure in stream) releases the reservation", async () => {
    currentUserId.mockResolvedValue("gen-user-provider-throw");
    resolveLlmProvider.mockImplementation(() => {
      throw new Error("ANTHROPIC_API_KEY not set");
    });

    const res = await POST(post(VALID_BODY, freshIp()));

    const events = await readNdjson(res);
    expect(events.at(-1)).toEqual({ type: "status", phase: "failed" });
    expect(usageCounterRepo.reserve).toHaveBeenCalledWith("gen-user-provider-throw", FREE_TAILORING_LIMIT);
    // Provider throw before llmStarted — reservation is released (FR-TAILOR-03).
    expect(usageCounterRepo.release).toHaveBeenCalledWith("gen-user-provider-throw");
  });

  it("paid user bypasses the reservation gate — only a non-gating tally on success", async () => {
    currentUserId.mockResolvedValue("gen-user-paid");
    subscriptionRepo.get.mockResolvedValue(PAID_SUBSCRIPTION);
    resolveLlmProvider.mockReturnValue(groundedProvider());

    const res = await POST(post(VALID_BODY, freshIp()));

    const events = await readNdjson(res);
    expect(events.find((e) => e.type === "result")).toBeDefined();
    expect(usageCounterRepo.reserve).not.toHaveBeenCalled();
    expect(usageCounterRepo.increment).toHaveBeenCalledWith("gen-user-paid");
  });
});

// ---------------------------------------------------------------------------
// Task 5.4 — persist-on-start wiring (generate route)
// ---------------------------------------------------------------------------

describe("POST /api/tailor/generate — persist-on-start wiring (task 5.4, FR-TAILOR-04, NFR-OBS-01)", () => {
  it("free logged-in user: createPending called at START, updateStatus('complete') on result", async () => {
    currentUserId.mockResolvedValue("gen-free-persist");
    resolveLlmProvider.mockReturnValue(groundedProvider());

    const res = await POST(post(VALID_BODY, freshIp()));

    const events = await readNdjson(res);
    expect(events.find((e) => e.type === "result")).toBeDefined();

    // createPending called once.
    expect(tailoringRepo.createPending).toHaveBeenCalledTimes(1);
    // updateStatus called with 'complete'.
    const completeCalls = tailoringRepo.updateStatus.mock.calls.filter(
      (c: unknown[]) => c[1] === "complete",
    );
    expect(completeCalls).toHaveLength(1);
    expect(completeCalls[0][0]).toBe("gen-pending-id-1");
    // No 'failed' calls.
    const failedCalls = tailoringRepo.updateStatus.mock.calls.filter(
      (c: unknown[]) => c[1] === "failed",
    );
    expect(failedCalls).toHaveLength(0);
  });

  it("free logged-in user: updateStatus('failed') called when provider throws (non-result outcome)", async () => {
    currentUserId.mockResolvedValue("gen-free-error");
    resolveLlmProvider.mockImplementation(() => {
      throw new Error("provider down");
    });

    const res = await POST(post(VALID_BODY, freshIp()));

    const events = await readNdjson(res);
    expect(events.at(-1)).toEqual({ type: "status", phase: "failed" });

    expect(tailoringRepo.createPending).toHaveBeenCalledTimes(1);
    const failedCalls = tailoringRepo.updateStatus.mock.calls.filter(
      (c: unknown[]) => c[1] === "failed",
    );
    expect(failedCalls).toHaveLength(1);
    expect(failedCalls[0][0]).toBe("gen-pending-id-1");
  });

  it("throwing createPending does NOT abort the stream — run continues with pendingId=null", async () => {
    currentUserId.mockResolvedValue("gen-createpending-throws");
    resolveLlmProvider.mockReturnValue(groundedProvider());
    tailoringRepo.createPending.mockRejectedValue(new Error("DB write failed"));

    const res = await POST(post(VALID_BODY, freshIp()));

    expect(res.status).toBe(200);
    const events = await readNdjson(res);
    expect(events.find((e) => e.type === "result")).toBeDefined();
    expect(events.at(-1)).not.toEqual({ type: "status", phase: "failed" });
    // updateStatus is never called because pendingId is null.
    expect(tailoringRepo.updateStatus).not.toHaveBeenCalled();
  });

  it("throwing updateStatus after result does NOT alter the client response", async () => {
    currentUserId.mockResolvedValue("gen-updatestatus-throws");
    resolveLlmProvider.mockReturnValue(groundedProvider());
    tailoringRepo.updateStatus.mockRejectedValue(new Error("DB write failed"));

    const res = await POST(post(VALID_BODY, freshIp()));

    expect(res.status).toBe(200);
    const events = await readNdjson(res);
    expect(events.find((e) => e.type === "result")).toBeDefined();
    // No error event leaked to the client.
    expect(events.find((e) => e.type === "error")).toBeUndefined();
  });

  it("anonymous callers create no pending row (not logged in)", async () => {
    // currentUserId returns null (default in beforeEach).
    resolveLlmProvider.mockReturnValue(groundedProvider());

    const res = await POST(post(VALID_BODY, freshIp()));

    const events = await readNdjson(res);
    expect(events.find((e) => e.type === "result")).toBeDefined();
    expect(tailoringRepo.createPending).not.toHaveBeenCalled();
    expect(tailoringRepo.updateStatus).not.toHaveBeenCalled();
  });

  it("paid users ALSO get a pending row — persistence is not paid-only (FR-TAILOR-04)", async () => {
    currentUserId.mockResolvedValue("gen-paid-persist");
    subscriptionRepo.get.mockResolvedValue({
      id: "s2",
      userId: "gen-paid-persist",
      plan: "pro",
      status: "active",
      currentPeriodEnd: "2999-01-01T00:00:00.000Z",
    });
    resolveLlmProvider.mockReturnValue(groundedProvider());

    const res = await POST(post(VALID_BODY, freshIp()));

    const events = await readNdjson(res);
    expect(events.find((e) => e.type === "result")).toBeDefined();
    // Paid users also persist — not paid-only.
    expect(tailoringRepo.createPending).toHaveBeenCalledTimes(1);
    const completeCalls = tailoringRepo.updateStatus.mock.calls.filter(
      (c: unknown[]) => c[1] === "complete",
    );
    expect(completeCalls).toHaveLength(1);
  });
});
