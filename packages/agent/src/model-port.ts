// @kamerton/agent — the `ModelPort` seam (tasks.md 4.1, design.md Decision 5).
// Mirrors `packages/slots` `CalendarPort`'s adapter-boundary pattern: one
// narrow interface production code (`AnthropicModelPort`, not written this
// pass) and test code (`testing/fake-model-port.ts`) both implement, so the
// tool-use loop (`loop.ts`) never talks to `@anthropic-ai/sdk` directly.
//
// TYPES + CONSTS ONLY — no implementation class lives here yet
// (`AnthropicModelPort` is a later task). Nothing in this file needs a red
// round of its own: an interface has no behaviour to fail, and
// `MODEL_CONFIG` is a plain data literal (same "no behaviour to fake"
// shape as `lib/src/intake/copy.ts`'s guardrail copy constants and S1
// `propose.ts`'s `CALENDAR_UNAVAILABLE_APOLOGY` — both shipped real content
// in their own red rounds). `loop.test.ts` asserts the loop always calls
// `send()` with exactly this constant (`@trace TC-STACK-02`,
// `@trace NFR-UX-01`); that assertion is legitimately green-by-nature here,
// the same way 2.4's `copy.test.ts` content checks were.

/** One block of a model message's content — the minimal subset of
 *  Anthropic's content-block union this slice's tool-use loop needs (plain
 *  text and tool-use only; no images/thinking blocks, since `MODEL_CONFIG`
 *  disables extended thinking — design.md Decision 2). */
export type TextBlock = { type: "text"; text: string };
export type ToolUseBlock = { type: "tool_use"; id: string; name: string; input: Record<string, unknown> };
export type ContentBlock = TextBlock | ToolUseBlock;

/** One turn in the conversation the loop replays to the model. `content` may
 *  be a plain string (a lead's free-text message) or content blocks (e.g. an
 *  assistant turn that included a `tool_use` block, or a `tool_result`
 *  reply — represented here as a block for symmetry, the concrete
 *  `AnthropicModelPort` adapter maps this onto the SDK's own message shape). */
export interface ModelMessage {
  role: "user" | "assistant";
  content: string | ContentBlock[];
}

/** The model's reply for one turn: zero or more content blocks (text and/or
 *  tool-use), exactly as `@anthropic-ai/sdk`'s `Message.content` shapes it. */
export interface ModelResponse {
  content: ContentBlock[];
}

/** A tool's JSON-Schema-shaped definition, the same shape
 *  `packages/agent/src/tools.ts`'s closed tool list (design.md Decision 2)
 *  is expressed in and the same shape `ModelPort.send()` forwards verbatim
 *  to the underlying API — this file does not import `tools.ts` (that would
 *  be a downward dependency from infra to domain); `tools.ts` imports this
 *  type instead. */
export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/** `claude-sonnet-5`'s extended-thinking toggle — a closed union (not a bare
 *  boolean) so a future slice that legitimately needs a thinking budget can
 *  add the `"enabled"` arm without breaking this one's `"disabled"` literal
 *  type. Intake turns are single-field extraction/validation, not
 *  multi-step reasoning, and the p90 <= 5s budget (NFR-UX-01) has no room
 *  for a thinking pass (design.md Decision 2). */
export type ThinkingConfig = { type: "disabled" } | { type: "enabled"; budget_tokens: number };

/** The model + thinking configuration every `ModelPort.send()` call the loop
 *  makes must carry, verbatim (`@trace TC-STACK-02`, `@trace NFR-UX-01`) —
 *  a single source of truth so no call site can silently drift to a
 *  different model or re-enable thinking. */
export interface ModelConfig {
  model: string;
  thinking: ThinkingConfig;
}

/** The fixed config this slice uses everywhere (design.md Decision 2):
 *  `claude-sonnet-5`, extended thinking disabled. Asserted, not just
 *  informally relied on, by a dedicated config test (tasks.md 4.4's final
 *  bullet). */
export const MODEL_CONFIG: ModelConfig = {
  model: "claude-sonnet-5",
  thinking: { type: "disabled" },
};

/**
 * The seam `loop.ts` calls through instead of `@anthropic-ai/sdk` directly.
 * Production: `AnthropicModelPort` (real SDK, local user-token auth per
 * NFR-SEC-01 — not written this pass). Test: `FakeModelPort`
 * (`testing/fake-model-port.ts`) — a scripted queue of canned responses so a
 * state-machine-driven conversation replays deterministically, in under a
 * second, with no network call.
 *
 * `system` (remediation of the review-gate finding "the model never
 * receives a system prompt or any conversation context — each turn is
 * context-free", CRITICAL) is a SEPARATE argument from `config`, not a field
 * folded into `ModelConfig`: `MODEL_CONFIG` is the one FIXED literal every
 * call must carry verbatim (`@trace TC-STACK-02`, `@trace NFR-UX-01`,
 * asserted with `toEqual(MODEL_CONFIG)` by `loop.test.ts`), whereas `system`
 * is deliberately DIFFERENT on every turn (it is state-derived — see
 * `system-prompt.ts`'s `buildSystemPrompt`). Folding a per-turn value into
 * the otherwise-constant `ModelConfig` would either break that "identical
 * every call" assertion or force `MODEL_CONFIG` itself to stop being a
 * plain fixed constant — a plain extra parameter keeps both contracts clean.
 */
export interface ModelPort {
  send(
    messages: ModelMessage[],
    tools: ToolDefinition[],
    config: ModelConfig,
    system: string,
  ): Promise<ModelResponse>;
}
