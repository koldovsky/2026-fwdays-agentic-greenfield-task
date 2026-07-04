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
