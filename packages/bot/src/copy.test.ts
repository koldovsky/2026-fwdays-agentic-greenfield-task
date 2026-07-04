// Test-first per tasks.md 5.3 — same precedent lib/src/intake/copy.test.ts
// names explicitly (2.4): `ANTHROPIC_PROCESSING_NOTICE` is a plain string
// literal with no logic to fake (S1's `slots/propose.ts`
// `CALENDAR_UNAVAILABLE_APOLOGY` shipped real content in its own red
// round), so these content-shape assertions may legitimately pass
// immediately against `copy.ts`'s real Ukrainian text. That is expected and
// reported explicitly, not a red-discipline violation — no BEHAVIOUR is
// pinned here, only fixed copy content against BC-BRAND-01/DESIGN.md's
// voice rubric and NFR-PRIV-02's content requirement. The genuinely red
// half (that `pipeline.ts` actually SENDS this notice to a brand-new lead)
// lives in `pipeline.test.ts`, not here.
import { describe, expect, it } from "vitest";
import { ANTHROPIC_PROCESSING_NOTICE } from "./copy.ts";

const PRESSURE_VOCABULARY = ["останнє місце", "тільки сьогодні", "поспішайте"];

describe("ANTHROPIC_PROCESSING_NOTICE (@trace NFR-PRIV-02)", () => {
  it("contains no exclamation marks and no pressure vocabulary (BC-BRAND-01)", () => {
    expect(ANTHROPIC_PROCESSING_NOTICE).not.toContain("!");
    for (const phrase of PRESSURE_VOCABULARY) {
      expect(ANTHROPIC_PROCESSING_NOTICE.toLowerCase()).not.toContain(phrase);
    }
  });

  it("is a single line (one-line notice, per spec.md's own wording)", () => {
    expect(ANTHROPIC_PROCESSING_NOTICE).not.toContain("\n");
  });

  it("names Anthropic explicitly, as the processing-disclosure NFR requires", () => {
    expect(ANTHROPIC_PROCESSING_NOTICE).toContain("Anthropic");
  });
});
