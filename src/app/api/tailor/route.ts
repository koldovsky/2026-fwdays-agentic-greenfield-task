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
import type { TailorRunEvent, TailoringRunInput, TailoringRunResult } from "@/features/run-tailoring";
import {
  createJobDescriptionRepo,
  createSubscriptionRepo,
  createTailoringRepo,
  createUsageCounterRepo,
  type BulletInput,
  type ChecklistItemInput,
  type CompletePayload,
} from "@/shared/lib/db";
import { getDb, withTransaction } from "@/shared/lib/db/pg";
import { resolveLlmProvider } from "@/shared/lib/llm";
import { clientIpFrom, releaseHitInMemory, reserveHitInMemory } from "@/shared/lib/rate-limit";
import { extractJobTitle } from "@/shared/lib/scoring";

/**
 * Map a streamed tailoring result to the repo's completion payload
 * (persist-tailoring-lifecycle). Same mapping as /api/tailor/generate.
 */
function toCompletePayload(result: TailoringRunResult): CompletePayload {
  const checklist: ChecklistItemInput[] = result.checklist.map((row) => ({
    requirement: row.requirement.text,
    importance: row.requirement.importance === "must-have" ? "must" : "nice",
    status: row.item.status,
    rationale: row.item.rationale,
  }));
  const bullets: BulletInput[] = result.bullets.map((bullet) => ({
    text: bullet.text,
    grounding: bullet.grounding === "grounded" ? "met" : "overclaim",
    included: bullet.includedInExport,
  }));
  return { matchScore: result.matchScore, checklist, bullets };
}

export const runtime = "nodejs";
/**
 * The loop is bounded, but a full tailoring (extract → generate → ground×N,
 * each an adaptive-thinking Claude call) can outlast a short serverless window.
 * 300s is the Vercel Fluid/Pro ceiling; on plans capped lower this is clamped
 * down harmlessly. Keep effort low (see shared/lib/llm/claude.ts) so real runs
 * finish well inside this.
 */
export const maxDuration = 300;

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

      // Set only when a reservation was actually granted. Released ONLY on a
      // clean pre-LLM failure. Once the LLM loop starts, a non-result outcome is
      // a mid-run abandon that CONSUMES the slot (persist-tailoring-lifecycle,
      // FR-ONBOARD-01, NFR-COST-02) — the pending row + TTL cleanup close the
      // probe-the-cap window, so we do not refund it.
      let releaseReservation: (() => Promise<void>) | null = null;
      // Flips true the instant the LLM loop begins; after that, releasing the
      // reservation is forbidden (mid-run abandon keeps the slot).
      let llmStarted = false;
      // Set only for a paid user — their runs aren't gated by the counter,
      // but a successful one is still tallied (unconditional, non-gating
      // increment; no atomicity concerns since nothing depends on the value).
      let paidTallyUserId: string | null = null;
      // Persisted pending-row id for ALL logged-in users (free + paid), created
      // at run START before the LLM. null when creation was skipped (anonymous)
      // or failed best-effort — the run continues either way (NFR-OBS-01).
      let pendingId: string | null = null;
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

        // Persist a PENDING row at run START for ALL logged-in users (free +
        // paid), before the LLM (persist-tailoring-lifecycle, FR-TAILOR-04).
        // Best-effort: a failure is logged and the run continues with
        // pendingId=null — persistence NEVER blocks the result stream
        // (NFR-OBS-01). Only the JD row + non-PII job title are written; no CV
        // text / PII reaches the pending row (NFR-SEC-01).
        if (userId !== null) {
          const startUserId: string = userId;
          try {
            pendingId = await withTransaction(async (tx) => {
              const jd = await createJobDescriptionRepo(tx).save(startUserId, input.jdText);
              return createTailoringRepo(tx).createPending(
                startUserId,
                jd.id,
                extractJobTitle(input.jdText),
              );
            });
          } catch (pendingError) {
            console.error("[api/tailor] createPending failed", pendingError);
            pendingId = null;
          }
        }

        // Resolve the provider inside the stream: a missing key / bad config
        // throws here, and must surface as a calm failure event on the open
        // stream — never a raw 500 or a blank body (NFR-OBS-01). No user id
        // or account metadata is ever passed to the loop (NFR-SEC-02).
        const llm = resolveLlmProvider();
        let succeeded = false;
        let finalResult: TailoringRunResult | null = null;
        // Past this point the LLM budget is spent — no refund on abandon.
        llmStarted = true;
        for await (const event of runTailoringLoop({ llm }, input)) {
          if (event.type === "result") {
            succeeded = true;
            finalResult = event.result;
          }
          send(event);
        }
        if (succeeded) {
          // Best-effort, non-gating tally (runs AFTER the result streamed): a DB
          // blip must not reach the outer catch and report a successful run as
          // "failed" to the user (NFR-OBS-01).
          if (paidTallyUserId !== null) {
            try {
              await createUsageCounterRepo(getDb()).increment(paidTallyUserId);
            } catch (tallyError) {
              console.error("[api/tailor] paid tally increment failed", tallyError);
            }
          }
          // Move the pending row to `complete` with score + children, for ALL
          // logged-in users (persist-tailoring-lifecycle, FR-TAILOR-04).
          // Best-effort: runs AFTER the result streamed (NFR-OBS-01).
          if (pendingId !== null && finalResult !== null) {
            const completeId: string = pendingId;
            const payload = toCompletePayload(finalResult);
            try {
              await withTransaction((tx) =>
                createTailoringRepo(tx).updateStatus(completeId, "complete", payload),
              );
            } catch (persistError) {
              console.error("[api/tailor] complete-status persistence failed", persistError);
            }
          }
        } else {
          // Non-result outcome. The LLM already ran (llmStarted) so this is a
          // mid-run abandon that keeps the slot (NFR-COST-02) — no refund. Mark
          // the pending row failed so history never lists an unfinished run.
          if (pendingId !== null) {
            const failedId: string = pendingId;
            try {
              await createTailoringRepo(getDb()).updateStatus(failedId, "failed");
            } catch (persistError) {
              console.error("[api/tailor] failed-status persistence failed", persistError);
            }
          }
        }
      } catch (error) {
        // Server-side only — the client always gets the same calm coded
        // event regardless of cause (NFR-OBS-01 protects the end user, not
        // the operator debugging a report of "it just says failed").
        console.error("[api/tailor] run failed", error);
        // Refund ONLY if the LLM never started (clean pre-LLM throw, e.g. a
        // provider-resolution error). A throw after llmStarted is a mid-run
        // abandon that consumes the slot (NFR-COST-02).
        if (releaseReservation && !llmStarted) {
          try {
            await releaseReservation();
          } catch {
            // Best-effort refund; the calm failure event below still fires.
          }
        }
        // Mark any pending row failed (best-effort, never rethrows).
        if (pendingId !== null) {
          const failedId: string = pendingId;
          try {
            await createTailoringRepo(getDb()).updateStatus(failedId, "failed");
          } catch (persistError) {
            console.error("[api/tailor] failed-status persistence failed", persistError);
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
