// In-memory scripted `ModelPort` — TEST INFRASTRUCTURE, not the feature under
// test (tasks.md 4.2). Fully working, unlike the throwing stubs elsewhere in
// this package (`loop.ts`): `loop.test.ts` needs a real, deterministic
// double that replays a canned model conversation without a network call —
// same role S1's `FakeCalendarPort` (lib/src/slots/fake-calendar.ts) plays
// for `hold.test.ts`.
//
// Framework-free of the real SDK: no `@anthropic-ai/sdk` import, no network,
// no filesystem — just an array acting as a FIFO script queue.

import type { ModelConfig, ModelMessage, ModelPort, ModelResponse, ToolDefinition } from "../model-port.ts";

/** One recorded `send()` invocation — everything a test needs to assert on
 *  what the loop actually sent the model (e.g. the `MODEL_CONFIG` config
 *  assertion, tasks.md 4.4's final bullet; the `system` prompt-wiring
 *  assertions, review-gate remediation for "each turn is context-free"). */
export interface RecordedModelCall {
  messages: ModelMessage[];
  tools: ToolDefinition[];
  config: ModelConfig;
  system: string;
}

/** A scripted queue entry: either a canned success `ModelResponse`, or an
 *  instruction to reject the call (simulating an Anthropic API failure, the
 *  `apology.ts` scenario, tasks.md 4.5 / `@trace NFR-REL-01`). */
export type ScriptedTurn = ModelResponse | { reject: unknown };

function isRejection(turn: ScriptedTurn): turn is { reject: unknown } {
  return typeof turn === "object" && turn !== null && "reject" in turn;
}

/**
 * A scripted, deterministic `ModelPort` double. Construct with an ordered
 * list of canned responses (or rejections); each `send()` call consumes the
 * next scripted turn, in order, and records the call for later assertions.
 *
 * Calling `send()` with no scripted turns left is a test-authoring bug, not
 * a production scenario to model — it throws loudly rather than returning
 * an empty response, so an under-scripted test fails with a clear message
 * instead of a confusing downstream assertion failure.
 */
export class FakeModelPort implements ModelPort {
  private readonly script: ScriptedTurn[];
  readonly calls: RecordedModelCall[] = [];

  constructor(script: ScriptedTurn[] = []) {
    this.script = [...script];
  }

  async send(
    messages: ModelMessage[],
    tools: ToolDefinition[],
    config: ModelConfig,
    system: string,
  ): Promise<ModelResponse> {
    this.calls.push({ messages, tools, config, system });

    const next = this.script.shift();
    if (next === undefined) {
      throw new Error(
        `FakeModelPort: send() call #${this.calls.length} has no scripted turn left — the test under-scripted its FakeModelPort`,
      );
    }
    if (isRejection(next)) {
      throw next.reject;
    }
    return next;
  }

  /** How many times `send()` has actually been called so far. */
  get callCount(): number {
    return this.calls.length;
  }

  /** The most recent recorded call, or `undefined` if `send()` was never
   *  invoked — convenience for the common "assert the last call's config"
   *  shape (tasks.md 4.4's final bullet). */
  get lastCall(): RecordedModelCall | undefined {
    return this.calls[this.calls.length - 1];
  }
}

/** Convenience builder for a single-text-block `ModelResponse` — the common
 *  "plain text, no tool-use" scripted turn shape (off-topic pass-through,
 *  tasks.md 4.4's third bullet). */
export function textResponse(text: string): ModelResponse {
  return { content: [{ type: "text", text }] };
}

/** Convenience builder for a single-tool-call `ModelResponse`, optionally
 *  alongside accompanying text (the model's narration, which the loop must
 *  NOT trust over the deterministic tool-result log — tasks.md 4.4's first
 *  bullet: "advances state ... regardless of the model's accompanying
 *  text"). */
export function toolUseResponse(
  name: string,
  input: Record<string, unknown>,
  options: { id?: string; text?: string } = {},
): ModelResponse {
  const content: ModelResponse["content"] = [];
  if (options.text !== undefined) {
    content.push({ type: "text", text: options.text });
  }
  content.push({ type: "tool_use", id: options.id ?? `fake-tool-call-${name}`, name, input });
  return { content };
}
