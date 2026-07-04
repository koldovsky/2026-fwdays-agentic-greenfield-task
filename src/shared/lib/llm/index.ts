// Public API barrel for the llm slice — other layers import ONLY this.
// Pure prompt core (TC-PURE-01) + the provider port. SDK/network code is
// isolated in the adapters (claude.ts, chatgpt.ts) behind the port.
export {
  COVER_LETTER_SYSTEM_PROMPT,
  EXTRACTION_SYSTEM_PROMPT,
  GENERATION_SYSTEM_PROMPT,
  GROUNDING_SYSTEM_PROMPT,
  SENIORITY_SYSTEM_PROMPT,
  buildCoverLetterPrompt,
  buildExtractionPrompt,
  buildGenerationPrompt,
  buildGroundingPrompt,
  buildSeniorityPrompt,
} from "./prompts";
export {
  parseCoverLetterResponse,
  parseExtractionResponse,
  parseGenerationResponse,
  parseGroundingResponse,
  parseSeniorityResponse,
} from "./parse";
export type { LlmCallOptions, LlmProvider } from "./provider";
export { createClaudeProvider, DEFAULT_CLAUDE_MODEL } from "./claude";
export { createChatGptProvider, DEFAULT_CHATGPT_MODEL } from "./chatgpt";
export { resolveLlmProvider } from "./factory";
export type {
  CareerStage,
  ConfirmedAnswerEvidence,
  CoverLetterInput,
  CoverLetterOutput,
  ExtractionInput,
  ExtractionResult,
  GeneratedBullet,
  GenerationInput,
  GenerationResult,
  GroundingInput,
  GroundingLabel,
  GroundingResult,
  GroundingVerdict,
  ParseResult,
  Prompt,
  PromptMessage,
  PromptRole,
  Requirement,
  SeniorityInput,
  SeniorityVerdict,
} from "./types";
