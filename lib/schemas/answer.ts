// @trace FR-RESP-03, TC-VALID-01
import { z } from "zod";

/**
 * Shared answer-write contract (FR-RESP-03). Framework-free — no Prisma, no
 * Next, no React. `form` and `ai-interview` slices import these schemas at
 * their own server-action boundaries and perform their own DB write; this
 * module defines validation only, never persists anything.
 */

export const openAnswerSchema = z.string().max(4000);

// Canonical anchor value only — z.number().int() rejects locale-formatted,
// whitespace-padded, or coerced numeric STRINGS outright (no z.coerce, no
// z.preprocess that trims/parses). A JSON payload must send a real number.
export const scaleAnswerSchema = z.number().int();

export const answerInputSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("open"),
    questionId: z.string().min(1).max(100),
    text: openAnswerSchema,
  }),
  z.object({
    type: z.literal("scale"),
    questionId: z.string().min(1),
    value: scaleAnswerSchema,
  }),
]);

export type AnswerInput = z.infer<typeof answerInputSchema>;

/**
 * Validate a scale answer against the SPECIFIC question's defined anchors
 * (not just "is an int") — the value must equal one of `anchors[].value`
 * exactly. Pure function: takes the anchors as a parameter rather than
 * re-deriving them from a global lookup, so callers (form/ai-interview) that
 * already have the cycle's snapshot anchors in hand can call it without a DB.
 */
export function isValidAnchorValue(
  value: number,
  anchors: ReadonlyArray<{ value: number }>,
): boolean {
  return anchors.some((anchor) => anchor.value === value);
}
