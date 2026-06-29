// @trace FR-AI-03 FR-AI-05 FR-AI-09 TC-VALID-01

import "server-only";

import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { getClaude } from "@/lib/ai/client";
import { getAiEnv } from "@/lib/ai/env";
import { buildJudgeSystemPrompt, buildJudgeUserPrompt } from "@/lib/ai/interview/prompts";
import { JUDGE_MAX_TOKENS } from "@/lib/ai/interview/config";
import type { TemplateSnapshot } from "@/lib/cycles/snapshot";

type SnapshotQuestion = TemplateSnapshot["questions"][number];

/** The structured verdict the judge must return; parsed from the tool input. */
export const judgmentSchema = z.object({
  addressesQuestion: z.boolean(),
  scaleCandidate: z.number().nullable(),
});
export type Judgment = z.infer<typeof judgmentSchema>;

export type JudgeResult = {
  judgment: Judgment;
  usage: { inputTokens: number; outputTokens: number };
};

const JUDGE_TOOL: Anthropic.Tool = {
  name: "report_judgment",
  description: "Report your structured judgment of the respondent's reply.",
  input_schema: {
    type: "object",
    properties: {
      addressesQuestion: {
        type: "boolean",
        description:
          "True only if the reply substantively and on-topically answers the current question.",
      },
      scaleCandidate: {
        type: ["number", "null"],
        description:
          "For a scale question, the integer the respondent intends to choose; null if none is clearly intended or the question is open.",
      },
    },
    required: ["addressesQuestion", "scaleCandidate"],
  },
};

/**
 * Judge a respondent reply against the current question via the cheap model
 * (haiku), forcing a single structured tool call (FR-AI-03/05). The verdict is
 * Zod-validated at the boundary; on any malformed or missing tool output this
 * returns null so the caller can degrade calmly rather than trust junk. The
 * judge is prompt-injection-hardened (FR-AI-09): the reply is given as data,
 * never as instructions.
 */
export async function judgeReply(args: {
  question: SnapshotQuestion;
  reply: string;
}): Promise<JudgeResult | null> {
  const claude = getClaude();
  const response = await claude.messages.create({
    model: getAiEnv().AI_JUDGE_MODEL,
    max_tokens: JUDGE_MAX_TOKENS,
    system: buildJudgeSystemPrompt(),
    tools: [JUDGE_TOOL],
    tool_choice: { type: "tool", name: JUDGE_TOOL.name },
    messages: [
      { role: "user", content: buildJudgeUserPrompt({ question: args.question, reply: args.reply }) },
    ],
  });

  for (const block of response.content) {
    if (block.type === "tool_use") {
      const parsed = judgmentSchema.safeParse(block.input);
      if (parsed.success) {
        return {
          judgment: parsed.data,
          usage: {
            inputTokens: response.usage.input_tokens,
            outputTokens: response.usage.output_tokens,
          },
        };
      }
    }
  }
  return null;
}
