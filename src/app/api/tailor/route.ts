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
// never a raw 429 that breaks the streaming contract (NFR-OBS-01).
//
// Budget is RESERVED before the LLM call, not charged after it (the previous
// shape — read the count, run the LLM, then record a hit — left a window the
// full length of the tailoring run in which concurrent requests from the same
// caller all read "under the limit" and all got admitted; reserveHitInMemory
// / usageCounterRepo.reserve fold the check and the write into one atomic
// step so that can't happen). A reservation that doesn't end in a `result`
// event is rolled back — failed runs never consume budget (FR-TAILOR-03).
import { currentUserId } from "@/app/auth";
import { hasPaidAccess } from "@/entities/subscription";
import { ANON_TAILORING_LIMIT, FREE_TAILORING_LIMIT, type AccountKind } from "@/entities/usage-counter";
import { runTailoringLoop } from "@/features/run-tailoring";
import type { TailorRunEvent, TailoringRunInput } from "@/features/run-tailoring";
import { createSubscriptionRepo, createUsageCounterRepo } from "@/shared/lib/db";
import { getDb } from "@/shared/lib/db/pg";
import { resolveLlmProvider } from "@/shared/lib/llm";
import { clientIpFrom, releaseHitInMemory, reserveHitInMemory } from "@/shared/lib/rate-limit";

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

      // Set only when a reservation was actually granted; used to roll it
      // back if the run doesn't end in a `result` event.
      let releaseReservation: (() => Promise<void>) | null = null;
      // Set only for a paid user — their runs aren't gated by the counter,
      // but a successful one is still tallied (unconditional, non-gating
      // increment; no atomicity concerns since nothing depends on the value).
      let paidTallyUserId: string | null = null;
      try {
        // Gate before the provider is even resolved, so a throttled request
        // never touches the LLM (NFR-COST-02). Each branch reserves budget
        // atomically — check and record happen in one step, so no window
        // exists for a concurrent request to slip through.
        if (userId === null) {
          const reservation = reserveHitInMemory(anonKey, ANON_WINDOW_MS, ANON_TAILORING_LIMIT);
          if (!reservation.allowed) {
            rejectRateLimited();
            return;
          }
          const token = reservation.token as number;
          releaseReservation = async () => releaseHitInMemory(anonKey, ANON_WINDOW_MS, token);
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
          if (kind === "paid") {
            paidTallyUserId = userId;
          } else {
            // Free accounts reserve against the durable lifetime counter.
            const counters = createUsageCounterRepo(getDb());
            const granted = await counters.reserve(userId, FREE_TAILORING_LIMIT);
            if (!granted) {
              rejectRateLimited();
              return;
            }
            releaseReservation = () => counters.release(userId);
          }
        }

        // Resolve the provider inside the stream: a missing key / bad config
        // throws here, and must surface as a calm failure event on the open
        // stream — never a raw 500 or a blank body (NFR-OBS-01). No user id
        // or account metadata is ever passed to the loop (NFR-SEC-02).
        const llm = resolveLlmProvider();
        let succeeded = false;
        for await (const event of runTailoringLoop({ llm }, input)) {
          if (event.type === "result") succeeded = true;
          send(event);
        }
        if (succeeded) {
          if (paidTallyUserId !== null) await createUsageCounterRepo(getDb()).increment(paidTallyUserId);
        } else if (releaseReservation) {
          // The reservation already charged the budget up front; a run that
          // never produced a result must refund it (FR-TAILOR-03).
          await releaseReservation();
        }
      } catch (error) {
        // Server-side only — the client always gets the same calm coded
        // event regardless of cause (NFR-OBS-01 protects the end user, not
        // the operator debugging a report of "it just says failed").
        console.error("[api/tailor] run failed", error);
        if (releaseReservation) {
          try {
            await releaseReservation();
          } catch {
            // Best-effort refund; the calm failure event below still fires.
          }
        }
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
