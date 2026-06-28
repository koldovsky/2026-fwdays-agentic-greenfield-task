import { describe, expect, it } from "vitest";
import { SEED_PRICE_TABLE } from "@/lib/ai/pricing";

describe("SEED_PRICE_TABLE", () => {
  // spec: seed table reflects current Anthropic pricing (TC-AI-02, FR-USAGE-04)
  it("holds current Anthropic pricing in USD per 1M tokens", () => {
    expect(SEED_PRICE_TABLE).toEqual({
      "claude-opus-4-8": { inputPerMillion: 5, outputPerMillion: 25 },
      "claude-sonnet-4-6": { inputPerMillion: 3, outputPerMillion: 15 },
      "claude-haiku-4-5": { inputPerMillion: 1, outputPerMillion: 5 },
    });
  });
});
