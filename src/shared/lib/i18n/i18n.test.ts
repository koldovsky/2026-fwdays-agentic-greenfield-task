import { describe, expect, it } from "vitest";

import { dictionaries, en, parseLocale, t, ua } from "./index";

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
  it("ua and en have identical key sets (structural parity)", () => {
    expect(flattenKeys(ua)).toEqual(flattenKeys(en));
  });

  it("ua values contain no emoji and no exclamation points (BC-BRAND-01)", () => {
    for (const value of flattenValues(ua)) {
      expect(value).not.toMatch(EMOJI);
      expect(value).not.toContain("!");
    }
  });

  it("t() returns ua as the default fallback", () => {
    expect(t("ua")).toBe(ua);
    expect(t("en")).toBe(en);
    expect(dictionaries.ua).toBe(ua);
  });

  it("parseLocale coerces cookie values Ukrainian-first (add-language-toggle)", () => {
    expect(parseLocale("en")).toBe("en");
    expect(parseLocale("ua")).toBe("ua");
    // Anything unrecognized falls back to Ukrainian (default), never throws.
    expect(parseLocale(undefined)).toBe("ua");
    expect(parseLocale(null)).toBe("ua");
    expect(parseLocale("")).toBe("ua");
    expect(parseLocale("fr")).toBe("ua");
    expect(parseLocale("EN")).toBe("ua");
  });
});
