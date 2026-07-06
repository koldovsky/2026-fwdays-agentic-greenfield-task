// tests/integration/agent/claude-agent-smoke.test.ts — the Agent-SDK-transport
// analogue of `smoke.test.ts` (tasks.md 5.5's "tiny real round trip", design.md
// Decision 5's testing posture): ONE real round trip through
// `ClaudeAgentModelPort` (claude-agent-model-port.ts), which spawns the local
// `claude` CLI rather than calling the raw Messages API. A single scripted
// lead message ("Доньку звати Софійка") asserts a `save_name` tool call comes
// back — kept intentionally tiny, same rationale as `smoke.test.ts`.
//
// GATING: `ensureAmbientAuthToken()` (bridges CLAUDE_CODE_OAUTH_TOKEN onto
// ANTHROPIC_AUTH_TOKEN — the CLI subprocess reads whichever is present from
// its inherited `process.env`) decides whether ANY Claude auth signal is
// available at all. On this sandbox there is either no usable auth or the
// subscription token is rate-limited (this task's own stated context) — the
// suite SKIPS cleanly rather than failing `npm run test:integration`. It is
// structured to run for real the moment usable auth/quota is available,
// exactly like `smoke.test.ts`'s own auth guard.
import { describe, expect, it } from "vitest";
import { ClaudeAgentModelPort } from "@kamerton/agent/src/claude-agent-model-port.ts";
import { MODEL_CONFIG, type ToolUseBlock } from "@kamerton/agent/src/model-port.ts";
import { TOOLS } from "@kamerton/agent/src/tools.ts";
import { buildSystemPrompt } from "@kamerton/agent/src/system-prompt.ts";
import { ensureAmbientAuthToken } from "@kamerton/agent/src/ambient-auth.ts";
import { initialIntakeState } from "@kamerton/lib/src/intake/state-machine.ts";

function isToolUseBlock(block: { type: string }): block is ToolUseBlock {
  return block.type === "tool_use";
}

describe.skipIf(!ensureAmbientAuthToken())(
  "ClaudeAgentModelPort — tiny real round trip through the local claude CLI",
  () => {
    // @trace TC-STACK-02
    // @trace NFR-UX-01
    it("calls save_name for a lead message naming their child", async () => {
      const port = new ClaudeAgentModelPort();

      const response = await port.send(
        [{ role: "user", content: "Доньку звати Софійка" }],
        TOOLS,
        MODEL_CONFIG,
        buildSystemPrompt(initialIntakeState()),
      );

      const toolUseBlocks = response.content.filter(isToolUseBlock);
      expect(toolUseBlocks.some((block) => block.name === "save_name")).toBe(true);
    }, 30000);
  },
);
