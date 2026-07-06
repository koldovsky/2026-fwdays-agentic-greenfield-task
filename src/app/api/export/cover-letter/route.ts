// POST /api/export/cover-letter — produces the cover-letter PDF for a paid
// caller (add-tailoring-intelligence §4 + improve-tailoring-quality T5 §3.1/3.3,
// FR-COVERLETTER-01/02). Node runtime (renderer + font read are Node-only),
// 400 on a malformed body, then the server-side paywall (FR-PAYWALL-01) — resolve
// the session, check hasPaidAccess() against synced subscription state, and return
// 402 for a non-paid caller BEFORE any generation or render. The client gate in
// the stepper is a UX nicety, not a boundary; any caller can POST here directly.
// A broken session/subscription read degrades to "not paid" (the stricter gate),
// never a raw 500 (NFR-OBS-01).
//
// Two-pass grounded letter (T5): when the body carries a `letter` context (CV
// sentences + confirmed answers, requirements for emphasis, careerStage for tone)
// this route ATTEMPTS a grounded, verified LLM letter server-side, where the
// provider and the paywall already live and the LLM call is off the checklist
// critical path (NFR-PERF-02 — this is an export-time action). The render input
// is then ONE OF exactly two things: (a) the verified LLM paragraphs wrapped in
// the client's localized framing, or (b) the client's deterministic reflow
// `document`. generateGroundedCoverLetter returns null on any generation/parse/
// verification failure or any rejected claim, and this route falls back to (b) —
// so UNVERIFIED PROSE CAN NEVER REACH THE RENDER (BC-HONESTY-01/02, NFR-OBS-01).
// The bullet-grounding lane is untouched: no letter context is ever threaded into
// it (FR-BULLETS-03).
import { currentUserId } from "@/app/auth";
import { hasPaidAccess } from "@/entities/subscription";
import type { ExportDocument } from "@/entities/export-document";
import {
  buildGroundedCoverLetterDocument,
  generateGroundedCoverLetter,
} from "@/features/export-cover-letter";
import { createSubscriptionRepo } from "@/shared/lib/db";
import { getDb } from "@/shared/lib/db/pg";
import {
  resolveLlmProvider,
  type CareerStage,
  type ConfirmedAnswerEvidence,
  type CoverLetterInput,
  type Requirement,
} from "@/shared/lib/llm";

import { renderCoverLetterPdf } from "./cover-letter-pdf";

export const runtime = "nodejs";
/** A cover letter is a few paragraphs; rendering is fast, headroom for cold font load. */
export const maxDuration = 30;

/**
 * Localized neutral framing for the grounded letter (§3.5). Supplied by the
 * client so this route resolves no i18n and `shared/lib` stays framework-free
 * (TC-PURE-01). Every field is optional prose framing, never a factual claim.
 */
interface LetterFraming {
  readonly greeting?: string;
  readonly closing?: string;
  readonly headline?: string;
  readonly footer?: string;
}

/**
 * Optional grounded-letter context. Its presence is what opts a request into the
 * two-pass LLM path; when absent, the route ships the deterministic `document`
 * unchanged (the pre-T5 behavior). Carries ONLY the candidate's own evidence
 * lanes plus emphasis/tone signals — never a user id or account metadata
 * (NFR-SEC-02).
 */
interface LetterContext {
  readonly cvSentences: readonly string[];
  readonly confirmedAnswers?: readonly ConfirmedAnswerEvidence[];
  readonly requirements: readonly Requirement[];
  readonly careerStage?: CareerStage;
  readonly framing?: LetterFraming;
}

function isCoverLetterDocument(value: unknown): value is ExportDocument {
  if (typeof value !== "object" || value === null) return false;
  const { coverLetter } = value as { coverLetter?: unknown };
  if (typeof coverLetter !== "object" || coverLetter === null) return false;
  const { paragraphs } = coverLetter as { paragraphs?: unknown };
  return Array.isArray(paragraphs) && paragraphs.every((p) => typeof p === "string");
}

function asStringArray(value: unknown): readonly string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

/**
 * Parse the optional grounded-letter context out of the body. Tolerant by
 * design: any shape that does not carry at least one CV sentence yields null, so
 * the route falls back to the deterministic document (NFR-OBS-01) rather than
 * attempting a generation it has no evidence for.
 */
function parseLetterContext(body: unknown): LetterContext | null {
  const letter = (body as { letter?: unknown } | null)?.letter;
  if (typeof letter !== "object" || letter === null) return null;
  const raw = letter as Record<string, unknown>;

  const cvSentences = asStringArray(raw["cvSentences"]);
  if (cvSentences.length === 0) return null;

  // Validate element-by-element — drop any element that does not satisfy the
  // Requirement shape. Blind casts at a trust boundary risk passing unexpected
  // payloads into the LLM prompt (defense-in-depth, NFR-SEC-04, NFR-OBS-01).
  const requirements: Requirement[] = Array.isArray(raw["requirements"])
    ? raw["requirements"].filter(
        (r): r is Requirement =>
          typeof r === "object" &&
          r !== null &&
          typeof (r as Record<string, unknown>)["id"] === "string" &&
          typeof (r as Record<string, unknown>)["text"] === "string" &&
          ((r as Record<string, unknown>)["importance"] === "must-have" ||
            (r as Record<string, unknown>)["importance"] === "nice-to-have") &&
          Array.isArray((r as Record<string, unknown>)["keywords"]) &&
          (
            (r as Record<string, unknown>)["keywords"] as unknown[]
          ).every((k) => typeof k === "string"),
      )
    : [];

  // Same element-level validation for ConfirmedAnswerEvidence — each element
  // must carry both question and answer strings; malformed elements are dropped.
  const rawAnswers = raw["confirmedAnswers"];
  const confirmedAnswers: ConfirmedAnswerEvidence[] | undefined =
    Array.isArray(rawAnswers)
      ? rawAnswers.filter(
          (a): a is ConfirmedAnswerEvidence =>
            typeof a === "object" &&
            a !== null &&
            typeof (a as Record<string, unknown>)["question"] === "string" &&
            typeof (a as Record<string, unknown>)["answer"] === "string",
        )
      : undefined;

  const stage = raw["careerStage"];
  const careerStage =
    stage === "junior" || stage === "mid" || stage === "senior" ? stage : undefined;

  const framingRaw = raw["framing"];
  const framing =
    typeof framingRaw === "object" && framingRaw !== null
      ? (framingRaw as LetterFraming)
      : undefined;

  return {
    cvSentences,
    requirements,
    ...(confirmedAnswers ? { confirmedAnswers } : {}),
    ...(careerStage ? { careerStage } : {}),
    ...(framing ? { framing } : {}),
  };
}

/**
 * Attempt the verified grounded letter, returning its render document or null.
 * Null is the fail-honest signal to fall back to the deterministic reflow — a
 * provider config error, a generation/parse failure, or any unverified claim all
 * resolve to null and NEVER to raw prose (BC-HONESTY-01/02, NFR-OBS-01).
 */
async function tryGroundedLetterDocument(
  context: LetterContext,
): Promise<ExportDocument | null> {
  const input: CoverLetterInput = {
    requirements: context.requirements,
    cvSentences: context.cvSentences,
    ...(context.confirmedAnswers ? { confirmedAnswers: context.confirmedAnswers } : {}),
    ...(context.careerStage ? { careerStage: context.careerStage } : {}),
  };

  let llm;
  try {
    llm = resolveLlmProvider();
  } catch (error) {
    // Missing key / bad config — fall back, do not 500 (NFR-OBS-01).
    console.error("[api/export/cover-letter] provider resolve failed", error);
    return null;
  }

  const verified = await generateGroundedCoverLetter(input, { llm });
  if (verified === null) return null;

  // Wrap the VERIFIED paragraphs in neutral localized framing (never a claim).
  return buildGroundedCoverLetterDocument(verified, context.framing ?? {});
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  const fallbackDoc = (body as { document?: unknown } | null)?.document;
  if (!isCoverLetterDocument(fallbackDoc)) {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  // Server-side paywall enforcement (FR-PAYWALL-01) — identical to the pdf route.
  let userId: string | null = null;
  try {
    userId = await currentUserId();
  } catch {
    userId = null;
  }
  let paid = false;
  if (userId !== null) {
    try {
      const subscription = await createSubscriptionRepo(getDb()).get(userId);
      paid = hasPaidAccess(subscription, new Date().toISOString());
    } catch {
      paid = false;
    }
  }
  if (!paid) {
    return Response.json({ error: "payment_required" }, { status: 402 });
  }

  // Grounded-letter attempt (T5): only when the body carried letter context.
  // On any failure, `doc` stays the deterministic fallback — the render input is
  // therefore never unverified prose.
  let doc: ExportDocument = fallbackDoc;
  const letterContext = parseLetterContext(body);
  if (letterContext !== null) {
    const grounded = await tryGroundedLetterDocument(letterContext);
    if (grounded !== null) doc = grounded;
  }

  try {
    const pdf = await renderCoverLetterPdf(doc);
    return new Response(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="vouch-cover-letter.pdf"',
        "Content-Length": String(pdf.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    // Server-side only — the client surfaces a calm failure (NFR-OBS-01).
    console.error("[api/export/cover-letter] render failed", error);
    return Response.json({ error: "export_failed" }, { status: 500 });
  }
}
