import { describe, it, expect } from "vitest";
import { parseDay, findOverlaps, summarize } from "../src/lib/parser";
import { parseTime, formatTime } from "../src/lib/time";

describe("time helpers", () => {
  it("parses time with and without leading zero", () => {
    expect(parseTime("9:00")).toBe(540);
    expect(parseTime("09:00")).toBe(540);
  });
  it("formats back to HH:MM", () => {
    expect(formatTime(540)).toBe("09:00");
    expect(formatTime(75)).toBe("01:15");
  });
  it("R2: rejects hours/minutes out of range", () => {
    expect(() => parseTime("24:00")).toThrow();
    expect(() => parseTime("10:60")).toThrow();
  });
});

describe("parseDay", () => {
  it("R1: accepts both dash variants", () => {
    expect(parseDay("9:00-10:00 a").blocks).toHaveLength(1);
    expect(parseDay("9:00 - 10:00 a").blocks).toHaveLength(1);
  });
  it("R1: error on unreadable line with line number", () => {
    const r = parseDay("breakfast at nine");
    expect(r.blocks).toHaveLength(0);
    expect(r.errors[0].line).toBe(1);
  });
  it("ignores comments and empty lines", () => {
    const r = parseDay("# plan\n\n9:00-10:00 work\n");
    expect(r.blocks).toHaveLength(1);
    expect(r.errors).toHaveLength(0);
  });
  it("R3: end not later than start -> error", () => {
    expect(parseDay("11:00-10:00 x").errors[0].message).toContain("end");
    expect(parseDay("10:00-10:00 x").errors).toHaveLength(1);
  });
  it("R5: sorts blocks by start time", () => {
    const r = parseDay("14:00-15:00 second\n9:00-10:00 first");
    expect(r.blocks.map((b) => b.label)).toEqual(["first", "second"]);
  });

  it("example from SPEC section 6", () => {
    const input = [
      "9:00-10:30 deep work",
      "# break",
      "10:30 - 11:00 email",
      "11:00-10:00 mistake",
    ].join("\n");
    const r = parseDay(input);
    expect(r.blocks).toHaveLength(2);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].line).toBe(4);
    expect(summarize(r.blocks).totalFocusMinutes).toBe(120);
  });
});

describe("findOverlaps (R4)", () => {
  it("finds an overlap", () => {
    const { blocks } = parseDay("9:00-10:00 a\n9:30-11:00 b");
    expect(findOverlaps(blocks)).toHaveLength(1);
  });
  it("adjacent blocks (end==start) do not overlap", () => {
    const { blocks } = parseDay("9:00-10:00 a\n10:00-11:00 b");
    expect(findOverlaps(blocks)).toHaveLength(0);
  });
});

describe("summarize", () => {
  it("computes gaps between blocks", () => {
    const { blocks } = parseDay("9:00-10:00 a\n11:00-12:00 b");
    const s = summarize(blocks);
    expect(s.gaps).toEqual([{ start: 600, end: 660 }]);
    expect(s.totalFocusMinutes).toBe(120);
  });
});

describe("findOverlaps — reviewer pass (maker != checker)", () => {
  it("long block covers a NON-adjacent block", () => {
    // 9:00-12:00 overlaps 11:00-11:30, but 9:15-9:30 sits between them
    const { blocks } = parseDay("9:00-12:00 deep\n9:15-9:30 short\n11:00-11:30 call");
    // expect AT LEAST two overlaps (deep x short, deep x call)
    expect(findOverlaps(blocks).length).toBeGreaterThanOrEqual(2);
  });
});
