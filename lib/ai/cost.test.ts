import { describe, expect, it } from "vitest";
import { cost, UnknownModelError } from "@/lib/ai/cost";
import { SEED_PRICE_TABLE } from "@/lib/ai/pricing";
import type { PriceTable } from "@/lib/schemas/usage";

describe("cost", () => {
  // 4.1 — known models against the seed table (spec scenarios)
  it("prices a known model: opus 1M/1M tokens → 30 USD", () => {
    expect(cost("claude-opus-4-8", 1_000_000, 1_000_000)).toBe(30);
  });

  it("prices input and output independently: sonnet 2M/0.5M → 13.5 USD", () => {
    expect(cost("claude-sonnet-4-6", 2_000_000, 500_000)).toBe(13.5);
  });

  // 4.2 — zero tokens cost nothing for every seeded model
  it("returns 0 for zero tokens on each seeded model", () => {
    for (const modelId of Object.keys(SEED_PRICE_TABLE)) {
      expect(cost(modelId, 0, 0)).toBe(0);
    }
  });

  // 4.3 — a custom table overrides the seed
  it("uses a caller-supplied price table over the seed", () => {
    const custom: PriceTable = {
      "claude-opus-4-8": { inputPerMillion: 10, outputPerMillion: 50 },
    };
    expect(cost("claude-opus-4-8", 1_000_000, 1_000_000, custom)).toBe(60);
    // and it differs from the seed result
    expect(cost("claude-opus-4-8", 1_000_000, 1_000_000)).toBe(30);
  });

  // 4.4 — unknown model fails explicitly; bad token counts rejected
  it("fails explicitly on an unknown model id (never a silent 0)", () => {
    expect(() => cost("gpt-nope", 1_000_000, 0)).toThrow(UnknownModelError);
  });

  it("rejects a negative token count via validation", () => {
    expect(() => cost("claude-opus-4-8", -1, 0)).toThrow();
  });

  it("rejects a non-integer token count via validation", () => {
    expect(() => cost("claude-opus-4-8", 1.5, 0)).toThrow();
  });
});
