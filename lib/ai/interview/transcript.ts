// @trace FR-AI-02 FR-AI-06 TC-VALID-01 TC-PURE-01

/**
 * The interview transcript contract + pure traversal helpers. Framework-free
 * (no next/*, react, DOM, Date.now()). The transcript is persisted in
 * `Dialog.messages` (Json) and re-validated with Zod on read at the boundary,
 * so a corrupt blob can never drive the agent. Question traversal is keyed off
 * the recorded Answer rows (the source of truth for "closed"), never off the
 * free-form transcript.
 */

import { z } from "zod";

/** An assistant turn's intent — drives the prompt and the follow-up counter. */
export const assistantKindSchema = z.enum([
  "greeting",
  "question",
  "followup",
  "decline",
  "complete",
]);

export const interviewMessageSchema = z.object({
  role: z.enum(["assistant", "user"]),
  content: z.string(),
  // The snapshot question id this turn relates to (the question being asked,
  // or the question a user reply answers). Absent on a pure greeting/complete.
  questionId: z.string().optional(),
  // Assistant turns only; describes the turn's intent.
  kind: assistantKindSchema.optional(),
});

export const interviewTranscriptSchema = z.array(interviewMessageSchema);

export type InterviewMessage = z.infer<typeof interviewMessageSchema>;

/**
 * Deterministically bound a respondent message to the cap before it reaches the
 * prompt, so a single huge paste cannot inflate prompt size or AI cost
 * (NFR-COST-01). Truncates rather than rejects; the route also enforces a hard
 * Zod max on the request body.
 */
export function clampMessage(raw: string, maxChars: number): string {
  return raw.length <= maxChars ? raw : raw.slice(0, maxChars);
}

/** How many follow-up turns the agent has already spent on a given question. */
export function followupsUsed(
  messages: ReadonlyArray<InterviewMessage>,
  questionId: string,
): number {
  return messages.filter(
    (m) => m.role === "assistant" && m.kind === "followup" && m.questionId === questionId,
  ).length;
}

/**
 * Whether the agent has already put a given question to the respondent (asked
 * it or followed up on it) in the transcript. Drives resumability: after a
 * recorded answer the next question must be ASKED before a reply can be judged,
 * so a stream that fails after recording but before asking re-asks on retry
 * rather than mis-judging the next reply (FR-AI-06, FR-AI-07).
 */
export function hasAskedQuestion(
  messages: ReadonlyArray<InterviewMessage>,
  questionId: string,
): boolean {
  return messages.some(
    (m) =>
      m.role === "assistant" &&
      m.questionId === questionId &&
      (m.kind === "greeting" || m.kind === "question" || m.kind === "followup"),
  );
}

/** Every respondent reply recorded against a given question, in order. */
export function priorReplies(
  messages: ReadonlyArray<InterviewMessage>,
  questionId: string,
): string[] {
  return messages
    .filter((m) => m.role === "user" && m.questionId === questionId)
    .map((m) => m.content);
}

/**
 * The most complete respondent text among `replies` — the longest after
 * trimming, the empty string when none carries usable text. Used to record a
 * capped-out open question with the respondent's best actual words, never
 * invented text (FR-AI-03, FR-AI-04).
 */
export function bestAvailableText(replies: ReadonlyArray<string>): string {
  let best = "";
  for (const reply of replies) {
    const trimmed = reply.trim();
    if (trimmed.length > best.length) best = trimmed;
  }
  return best;
}

/**
 * The next question to ask: the first snapshot question (in `order`) without a
 * recorded Answer row, or null when every question already has a row. The
 * interview records a row for each question it closes, so this advances the
 * traversal one question at a time and makes the conversation resumable
 * (FR-AI-02, FR-AI-06).
 */
export function nextInterviewQuestionId(
  questions: ReadonlyArray<{ id: string; order: number }>,
  recordedQuestionIds: ReadonlyArray<string>,
): string | null {
  const recorded = new Set(recordedQuestionIds);
  const ordered = [...questions].sort((a, b) => a.order - b.order);
  for (const question of ordered) {
    if (!recorded.has(question.id)) return question.id;
  }
  return null;
}
