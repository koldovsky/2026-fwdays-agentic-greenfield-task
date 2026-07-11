import { describe, expect, it } from "vitest";

import { TARGET_LANGUAGES, findLanguageName } from "@/lib/target_languages";

/**
 * Unit tests for the hardcoded ISO 639-1 target language list.
 *
 * BDD contract: `docs/features/translation-configuration.feature`
 * scenario "Target languages include at least 55 options" — the
 * "≥55" invariant is enforced at the unit level so the dropdown
 * regression is caught before the Playwright run.
 *
 * Phase 02.1 D-07: every test in this file shares the tcid
 * ``F-UT01`` (frontend unit group; CONF-02-UT01 per the test plan).
 * Vitest does not have a Playwright-style ``test.info().annotations``
 * — we annotate each ``it()`` with a ``tcid`` custom property on
 * the test context. See ``.planning/.../02.1-TEST-PLAN.md`` for
 * the inventory.
 */
const TCID = "F-UT01";

describe("target_languages", () => {
  it(`tcid=${TCID}: contains at least 55 entries (BDD ≥55 invariant)`, () => {
    expect(TARGET_LANGUAGES.length).toBeGreaterThanOrEqual(55);
  });

  it(`tcid=${TCID}: contains the full PRD §9 Appendix A enumeration`, () => {
    // The PRD lists Afrikaans..Zulu — 80 entries. Pin to that exact
    // count so a silent edit doesn't drop a language without review.
    expect(TARGET_LANGUAGES.length).toBe(80);
  });

  it(`tcid=${TCID}: has unique codes (no duplicates)`, () => {
    const codes = TARGET_LANGUAGES.map((l) => l.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it(`tcid=${TCID}: findLanguageName returns the human-readable name for known codes`, () => {
    expect(findLanguageName("en")).toBe("English");
    expect(findLanguageName("de")).toBe("German");
    expect(findLanguageName("zh-CN")).toBe("Chinese (Simplified)");
  });

  it(`tcid=${TCID}: findLanguageName is case-insensitive`, () => {
    expect(findLanguageName("EN")).toBe("English");
    expect(findLanguageName("zh-cn")).toBe("Chinese (Simplified)");
  });

  it(`tcid=${TCID}: findLanguageName falls back to the code for unknown languages`, () => {
    expect(findLanguageName("xx")).toBe("xx");
  });

  it(`tcid=${TCID}: findLanguageName returns empty string for empty input`, () => {
    expect(findLanguageName("")).toBe("");
  });
});
