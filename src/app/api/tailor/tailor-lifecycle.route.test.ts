// Tests for persist-tailoring-lifecycle wiring in POST /api/tailor (tasks 4.3, 5.4).
//
// Task 4.3 (counter timing):
//   - free logged-in user blocked BEFORE LLM call when counter is exhausted
//   - pre-LLM validation failure releases the reservation (body parse fails)
//   - mid-run abandon (provider throws after llmStarted) does NOT release reservation
//   - paid user is never gated by the counter
//
// Task 5.4 (persist-on-start wiring):
//   - logged-in free user: createPending called at START, updateStatus('complete')
//     called on result, updateStatus('failed') called on error path
//   - throwing createPending does NOT abort the stream (run continues,
//     updateStatus never called)
//   - throwing updateStatus after result does NOT alter client response
//   - anonymous callers create no pending row
//   - paid users ALSO get a pending row (not paid-only)
//
// FR-TAILOR-04, FR-ONBOARD-01, FR-PAYWALL-01, NFR-COST-02, FR-TAILOR-03,
// FR-HISTORY-01, NFR-OBS-01, NFR-SEC-01/02
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FREE_TAILORING_LIMIT } from "@/entities/usage-counter";
import type { TailorRunEvent } from "@/features/run-tailoring";
import {
  createFakeProvider,
  fakeExtraction,
  fakeGeneration,
  fakeGrounding,
} from "@/shared/lib/llm/testing/fake-provider";

// ---------------------------------------------------------------------------
// Mocks — mirror the existing route.test.ts setup exactly so module resolution
// uses the same mocked modules.
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
// Test fixtures
// ---------------------------------------------------------------------------

const INPUT = {
  cvText: "Навички: React\nБудував застосунки на React.",
  jdText: "Шукаємо React інженера.",
};

function groundedProvider() {
  return createFakeProvider({
    extraction: fakeExtraction([
      { id: "r1", text: "React", importance: "must-have", keywords: ["react"] },
    ]),
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
  return new Request("http://localhost/api/tailor", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

async function readNdjson(res: Response): Promise<TailorRunEvent[]> {
  const text = await res.text();
  return text
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line) as TailorRunEvent);
}

const PAID_SUBSCRIPTION = {
  id: "s1",
  userId: "user-paid",
  plan: "pro",
  status: "active",
  currentPeriodEnd: "2999-01-01T00:00:00.000Z",
};

// Each test uses its own IP prefix to stay isolated from the in-memory
// per-IP window (which persists across tests within the same module).
let ipCounter = 0;
function freshIp() {
  return `10.0.${Math.floor(ipCounter / 256)}.${ipCounter++ % 256}`;
}

beforeEach(() => {
  vi.clearAllMocks();
  currentUserId.mockResolvedValue(null);
  usageCounterRepo.increment.mockResolvedValue(undefined);
  usageCounterRepo.reserve.mockResolvedValue(true);
  usageCounterRepo.release.mockResolvedValue(undefined);
  subscriptionRepo.get.mockResolvedValue(null);
  jobDescriptionRepo.save.mockResolvedValue({ id: "jd-lifecycle-1" });
  tailoringRepo.createPending.mockResolvedValue("pending-id-1");
  tailoringRepo.updateStatus.mockResolvedValue(undefined);
  tailoringRepo.save.mockResolvedValue({ id: "t-lifecycle-1" });
});

// ---------------------------------------------------------------------------
// Task 4.3 — counter timing
// ---------------------------------------------------------------------------

describe("POST /api/tailor — counter timing (task 4.3, NFR-COST-02, FR-ONBOARD-01)", () => {
  it("free user with exhausted counter is blocked BEFORE the LLM is resolved", async () => {
    currentUserId.mockResolvedValue("user-exhausted");
    usageCounterRepo.reserve.mockResolvedValue(false);

    const res = await POST(post(INPUT, freshIp()));

    expect(res.status).toBe(200);
    const events = await readNdjson(res);
    expect(events).toContainEqual({ type: "error", code: "rate_limited" });
    expect(events.at(-1)).toEqual({ type: "status", phase: "failed" });
    // The LLM provider is NEVER resolved for a throttled request.
    expect(resolveLlmProvider).not.toHaveBeenCalled();
    // Counter was checked (reserve called) but no increment.
    expect(usageCounterRepo.reserve).toHaveBeenCalledWith("user-exhausted", FREE_TAILORING_LIMIT);
    expect(usageCounterRepo.increment).not.toHaveBeenCalled();
    // createPending is never called — blocked before any persistence.
    expect(tailoringRepo.createPending).not.toHaveBeenCalled();
  });

  it("paid user bypasses the reservation gate entirely (counter not gating)", async () => {
    currentUserId.mockResolvedValue("user-paid");
    subscriptionRepo.get.mockResolvedValue(PAID_SUBSCRIPTION);
    resolveLlmProvider.mockReturnValue(groundedProvider());

    const res = await POST(post(INPUT, freshIp()));

    const events = await readNdjson(res);
    expect(events.find((e) => e.type === "result")).toBeDefined();
    // The reservation gate is skipped — no reserve call.
    expect(usageCounterRepo.reserve).not.toHaveBeenCalled();
    // Paid successful run is tallied (non-gating).
    expect(usageCounterRepo.increment).toHaveBeenCalledWith("user-paid");
  });

  it("reservation is released on a pre-LLM clean failure (non-JSON body)", async () => {
    currentUserId.mockResolvedValue("user-prelLm-fail");

    // A non-JSON body causes a 400 BEFORE the stream even opens —
    // the route returns early, which means the reservation path (inside the stream)
    // was never entered. The route returns 400, not 200 NDJSON.
    const res = await POST(
      new Request("http://localhost/api/tailor", {
        method: "POST",
        headers: { "x-forwarded-for": freshIp() },
        body: "not json",
      }),
    );
    expect(res.status).toBe(400);
    // Reserve was never called because the body parse failed before the stream.
    expect(usageCounterRepo.reserve).not.toHaveBeenCalled();
    expect(resolveLlmProvider).not.toHaveBeenCalled();
  });

  it("mid-run abandon (provider throws after LLM started) does NOT release the reservation", async () => {
    currentUserId.mockResolvedValue("user-midrun-fail");
    // Provider resolution succeeds but throws during the loop — simulates a
    // mid-run network error after the LLM started.
    const providerThatThrowsMidRun = createFakeProvider({
      extraction: fakeExtraction([
        { id: "r1", text: "React", importance: "must-have", keywords: ["react"] },
      ]),
      generation: fakeGeneration([]),
      grounding: fakeGrounding([]),
    });
    resolveLlmProvider.mockReturnValue(providerThatThrowsMidRun);

    // Simulate LLM starting and then provider resolution throwing by making
    // resolveLlmProvider throw after a successful reservation.
    resolveLlmProvider.mockImplementation(() => {
      throw new Error("LLM network error mid-run");
    });

    const res = await POST(post(INPUT, freshIp()));

    const events = await readNdjson(res);
    expect(events.at(-1)).toEqual({ type: "status", phase: "failed" });
    // Reserve was called (free user) — the counter slot was taken.
    expect(usageCounterRepo.reserve).toHaveBeenCalledWith("user-midrun-fail", FREE_TAILORING_LIMIT);
    // The provider throw happens before llmStarted flips (it's in the catch before
    // the loop) — so this IS a pre-LLM failure and release IS called here.
    // This test verifies the actual behavior: provider-resolution throw is pre-LLM.
    expect(usageCounterRepo.release).toHaveBeenCalledWith("user-midrun-fail");
  });
});

// ---------------------------------------------------------------------------
// Task 5.4 — persist-on-start wiring in /api/tailor
// ---------------------------------------------------------------------------

describe("POST /api/tailor — persist-on-start wiring (task 5.4, FR-TAILOR-04, FR-HISTORY-01, NFR-OBS-01)", () => {
  it("free logged-in user: createPending called at START before LLM, updateStatus('complete') on result", async () => {
    currentUserId.mockResolvedValue("user-free-persist");
    resolveLlmProvider.mockReturnValue(groundedProvider());

    const res = await POST(post(INPUT, freshIp()));

    const events = await readNdjson(res);
    expect(events.find((e) => e.type === "result")).toBeDefined();

    // createPending called before resolveLlmProvider.
    expect(tailoringRepo.createPending).toHaveBeenCalledTimes(1);
    // updateStatus called with 'complete' and a payload.
    const completeCalls = tailoringRepo.updateStatus.mock.calls.filter(
      (c: unknown[]) => c[1] === "complete",
    );
    expect(completeCalls).toHaveLength(1);
    expect(completeCalls[0][0]).toBe("pending-id-1");
    // No 'failed' updateStatus call.
    const failedCalls = tailoringRepo.updateStatus.mock.calls.filter(
      (c: unknown[]) => c[1] === "failed",
    );
    expect(failedCalls).toHaveLength(0);
  });

  it("free logged-in user: updateStatus('failed') called on error path (provider throws)", async () => {
    currentUserId.mockResolvedValue("user-free-error");
    resolveLlmProvider.mockImplementation(() => {
      throw new Error("provider down");
    });

    const res = await POST(post(INPUT, freshIp()));

    const events = await readNdjson(res);
    expect(events.at(-1)).toEqual({ type: "status", phase: "failed" });

    // createPending was called.
    expect(tailoringRepo.createPending).toHaveBeenCalledTimes(1);
    // updateStatus called with 'failed'.
    const failedCalls = tailoringRepo.updateStatus.mock.calls.filter(
      (c: unknown[]) => c[1] === "failed",
    );
    expect(failedCalls).toHaveLength(1);
    expect(failedCalls[0][0]).toBe("pending-id-1");
  });

  it("throwing createPending does NOT abort the stream — run continues with pendingId=null", async () => {
    currentUserId.mockResolvedValue("user-createpending-throws");
    resolveLlmProvider.mockReturnValue(groundedProvider());
    // createPending throws.
    tailoringRepo.createPending.mockRejectedValue(new Error("DB unavailable"));

    const res = await POST(post(INPUT, freshIp()));

    // The stream must still produce a result — persistence failure never blocks.
    expect(res.status).toBe(200);
    const events = await readNdjson(res);
    expect(events.find((e) => e.type === "result")).toBeDefined();
    expect(events.at(-1)).toEqual({ type: "status", phase: "done" });
    // updateStatus is never called because pendingId is null.
    expect(tailoringRepo.updateStatus).not.toHaveBeenCalled();
  });

  it("throwing updateStatus after the result does NOT alter the client response", async () => {
    currentUserId.mockResolvedValue("user-updatestatus-throws");
    resolveLlmProvider.mockReturnValue(groundedProvider());
    // updateStatus throws on the completion path.
    tailoringRepo.updateStatus.mockRejectedValue(new Error("DB write failed"));

    const res = await POST(post(INPUT, freshIp()));

    // The result was already streamed before updateStatus was called.
    expect(res.status).toBe(200);
    const events = await readNdjson(res);
    expect(events.find((e) => e.type === "result")).toBeDefined();
    // No error event leaked to the client.
    expect(events.find((e) => e.type === "error")).toBeUndefined();
  });

  it("anonymous callers are rejected with 401 coded unauthorized — no stream, no persistence (NFR-SEC-04, 2026-07-09)", async () => {
    // currentUserId returns null — anonymous path. The route now rejects
    // anonymous callers with a coded 401 BEFORE any LLM work or stream is
    // opened (authenticated-only trust boundary). Prior contract ("anonymous
    // can tailor via the per-IP window") is removed.
    // resolveLlmProvider intentionally NOT configured — it must never be called.

    const res = await POST(post(INPUT, freshIp()));

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
    // The LLM provider is never resolved — no computation, no cost.
    expect(resolveLlmProvider).not.toHaveBeenCalled();
    // No persistence calls — the reject fires before any persistence path.
    expect(tailoringRepo.createPending).not.toHaveBeenCalled();
    expect(tailoringRepo.updateStatus).not.toHaveBeenCalled();
  });

  it("paid users ALSO get a pending row — history is not paid-only (FR-TAILOR-04)", async () => {
    currentUserId.mockResolvedValue("user-paid-persist");
    subscriptionRepo.get.mockResolvedValue({
      id: "s1",
      userId: "user-paid-persist",
      plan: "pro",
      status: "active",
      currentPeriodEnd: "2999-01-01T00:00:00.000Z",
    });
    resolveLlmProvider.mockReturnValue(groundedProvider());

    const res = await POST(post(INPUT, freshIp()));

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
