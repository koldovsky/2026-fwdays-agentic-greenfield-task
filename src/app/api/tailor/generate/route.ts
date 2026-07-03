// POST /api/tailor/generate — the wizard's generation phase as its own
// NDJSON route (add-resume-wizard design.md §1, FR-WIZARD-01/04):
// generate-bullet → ground-bullet*, streamed the same shape as /api/tailor.
// Terminal event is "result" — identical shape to /api/tailor's today. This
// is where a tailoring is actually CONSUMED (design.md's budget-gating
// call): /api/tailor/analyze is cheap and gets its own separate anti-abuse
// cap, while generation is the expensive, budget-worthy work, so this route
// gates NFR-COST-02 exactly like /api/tailor does today — the two share the
// SAME rate-limit key namespace ("tailor:ip:") and the same durable usage
// counter, because both spend the same one budget: an anonymous or free
// caller who used a tailoring via /api/tailor has one fewer left here too,
// and vice versa.
//
// Body: { cvProfile, requirements, jobDescription, confirmedAnswers,
// checklist, matchScore }. The client echoes back cvProfile/requirements/
// checklist/matchScore verbatim from the /api/tailor/analyze response's
// "analysis" event (which already carries all four — loop.ts's
// GenerationPhaseInput needs checklist/matchScore too, to assemble a
// complete result without recomputing the score step) plus its own jdText as
// jobDescription and whatever confirmedAnswers the wizard's clarify step
// collected.
//
// Abuse gating (NFR-COST-02, NFR-SEC-04) mirrors src/app/api/tailor/route.ts
// exactly: budget is RESERVED atomically before the LLM call, not charged
// after it, so no window exists for a concurrent request to slip through. A
// reservation that doesn't end in a "result" event is rolled back — failed
// runs never consume budget (FR-TAILOR-03).
import { currentUserId } from "@/app/auth";
import { hasPaidAccess } from "@/entities/subscription";
import type { TailoringChecklistRow } from "@/entities/tailoring";
import { ANON_TAILORING_LIMIT, FREE_TAILORING_LIMIT, type AccountKind } from "@/entities/usage-counter";
import { runGenerationPhase } from "@/features/run-tailoring";
import type { GenerationEvent, GenerationPhaseInput } from "@/features/run-tailoring";
import { createSubscriptionRepo, createUsageCounterRepo } from "@/shared/lib/db";
import { getDb } from "@/shared/lib/db/pg";
import { resolveLlmProvider, type ConfirmedAnswerEvidence } from "@/shared/lib/llm";
import { clientIpFrom, releaseHitInMemory, reserveHitInMemory } from "@/shared/lib/rate-limit";
import type { CvProfile, Requirement } from "@/shared/lib/scoring";

export const runtime = "nodejs";
/** Mirrors /api/tailor — the phase is bounded, but streaming can outlast a default serverless window. */
export const maxDuration = 60;

/** Same NFR-COST-02 window as /api/tailor's anonymous gate — one shared budget. */
const ANON_WINDOW_MS = 24 * 60 * 60 * 1000;

const encoder = new TextEncoder();

function isCvProfile(value: unknown): value is CvProfile {
  if (typeof value !== "object" || value === null) return false;
  const { skills, sentences } = value as { skills?: unknown; sentences?: unknown };
  return Array.isArray(skills) && Array.isArray(sentences);
}

/**
 * Best-effort runtime shape check (NFR-OBS-01) — not a full schema
 * validator, matching the simplicity of /api/tailor's cvText/jdText
 * coercion. cvProfile/requirements are the two fields that would otherwise
 * throw deep inside buildGenerationPrompt (e.g. `cvProfile.skills.join`) if
 * malformed, so a bad shape there fails the whole request instead of the
 * loop; every other field degrades to a safe default.
 */
function parseGenerateBody(
  body: unknown,
): { readonly ok: true; readonly value: GenerationPhaseInput } | { readonly ok: false } {
  const b = (body ?? {}) as {
    cvProfile?: unknown;
    requirements?: unknown;
    jobDescription?: unknown;
    confirmedAnswers?: unknown;
    checklist?: unknown;
    matchScore?: unknown;
  };
  if (!isCvProfile(b.cvProfile) || !Array.isArray(b.requirements)) {
    return { ok: false };
  }
  return {
    ok: true,
    value: {
      cvProfile: b.cvProfile,
      requirements: b.requirements as readonly Requirement[],
      jobDescription: typeof b.jobDescription === "string" ? b.jobDescription : "",
      confirmedAnswers: Array.isArray(b.confirmedAnswers)
        ? (b.confirmedAnswers as readonly ConfirmedAnswerEvidence[])
        : [],
      checklist: Array.isArray(b.checklist) ? (b.checklist as readonly TailoringChecklistRow[]) : [],
      matchScore: typeof b.matchScore === "number" ? b.matchScore : 0,
    },
  };
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }
  const parsed = parseGenerateBody(body);

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
  // Same key namespace /api/tailor uses — one shared NFR-COST-02 budget pool.
  const anonKey = `tailor:ip:${clientIp}`;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: GenerationEvent): void => {
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

        // A malformed body never reaches the LLM (NFR-OBS-01) — the calm
        // failure event still flows through the same reservation-release
        // path below as any other non-"result" run.
        let succeeded = false;
        if (!parsed.ok) {
          send({ type: "error", code: "failed" });
          send({ type: "status", phase: "failed" });
        } else {
          // Resolve the provider inside the stream: a missing key / bad
          // config throws here, and must surface as a calm failure event on
          // the open stream — never a raw 500 or a blank body (NFR-OBS-01).
          // No user id or account metadata is ever passed to the phase
          // (NFR-SEC-02).
          const llm = resolveLlmProvider();
          for await (const event of runGenerationPhase({ llm }, parsed.value)) {
            if (event.type === "result") succeeded = true;
            send(event);
          }
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
        console.error("[api/tailor/generate] run failed", error);
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
