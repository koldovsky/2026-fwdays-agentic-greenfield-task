// @kamerton/agent — the PRODUCTION `ModelPort`, Agent-SDK transport.
//
// WHY THIS EXISTS (not a duplicate of `anthropic-model-port.ts`): this
// deployment authenticates with a subscription Claude Code OAuth token
// (`CLAUDE_CODE_OAUTH_TOKEN`, bridged onto `ANTHROPIC_AUTH_TOKEN` by
// `ambient-auth.ts`'s `ensureAmbientAuthToken`). Against the raw Anthropic
// Messages API (`@anthropic-ai/sdk`, what `AnthropicModelPort` calls) that
// token authenticates but is then immediately rate-limited (HTTP 429) — a
// subscription token is not a metered API key. The Claude Agent SDK
// (`@anthropic-ai/claude-agent-sdk@0.3.201`) instead spawns the local
// `claude` CLI (v2.1.200, present on this machine's PATH) as a subprocess;
// the CLI itself reads the SAME ambient `CLAUDE_CODE_OAUTH_TOKEN` (inherited
// via `process.env`, the SDK's own default when `options.env` is omitted —
// verified against the bundled `sdk.d.ts`'s `Options.env` doc: "When
// omitted, the subprocess inherits `process.env`") and draws against the
// subscription's own allowance instead of the metered API, avoiding the
// 429. `AnthropicModelPort` stays in the codebase unchanged (still the
// right adapter for a real API-key deployment, and for the existing
// tiny-real-Anthropic smoke `tests/integration/agent/smoke.test.ts`) — this
// file is a NEW, swappable adapter behind the SAME `ModelPort` seam
// (model-port.ts), so `loop.ts`/`pipeline.ts` never change.
//
// CONFIRMED FROM THE BUNDLED `sdk.d.ts` (not memory — this package's API
// moves faster than training data, per AGENTS.md):
//   - `query({ prompt: string | AsyncIterable<SDKUserMessage>, options?:
//     Options }): Query`, where `Query extends AsyncGenerator<SDKMessage,
//     void>` — an async ITERABLE, not a Promise; iterate with `for await`.
//   - `tool<Schema extends AnyZodRawShape>(name, description, inputSchema:
//     Schema, handler): SdkMcpToolDefinition<Schema>` — `AnyZodRawShape` is
//     zod's `Record<string, ZodTypeAny>` RAW SHAPE (imports `ZodRawShape`
//     from `"zod"`/`"zod/v4"`), NOT a raw JSON-Schema object and NOT a
//     `ZodObject` — `mcp-tool-schema.ts`'s `jsonSchemaToZodRawShape` is the
//     pure translation this file needs from `tools.ts`'s JSON-Schema
//     `ToolDefinition`s.
//   - `createSdkMcpServer({ name, tools }): McpSdkServerConfigWithInstance`
//     — an in-process MCP server; registered via `Options.mcpServers`. MCP
//     tools are exposed to the model under the fully-qualified name
//     `mcp__<server>__<tool>` (confirmed by `SDKControlMcpCallRequest.tool`'s
//     own doc comment) — `mcp-tool-schema.ts`'s `mcpToolName`/
//     `stripMcpToolPrefix` are the one place that prefix is added/removed.
//   - `Options.canUseTool?: CanUseTool` — `(toolName, input, { signal,
//     toolUseID, requestId, ... }) => Promise<PermissionResult | null>`,
//     called BEFORE a proposed tool call's handler ever runs. Returning
//     `{ behavior: "deny", message }` blocks execution; there is no
//     "allow but don't run" verdict, so this file also flips the
//     `AbortController` passed as `Options.abortController` the moment it
//     captures a call, guaranteeing the query stops rather than looping to
//     try another tool (design requirement: "nothing executes").
//   - `Options.systemPrompt?: string | string[] | { type: 'preset'; ... }`
//     — a plain string (one of the documented forms) is `system-prompt.ts`'s
//     `buildSystemPrompt` output, passed through with no wrapping needed
//     (mirrors `AnthropicModelPort`'s own `system` handling).
//   - `Options.tools?: string[] | { type: 'preset'; preset: 'claude_code' }`
//     — an EMPTY array is documented as "Disable all built-in tools"; this
//     file passes `tools: []` so no built-in tool (Bash/Read/Edit/...) is
//     even offered to the model, on top of `canUseTool` denying everything
//     anyway (defense in depth, same posture design.md/AGENTS.md ask of the
//     closed intake tool set itself).
//   - `Options.strictMcpConfig?: boolean` — ignores project `.mcp.json`/user
//     settings/plugins, using ONLY the `mcpServers` this call passes; set
//     here so no ambient repo configuration can add extra tools.
//   - Message shapes: `SDKAssistantMessage.message` is a `BetaMessage`
//     (`@anthropic-ai/sdk/resources/beta/messages/messages.mjs`) — the SAME
//     content-block union `AnthropicModelPort.toContentBlocks` already
//     narrows (`type: "text" | "tool_use" | ...`); `SDKResultMessage`'s
//     `success` variant carries the run's final text in `.result`, used as
//     this adapter's plain-text fallback when the model's assistant message
//     yielded no text block of its own.
//
// NFR-SEC-01: this module never reads, logs, or forwards
// `CLAUDE_CODE_OAUTH_TOKEN`/`ANTHROPIC_AUTH_TOKEN`/any API-key-shaped value
// itself — `Options.env` is left UNSET so the CLI subprocess inherits
// `process.env` on its own (the SDK's documented default), exactly as
// `ambient-auth.ts`'s header describes for the raw-SDK adapter.
import { randomUUID } from "node:crypto";
import { createSdkMcpServer, query, tool } from "@anthropic-ai/claude-agent-sdk";
import type {
  CanUseTool,
  SDKMessage,
  ThinkingConfig as SdkThinkingConfig,
} from "@anthropic-ai/claude-agent-sdk";
import { INTAKE_MCP_SERVER_NAME, jsonSchemaToZodRawShape, stripMcpToolPrefix } from "./mcp-tool-schema.ts";
import type {
  ModelConfig,
  ModelMessage,
  ModelPort,
  ModelResponse,
  ThinkingConfig,
  ToolDefinition,
} from "./model-port.ts";

/** One proposed tool call, captured by `canUseTool` the moment the model
 *  asks to run it — before the SDK would ever invoke the (deliberately
 *  never-really-run) MCP tool handler below. */
interface CapturedToolUse {
  name: string;
  input: Record<string, unknown>;
}

/** The real `@anthropic-ai/claude-agent-sdk`-backed `ModelPort` — the
 *  production choice for this deployment's subscription OAuth auth (see this
 *  file's header). Framework-free of `loop.ts`'s own concerns, same as
 *  `AnthropicModelPort`: this class only translates between this package's
 *  minimal `ModelMessage`/`ModelResponse`/`ToolDefinition` shapes and the
 *  Agent SDK's own `query()`/`tool()`/message shapes; it holds no
 *  conversation state and makes no decisions of its own.
 */
export class ClaudeAgentModelPort implements ModelPort {
  async send(
    messages: ModelMessage[],
    tools: ToolDefinition[],
    config: ModelConfig,
    system: string,
  ): Promise<ModelResponse> {
    const prompt = extractLatestUserText(messages);
    const mcpServer = createSdkMcpServer({
      name: INTAKE_MCP_SERVER_NAME,
      tools: tools.map((toolDef) => buildNeverRunTool(toolDef)),
    });

    const abortController = new AbortController();
    let captured: CapturedToolUse | null = null;

    // Captures the FIRST proposed tool call and immediately aborts — no
    // tool this adapter registers is ever actually executed (`loop.ts`
    // dispatches tool-use deterministically itself, through the reducer,
    // never through the SDK's own execution path; `@trace FR-GUARD-01`,
    // `@trace FR-GUARD-06`).
    const canUseTool: CanUseTool = async (toolName, input) => {
      if (captured === null) {
        captured = { name: stripMcpToolPrefix(toolName), input };
      }
      abortController.abort();
      return {
        behavior: "deny",
        message:
          "Kamerton dispatches tool calls deterministically outside the SDK (packages/agent/src/loop.ts) — this call was logged, not executed here.",
      };
    };

    const stream = query({
      prompt,
      options: {
        model: config.model,
        systemPrompt: system,
        mcpServers: { [INTAKE_MCP_SERVER_NAME]: mcpServer },
        // Deliberately NOT `allowedTools: [...mcp__intake__* names]`: a live
        // run against the real CLI (this file's own manual verification,
        // logged in the task report) surfaced the SDK's own runtime warning
        // — "Bare allowedTools entries auto-approve the whole tool before
        // the callback is consulted" — i.e. listing an MCP tool in
        // `allowedTools` makes the SDK run its handler directly WITHOUT
        // ever calling `canUseTool`, the opposite of what this adapter
        // needs (capture-then-abort, never execute). Leaving `allowedTools`
        // unset does not hide the tools from the model — they are still
        // offered via `mcpServers` below — it only means every proposed
        // call falls through to `canUseTool`, which is exactly the gate
        // this adapter relies on.
        tools: [], // disable every built-in tool — only the intake MCP tools exist for this turn
        permissionMode: "default", // canUseTool, not an interactive prompt or an auto-allow mode, is the gate
        strictMcpConfig: true, // ignore project .mcp.json/user settings — only the server passed above
        canUseTool,
        maxTurns: 1, // one intake turn, `@trace NFR-UX-01`
        thinking: toSdkThinkingConfig(config.thinking),
        abortController,
      },
    });

    const textParts: string[] = [];
    let resultText: string | undefined;

    try {
      for await (const message of stream) {
        collectMessageText(message, textParts, (text) => {
          resultText = text;
        });
        if (message.type === "result") break;
      }
    } catch (error) {
      if (captured === null) {
        // A genuine SDK/CLI failure (spawn error, auth failure, rate
        // limit, ...) — let it reject. `loop.ts`'s `runIntakeTurn` already
        // converts a `ModelPort.send()` rejection into the deterministic
        // Ukrainian apology (`@trace NFR-REL-01`); swallowing it here would
        // hide a real outage as a silent "no tool, no text" response.
        throw error;
      }
      // Otherwise: this is the expected fallout of the `abortController`
      // this same call just fired inside `canUseTool` (a stream-closed /
      // AbortError) — the tool call was already captured, so there is
      // nothing left for this turn to wait on.
    }

    if (captured !== null) {
      const applied: CapturedToolUse = captured;
      return {
        content: [{ type: "tool_use", id: randomUUID(), name: applied.name, input: applied.input }],
      };
    }

    const text = textParts.length > 0 ? textParts.join("\n") : (resultText ?? "");
    return { content: [{ type: "text", text }] };
  }
}

/** `loop.ts` only ever calls `ModelPort.send()` with a single current-turn
 *  user message (`messages: [{ role: "user", content: message }]` —
 *  `loop.ts`'s own header comment). This reads that message's text
 *  defensively rather than assuming the array shape, so a future caller that
 *  legitimately threads more history through `ModelMessage[]` degrades to
 *  "the latest user turn's text" instead of silently reading the wrong
 *  entry. */
function extractLatestUserText(messages: ModelMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message === undefined || message.role !== "user") continue;
    if (typeof message.content === "string") return message.content;
    return message.content
      .filter((block): block is { type: "text"; text: string } => block.type === "text")
      .map((block) => block.text)
      .join("\n");
  }
  return "";
}

/** Maps this package's `ThinkingConfig` (model-port.ts) onto the Agent SDK's
 *  own `ThinkingConfig` union (`sdk.d.ts`) — the `"disabled"` arm is
 *  structurally identical (`{ type: "disabled" }`, the ONLY arm `loop.ts`'s
 *  fixed `MODEL_CONFIG` ever actually sends, `@trace TC-STACK-02`); the
 *  `"enabled"` arm's field is spelled `budget_tokens` on this package's own
 *  type and `budgetTokens` on the SDK's, so it is translated explicitly
 *  rather than passed through. */
function toSdkThinkingConfig(thinking: ThinkingConfig): SdkThinkingConfig {
  if (thinking.type === "disabled") return { type: "disabled" };
  return { type: "enabled", budgetTokens: thinking.budget_tokens };
}

/** Builds one SDK tool whose handler is NEVER expected to run in practice:
 *  `canUseTool` above denies (and aborts) every proposed call before the SDK
 *  would invoke it. If this handler ever DOES run, `canUseTool` failed to
 *  intercept — this throws loudly rather than silently letting an
 *  unvetted "tool executed" path through (`@trace FR-GUARD-01`). */
function buildNeverRunTool(toolDef: ToolDefinition) {
  return tool(toolDef.name, toolDef.description, jsonSchemaToZodRawShape(toolDef.input_schema), async () => {
    throw new Error(
      `Kamerton: the "${toolDef.name}" MCP tool handler ran — canUseTool should have denied and aborted this call before execution.`,
    );
  });
}

/** Reads the text this adapter needs out of one yielded `SDKMessage`:
 *  assistant text blocks (pushed onto `textParts`, mirroring
 *  `AnthropicModelPort.toContentBlocks`'s own text-block handling) and, for
 *  a successful `result` message with no assistant text of its own, the
 *  run's final `.result` string (via `onResultText`) as a fallback so a
 *  plain-text-only turn is never returned empty. */
function collectMessageText(
  message: SDKMessage,
  textParts: string[],
  onResultText: (text: string) => void,
): void {
  if (message.type === "assistant") {
    for (const block of message.message.content) {
      if (block.type === "text") textParts.push(block.text);
    }
    return;
  }
  if (message.type === "result" && message.subtype === "success") {
    onResultText(message.result);
  }
}
