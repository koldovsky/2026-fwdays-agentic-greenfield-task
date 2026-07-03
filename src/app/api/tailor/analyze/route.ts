// POST /api/tailor/analyze — the wizard's analysis phase as its own NDJSON
// route (add-resume-wizard design.md §1, FR-WIZARD-01): parse-cv →
// extract-requirements → score → derive-clarifying-questions, streamed the
// same shape as /api/tailor. Terminal event is "analysis" (checklist + match
// score + clarifying questions), never "result" — nothing is generated yet,
// so nothing here is NFR-COST-02 budget-worthy; /api/tailor/generate is the
// route that actually spends a tailoring (design.md's budget-gating call).
//
// This still costs one real LLM call (extract-requirements), so it gets its
// own generous, stateless per-IP anti-abuse cap — a namespace DISTINCT from
// both /api/tailor's and /api/tailor/generate's shared NFR-COST-02 budget
// key ("tailor:ip:"), so probing this endpoint can never itself consume (or
// be confused with) a caller's actual tailoring budget. Every attempt
// counts, success or fail — no release path, same "every attempt counts"
// precedent as src/app/api/cv/parse/route.ts. No session/subscription
// lookup: this route stays fast and stateless (NFR-SEC-04).
import { runAnalysisPhase } from "@/features/run-tailoring";
import type { AnalysisEvent, TailoringRunInput } from "@/features/run-tailoring";
import { resolveLlmProvider } from "@/shared/lib/llm";
import { clientIpFrom, reserveHitInMemory } from "@/shared/lib/rate-limit";

export const runtime = "nodejs";
/** Mirrors /api/tailor: the phase is bounded, but streaming can outlast a default serverless window. */
export const maxDuration = 60;

/** Generous anti-abuse cap, not a product limit (NFR-SEC-04): 10 analyses per IP per hour. */
const ANALYZE_LIMIT = 10;
const ANALYZE_WINDOW_MS = 60 * 60 * 1000;

const encoder = new TextEncoder();

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  // Coerce missing/typed-wrong fields to "" so the phase emits a calm
  // `empty_input` event rather than throwing (NFR-OBS-01).
  const { cvText, jdText } = (body ?? {}) as { cvText?: unknown; jdText?: unknown };
  const input: TailoringRunInput = {
    cvText: typeof cvText === "string" ? cvText : "",
    jdText: typeof jdText === "string" ? jdText : "",
  };

  const clientIp = clientIpFrom(
    request.headers.get("x-forwarded-for"),
    request.headers.get("x-real-ip"),
  );
  // Distinct namespace from "tailor:ip:" (the shared /api/tailor +
  // /api/tailor/generate NFR-COST-02 budget key) — this is a separate,
  // non-budget anti-abuse cap only.
  const rateKey = `analyze:ip:${clientIp}`;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AnalysisEvent): void => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      try {
        // Gate before the provider is even resolved, so a throttled request
        // never touches the LLM (NFR-SEC-04). Every attempt counts, success
        // or fail — no release path (mirrors cv/parse/route.ts).
        if (!reserveHitInMemory(rateKey, ANALYZE_WINDOW_MS, ANALYZE_LIMIT).allowed) {
          send({ type: "error", code: "rate_limited" });
          send({ type: "status", phase: "failed" });
          return;
        }

        // Resolve the provider inside the stream: a missing key / bad config
        // throws here, and must surface as a calm failure event on the open
        // stream — never a raw 500 or a blank body (NFR-OBS-01). No user id
        // or account metadata is ever passed to the phase (NFR-SEC-02).
        const llm = resolveLlmProvider();
        for await (const event of runAnalysisPhase({ llm }, input)) {
          send(event);
        }
      } catch (error) {
        // Server-side only — the client always gets the same calm coded
        // event regardless of cause (NFR-OBS-01 protects the end user, not
        // the operator debugging a report of "it just says failed").
        console.error("[api/tailor/analyze] run failed", error);
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
