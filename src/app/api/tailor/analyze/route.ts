// POST /api/tailor/analyze — the wizard's analysis phase as its own NDJSON
// route (add-resume-wizard design.md §1, FR-WIZARD-01): parse-cv →
// extract-requirements → score → derive-clarifying-questions, streamed the
// same shape as /api/tailor. Terminal event is "analysis" (checklist + match
// score + clarifying questions), never "result" — nothing is generated yet,
// so nothing here is NFR-COST-02 budget-worthy; /api/tailor/generate is the
// route that actually spends a tailoring (design.md's budget-gating call).
//
// Authenticated-only (user decision 2026-07-09, revises NFR-SEC-04): an
// anonymous caller is rejected with a coded 401 BEFORE any LLM work, mirroring
// /api/tailor and /api/tailor/generate. The /tailor page's sign-in redirect is
// UX only; a devtools/script caller with no session is refused here.
import { currentUserId } from "@/app/auth";
import { runAnalysisPhase } from "@/features/run-tailoring";
import type { AnalysisEvent, TailoringRunInput } from "@/features/run-tailoring";
import { resolveLlmProvider } from "@/shared/lib/llm";

export const runtime = "nodejs";
/** Mirrors /api/tailor: extract is one adaptive-thinking call, but give it headroom over a short window. */
export const maxDuration = 120;

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

  // Caller identity, resolved BEFORE the LLM provider (NFR-SEC-04). A broken
  // session read degrades to anonymous — which is now REJECTED, not throttled.
  let userId: string | null = null;
  try {
    userId = await currentUserId();
  } catch {
    userId = null;
  }
  // Authenticated-only trust boundary (user decision 2026-07-09): reject an
  // anonymous caller with a coded 401 before any LLM work or stream is opened
  // (NFR-SEC-04). The /tailor page's sign-in redirect is UX only; a
  // devtools/script caller with no session is refused here.
  if (userId === null) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: AnalysisEvent): void => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      try {
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
