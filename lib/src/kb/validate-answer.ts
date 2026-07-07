// TYPED THROWING STUB — red state for kb-learning tasks.md B.1/B.2. The
// types and `validateAnswerText` signature below are the contract pinned by
// validate-answer.test.ts; the body is implemented in B.2. No logic lives
// here yet — same "single Not-implemented throw" convention as
// booking-hitl's validate-admin-slots.ts/validate-preferences.ts red rounds.
//
// Framework-free pure core (TC-PURE-01): pure, synchronous, no I/O, no LLM.
//
// CONTRACT (design.md Decision 5, step 1 — "One-action admin answer",
// baseline spec.md's "Empty answer is rejected inline" / "Oversized answer
// is rejected inline" scenarios):
//   validateAnswerText(text) ->
//     { ok: true }
//     | { ok: false; code: "EMPTY" }        -- empty after trim, incl.
//                                               whitespace-only strings
//     | { ok: false; code: "TOO_LONG"; maxLength: number }
//                                            -- longer than MAX_ANSWER_LENGTH
//                                               (3,500); `maxLength` names
//                                               the bound the baseline spec
//                                               requires the inline error to
//                                               name, so the caller never has
//                                               to hardcode the number twice
//   Length is measured on the RAW (untrimmed) text — trimming only decides
//   emptiness, never resizes the string being length-checked (an answer
//   that is short after trim but starts/ends with enough incidental
//   whitespace to cross 3,500 raw characters still can't silently exceed the
//   Telegram-message-fit bound the 3,500 number exists to protect).
//   Exactly 3,500 characters passes (the bound is inclusive).

/** The baseline spec's own bound (FR-KB-03): chosen so the FR-KB-04 Telegram
 *  message (answer plus framing text) fits Telegram's 4,096-character
 *  single-message limit. */
export const MAX_ANSWER_LENGTH = 3500;

/** Discriminated validation result — `TOO_LONG` carries `maxLength` so every
 *  caller (the dashboard route's inline error, this file's own tests) names
 *  the bound from ONE source, never a re-typed literal. */
export type AnswerValidation =
  | { ok: true }
  | { ok: false; code: "EMPTY" }
  | { ok: false; code: "TOO_LONG"; maxLength: number };

export function validateAnswerText(text: string): AnswerValidation {
  if (text.trim().length === 0) {
    return { ok: false, code: "EMPTY" };
  }

  if (text.length > MAX_ANSWER_LENGTH) {
    return { ok: false, code: "TOO_LONG", maxLength: MAX_ANSWER_LENGTH };
  }

  return { ok: true };
}
