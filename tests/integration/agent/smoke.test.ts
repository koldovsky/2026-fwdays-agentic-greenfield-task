// tests/integration/agent/smoke.test.ts — tasks.md 5.5, design.md
// Decision 5's "Tiny real-Anthropic smoke": ONE real round trip against the
// PRODUCTION `AnthropicModelPort` (`packages/agent/src/anthropic-model-port.ts`,
// `claude-sonnet-5`, thinking disabled — `MODEL_CONFIG`), never a fake, never
// mocked network. A single scripted lead message ("Мене звати Оксана")
// asserts a `save_name` tool call happens — kept intentionally tiny (one
// assertion, no conversation loop, no `runIntakeTurn`) so this test costs one
// real API call, not a whole scripted transcript.
//
// AUTH GUARD (NFR-SEC-01 — never require/read an Anthropic API key from this
// codebase): this file never reads `ANTHROPIC_API_KEY` itself. The guard
// below checks, synchronously and without touching the OS keychain or
// `~/.claude` (Claude Code's own session storage — out of scope for this
// module, which only cares about the SDK's OWN documented auth surface,
// verified against the bundled `@anthropic-ai/sdk@0.93.0`'s `client.d.ts`):
//   1. `ANTHROPIC_AUTH_TOKEN` env var (the "local user token" profile
//      AGENTS.md/design.md Decision 2 name) — the primary signal.
//   2. `ANTHROPIC_API_KEY` env var, if the environment happens to already
//      export one (this module does not set or require it, only detects it).
//   3. The SDK's own on-disk profile config, `<config_dir>/active_config` or
//      `<config_dir>/configs/`, where `config_dir` is `ANTHROPIC_CONFIG_DIR`,
//      else `XDG_CONFIG_HOME/anthropic`, else `~/.config/anthropic` (the same
//      resolution order `core/credentials.js` documents).
// If NONE of these are present, `describe.skipIf` skips this suite entirely
// — so a machine with no Anthropic auth configured (e.g. a fresh CI runner,
// or this very sandbox — see this task's own final report) never fails
// `npm run test:integration`, it cleanly reports 1 skipped.
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { AnthropicModelPort } from "@kamerton/agent/src/anthropic-model-port.ts";
import { MODEL_CONFIG, type ToolUseBlock } from "@kamerton/agent/src/model-port.ts";
import { TOOLS } from "@kamerton/agent/src/tools.ts";
import { buildSystemPrompt } from "@kamerton/agent/src/system-prompt.ts";
import { ensureAmbientAuthToken } from "@kamerton/agent/src/ambient-auth.ts";
import { initialIntakeState } from "@kamerton/lib/src/intake/state-machine.ts";

function anthropicConfigDir(): string {
  if (process.env.ANTHROPIC_CONFIG_DIR) return process.env.ANTHROPIC_CONFIG_DIR;
  if (process.env.XDG_CONFIG_HOME) return path.join(process.env.XDG_CONFIG_HOME, "anthropic");
  return path.join(homedir(), ".config", "anthropic");
}

function hasAnthropicAuthSignal(): boolean {
  // Recognises (and bridges) the local Claude Code OAuth token too, so the
  // smoke runs whenever CLAUDE_CODE_OAUTH_TOKEN / ANTHROPIC_AUTH_TOKEN is
  // exported, not only when a config profile exists on disk.
  if (ensureAmbientAuthToken()) {
    return true;
  }
  const configDir = anthropicConfigDir();
  return (
    existsSync(path.join(configDir, "active_config")) ||
    existsSync(path.join(configDir, "configs")) ||
    existsSync(path.join(configDir, "credentials"))
  );
}

function isToolUseBlock(block: { type: string }): block is ToolUseBlock {
  return block.type === "tool_use";
}

describe.skipIf(!hasAnthropicAuthSignal())(
  "AnthropicModelPort — tiny real round trip (tasks.md 5.5, design.md Decision 5)",
  () => {
    // @trace TC-STACK-02
    // @trace NFR-UX-01
    it("calls save_name for a lead message naming their child", async () => {
      const port = new AnthropicModelPort();

      const response = await port.send(
        [{ role: "user", content: "Мене звати Оксана" }],
        TOOLS,
        MODEL_CONFIG,
        buildSystemPrompt(initialIntakeState()),
      );

      const toolUseBlocks = response.content.filter(isToolUseBlock);
      expect(toolUseBlocks.some((block) => block.name === "save_name")).toBe(true);
    }, 30000);
  },
);
