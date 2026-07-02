// Route-level tests for POST /api/tailor (FR-TAILOR-01/02, NFR-OBS-01). Only
// resolveLlmProvider is mocked (spread importOriginal, override that one fn) so
// the real loop, prompt builders, and parsers run unchanged against the fake
// provider — no ANTHROPIC_API_KEY, no network, no DB.
import { beforeEach, describe, expect, it, vi } from "vitest";

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

function post(body: unknown): Request {
  return new Request("http://localhost/api/tailor", {
    method: "POST",
    headers: { "content-type": "application/json" },
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
});

describe("POST /api/tailor", () => {
  it("streams NDJSON events ending in a result + done (FR-TAILOR-01/02)", async () => {
    resolveLlmProvider.mockReturnValue(groundedProvider());

    const res = await POST(post(INPUT));

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

    const res = await POST(post(INPUT));

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

    const res = await POST(post({ cvText: "", jdText: "" }));

    const events = await readNdjson(res);
    expect(events).toContainEqual({ type: "error", code: "empty_input" });
    expect(events.at(-1)).toEqual({ type: "status", phase: "failed" });
    // The loop short-circuits on empty input before any LLM call.
    expect(provider.calls).toHaveLength(0);
  });
});
