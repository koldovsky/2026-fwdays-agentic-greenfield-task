// streamAnalyze wraps the shared NDJSON reader for /api/tailor/analyze — the
// chunk-boundary logic itself is covered by stream-tailoring.test.ts, so this
// verifies the analyze terminal event round-trips and a non-ok response
// degrades to one calm failed event (NFR-OBS-01).
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AnalysisEvent } from "../lib/loop";
import { streamAnalyze } from "./stream-analyze";

function okResponse(lines: readonly string[]): Response {
  const encoder = new TextEncoder();
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(lines.map((l) => `${l}\n`).join("")));
        controller.close();
      },
    }),
    { status: 200 },
  );
}

async function collect(): Promise<AnalysisEvent[]> {
  const out: AnalysisEvent[] = [];
  for await (const e of streamAnalyze({ cvText: "cv", jdText: "jd" })) out.push(e);
  return out;
}

afterEach(() => vi.unstubAllGlobals());

describe("streamAnalyze", () => {
  it("yields the terminal analysis event", async () => {
    const analysis: AnalysisEvent = {
      type: "analysis",
      checklist: [],
      matchScore: 42,
      cvProfile: { skills: [], sentences: [] },
      requirements: [],
      clarifyingQuestions: [],
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        okResponse([JSON.stringify({ type: "status", phase: "queued" }), JSON.stringify(analysis)]),
      ),
    );

    const events = await collect();
    expect(events.at(-1)).toEqual(analysis);
  });

  it("yields one calm failed event on a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 500 })));
    expect(await collect()).toEqual([{ type: "error", code: "failed" }]);
  });
});
