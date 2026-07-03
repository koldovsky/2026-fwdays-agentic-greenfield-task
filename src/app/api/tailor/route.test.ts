// Route-level tests for POST /api/tailor (FR-TAILOR-01/02, NFR-OBS-01, and the
// add-security-hardening gates: NFR-COST-02, NFR-SEC-04). Only
// resolveLlmProvider is mocked (spread importOriginal, override that one fn) so
// the real loop, prompt builders, and parsers run unchanged against the fake
// provider — no ANTHROPIC_API_KEY, no network. The session (currentUserId) and
// the usage-counter repo are mocked; the anonymous per-IP limiter runs for real
// against its module-level in-memory store, so every test uses its own IP to
// stay isolated.
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ANON_TAILORING_LIMIT, FREE_TAILORING_LIMIT } from "@/entities/usage-counter";
import type { TailorRunEvent } from "@/features/run-tailoring";
import {
  createFakeProvider,
  fakeExtraction,
  fakeGeneration,
  fakeGrounding,
} from "@/shared/lib/llm/testing/fake-provider";

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
vi.mock("@/shared/lib/db", () => ({
  createUsageCounterRepo: () => usageCounterRepo,
  createSubscriptionRepo: () => subscriptionRepo,
}));
vi.mock("@/shared/lib/db/pg", () => ({ getDb: vi.fn(() => ({})) }));

import { POST } from "./route";

const INPUT = { cvText: "Навички: React\nБудував застосунки на React.", jdText: "Шукаємо React інженера." };

/** A fully-grounded single-bullet script so a real run produces a result. */
function groundedProvider() {
  return createFakeProvider({
    extraction: fakeExtraction([
      { id: "r1", text: "React", importance: "must-have", keywords: ["react"] },
    ]),
    generation: fakeGeneration([
      { id: "b1", text: "Побудував застосунок на React.", sourceSentence: "Будував застосунки на React." },
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

beforeEach(() => {
  vi.clearAllMocks();
  currentUserId.mockResolvedValue(null);
  usageCounterRepo.increment.mockResolvedValue(undefined);
  usageCounterRepo.reserve.mockResolvedValue(true);
  usageCounterRepo.release.mockResolvedValue(undefined);
  subscriptionRepo.get.mockResolvedValue(null); // default: never paid (Free)
});

describe("POST /api/tailor", () => {
  it("streams NDJSON events ending in a result + done (FR-TAILOR-01/02)", async () => {
    resolveLlmProvider.mockReturnValue(groundedProvider());

    const res = await POST(post(INPUT, "203.0.113.10"));

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/x-ndjson");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("cache-control")).toBe("no-store");

    const events = await readNdjson(res);
    // Every line is a valid JSON event; the stream begins queued and ends done.
    expect(events[0]).toEqual({ type: "status", phase: "queued" });
    expect(events.at(-1)).toEqual({ type: "status", phase: "done" });

    const result = events.find((e) => e.type === "result");
    expect(result?.type).toBe("result");
    if (result?.type === "result") {
      expect(result.result.bullets).toHaveLength(1);
      expect(result.result.checklist).toHaveLength(1);
      expect(typeof result.result.matchScore).toBe("number");
    }
  });

  it("fails calm on the open stream when the provider can't be resolved (NFR-OBS-01)", async () => {
    resolveLlmProvider.mockImplementation(() => {
      throw new Error("ANTHROPIC_API_KEY is not set");
    });

    const res = await POST(post(INPUT, "203.0.113.11"));

    // Stream still opens (200) — the failure surfaces as events, not a raw 500.
    expect(res.status).toBe(200);
    const events = await readNdjson(res);
    expect(events).toContainEqual({ type: "error", code: "failed" });
    expect(events.at(-1)).toEqual({ type: "status", phase: "failed" });
    expect(events.find((e) => e.type === "result")).toBeUndefined();
  });

  it("rejects a non-JSON body with 400 invalid_body", async () => {
    const res = await POST(
      new Request("http://localhost/api/tailor", { method: "POST", body: "not json" }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_body" });
    // The provider is never resolved for a malformed request.
    expect(resolveLlmProvider).not.toHaveBeenCalled();
  });

  it("emits empty_input for blank cv/jd without calling the LLM", async () => {
    const provider = groundedProvider();
    resolveLlmProvider.mockReturnValue(provider);

    const res = await POST(post({ cvText: "", jdText: "" }, "203.0.113.12"));

    const events = await readNdjson(res);
    expect(events).toContainEqual({ type: "error", code: "empty_input" });
    expect(events.at(-1)).toEqual({ type: "status", phase: "failed" });
    // The loop short-circuits on empty input before any LLM call.
    expect(provider.calls).toHaveLength(0);
  });
});

describe("POST /api/tailor gating (NFR-COST-02, NFR-SEC-04)", () => {
  it("blocks an anonymous second run from the same IP with a calm rate_limited stream", async () => {
    resolveLlmProvider.mockReturnValue(groundedProvider());
    const first = await POST(post(INPUT, "198.51.100.1"));
    expect((await readNdjson(first)).find((e) => e.type === "result")).toBeDefined();

    resolveLlmProvider.mockClear();
    const second = await POST(post(INPUT, "198.51.100.1"));

    // Normal 200 NDJSON stream, not a raw 429 (NFR-OBS-01).
    expect(second.status).toBe(200);
    const events = await readNdjson(second);
    expect(events).toContainEqual({ type: "error", code: "rate_limited" });
    expect(events.at(-1)).toEqual({ type: "status", phase: "failed" });
    expect(events.find((e) => e.type === "result")).toBeUndefined();
    // The LLM provider is never even resolved for a throttled request.
    expect(resolveLlmProvider).not.toHaveBeenCalled();
  });

  it("caps concurrent anonymous requests from the same IP at the limit — the race a check-then-record-later gate allows", async () => {
    resolveLlmProvider.mockReturnValue(groundedProvider());
    const ip = "198.51.100.30";

    const responses = await Promise.all(Array.from({ length: 5 }, () => POST(post(INPUT, ip))));
    const allEvents = await Promise.all(responses.map(readNdjson));
    const successCount = allEvents.filter((events) => events.some((e) => e.type === "result")).length;

    expect(successCount).toBe(ANON_TAILORING_LIMIT);
  });

  it("does not charge the anonymous per-IP window for a failed run (FR-TAILOR-03)", async () => {
    resolveLlmProvider.mockImplementation(() => {
      throw new Error("ANTHROPIC_API_KEY is not set");
    });
    const failed = await POST(post(INPUT, "198.51.100.2"));
    expect(await readNdjson(failed)).toContainEqual({ type: "error", code: "failed" });

    // Same IP retries and succeeds — the failed attempt consumed nothing.
    resolveLlmProvider.mockReturnValue(groundedProvider());
    const retry = await POST(post(INPUT, "198.51.100.2"));
    const events = await readNdjson(retry);
    expect(events.find((e) => e.type === "result")).toBeDefined();
  });

  it("blocks a logged-in free user at the lifetime limit before the LLM", async () => {
    currentUserId.mockResolvedValue("user-1");
    usageCounterRepo.reserve.mockResolvedValue(false); // already at the limit

    const res = await POST(post(INPUT, "198.51.100.3"));

    expect(res.status).toBe(200);
    const events = await readNdjson(res);
    expect(events).toContainEqual({ type: "error", code: "rate_limited" });
    expect(events.at(-1)).toEqual({ type: "status", phase: "failed" });
    expect(resolveLlmProvider).not.toHaveBeenCalled();
    // A rejected reservation is never charged, and there is nothing to release.
    expect(usageCounterRepo.increment).not.toHaveBeenCalled();
    expect(usageCounterRepo.release).not.toHaveBeenCalled();
  });

  it("reserves a logged-in free user's budget atomically before the LLM runs, and doesn't double-charge on success", async () => {
    currentUserId.mockResolvedValue("user-2");
    resolveLlmProvider.mockReturnValue(groundedProvider());

    const res = await POST(post(INPUT, "198.51.100.4"));

    const events = await readNdjson(res);
    expect(events.find((e) => e.type === "result")).toBeDefined();
    expect(usageCounterRepo.reserve).toHaveBeenCalledTimes(1);
    expect(usageCounterRepo.reserve).toHaveBeenCalledWith("user-2", FREE_TAILORING_LIMIT);
    // The reservation already counted the run — no separate charge, no release.
    expect(usageCounterRepo.increment).not.toHaveBeenCalled();
    expect(usageCounterRepo.release).not.toHaveBeenCalled();
  });

  it("releases a logged-in free user's reservation when the run fails (FR-TAILOR-03)", async () => {
    currentUserId.mockResolvedValue("user-3");
    resolveLlmProvider.mockImplementation(() => {
      throw new Error("boom");
    });

    const res = await POST(post(INPUT, "198.51.100.5"));

    const events = await readNdjson(res);
    expect(events.at(-1)).toEqual({ type: "status", phase: "failed" });
    expect(events.find((e) => e.type === "result")).toBeUndefined();
    expect(usageCounterRepo.reserve).toHaveBeenCalledWith("user-3", FREE_TAILORING_LIMIT);
    expect(usageCounterRepo.release).toHaveBeenCalledWith("user-3");
    expect(usageCounterRepo.increment).not.toHaveBeenCalled();
  });

  it("lifts the lifetime cap for an active paid subscription (task 2.2, NFR-COST-02)", async () => {
    currentUserId.mockResolvedValue("user-paid");
    subscriptionRepo.get.mockResolvedValue({
      id: "s1",
      userId: "user-paid",
      plan: "pro",
      status: "active",
      currentPeriodEnd: "2999-01-01T00:00:00.000Z",
    });
    resolveLlmProvider.mockReturnValue(groundedProvider());

    const res = await POST(post(INPUT, "198.51.100.7"));

    const events = await readNdjson(res);
    expect(events.find((e) => e.type === "result")).toBeDefined();
    // Paid is unlimited: the reservation gate is skipped entirely...
    expect(usageCounterRepo.reserve).not.toHaveBeenCalled();
    // ...but successful runs are still tallied (non-gating, no reservation).
    expect(usageCounterRepo.increment).toHaveBeenCalledWith("user-paid");
  });

  it("still honors a canceled subscription until its period end (FR-BILLING-02)", async () => {
    currentUserId.mockResolvedValue("user-canceled");
    subscriptionRepo.get.mockResolvedValue({
      id: "s2",
      userId: "user-canceled",
      plan: "job_hunt_pass",
      status: "canceled",
      currentPeriodEnd: "2999-01-01T00:00:00.000Z",
    });
    resolveLlmProvider.mockReturnValue(groundedProvider());

    const res = await POST(post(INPUT, "198.51.100.8"));

    expect((await readNdjson(res)).find((e) => e.type === "result")).toBeDefined();
  });

  it("gates a lapsed subscription like Free — downgrade at period end", async () => {
    currentUserId.mockResolvedValue("user-lapsed");
    subscriptionRepo.get.mockResolvedValue({
      id: "s3",
      userId: "user-lapsed",
      plan: "pro",
      status: "canceled",
      currentPeriodEnd: "2020-01-01T00:00:00.000Z",
    });
    usageCounterRepo.reserve.mockResolvedValue(false); // simulate already at the free limit

    const res = await POST(post(INPUT, "198.51.100.9"));

    const events = await readNdjson(res);
    expect(events).toContainEqual({ type: "error", code: "rate_limited" });
    expect(resolveLlmProvider).not.toHaveBeenCalled();
    expect(usageCounterRepo.reserve).toHaveBeenCalledWith("user-lapsed", FREE_TAILORING_LIMIT);
  });

  it("degrades a broken subscription read to the stricter free gate (NFR-OBS-01)", async () => {
    currentUserId.mockResolvedValue("user-db-down");
    subscriptionRepo.get.mockRejectedValue(new Error("connection refused"));
    usageCounterRepo.reserve.mockResolvedValue(false); // simulate already at the free limit

    const res = await POST(post(INPUT, "198.51.100.10"));

    expect(res.status).toBe(200);
    const events = await readNdjson(res);
    expect(events).toContainEqual({ type: "error", code: "rate_limited" });
    expect(events.at(-1)).toEqual({ type: "status", phase: "failed" });
    expect(usageCounterRepo.reserve).toHaveBeenCalledWith("user-db-down", FREE_TAILORING_LIMIT);
  });

  it("treats a broken session read as anonymous instead of failing (NFR-OBS-01)", async () => {
    currentUserId.mockRejectedValue(new Error("AUTH_SECRET is not set"));
    resolveLlmProvider.mockReturnValue(groundedProvider());

    const res = await POST(post(INPUT, "198.51.100.6"));

    expect(res.status).toBe(200);
    const events = await readNdjson(res);
    expect(events.find((e) => e.type === "result")).toBeDefined();
    // Anonymous path: the durable counter is never touched.
    expect(usageCounterRepo.reserve).not.toHaveBeenCalled();
    expect(usageCounterRepo.increment).not.toHaveBeenCalled();
  });
});
