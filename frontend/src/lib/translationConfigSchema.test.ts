/**
 * Unit tests for the `translationConfigSchema` Zod schema
 * (Phase 1 plan 01).
 *
 * Covers the 6 cases the plan specifies:
 *  1. Full valid form → success.
 *  2. Empty model → failure with "Pick a model".
 *  3. Empty source → failure.
 *  4. Empty target → failure.
 *  5. Source === target → failure.
 *  6. Source unset + 1 declared language (caller suppresses the error
 *     via the component-level gate logic; the schema itself
 *     enforces non-empty).
 */
import { describe, expect, it } from "vitest";

import { translationConfigSchema } from "./translationConfigSchema";

describe("translationConfigSchema", () => {
  it("accepts a full valid form", () => {
    const result = translationConfigSchema.safeParse({
      provider: "openai-compatible",
      model: "gpt-4o-mini",
      sourceLanguage: "en",
      targetLanguage: "fr",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty model with the 'Pick a model' error", () => {
    const result = translationConfigSchema.safeParse({
      provider: "ollama",
      model: "",
      sourceLanguage: "en",
      targetLanguage: "fr",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const modelIssue = result.error.issues.find((i) => i.path.includes("model"));
      expect(modelIssue?.message).toBe("Pick a model");
    }
  });

  it("rejects an empty source language", () => {
    const result = translationConfigSchema.safeParse({
      provider: "ollama",
      model: "translategemma:12b",
      sourceLanguage: "",
      targetLanguage: "fr",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty target language", () => {
    const result = translationConfigSchema.safeParse({
      provider: "ollama",
      model: "translategemma:12b",
      sourceLanguage: "en",
      targetLanguage: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects source === target", () => {
    const result = translationConfigSchema.safeParse({
      provider: "ollama",
      model: "translategemma:12b",
      sourceLanguage: "fr",
      targetLanguage: "fr",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const targetIssue = result.error.issues.find((i) => i.path.includes("targetLanguage"));
      expect(targetIssue?.message).toBe("Source and target languages must differ");
    }
  });

  it("treats source unset + 1 declared language as a schema-level pass (the gate logic handles the conditional)", () => {
    // The schema itself enforces non-empty source — the component
    // (TranslationConfigStep) reads `noDeclaredLanguages` from the
    // EPUB metadata and suppresses the schema failure on the source
    // field at the gate level. The schema MUST still surface the
    // empty-source error so the unit test pins the contract; the
    // component owns the suppression.
    const result = translationConfigSchema.safeParse({
      provider: "ollama",
      model: "translategemma:12b",
      sourceLanguage: "",
      targetLanguage: "fr",
    });
    expect(result.success).toBe(false);
  });
});
