// Test-first per tasks.md 2.4. Unlike state-machine.test.ts's other cases,
// these constants are plain string literals with no logic to fake (S1
// precedent: slots/propose.ts's CALENDAR_UNAVAILABLE_APOLOGY shipped with
// real content in its own red round) — so these assertions may legitimately
// pass immediately against copy.ts's real Ukrainian text. That is expected
// and is called out explicitly in the test-engineer's report; it is not a
// red-discipline violation because no BEHAVIOR is pinned here, only fixed
// copy content against a content-shape rubric (BC-BRAND-01, DESIGN.md
// voice rules).
import { describe, expect, it } from "vitest";
import { AGE_REFUSAL_COPY, FORMAT_UNSURE_COPY, SCOPE_EXPLANATION_COPY } from "./copy";

const PRESSURE_VOCABULARY = ["останнє місце", "тільки сьогодні", "поспішайте"];

describe("intake guardrail copy constants", () => {
  // @trace FR-GUARD-04
  // @trace BC-BRAND-01
  it.each([
    ["AGE_REFUSAL_COPY", AGE_REFUSAL_COPY],
    ["SCOPE_EXPLANATION_COPY", SCOPE_EXPLANATION_COPY],
    ["FORMAT_UNSURE_COPY", FORMAT_UNSURE_COPY],
  ])("%s contains no exclamation marks and no pressure vocabulary", (_name, copy) => {
    expect(copy).not.toContain("!");
    for (const phrase of PRESSURE_VOCABULARY) {
      expect(copy.toLowerCase()).not.toContain(phrase);
    }
  });

  // @trace FR-GUARD-04
  // @trace BC-BRAND-01
  it("AGE_REFUSAL_COPY mentions the age-4 threshold", () => {
    expect(AGE_REFUSAL_COPY).toContain("4");
  });

  // @trace BC-SCOPE-01
  // @trace BC-SCOPE-02
  it("SCOPE_EXPLANATION_COPY never promises instrument lessons and offers a voice trial", () => {
    const lowered = SCOPE_EXPLANATION_COPY.toLowerCase();
    // Never a promise of instrument lessons: the phrase "уроки гри" (lesson
    // in playing [an instrument]) must never appear affirmatively — only
    // ever negated ("не проводимо").
    expect(lowered).toContain("не проводимо");
    expect(lowered).not.toMatch(/навчаємо (грі|гри) на/);
    // Offers a voice trial as the nearest yes.
    expect(lowered).toContain("пробне заняття з вокалу");
  });

  // @trace BC-FORMAT-01
  it("FORMAT_UNSURE_COPY contains no digits (BC-PRICE-01 boundary — never mentions a price)", () => {
    expect(FORMAT_UNSURE_COPY).not.toMatch(/[0-9]/);
  });
});
