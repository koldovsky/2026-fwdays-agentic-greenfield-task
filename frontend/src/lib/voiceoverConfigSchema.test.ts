/**
 * Unit tests for the `voiceoverConfigSchema` Zod schema
 * (Phase 1 plan 03).
 *
 * Covers the 5 cases the plan specifies:
 *  1. Full valid form → success.
 *  2. Empty base URL → failure.
 *  3. Empty API key → failure.
 *  4. Empty voiceover language → failure.
 *  5. Invalid URL (e.g. "not-a-url") → failure.
 */
import { describe, expect, it } from "vitest";

import { voiceoverConfigSchema } from "./voiceoverConfigSchema";

describe("voiceoverConfigSchema", () => {
  it("accepts a full valid form", () => {
    const result = voiceoverConfigSchema.safeParse({
      provider: "openai-compatible",
      providerBaseUrl: "https://api.openai.com/v1",
      providerApiKey: "sk-test",
      voiceoverLanguage: "en",
      voice: "alloy",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty base URL", () => {
    const result = voiceoverConfigSchema.safeParse({
      provider: "openai-compatible",
      providerBaseUrl: "",
      providerApiKey: "sk-test",
      voiceoverLanguage: "en",
      voice: "alloy",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty API key", () => {
    const result = voiceoverConfigSchema.safeParse({
      provider: "openai-compatible",
      providerBaseUrl: "https://api.openai.com/v1",
      providerApiKey: "",
      voiceoverLanguage: "en",
      voice: "alloy",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty voiceover language", () => {
    const result = voiceoverConfigSchema.safeParse({
      provider: "openai-compatible",
      providerBaseUrl: "https://api.openai.com/v1",
      providerApiKey: "sk-test",
      voiceoverLanguage: "",
      voice: "alloy",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid URL", () => {
    const result = voiceoverConfigSchema.safeParse({
      provider: "openai-compatible",
      providerBaseUrl: "not-a-url",
      providerApiKey: "sk-test",
      voiceoverLanguage: "en",
      voice: "alloy",
    });
    expect(result.success).toBe(false);
  });
});
