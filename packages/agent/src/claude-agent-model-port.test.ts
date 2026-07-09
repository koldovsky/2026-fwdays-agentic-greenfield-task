// @kamerton/agent — regression guard for the CRITICAL production defect the
// live kb-learning eval probe (stage H) surfaced: `ClaudeAgentModelPort.send()`
// used to discard the model's OWN narrated text whenever a tool call was
// captured, returning ONLY a `tool_use` content block. That is harmless for
// `save_*`/`amend_field` (`loop.ts`'s `assembleReply` composes a deterministic
// ack+next-question reply for an "applied" outcome regardless of what text
// accompanies it — see `loop.ts`'s own header comment and
// `assembleReply`'s), but `answer_faq`/`log_question` are dispatched as
// `outcome: "logged"` (kb-learning design.md Decision 4), which `runIntakeTurn`
// does NOT override — a pure-FAQ turn's reply IS the model's own narration.
// Discarding that text meant every lead who asked a KB question got a BLANK
// Telegram reply in production (11/12 probe cases).
//
// This file mocks `@anthropic-ai/claude-agent-sdk`'s `query()` with a fake
// async generator that faithfully reproduces the file's own documented
// ordering (`claude-agent-model-port.ts` lines 41-48/62-68): the `assistant`
// SDKMessage (carrying both a `text` block and a `tool_use` block) is
// YIELDED to the `for await` consumer FIRST — so `collectMessageText` has
// already pushed the text onto `textParts` — and only THEN does the fake
// drive `options.canUseTool(...)` for that tool_use block (mirroring the
// SDK's own permission gate, called "before a proposed tool call's handler
// ever runs" per `Options.canUseTool`'s doc comment), which the real
// `canUseTool` implementation answers by flipping `options.abortController`
// and denying — after which the fake throws the resulting `AbortError`,
// mirroring the stream closing out from under the `for await` loop.
import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CanUseTool, Query, SDKMessage } from "@anthropic-ai/claude-agent-sdk";

vi.mock("@anthropic-ai/claude-agent-sdk", () => ({
  query: vi.fn(),
  // Never actually invoked by this file's fake `query` implementation (no
  // real tool handler ever runs, same as production — `canUseTool` always
  // denies before a handler could) — a minimal stub is enough to satisfy
  // `buildNeverRunTool`'s call shape.
  tool: vi.fn((name: string, description: string) => ({ name, description })),
  createSdkMcpServer: vi.fn((options: { name: string }) => ({ type: "sdk", name: options.name })),
}));

import { query } from "@anthropic-ai/claude-agent-sdk";
import { ClaudeAgentModelPort } from "./claude-agent-model-port.ts";
import { MODEL_CONFIG, type ToolDefinition } from "./model-port.ts";
import { mcpToolName } from "./mcp-tool-schema.ts";

const mockedQuery = vi.mocked(query);

const TOOLS: ToolDefinition[] = [
  {
    name: "answer_faq",
    description: "Log a lead's question answered from the KB.",
    input_schema: { type: "object", properties: { question: { type: "string" } }, required: ["question"] },
  },
  {
    name: "save_name",
    description: "Save the student's name.",
    input_schema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
  },
];

/** One `SDKAssistantMessage`-shaped fake — only the fields
 *  `collectMessageText`/this file's own dispatch actually reads
 *  (`type`/`message.content`) are populated; the rest of the real
 *  `BetaMessage` shape is irrelevant to this adapter and is cast away. */
function fakeAssistantMessage(content: Array<{ type: "text"; text: string } | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }>): SDKMessage {
  return {
    type: "assistant",
    message: { content },
    parent_tool_use_id: null,
    uuid: randomUUID(),
    session_id: "test-session",
  } as unknown as SDKMessage;
}

/** Builds a fake `query()` async generator that reproduces the real SDK's
 *  documented ordering: yields the assistant message (text + tool_use) FIRST,
 *  then — only once the consumer resumes the generator, i.e. AFTER that
 *  message has already been iterated by `send()`'s `for await` loop — drives
 *  `options.canUseTool` for the tool_use block, then throws the resulting
 *  `AbortError` once `canUseTool` has flipped `options.abortController`
 *  (exactly what the production `canUseTool` implementation in
 *  `claude-agent-model-port.ts` does: deny + abort, never allow). */
function fakeQueryWithToolUse(
  qualifiedToolName: string,
  toolInput: Record<string, unknown>,
  precedingText: string | undefined,
  options: { canUseTool?: CanUseTool; abortController?: AbortController },
): Query {
  const toolUseId = randomUUID();
  const content: Array<{ type: "text"; text: string } | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }> = [];
  if (precedingText !== undefined) content.push({ type: "text", text: precedingText });
  content.push({ type: "tool_use", id: toolUseId, name: qualifiedToolName, input: toolInput });
  const assistantMessage = fakeAssistantMessage(content);

  const generator = (async function* () {
    yield assistantMessage;
    // Reached only after the consumer's `for await` has already processed
    // the yielded assistant message above (JS generator semantics: the body
    // past a `yield` only resumes once the consumer calls `.next()` again) —
    // this is the ordering `claude-agent-model-port.ts`'s header comment
    // documents ("called BEFORE a proposed tool call's handler ever runs",
    // not before the assistant message itself is surfaced).
    const abortSignal = options.abortController?.signal;
    await options.canUseTool?.(qualifiedToolName, toolInput, {
      signal: abortSignal as AbortSignal,
      toolUseID: toolUseId,
      requestId: "test-request",
    });
    const abortError = new Error("The operation was aborted.");
    abortError.name = "AbortError";
    throw abortError;
  })();
  // The real `Query` also exposes control methods (`interrupt`,
  // `setPermissionMode`, ...) this adapter never calls — irrelevant to
  // `send()`'s own behaviour, so the fake generator (a real
  // `AsyncGenerator<SDKMessage, void>`, exactly what `send()`'s `for await`
  // consumes) is cast rather than fully re-implementing `Query`'s surface.
  return generator as unknown as Query;
}

/** A fake `query()` generator for a genuinely plain-text (no tool call)
 *  response — ends normally after the one assistant message, exactly as the
 *  real SDK stream would for a turn with nothing to gate. */
function fakeQueryTextOnly(text: string): Query {
  const assistantMessage = fakeAssistantMessage([{ type: "text", text }]);
  const generator = (async function* () {
    yield assistantMessage;
  })();
  return generator as unknown as Query;
}

describe("ClaudeAgentModelPort.send()", () => {
  beforeEach(() => {
    mockedQuery.mockReset();
  });

  // @trace FR-GUARD-06 (kb-learning design.md Decision 4)
  it("an answer_faq tool-use response includes BOTH the model's narrated text AND the tool_use block (the CRITICAL blank-reply fix)", async () => {
    const qualifiedName = mcpToolName("answer_faq");
    mockedQuery.mockImplementation(({ options }) =>
      fakeQueryWithToolUse(
        qualifiedName,
        { question: "Скільки триває заняття?" },
        "Індивідуальні заняття тривають 45 хвилин.",
        options ?? {},
      ),
    );

    const port = new ClaudeAgentModelPort();
    const response = await port.send(
      [{ role: "user", content: "Скільки триває заняття?" }],
      TOOLS,
      MODEL_CONFIG,
      "system prompt",
    );

    const textBlocks = response.content.filter((block) => block.type === "text");
    const toolUseBlocks = response.content.filter((block) => block.type === "tool_use");

    // Before the fix, `response.content` was ONLY the `tool_use` block — this
    // is the exact assertion that reproduced the live probe's blank replies.
    expect(textBlocks).toHaveLength(1);
    expect(textBlocks[0]).toMatchObject({ type: "text", text: "Індивідуальні заняття тривають 45 хвилин." });
    expect(toolUseBlocks).toHaveLength(1);
    expect(toolUseBlocks[0]).toMatchObject({ type: "tool_use", name: "answer_faq", input: { question: "Скільки триває заняття?" } });
  });

  // @trace FR-INTAKE-01, FR-INTAKE-02
  it("returns ALL tool_use blocks from one assistant turn (multi-field extraction: save_name + save_age)", async () => {
    const nameCall = mcpToolName("save_name");
    const ageCall = mcpToolName("save_age");
    mockedQuery.mockImplementation(({ options }) => {
      const content = [
        { type: "text" as const, text: "Записала." },
        { type: "tool_use" as const, id: "t1", name: nameCall, input: { name: "Саша" } },
        { type: "tool_use" as const, id: "t2", name: ageCall, input: { age: 7 } },
      ];
      const assistantMessage = fakeAssistantMessage(content);
      const generator = (async function* () {
        yield assistantMessage;
        const abortSignal = options?.abortController?.signal;
        await options?.canUseTool?.(nameCall, { name: "Саша" }, {
          signal: abortSignal as AbortSignal,
          toolUseID: "t1",
          requestId: "test-request",
        });
        const abortError = new Error("The operation was aborted.");
        abortError.name = "AbortError";
        throw abortError;
      })();
      return generator as unknown as Query;
    });

    const port = new ClaudeAgentModelPort();
    const response = await port.send(
      [{ role: "user", content: "Саша, 7" }],
      TOOLS,
      MODEL_CONFIG,
      "system prompt",
    );

    // Before this fix the port captured only the FIRST tool call and aborted,
    // so a merged "name AND age" answer saved only the name — the live-bot
    // "записала 7 років… скільки років?" duplicate. Both must survive now.
    const toolUseBlocks = response.content.filter((block) => block.type === "tool_use");
    expect(toolUseBlocks.map((b) => (b.type === "tool_use" ? b.name : ""))).toEqual(["save_name", "save_age"]);
    expect(toolUseBlocks[1]).toMatchObject({ type: "tool_use", name: "save_age", input: { age: 7 } });
  });

  // Proves the merge this fix introduces is UNIFORM — not special-cased to
  // `answer_faq`/`log_question` — so a `save_*` response with accompanying
  // text is composed the same way. This is INERT for existing intake
  // behaviour: `loop.ts`'s `runIntakeTurn` only ever treats a `save_*` call's
  // OUTCOME as `"applied"` (never `"logged"`), and its reply-assembly rule
  // (`hasAppliedToolCall || stateAdvanced` -> `assembleReply(narratedText,
  // currentState)`, loop.ts lines 501-504) ALREADY documents composing the
  // deterministic ack+next-question copy on top of "the model's own
  // accompanying text if it gave any ... never discarded when present"
  // (`assembleReply`'s own header comment, loop.ts lines 509-522) — i.e.
  // `loop.ts` was already designed to use a `save_*` response's text block as
  // the ack when present; this file's fix is what finally lets that text
  // reach `loop.ts` at all for the production adapter. `loop.test.ts`'s own
  // "Записала ім'я." case (a save_name response WITH accompanying text)
  // already asserts `assembleReply` still appends the deterministic next
  // question rather than returning the narration verbatim — proving the
  // "applied" override is unaffected by a text block being present.
  it("a save_name-style tool-use response with preceding text ALSO returns both a text block and the tool_use block (uniform merge, not FAQ-only)", async () => {
    const qualifiedName = mcpToolName("save_name");
    mockedQuery.mockImplementation(({ options }) =>
      fakeQueryWithToolUse(qualifiedName, { name: "Оксана" }, "Дякую!", options ?? {}),
    );

    const port = new ClaudeAgentModelPort();
    const response = await port.send(
      [{ role: "user", content: "Мене звати Оксана" }],
      TOOLS,
      MODEL_CONFIG,
      "system prompt",
    );

    const textBlocks = response.content.filter((block) => block.type === "text");
    const toolUseBlocks = response.content.filter((block) => block.type === "tool_use");
    expect(textBlocks).toHaveLength(1);
    expect(textBlocks[0]).toMatchObject({ type: "text", text: "Дякую!" });
    expect(toolUseBlocks).toHaveLength(1);
    expect(toolUseBlocks[0]).toMatchObject({ type: "tool_use", name: "save_name", input: { name: "Оксана" } });
  });

  // A tool-use response with NO accompanying text must still omit the text
  // block entirely (never emit an empty-string `text` block) — `runIntakeTurn`
  // treats an empty `narratedText` as "no narration", not as an empty-but-
  // present block; keeping the omission exact avoids a spurious block for
  // every existing `save_*`/`amend_field` call the model makes bare.
  it("a tool-use response with NO accompanying text returns ONLY the tool_use block (no empty text block introduced)", async () => {
    const qualifiedName = mcpToolName("save_name");
    mockedQuery.mockImplementation(({ options }) =>
      fakeQueryWithToolUse(qualifiedName, { name: "Богдан" }, undefined, options ?? {}),
    );

    const port = new ClaudeAgentModelPort();
    const response = await port.send(
      [{ role: "user", content: "Мене звати Богдан" }],
      TOOLS,
      MODEL_CONFIG,
      "system prompt",
    );

    expect(response.content).toEqual([
      { type: "tool_use", id: expect.any(String), name: "save_name", input: { name: "Богдан" } },
    ]);
  });

  // Baseline, unchanged behaviour: a genuinely plain-text-only turn (no tool
  // call at all) is still returned as a single text block, exactly as before
  // this fix.
  it("a plain-text-only response (no tool call) returns a single text block, unchanged", async () => {
    mockedQuery.mockImplementation(() => fakeQueryTextOnly("Розкажіть, будь ласка, більше про свою мету."));

    const port = new ClaudeAgentModelPort();
    const response = await port.send(
      [{ role: "user", content: "Привіт!" }],
      TOOLS,
      MODEL_CONFIG,
      "system prompt",
    );

    expect(response.content).toEqual([
      { type: "text", text: "Розкажіть, будь ласка, більше про свою мету." },
    ]);
  });
});
