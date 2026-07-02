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

// --- Pass 1: generation ---------------------------------------------------

export interface GenerationInput {
  readonly cvProfile: CvProfile;
  /** Ranked (most important first) job requirements to tailor toward. */
  readonly requirements: readonly Requirement[];
  /** Raw job-description text pasted by the user. */
  readonly jobDescription: string;
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
 * Input to the grounding pass. Deliberately carries ONLY the generated bullets
 * and the candidate's own raw CV sentences — never the generation prompt, the
 * JD, or the ranked requirements (BC-HONESTY-01 / FR-BULLETS-03).
 */
export interface GroundingInput {
  readonly bullets: readonly GeneratedBullet[];
  readonly cvSentences: readonly string[];
}

export interface GroundingVerdict {
  readonly bulletId: string;
  readonly label: GroundingLabel;
  /** The exact CV sentence that supports the bullet when grounded. */
  readonly evidence?: string;
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
