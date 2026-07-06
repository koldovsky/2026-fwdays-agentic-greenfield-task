// Test-first per booking-hitl tasks.md A.7. Unlike this slice's other new
// `lib/src/booking/` modules, `copy.ts`'s constants/composers are plain
// deterministic text with no behavior to fake (S1/S2 precedent:
// `slots/propose.ts`'s CALENDAR_UNAVAILABLE_APOLOGY and `intake/copy.ts`
// both shipped real content in their own red round) — so these
// content-shape assertions may legitimately pass immediately against
// copy.ts's real Ukrainian text. That is expected and called out in the
// test-engineer's report; it is not a red-discipline violation because no
// BEHAVIOR is pinned here, only fixed copy content against BC-BRAND-01/
// BC-LANG-01's voice rubric.
import { describe, expect, it } from "vitest";
import { composeConfirmationMessage, composeReProposalMessage, DECLINE_COPY } from "./copy.ts";

// Matches any emoji-range codepoint — used to assert "no emoji at all"
// (decline/re-proposal) and "no emoji OTHER than 🎵" (confirmation).
const EMOJI_REGEX = /\p{Extended_Pictographic}/gu;

function countOccurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

describe("composeConfirmationMessage — FR-HITL-02 confirmation with date and time", () => {
  // @trace FR-HITL-02
  it("interpolates the slot's exact date and time", () => {
    const message = composeConfirmationMessage({ start: "2026-07-07T17:00" });
    expect(message).toContain("07.07.2026");
    expect(message).toContain("17:00");
  });

  // @trace BC-BRAND-01
  // @trace BC-LANG-01
  it("carries at most one exclamation mark and at most one 🎵, and no other emoji", () => {
    const message = composeConfirmationMessage({ start: "2026-07-07T17:00" });
    expect(countOccurrences(message, "!")).toBeLessThanOrEqual(1);
    expect(countOccurrences(message, "🎵")).toBeLessThanOrEqual(1);

    const allEmoji = message.match(EMOJI_REGEX) ?? [];
    for (const emoji of allEmoji) {
      expect(emoji).toBe("🎵");
    }
  });
});

describe("DECLINE_COPY — FR-HITL-02 kind refusal, door left open", () => {
  // @trace FR-HITL-02
  // @trace BC-BRAND-01
  it("contains no exclamation marks and no emoji", () => {
    expect(DECLINE_COPY).not.toContain("!");
    expect(DECLINE_COPY.match(EMOJI_REGEX) ?? []).toHaveLength(0);
  });

  // @trace FR-HITL-02
  it("explicitly invites the lead to return", () => {
    expect(DECLINE_COPY.toLowerCase()).toMatch(/раді бачити вас знову|повернутися|напишіть нам/);
  });
});

describe("composeReProposalMessage — FR-HITL-02 propose-another-time carries the admin's slots", () => {
  // @trace FR-HITL-02
  it("interpolates every offered slot's date and time", () => {
    const message = composeReProposalMessage([
      { start: "2026-07-07T15:00" },
      { start: "2026-07-08T18:00" },
    ]);
    expect(message).toContain("07.07.2026");
    expect(message).toContain("15:00");
    expect(message).toContain("08.07.2026");
    expect(message).toContain("18:00");
  });

  // @trace BC-BRAND-01
  // @trace BC-LANG-01
  it("contains no exclamation marks and no emoji", () => {
    const message = composeReProposalMessage([{ start: "2026-07-07T15:00" }]);
    expect(message).not.toContain("!");
    expect(message.match(EMOJI_REGEX) ?? []).toHaveLength(0);
  });
});
