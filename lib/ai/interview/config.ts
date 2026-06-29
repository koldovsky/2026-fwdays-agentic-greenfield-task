// @trace NFR-COST-01

/**
 * Interview tuning constants, framework-free. The follow-up cap lives in
 * `turn.ts` (DEFAULT_FOLLOWUP_CAP). These bound prompt/answer size so a single
 * turn cannot inflate AI cost without limit (NFR-COST-01).
 */

/** Hard cap on a respondent message before it reaches the prompt (matches the
 * open-answer Zod max in lib/schemas/answer.ts). */
export const MAX_RESPONDENT_MESSAGE_CHARS = 4000;

/** How many recent transcript turns to send to the streamer for tone/context.
 * Keeps the prompt bounded on a long interview. */
export const RECENT_TURNS_WINDOW = 8;

/** Max tokens for a single interviewer streamed reply (one short turn). */
export const INTERVIEWER_MAX_TOKENS = 512;

/** Max tokens for the structured judge (it only emits a tiny tool call). */
export const JUDGE_MAX_TOKENS = 256;
