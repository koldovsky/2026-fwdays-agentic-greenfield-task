// Inline tailoring route (add-agent-loop task 3.3, FR-TAILOR-01/02). Runs the
// bounded agent loop and streams its events to the client as NDJSON — one JSON
// event per line — so progress and the result surface as they are produced
// (NFR-PERF-01/02). This is the MVP path; the loop moves to a BullMQ worker
// later (system-design.md §3). Node runtime: the Claude adapter uses the
// Anthropic Node SDK.
import { runTailoringLoop } from "@/features/run-tailoring";
import type { TailorRunEvent, TailoringRunInput } from "@/features/run-tailoring";
import { resolveLlmProvider } from "@/shared/lib/llm";

export const runtime = "nodejs";
/** The loop is bounded, but streaming can outlast a default serverless window. */
export const maxDuration = 60;

const encoder = new TextEncoder();

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  // Coerce missing/typed-wrong fields to "" so the loop emits a calm
  // `empty_input` event rather than throwing (NFR-OBS-01).
  const { cvText, jdText } = (body ?? {}) as { cvText?: unknown; jdText?: unknown };
  const input: TailoringRunInput = {
    cvText: typeof cvText === "string" ? cvText : "",
    jdText: typeof jdText === "string" ? jdText : "",
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: TailorRunEvent): void => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      // Resolve the provider inside the stream: a missing key / bad config
      // throws here, and must surface as a calm failure event on the open
      // stream — never a raw 500 or a blank body (NFR-OBS-01). No user id or
      // account metadata is ever passed to the loop (NFR-SEC-02).
      try {
        const llm = resolveLlmProvider();
        for await (const event of runTailoringLoop({ llm }, input)) {
          send(event);
        }
      } catch {
        send({ type: "error", code: "failed" });
        send({ type: "status", phase: "failed" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    },
  });
}
