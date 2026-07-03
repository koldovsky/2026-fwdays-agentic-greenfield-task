// Inline tailoring route (add-agent-loop task 3.3, FR-TAILOR-01/02). Runs the
// bounded agent loop and streams its events to the client as NDJSON — one JSON
// event per line — so progress and the result surface as they are produced
// (NFR-PERF-01/02). This is the MVP path; the loop moves to a BullMQ worker
// later (system-design.md §3). Node runtime: the Claude adapter uses the
// Anthropic Node SDK.
//
// Abuse gating (add-security-hardening, NFR-COST-02, NFR-SEC-04): the caller's
// account kind and IP are resolved before any LLM work. Anonymous callers get
// a per-IP sliding window (in-memory, single-instance stopgap — design.md);
// logged-in callers are gated by the durable usage counter. An over-limit
// request emits a calm `rate_limited` event on the normal 200 NDJSON stream —
// never a raw 429 that breaks the streaming contract (NFR-OBS-01) — and only a
// successful `result` charges the budget (mirrors FR-TAILOR-03).
import { currentUserId } from "@/app/auth";
import { hasPaidAccess } from "@/entities/subscription";
import { ANON_TAILORING_LIMIT, canTailor, type AccountKind } from "@/entities/usage-counter";
import { runTailoringLoop } from "@/features/run-tailoring";
import type { TailorRunEvent, TailoringRunInput } from "@/features/run-tailoring";
import { createSubscriptionRepo, createUsageCounterRepo } from "@/shared/lib/db";
import { getDb } from "@/shared/lib/db/pg";
import { resolveLlmProvider } from "@/shared/lib/llm";
import {
  checkRateLimitInMemory,
  clientIpFrom,
  recordRateLimitHitInMemory,
} from "@/shared/lib/rate-limit";

export const runtime = "nodejs";
/** The loop is bounded, but streaming can outlast a default serverless window. */
export const maxDuration = 60;

/** Anonymous per-IP window: ANON_TAILORING_LIMIT per 24 h (NFR-COST-02). */
const ANON_WINDOW_MS = 24 * 60 * 60 * 1000;

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

  // Caller identity, resolved BEFORE the LLM provider (NFR-SEC-04). A broken
  // session read degrades to anonymous — the stricter limit — never a raw 500.
  let userId: string | null = null;
  try {
    userId = await currentUserId();
  } catch {
    userId = null;
  }
  const clientIp = clientIpFrom(
    request.headers.get("x-forwarded-for"),
    request.headers.get("x-real-ip"),
  );
  const anonKey = `tailor:ip:${clientIp}`;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: TailorRunEvent): void => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      const rejectRateLimited = (): void => {
        send({ type: "error", code: "rate_limited" });
        send({ type: "status", phase: "failed" });
      };

      // Resolve the provider inside the stream: a missing key / bad config
      // throws here, and must surface as a calm failure event on the open
      // stream — never a raw 500 or a blank body (NFR-OBS-01). No user id or
      // account metadata is ever passed to the loop (NFR-SEC-02).
      try {
        // Gate before the provider is even resolved, so a throttled request
        // never touches the LLM (NFR-COST-02). Both checks are read-only — a
        // rejected request is never charged.
        if (userId === null) {
          const verdict = checkRateLimitInMemory(anonKey, ANON_WINDOW_MS, ANON_TAILORING_LIMIT);
          if (!verdict.allowed) {
            rejectRateLimited();
            return;
          }
        } else {
          // Real plan lookup (add-payments-emulator task 2.2, NFR-COST-02):
          // an active — or canceled-but-not-yet-lapsed (FR-BILLING-02) — paid
          // subscription lifts the lifetime cap. An unreadable subscription
          // degrades to the stricter "free" gate, never a raw failure.
          let kind: AccountKind = "free";
          try {
            const subscription = await createSubscriptionRepo(getDb()).get(userId);
            if (hasPaidAccess(subscription, new Date().toISOString())) kind = "paid";
          } catch {
            kind = "free";
          }
          // Paid is unlimited (canTailor short-circuits) — skip the counter
          // read; free accounts are gated by the durable lifetime counter.
          if (kind !== "paid") {
            const counters = createUsageCounterRepo(getDb());
            const counter = (await counters.get(userId)) ?? { userId, tailoringsUsed: 0 };
            if (!canTailor(counter, kind)) {
              rejectRateLimited();
              return;
            }
          }
        }

        const llm = resolveLlmProvider();
        let charged = false;
        for await (const event of runTailoringLoop({ llm }, input)) {
          // Charge exactly once, only when a real result was produced — failed
          // runs never consume budget (FR-TAILOR-03) — and before forwarding
          // it, so a client that disconnects mid-stream is still charged.
          if (event.type === "result" && !charged) {
            charged = true;
            if (userId === null) {
              recordRateLimitHitInMemory(anonKey, ANON_WINDOW_MS);
            } else {
              await createUsageCounterRepo(getDb()).increment(userId);
            }
          }
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
