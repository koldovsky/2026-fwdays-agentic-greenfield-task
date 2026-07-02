import { describe, expect, it } from "vitest";

import { dictionaries, en, t, uk } from "./index";

const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}️]/u;

/** Flatten nested string values into path->string pairs for structural comparison. */
function flattenKeys(obj: unknown, prefix = ""): string[] {
  if (obj === null || typeof obj !== "object") return [prefix];
  return Object.entries(obj as Record<string, unknown>)
    .flatMap(([k, v]) => flattenKeys(v, prefix ? `${prefix}.${k}` : k))
    .sort();
}

function flattenValues(obj: unknown): string[] {
  if (typeof obj === "string") return [obj];
  if (obj === null || typeof obj !== "object") return [];
  return Object.values(obj as Record<string, unknown>).flatMap(flattenValues);
}

describe("i18n (NFR-I18N-01, BC-BRAND-01)", () => {
  it("uk and en have identical key sets (structural parity)", () => {
    expect(flattenKeys(uk)).toEqual(flattenKeys(en));
  });

  it("uk values contain no emoji and no exclamation points (BC-BRAND-01)", () => {
    for (const value of flattenValues(uk)) {
      expect(value).not.toMatch(EMOJI);
      expect(value).not.toContain("!");
    }
  });

  it("t() returns uk as the default fallback", () => {
    expect(t("uk")).toBe(uk);
    expect(t("en")).toBe(en);
    expect(dictionaries.uk).toBe(uk);
  });
});
