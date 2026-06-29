// @trace FR-REPORT-02 FR-REPORT-04 TC-VALID-01 BC-PRIVACY-04

import "server-only";

import type Anthropic from "@anthropic-ai/sdk";
import { getClaude } from "@/lib/ai/client";
import { getAiEnv } from "@/lib/ai/env";
import {
  buildSummariserSystemPrompt,
  buildSummariserUserPrompt,
} from "@/lib/ai/summary/prompts";
import { summaryShapeSchema, type SummaryShape } from "@/lib/ai/summary/schema";
import type { TemplateSnapshot } from "@/lib/cycles/snapshot";

const SUMMARY_MAX_TOKENS = 1500;

const SUMMARY_TOOL: Anthropic.Tool = {
  name: "report_summary",
  description: "Return the structured assessment summary.",
  input_schema: {
    type: "object",
    properties: {
      strengths: { type: "array", items: { type: "string" }, description: "Concise strengths grounded in the answers." },
      growthAreas: { type: "array", items: { type: "string" }, description: "Concise growth areas grounded in the answers." },
      quotes: {
        type: "array",
        description: "Short verbatim quotes, each copied from one answer and attributed by its questionId.",
        items: {
          type: "object",
          properties: {
            text: { type: "string", description: "Verbatim text copied from the answer." },
            questionId: { type: "string", description: "The questionId of the answer this quote is from." },
          },
          required: ["text", "questionId"],
        },
      },
    },
    required: ["strengths", "growthAreas", "quotes"],
  },
};

export type SummariseResult = {
  summary: SummaryShape;
  usage: { inputTokens: number; outputTokens: number };
  model: string;
};

/**
 * Draft the structured summary on Opus via the single `lib/ai/` client
 * (FR-REPORT-04). Forces one `report_summary` tool call and validates the shape
 * with Zod at the boundary; returns null on missing/malformed output so the
 * caller shows the calm "could not draft" state rather than persisting junk.
 * Grounding (quote attribution + verbatim occurrence) is enforced by the caller
 * via `validateSummaryGrounding` against the cycle's snapshot and answers.
 */
export async function summarise(args: {
  questions: TemplateSnapshot["questions"];
  answersById: Readonly<Record<string, string>>;
  subjectFirstName: string | null;
}): Promise<SummariseResult | null> {
  const model = getAiEnv().AI_SUMMARY_MODEL;
  const response = await getClaude().messages.create({
    model,
    max_tokens: SUMMARY_MAX_TOKENS,
    system: buildSummariserSystemPrompt(),
    tools: [SUMMARY_TOOL],
    tool_choice: { type: "tool", name: SUMMARY_TOOL.name },
    messages: [
      {
        role: "user",
        content: buildSummariserUserPrompt({
          questions: args.questions,
          answersById: args.answersById,
          subjectFirstName: args.subjectFirstName,
        }),
      },
    ],
  });

  for (const block of response.content) {
    if (block.type === "tool_use") {
      const parsed = summaryShapeSchema.safeParse(block.input);
      if (parsed.success) {
        return {
          summary: parsed.data,
          usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
          model,
        };
      }
    }
  }
  return null;
}
