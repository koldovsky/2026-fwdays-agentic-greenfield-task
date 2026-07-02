// Public API barrel for the llm slice — other layers import ONLY this.
// Pure two-pass prompt core (TC-PURE-01): no network, no Anthropic SDK.
export {
  GENERATION_SYSTEM_PROMPT,
  GROUNDING_SYSTEM_PROMPT,
  buildGenerationPrompt,
  buildGroundingPrompt,
} from "./prompts";
export { parseGenerationResponse, parseGroundingResponse } from "./parse";
export type {
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
} from "./types";
