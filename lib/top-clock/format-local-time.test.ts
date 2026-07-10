import { describe, expect, it } from "vitest";
import { formatLocalTime, formatLocalTimeIso } from "./format-local-time";

// @trace FR-CLOCK-01
describe("formatLocalTime", () => {
  it("formats a fixed instant as 24-hour HH:MM in uk-UA", () => {
    const date = new Date(2026, 5, 27, 14, 5);

    expect(formatLocalTime(date)).toMatch(/^14:0?5$/);
  });

  it("pads single-digit minutes", () => {
    const date = new Date(2026, 5, 27, 9, 7);

    expect(formatLocalTime(date)).toMatch(/^09:07$/);
  });

  it("exposes a stable HH:MM dateTime value", () => {
    const date = new Date(2026, 5, 27, 23, 59);

    expect(formatLocalTimeIso(date)).toBe("23:59");
  });
});
