// @kamerton/agent — the PRODUCTION `ModelPort` (tasks.md 5.5/5.6, design.md
// Decision 5's "Tiny real-Anthropic smoke" test layer + tasks.md 5.6's bot
// wiring). Real `@anthropic-ai/sdk` client, `claude-sonnet-5`, thinking
// disabled (design.md Decision 2, `@trace TC-STACK-02`, `@trace NFR-UX-01`).
//
// Auth (NFR-SEC-01): this module NEVER passes an explicit `apiKey` to the
// SDK constructor and never reads `ANTHROPIC_API_KEY`/any API-key-shaped
// secret itself. `new Anthropic()` with no `apiKey`/`authToken`/`profile`
// argument lets the SDK resolve credentials on its own, in this order (per
// the bundled `client.d.ts`'s own JSDoc, verified against
// `@anthropic-ai/sdk@0.93.0`):
//   1. `ANTHROPIC_AUTH_TOKEN` (bearer token — the "local user token" profile
//      AGENTS.md/design.md Decision 2 name).
//   2. `ANTHROPIC_API_KEY`, if the environment happens to set one (this
//      module does not require or document setting it — see NFR-SEC-01 — but
//      does not disable the SDK's own fallback either, since that would mean
//      hand-rolling credential resolution instead of using the SDK's own
//      vetted logic).
//   3. A profile config file under `<config_dir>/configs/<profile>.json` /
//      `<config_dir>/credentials/<profile>.json` (`ANTHROPIC_CONFIG_DIR` or
//      `XDG_CONFIG_HOME/anthropic`, default `~/.config/anthropic`).
// If none of these resolve, the SDK itself throws on the first request — a
// `ModelPort.send()` rejection `loop.ts`'s own `runIntakeTurn` already
// converts into `ANTHROPIC_UNAVAILABLE_APOLOGY` (`@trace NFR-REL-01`), so a
// missing-auth machine degrades the same way a real outage would, never a
// crash.
//
// Thinking disabled (design.md Decision 2): `ThinkingConfigDisabled` in the
// bundled SDK types is exactly `{ type: "disabled" }` (resources/messages/
// messages.d.ts) — the SAME literal shape `model-port.ts`'s own
// `ThinkingConfig`/`MODEL_CONFIG` already pins, so `MODEL_CONFIG.thinking`
// passes straight through with no adapter-side branching needed. Verified
// against the bundled `messages.d.ts` that the SDK does NOT reject an
// explicit `{ type: "disabled" }` (it is a first-class, documented member of
// `ThinkingConfigParam`, not merely "thinking omitted").

import Anthropic from "@anthropic-ai/sdk";
import type {
  ContentBlock,
  ModelConfig,
  ModelMessage,
  ModelPort,
  ModelResponse,
  ToolDefinition,
} from "./model-port.ts";

/** Intake turns are single-field extraction/validation, never long-form
 *  narration (design.md Decision 2's "single-field extraction ... not
 *  multi-step reasoning" framing) — a small, fixed ceiling keeps the p90 <=
 *  5s budget (NFR-UX-01) achievable regardless of what the lead writes. */
const MAX_TOKENS = 1024;

/**
 * The real `@anthropic-ai/sdk`-backed `ModelPort` (design.md Decision 5).
 * Framework-free of `loop.ts`'s own concerns — this class only translates
 * between this package's minimal `ModelMessage`/`ModelResponse`/
 * `ToolDefinition` shapes and the Anthropic SDK's own `Message`/
 * `MessageParam`/`Tool` shapes; it holds no conversation state and makes no
 * decisions of its own (`runIntakeTurn` owns all of that).
 */
export class AnthropicModelPort implements ModelPort {
  private readonly client: Anthropic;

  /** Accepts an already-constructed `Anthropic` client so a caller (or a
   *  test) may inject one with explicit options if it ever needs to — the
   *  default (no argument) is the NFR-SEC-01-compliant path this module
   *  documents above: no `apiKey` passed, the SDK resolves auth on its own. */
  constructor(client: Anthropic = new Anthropic()) {
    this.client = client;
  }

  async send(
    messages: ModelMessage[],
    tools: ToolDefinition[],
    config: ModelConfig,
    system: string,
  ): Promise<ModelResponse> {
    const response = await this.client.messages.create({
      model: config.model,
      max_tokens: MAX_TOKENS,
      thinking: config.thinking,
      // The system prompt (`system-prompt.ts`'s `buildSystemPrompt` in
      // production) — a plain string is one of the two shapes the bundled
      // SDK types accept for `system` (`string | Array<TextBlockParam>`,
      // resources/messages/messages.d.ts), so no adapter-side wrapping is
      // needed (remediation of the review-gate finding "the model never
      // receives a system prompt or any conversation context").
      system,
      tools: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.input_schema,
      })),
      messages: messages.map((message) => ({
        role: message.role,
        content: message.content,
      })) as Anthropic.MessageParam[],
    });

    return { content: toContentBlocks(response.content) };
  }
}

/** Narrows the SDK's own (much wider) `Message.content` block union down to
 *  this package's minimal `ContentBlock` shape (text/tool-use only — thinking
 *  is disabled, so no thinking blocks are ever expected, but any other block
 *  type this slice does not model is dropped rather than crashing the loop). */
function toContentBlocks(blocks: Anthropic.ContentBlock[]): ContentBlock[] {
  const result: ContentBlock[] = [];
  for (const block of blocks) {
    if (block.type === "text") {
      result.push({ type: "text", text: block.text });
    } else if (block.type === "tool_use") {
      result.push({
        type: "tool_use",
        id: block.id,
        name: block.name,
        input: block.input as Record<string, unknown>,
      });
    }
  }
  return result;
}
