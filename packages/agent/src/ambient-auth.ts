// @kamerton/agent — ambient Anthropic auth resolution (NFR-SEC-01, design.md
// Decision 2's "local user token"). The bot and the real-Anthropic smoke
// authenticate with the developer's local Claude Code OAuth token, NEVER an
// API key. `@anthropic-ai/sdk` reads a bearer token from
// `ANTHROPIC_AUTH_TOKEN`; Claude Code exposes its OAuth token as
// `CLAUDE_CODE_OAUTH_TOKEN`. This bridges the two so `new Anthropic()` (no
// explicit credential argument) resolves the bearer token on its own.
//
// It never inspects, logs, persists, or returns the token VALUE — only maps
// one env var onto the SDK's documented one and reports whether *some* auth
// signal is present, so callers can degrade cleanly (skip a test, warn on
// startup) instead of the SDK throwing mid-request.

/**
 * If no `ANTHROPIC_AUTH_TOKEN` is set but a Claude Code OAuth token is
 * present, copy it onto `ANTHROPIC_AUTH_TOKEN` (the bearer var the SDK
 * reads). Returns whether any Anthropic auth signal is now available.
 * Idempotent; an already-set `ANTHROPIC_AUTH_TOKEN`/`ANTHROPIC_API_KEY` wins.
 */
export function ensureAmbientAuthToken(env: NodeJS.ProcessEnv = process.env): boolean {
  if (!env.ANTHROPIC_AUTH_TOKEN && env.CLAUDE_CODE_OAUTH_TOKEN) {
    env.ANTHROPIC_AUTH_TOKEN = env.CLAUDE_CODE_OAUTH_TOKEN;
  }
  return Boolean(env.ANTHROPIC_AUTH_TOKEN || env.ANTHROPIC_API_KEY);
}
