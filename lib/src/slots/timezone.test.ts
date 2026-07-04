// Test-first (red): lib/src/slots/timezone.ts does not exist yet.
//
// Contract this test file pins down (design.md Decision 3, spec.md
// Conventions "Timezone"):
//   `kyivWallClockToUtc(local)` / `utcToKyivWallClock(utc)` are the ONLY
//   place in this codebase that touches a timezone/DST rule -- used solely
//   at the adapter boundary (never inside grid/subtract/rank/widen, which
//   stay pure wall-clock string arithmetic per TC-PURE-01).
//     - `local`: Europe/Kyiv wall-clock "YYYY-MM-DDTHH:mm" (no offset).
//     - `utc`: RFC3339 UTC, e.g. "2026-07-06T07:00:00.000Z".
//   The grid's wall-clock starts (10:00-19:00) never shift across a DST
//   transition -- only the UTC offset used for the conversion changes
//   (EET = UTC+2 in winter, EEST = UTC+3 in summer; Ukraine follows the
//   EU-wide DST schedule). 2026 transitions: EET->EEST on Sun 2026-03-29,
//   EEST->EET on Sun 2026-10-25 (verified against the IANA tz database via
//   Intl.DateTimeFormat during test authoring).
import { describe, expect, it } from "vitest";
import { kyivWallClockToUtc, utcToKyivWallClock } from "./timezone.ts";

describe("Kyiv wall-clock <-> RFC3339 UTC conversion", () => {
  // @trace FR-SLOT-01
  it("converts a mid-summer (EEST, UTC+3) Kyiv wall-clock grid start to UTC", () => {
    expect(kyivWallClockToUtc("2026-07-06T10:00")).toBe("2026-07-06T07:00:00.000Z");
  });

  // @trace FR-SLOT-01
  it("converts an RFC3339 UTC busy-interval timestamp back to Kyiv wall-clock time (mid-summer, EEST)", () => {
    expect(utcToKyivWallClock("2026-07-06T07:00:00.000Z")).toBe("2026-07-06T10:00");
  });

  // @trace FR-SLOT-01
  it("keeps the grid's wall-clock start fixed at 10:00 across the spring-forward DST boundary (Sun 2026-03-29), while the UTC offset shifts EET -> EEST", () => {
    // Monday before the transition: Kyiv is still EET, UTC+2.
    expect(kyivWallClockToUtc("2026-03-23T10:00")).toBe("2026-03-23T08:00:00.000Z");
    // Monday after the transition: Kyiv is now EEST, UTC+3 -- the SAME
    // 10:00 wall-clock grid start now maps to a different UTC instant.
    expect(kyivWallClockToUtc("2026-03-30T10:00")).toBe("2026-03-30T07:00:00.000Z");
  });

  // @trace FR-SLOT-01
  it("keeps the grid's wall-clock start fixed at 10:00 across the autumn fall-back DST boundary (Sun 2026-10-25), while the UTC offset shifts EEST -> EET", () => {
    // Monday before the transition: Kyiv is still EEST, UTC+3.
    expect(kyivWallClockToUtc("2026-10-19T10:00")).toBe("2026-10-19T07:00:00.000Z");
    // Monday after the transition: Kyiv is now EET, UTC+2.
    expect(kyivWallClockToUtc("2026-10-26T10:00")).toBe("2026-10-26T08:00:00.000Z");
  });

  // @trace FR-SLOT-01
  it("round-trips Kyiv wall-clock -> UTC -> Kyiv wall-clock without drift, on both sides of both 2026 DST boundaries", () => {
    const wallClockFixtures = [
      "2026-03-23T10:00",
      "2026-03-30T10:00",
      "2026-10-19T19:00",
      "2026-10-26T19:00",
    ];
    for (const wallClock of wallClockFixtures) {
      expect(utcToKyivWallClock(kyivWallClockToUtc(wallClock))).toBe(wallClock);
    }
  });
});
