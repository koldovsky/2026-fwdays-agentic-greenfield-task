import { describe, expect, it } from "vitest";
import { formatDate, formatNumber, formatPercent } from "@/app/lib/format";

describe("uk-UA formatting (BC-LANG-01)", () => {
  it("percent uses a (non-breaking) space before the sign", () => {
    const out = formatPercent(54);
    expect(out).toBe("54 %");
    expect(out).not.toBe("54%");
  });

  it("numbers use a comma decimal and a space thousands separator", () => {
    expect(formatNumber(151.55, { maximumFractionDigits: 1 })).toBe("151,6");
    expect(formatNumber(1234)).toBe("1 234");
  });

  it("dates render in Ukrainian, day–month–year", () => {
    expect(formatDate(new Date("2026-07-31"))).toBe("31 липня 2026 р.");
  });
});

// @trace BC-LANG-01
