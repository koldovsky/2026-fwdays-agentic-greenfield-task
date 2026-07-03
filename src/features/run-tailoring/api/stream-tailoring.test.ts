// Tests for the client NDJSON reader (FR-TAILOR-01/02). `fetch` is stubbed with
// a real ReadableStream so the chunk-boundary / buffering logic runs for real —
// only the network call itself is faked.
import { afterEach, describe, expect, it, vi } from "vitest";

import type { TailorRunEvent } from "../model/types";
import { streamTailoring } from "./stream-tailoring";

function streamOf(chunks: readonly string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

function okResponse(chunks: readonly string[]): Response {
  return new Response(streamOf(chunks), {
    status: 200,
    headers: { "content-type": "application/x-ndjson" },
  });
}

async function collect(input = { cvText: "cv", jdText: "jd" }): Promise<TailorRunEvent[]> {
  const events: TailorRunEvent[] = [];
  for await (const event of streamTailoring(input)) events.push(event);
  return events;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("streamTailoring", () => {
  it("parses multiple NDJSON lines delivered in one chunk", async () => {
    const line1 = JSON.stringify({ type: "status", phase: "queued" });
    const line2 = JSON.stringify({ type: "status", phase: "processing" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(okResponse([`${line1}\n${line2}\n`])));

    const events = await collect();
    expect(events).toEqual([
      { type: "status", phase: "queued" },
      { type: "status", phase: "processing" },
    ]);
  });

  it("parses a JSON line split across two stream chunks", async () => {
    const line = JSON.stringify({ type: "status", phase: "done" });
    const mid = Math.floor(line.length / 2);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(okResponse([line.slice(0, mid), `${line.slice(mid)}\n`])),
    );

    const events = await collect();
    expect(events).toEqual([{ type: "status", phase: "done" }]);
  });

  it("yields exactly one calm failed event on a non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 500 })),
    );

    const events = await collect();
    expect(events).toEqual([{ type: "error", code: "failed" }]);
  });
});
