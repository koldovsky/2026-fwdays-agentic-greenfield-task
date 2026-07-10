// streamGenerate wraps the shared NDJSON reader for /api/tailor/generate — the
// chunk-boundary logic is covered by stream-tailoring.test.ts, so this verifies
// the result event round-trips and a non-ok response degrades to one calm
// failed event (NFR-OBS-01).
import { afterEach, describe, expect, it, vi } from "vitest";

import type { GenerationEvent, GenerationPhaseInput } from "../lib/loop";
import { streamGenerate } from "./stream-generate";

const INPUT: GenerationPhaseInput = {
  cvProfile: { skills: [], sentences: [] },
  requirements: [],
  jobDescription: "jd",
  confirmedAnswers: [],
  checklist: [],
  matchScore: 0,
};

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

async function collect(): Promise<GenerationEvent[]> {
  const out: GenerationEvent[] = [];
  for await (const e of streamGenerate(INPUT)) out.push(e);
  return out;
}

afterEach(() => vi.unstubAllGlobals());

describe("streamGenerate", () => {
  it("yields the terminal result event", async () => {
    const result: GenerationEvent = {
      type: "result",
      result: { checklist: [], bullets: [], matchScore: 77 },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        okResponse([JSON.stringify({ type: "status", phase: "processing" }), JSON.stringify(result)]),
      ),
    );

    const events = await collect();
    expect(events.at(-1)).toEqual(result);
  });

  it("yields one calm failed event on a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 500 })));
    expect(await collect()).toEqual([{ type: "error", code: "failed" }]);
  });
});
