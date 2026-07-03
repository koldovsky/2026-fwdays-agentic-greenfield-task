// Route-level tests for POST /api/tailor/analyze (FR-WIZARD-01, NFR-OBS-01,
// NFR-SEC-04). Only resolveLlmProvider is mocked (spread importOriginal,
// override that one fn) so the real analysis phase, prompt builders, and
// parsers run unchanged against the fake provider — no ANTHROPIC_API_KEY, no
// network. This route has no session/subscription lookup (design.md's
// budget-gating call — analysis isn't NFR-COST-02 budget-worthy), so nothing
// else needs mocking; the anti-abuse limiter runs for real against its
// module-level in-memory store, so every test uses its own IP to stay
// isolated.
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AnalysisEvent } from "@/features/run-tailoring";
import { createFakeProvider, fakeExtraction } from "@/shared/lib/llm/testing/fake-provider";

const resolveLlmProvider = vi.hoisted(() => vi.fn());

vi.mock("@/shared/lib/llm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/lib/llm")>();
  return { ...actual, resolveLlmProvider };
});

import { POST } from "./route";

const INPUT = {
  cvText: "Навички: React\nБудував застосунки на React.",
  jdText: "Шукаємо React та Kubernetes інженера.",
};

/** One met requirement (React) and one gap (Kubernetes) so the terminal
 * event's clarifyingQuestions is provably non-empty (FR-WIZARD-02). */
function analysisProvider() {
  return createFakeProvider({
    extraction: fakeExtraction([
      { id: "r1", text: "React", importance: "must-have", keywords: ["react"] },
      { id: "r2", text: "Kubernetes", importance: "nice-to-have", keywords: ["kubernetes"] },
    ]),
  });
}

function post(body: unknown, ip: string): Request {
  return new Request("http://localhost/api/tailor/analyze", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

async function readNdjson(res: Response): Promise<AnalysisEvent[]> {
  const text = await res.text();
  return text
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line) as AnalysisEvent);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/tailor/analyze", () => {
  it("streams NDJSON events ending in a terminal analysis event carrying clarifyingQuestions (FR-WIZARD-01/02)", async () => {
    resolveLlmProvider.mockReturnValue(analysisProvider());

    const res = await POST(post(INPUT, "203.0.113.20"));

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/x-ndjson");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("cache-control")).toBe("no-store");

    const events = await readNdjson(res);
    expect(events[0]).toEqual({ type: "status", phase: "queued" });

    const analysis = events.find((e) => e.type === "analysis");
    expect(analysis?.type).toBe("analysis");
    if (analysis?.type === "analysis") {
      expect(analysis.checklist).toHaveLength(2);
      expect(typeof analysis.matchScore).toBe("number");
      expect(analysis.cvProfile.sentences.length).toBeGreaterThan(0);
      expect(analysis.requirements).toHaveLength(2);
      expect(analysis.clarifyingQuestions).toHaveLength(1);
      expect(analysis.clarifyingQuestions[0]?.requirementText).toBe("Kubernetes");
    }
    // AnalysisEvent's own type has no "result" variant — the analysis-only
    // route can never emit one, enforced at compile time, not just by test.
  });

  it("fails calm on the open stream when the provider can't be resolved (NFR-OBS-01)", async () => {
    resolveLlmProvider.mockImplementation(() => {
      throw new Error("ANTHROPIC_API_KEY is not set");
    });

    const res = await POST(post(INPUT, "203.0.113.21"));

    expect(res.status).toBe(200);
    const events = await readNdjson(res);
    expect(events).toContainEqual({ type: "error", code: "failed" });
    expect(events.at(-1)).toEqual({ type: "status", phase: "failed" });
  });

  it("rejects a non-JSON body with 400 invalid_body", async () => {
    const res = await POST(
      new Request("http://localhost/api/tailor/analyze", { method: "POST", body: "not json" }),
    );
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_body" });
    expect(resolveLlmProvider).not.toHaveBeenCalled();
  });

  it("emits empty_input for blank cv/jd without calling the LLM", async () => {
    const provider = analysisProvider();
    resolveLlmProvider.mockReturnValue(provider);

    const res = await POST(post({ cvText: "", jdText: "" }, "203.0.113.22"));

    const events = await readNdjson(res);
    expect(events).toContainEqual({ type: "error", code: "empty_input" });
    expect(events.at(-1)).toEqual({ type: "status", phase: "failed" });
    expect(provider.calls).toHaveLength(0);
  });

  it("caps repeated analyze attempts from the same IP with a distinct, generous anti-abuse limit (NFR-SEC-04)", async () => {
    resolveLlmProvider.mockReturnValue(analysisProvider());
    const ip = "203.0.113.23";

    for (let i = 0; i < 10; i += 1) {
      const res = await POST(post(INPUT, ip));
      const events = await readNdjson(res);
      expect(events.find((e) => e.type === "analysis")).toBeDefined();
    }

    resolveLlmProvider.mockClear();
    const blocked = await POST(post(INPUT, ip));

    // Normal 200 NDJSON stream, not a raw 429 (NFR-OBS-01).
    expect(blocked.status).toBe(200);
    const events = await readNdjson(blocked);
    expect(events).toContainEqual({ type: "error", code: "rate_limited" });
    expect(events.at(-1)).toEqual({ type: "status", phase: "failed" });
    // The 11th attempt never even resolves the LLM provider.
    expect(resolveLlmProvider).not.toHaveBeenCalled();
  });

  it("gates every attempt (success or fail) the same way cv/parse does — no release path", async () => {
    resolveLlmProvider.mockImplementation(() => {
      throw new Error("boom");
    });
    const ip = "203.0.113.24";

    for (let i = 0; i < 10; i += 1) {
      await POST(post(INPUT, ip));
    }

    // A working provider on the 11th attempt still gets blocked — the 10
    // earlier failed attempts consumed the cap, unlike the tailor route's
    // success-only budget.
    resolveLlmProvider.mockReturnValue(analysisProvider());
    const res = await POST(post(INPUT, ip));
    const events = await readNdjson(res);
    expect(events).toContainEqual({ type: "error", code: "rate_limited" });
  });
});
