import { describe, it, expect } from "vitest";
import { normalizeNumericReply, mapReplyToAnchor } from "./scale";

const anchors = [{ value: 1 }, { value: 2 }, { value: 3 }, { value: 4 }, { value: 5 }];

describe("normalizeNumericReply", () => {
  it("parses a plain integer", () => {
    expect(normalizeNumericReply("4")).toBe(4);
  });

  it("treats a Ukrainian decimal comma as a decimal point", () => {
    expect(normalizeNumericReply("3,5")).toBe(3.5);
  });

  it("strips surrounding whitespace and trailing punctuation", () => {
    expect(normalizeNumericReply(" 4. ")).toBe(4);
    expect(normalizeNumericReply("4.")).toBe(4);
    expect(normalizeNumericReply("5!")).toBe(5);
  });

  it("returns null for prose, mixed content, or multiple numbers", () => {
    expect(normalizeNumericReply("4 з 5")).toBeNull();
    expect(normalizeNumericReply("десь четвірка")).toBeNull();
    expect(normalizeNumericReply("")).toBeNull();
    expect(normalizeNumericReply("   ")).toBeNull();
    expect(normalizeNumericReply("abc")).toBeNull();
  });
});

describe("mapReplyToAnchor", () => {
  it("maps a clean integer reply to the matching anchor", () => {
    expect(mapReplyToAnchor("4", anchors)).toBe(4);
    expect(mapReplyToAnchor(" 2 ", anchors)).toBe(2);
    expect(mapReplyToAnchor("4.", anchors)).toBe(4);
  });

  it("returns null for a value outside the anchor set", () => {
    expect(mapReplyToAnchor("10", anchors)).toBeNull();
    expect(mapReplyToAnchor("0", anchors)).toBeNull();
  });

  it("does not round a fractional reply to a nearby anchor", () => {
    expect(mapReplyToAnchor("3,5", anchors)).toBeNull();
  });

  it("returns null for an unparseable reply", () => {
    expect(mapReplyToAnchor("не знаю", anchors)).toBeNull();
  });
});
