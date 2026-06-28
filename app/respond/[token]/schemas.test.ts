// @trace FR-LINK-03 TC-VALID-01
//
// Boundary tests for tokenBoundarySchema — the Zod guard applied before any DB
// call on the respondent route. Validates exactly 43 base64url characters.

import { describe, it, expect } from "vitest";
import { tokenBoundarySchema } from "./schemas";

describe("tokenBoundarySchema", () => {
  it("accepts a valid 43-character base64url token", () => {
    const valid = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"; // 43 chars
    const result = tokenBoundarySchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("accepts all base64url alphabet characters: A-Z a-z 0-9 - _", () => {
    // 43 chars using all allowed character classes (A-Z = 26, a-q = 17)
    const allChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopq"; // 43 chars, no + or /
    const result = tokenBoundarySchema.safeParse(allChars);
    expect(result.success).toBe(true);
  });

  it("rejects an empty string", () => {
    const result = tokenBoundarySchema.safeParse("");
    expect(result.success).toBe(false);
  });

  it("rejects a 42-character string (one short)", () => {
    const short = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"; // 42 chars
    const result = tokenBoundarySchema.safeParse(short);
    expect(result.success).toBe(false);
  });

  it("rejects a 44-character string (one over)", () => {
    const long = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"; // 44 chars
    const result = tokenBoundarySchema.safeParse(long);
    expect(result.success).toBe(false);
  });

  it("rejects a 10,000-character string (URL injection attempt)", () => {
    const huge = "A".repeat(10_000);
    const result = tokenBoundarySchema.safeParse(huge);
    expect(result.success).toBe(false);
  });

  it("rejects a token with a disallowed character '+'", () => {
    // standard base64 uses + and /, base64url replaces them with - and _
    const withPlus = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA+"; // 43 chars but has +
    const result = tokenBoundarySchema.safeParse(withPlus);
    expect(result.success).toBe(false);
  });

  it("rejects a padded base64 token containing '='", () => {
    // base64url does not use padding; '=' is standard base64, not base64url
    // 42 'A' + '=' = 43 chars total, but '=' is not in [A-Za-z0-9_-]
    const padded = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="; // 43 chars with '='
    const result = tokenBoundarySchema.safeParse(padded);
    expect(result.success).toBe(false);
  });
});
