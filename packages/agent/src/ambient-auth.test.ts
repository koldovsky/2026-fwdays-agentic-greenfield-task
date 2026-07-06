import { describe, expect, it } from "vitest";
import { ensureAmbientAuthToken } from "./ambient-auth.ts";

// @trace NFR-SEC-01 — auth resolves from the local Claude Code OAuth token,
// never an API key introduced into the repo/.env.
describe("ensureAmbientAuthToken", () => {
  it("maps CLAUDE_CODE_OAUTH_TOKEN onto ANTHROPIC_AUTH_TOKEN when the latter is unset", () => {
    const env: NodeJS.ProcessEnv = { CLAUDE_CODE_OAUTH_TOKEN: "oat-xyz" };
    expect(ensureAmbientAuthToken(env)).toBe(true);
    expect(env.ANTHROPIC_AUTH_TOKEN).toBe("oat-xyz");
  });

  it("does not override an already-set ANTHROPIC_AUTH_TOKEN", () => {
    const env: NodeJS.ProcessEnv = { ANTHROPIC_AUTH_TOKEN: "preset", CLAUDE_CODE_OAUTH_TOKEN: "oat-xyz" };
    expect(ensureAmbientAuthToken(env)).toBe(true);
    expect(env.ANTHROPIC_AUTH_TOKEN).toBe("preset");
  });

  it("reports true when only ANTHROPIC_API_KEY is present (SDK's own fallback)", () => {
    const env: NodeJS.ProcessEnv = { ANTHROPIC_API_KEY: "sk-whatever" };
    expect(ensureAmbientAuthToken(env)).toBe(true);
    expect(env.ANTHROPIC_AUTH_TOKEN).toBeUndefined();
  });

  it("reports false and changes nothing when no auth signal is present", () => {
    const env: NodeJS.ProcessEnv = {};
    expect(ensureAmbientAuthToken(env)).toBe(false);
    expect(env.ANTHROPIC_AUTH_TOKEN).toBeUndefined();
  });
});
