import { z } from "zod";

/**
 * Server-side AI environment (NFR-SEC-02). The Claude API key lives only here,
 * never bundled to the client. Model ids and the follow-up cap are configurable
 * so cost/behaviour can be tuned without code changes (NFR-COST-01); each has a
 * safe default matching AGENTS.md (interview = sonnet, judge = haiku, summary =
 * opus). Parsed once at the server boundary via `getAiEnv()`.
 */
export const aiEnvSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1),
  // Models per task (AGENTS.md): conversational interview + the cheap
  // structured judge + the Opus summariser.
  AI_INTERVIEW_MODEL: z.string().min(1).default("claude-sonnet-4-6"),
  AI_JUDGE_MODEL: z.string().min(1).default("claude-haiku-4-5"),
  AI_SUMMARY_MODEL: z.string().min(1).default("claude-opus-4-8"),
});

export type AiEnv = z.infer<typeof aiEnvSchema>;
