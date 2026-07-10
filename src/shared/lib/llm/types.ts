// Domain types for the pure two-pass prompt core (shared layer — lowest FSD layer).
// Framework-free (TC-PURE-01): no next/*, no DOM, no IO, no Anthropic SDK.
// The two passes are SEPARATE prompts with NO shared context — this is the
// honesty guarantee (BC-HONESTY-01 / FR-BULLETS-03).

import type { CvProfile, Requirement } from "@/shared/lib/scoring";

/** Provider-agnostic chat message (no SDK dependency). */
export type PromptRole = "system" | "user";

export interface PromptMessage {
  readonly role: PromptRole;
  readonly content: string;
  /**
   * Optional non-text parts (e.g. an attached PDF document block). Carried by
   * the GENERATION pass's user message ONLY (add-premium-pdf-attach, T5): the
   * grounding Prompt is built from a GroundingInput that has no attachment
   * field, so a document can never reach grounding by construction
   * (BC-HONESTY-01/02). Absent for every text-only prompt, so those stay
   * byte-for-byte unchanged.
   */
  readonly attachments?: readonly DocumentAttachment[];
}

/**
 * A non-text prompt part — an attached document (the candidate's original CV
 * PDF). Framework-free (TC-PURE-01): raw base64 + media type, no SDK type; the
 * Claude adapter maps it onto a document content block. The bytes are the same
 * CV the parsed text came from — a richer source, never a new one — and are
 * NEVER logged (NFR-SEC-01/02).
 */
export interface DocumentAttachment {
  readonly kind: "pdf";
  readonly mediaType: "application/pdf";
  /** base64-encoded PDF bytes. */
  readonly dataBase64: string;
}

/** A ready-to-send prompt: an ordered list of messages. */
export interface Prompt {
  readonly messages: readonly PromptMessage[];
}

// --- Pass 0: JD requirement extraction (FR-JD-01/02) -----------------------

export interface ExtractionInput {
  /** Raw job-description text pasted by the user. */
  readonly jobDescription: string;
}

/** Ranked (most important first) requirements extracted from the JD. */
export interface ExtractionResult {
  readonly requirements: readonly Requirement[];
}

/**
 * A wizard clarifying question the user confirmed with a free-text answer.
 * Self-attested, not CV-sourced — a second, distinctly-tagged evidence lane
 * (BC-HONESTY-03), never merged with `cvSentences`.
 */
export interface ConfirmedAnswerEvidence {
  readonly question: string;
  readonly answer: string;
}

// --- Seniority inference (analysis phase, tone signal only) ----------------

/** Inferred career stage from the CV prose (add-tailoring-intelligence §3). */
export type CareerStage = "junior" | "mid" | "senior";

/**
 * Input to seniority inference. Carries ONLY the candidate's own raw CV text —
 * never the JD, requirements, or generated bullets. The inference is a pure
 * prompt that reads CV prose and returns a stage; it must never introduce a
 * skill, number, or experience absent from that text (BC-HONESTY-01).
 */
export interface SeniorityInput {
  readonly cvText: string;
}

/**
 * The seniority verdict: a stage plus a short Ukrainian rationale that cites
 * only CV-sourced signal (NFR-I18N-01, BC-HONESTY-01). It MAY calibrate the
 * tone of generation/cover-letter output but is NEVER part of the grounding
 * pass's context (BC-HONESTY-03) and adds no claim of its own.
 */
export interface SeniorityVerdict {
  readonly stage: CareerStage;
  readonly rationale: string;
}

// --- Cover letter (end of flow, grounded like generation) ------------------

/**
 * Input to grounded cover-letter generation (§4). Carries the ranked
 * requirements to address, the candidate's own CV sentences, the confirmed
 * wizard answers (second evidence lane, BC-HONESTY-03), and the inferred career
 * stage as a TONE signal only. The letter it produces must introduce no claim
 * the tailored, grounded bullets did not already justify (BC-HONESTY-01/02).
 */
export interface CoverLetterInput {
  readonly requirements: readonly Requirement[];
  readonly cvSentences: readonly string[];
  readonly confirmedAnswers?: readonly ConfirmedAnswerEvidence[];
  readonly careerStage?: CareerStage;
}

/** The generated cover letter: ordered Ukrainian-first prose paragraphs. */
export interface CoverLetterOutput {
  readonly paragraphs: readonly string[];
}

/**
 * Input to the cover-letter VERIFICATION pass (T5 §3.2). A second, isolated
 * check that mirrors the two-pass bullet model: it receives ONLY the generated
 * paragraphs, the candidate's CV sentences, and the confirmed wizard answers —
 * NEVER the requirements, JD, or career stage. The isolation widens, never
 * loosens, so nothing that could seed a new claim reaches the verifier
 * (BC-HONESTY-01/03).
 */
export interface CoverLetterVerificationInput {
  readonly paragraphs: readonly string[];
  readonly cvSentences: readonly string[];
  readonly confirmedAnswers?: readonly ConfirmedAnswerEvidence[];
}

/**
 * The verification verdict. `supported` is true only when every factual claim in
 * the letter traces to a CV sentence or a confirmed answer; any unverifiable
 * claim makes it false and is listed in `unsupportedClaims`, so the caller
 * rejects the letter and falls back to the deterministic reflow (T5 §3.3).
 */
export interface CoverLetterVerdict {
  readonly supported: boolean;
  readonly unsupportedClaims: readonly string[];
}

// --- Flagged LLM coverage judge (analysis phase, improve-tailoring-quality T5) --

/**
 * Input to the FLAGGED batched coverage judge (T5 §2.2). ONE call per tailoring
 * (NFR-COST-01) that judges every requirement at once. It carries ONLY the
 * candidate's own CV text and the ranked requirements — never the JD prose
 * beyond those requirements, never bullets, never a user id (NFR-SEC-02). The
 * judge produces per-requirement verdicts WITH a verbatim CV citation; the
 * deterministic scorer downstream re-verifies each citation and discards any it
 * cannot find verbatim, so the judge can never inflate a score from thin air
 * (BC-HONESTY-01).
 */
export interface CoverageJudgeInput {
  readonly requirements: readonly Requirement[];
  /** The candidate's own CV sentences — the ONLY legal source of a citation. */
  readonly cvSentences: readonly string[];
}

/** A judge's coverage call on ONE requirement (T5 §2.2). */
export type CoverageVerdictLabel = "covered" | "adjacent" | "uncovered";

/**
 * One requirement's coverage verdict from the judge. `citation` is the verbatim
 * CV span the judge claims backs the requirement — the scorer re-checks it
 * appears verbatim in the CV text and discards the verdict otherwise. For
 * `uncovered` the citation is expected empty/absent (nothing to cite).
 */
export interface CoverageVerdict {
  readonly requirementId: string;
  readonly label: CoverageVerdictLabel;
  /** Verbatim CV span the judge cites as evidence; absent for `uncovered`. */
  readonly citation?: string;
}

export interface CoverageJudgeResult {
  readonly verdicts: readonly CoverageVerdict[];
}

// --- Pass 1: generation ---------------------------------------------------

export interface GenerationInput {
  readonly cvProfile: CvProfile;
  /** Ranked (most important first) job requirements to tailor toward. */
  readonly requirements: readonly Requirement[];
  /** Raw job-description text pasted by the user. */
  readonly jobDescription: string;
  /** Confirmed wizard answers, alongside (never instead of) the CV (BC-HONESTY-03). */
  readonly confirmedAnswers?: readonly ConfirmedAnswerEvidence[];
  /**
   * Inferred career stage — TONE calibration only (§3.5). Absent leaves the
   * baseline prompt byte-for-byte unchanged; present may shift phrasing but
   * introduces no claim the CV did not already support (BC-HONESTY-01).
   */
  readonly careerStage?: CareerStage;
  /**
   * The candidate's original CV document(s) for the PAID multimodal generation
   * pass (add-premium-pdf-attach, T5). The generation prompt attaches these to
   * its user message so the model sees the real layout/tables the text
   * extractor may have flattened. The grounding pass's GroundingInput has NO
   * attachment field, so honesty isolation holds by construction
   * (BC-HONESTY-01/02): a bullet is still grounded against the candidate's own
   * CV TEXT and flagged overclaim-risk when it cannot be, with no exemption for
   * content sourced from the attachment. Absent leaves the baseline prompt
   * byte-for-byte unchanged.
   */
  readonly attachments?: readonly DocumentAttachment[];
}

export interface GeneratedBullet {
  readonly id: string;
  /** The rewritten, tailored bullet (Ukrainian-first — NFR-I18N-01). */
  readonly text: string;
  /**
   * The CV sentence the model claims this bullet draws from, if any. This is
   * only a claim — pass 2 independently verifies it (FR-BULLETS-03).
   */
  readonly sourceSentence?: string;
}

export interface GenerationResult {
  readonly bullets: readonly GeneratedBullet[];
}

// --- Pass 2: grounding ----------------------------------------------------

/** Each bullet is either grounded in the CV or flagged as an overclaim. */
export type GroundingLabel = "grounded" | "overclaim-risk";

/**
 * Input to the grounding pass. Deliberately carries ONLY the generated bullets,
 * the candidate's own raw CV sentences, and — per BC-HONESTY-03 — confirmed
 * wizard answers as a second named evidence lane. Never the generation prompt,
 * the JD, or the ranked requirements (BC-HONESTY-01 / FR-BULLETS-03).
 */
export interface GroundingInput {
  readonly bullets: readonly GeneratedBullet[];
  readonly cvSentences: readonly string[];
  /** Alongside, never instead of, `cvSentences` (BC-HONESTY-03). */
  readonly confirmedAnswers?: readonly ConfirmedAnswerEvidence[];
}

export interface GroundingVerdict {
  readonly bulletId: string;
  readonly label: GroundingLabel;
  /** The exact CV sentence that supports the bullet when grounded. */
  readonly evidence?: string;
  /**
   * Which evidence lane backs `evidence` (BC-HONESTY-03). Absent means "cv" —
   * tolerant default for responses/fixtures that predate this field.
   */
  readonly evidenceKind?: "cv" | "user-confirmed";
}

export interface GroundingResult {
  readonly verdicts: readonly GroundingVerdict[];
}

// --- Parser result --------------------------------------------------------

/**
 * Tolerant parse outcome. Parsers never throw on malformed model output — they
 * return `{ ok: false, error }` so callers can fail honestly (NFR-OBS-01).
 */
export type ParseResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: string };

export type { CvProfile, Requirement };
