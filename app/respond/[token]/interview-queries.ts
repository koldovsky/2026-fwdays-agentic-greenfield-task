// @trace FR-AI-06 TC-VALID-01 NFR-SEC-01
import "server-only";

import { db } from "@/lib/db";
import { interviewTranscriptSchema, type InterviewMessage } from "@/lib/ai/interview/transcript";

/**
 * The visible chat history for resuming an AI interview (FR-AI-06). Loads the
 * cycle's stored Dialog transcript and validates it with Zod; a missing or
 * corrupt blob resolves to an empty history (the agent re-greets) rather than
 * driving the UI with junk. Server-only; the respondent only ever sees their
 * OWN cycle's transcript (resolved by token upstream in the page).
 */
export async function getInterviewTranscript(token: string): Promise<InterviewMessage[]> {
  const cycle = await db.cycle.findUnique({
    where: { token },
    select: { dialog: { select: { messages: true } } },
  });

  const parsed = interviewTranscriptSchema.safeParse(cycle?.dialog?.messages ?? []);
  return parsed.success ? parsed.data : [];
}
