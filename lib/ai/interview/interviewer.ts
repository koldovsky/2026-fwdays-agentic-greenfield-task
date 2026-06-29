// @trace FR-AI-01 FR-AI-02 TC-AI-04 BC-PRIVACY-04 NFR-COST-01

import "server-only";

import { getClaude } from "@/lib/ai/client";
import { getAiEnv } from "@/lib/ai/env";
import {
  buildInterviewerSystemPrompt,
  buildInterviewerUserPrompt,
  type InterviewerTurn,
} from "@/lib/ai/interview/prompts";
import { INTERVIEWER_MAX_TOKENS, RECENT_TURNS_WINDOW } from "@/lib/ai/interview/config";
import type { InterviewMessage } from "@/lib/ai/interview/transcript";
import type { TemplateSnapshot } from "@/lib/cycles/snapshot";

/**
 * Start the streamed interviewer reply for one turn (FR-AI-01, TC-AI-04). Runs
 * server-side on the Claude API via the shared client and streams token by
 * token (the Route Handler pipes `.on("text")` to the HTTP response). Only
 * minimised data reaches the prompt — the template questions, a bounded window
 * of recent turns, and at most a first name (BC-PRIVACY-04). Returns the SDK
 * stream so the caller can both pipe text and await the final message + usage
 * for persistence.
 */
export function streamInterviewerReply(args: {
  questions: TemplateSnapshot["questions"];
  transcript: ReadonlyArray<InterviewMessage>;
  subjectFirstName: string | null;
  turn: InterviewerTurn;
}) {
  const recent = args.transcript.slice(-RECENT_TURNS_WINDOW);
  const userPrompt = buildInterviewerUserPrompt({
    questions: args.questions,
    recent,
    subjectFirstName: args.subjectFirstName,
    turn: args.turn,
  });

  return getClaude().messages.stream({
    model: getAiEnv().AI_INTERVIEW_MODEL,
    max_tokens: INTERVIEWER_MAX_TOKENS,
    system: buildInterviewerSystemPrompt(),
    messages: [{ role: "user", content: userPrompt }],
  });
}
