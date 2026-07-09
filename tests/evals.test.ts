import { describe, it, expect } from "vitest";
import { parseDay } from "../src/lib/parser";

// Eval set: a table of edge cases. Each row is a separate "example" with the
// expected number of valid blocks and errors. This is our mini dataset for
// checking parser quality (maker != checker: examples written apart from code).
type Case = { name: string; input: string; blocks: number; errors: number };

const CASES: Case[] = [
  { name: "empty input", input: "", blocks: 0, errors: 0 },
  { name: "comments only", input: "# a\n# b", blocks: 0, errors: 0 },
  { name: "surrounding whitespace", input: "   9:00-10:00 yoga   ", blocks: 1, errors: 0 },
  { name: "label with an inner dash", input: "9:00-10:00 code-review", blocks: 1, errors: 0 },
  { name: "label with a time inside", input: "9:00-10:00 call at 9:30", blocks: 1, errors: 0 },
  { name: "midnight as start", input: "0:00-1:00 sleep", blocks: 1, errors: 0 },
  { name: "late evening", input: "23:00-23:59 reading", blocks: 1, errors: 0 },
  { name: "24:00 is invalid", input: "24:00-25:00 x", blocks: 0, errors: 1 },
  { name: "missing label", input: "9:00-10:00", blocks: 0, errors: 1 },
  { name: "negative duration", input: "12:00-11:00 x", blocks: 0, errors: 1 },
  { name: "zero duration", input: "9:00-9:00 x", blocks: 0, errors: 1 },
  { name: "mixed valid+invalid", input: "9:00-10:00 ok\ngarbage\n10:00-11:00 ok2", blocks: 2, errors: 1 },
];

describe("parser eval set", () => {
  for (const c of CASES) {
    it(c.name, () => {
      const r = parseDay(c.input);
      expect(r.blocks.length, `blocks for "${c.name}"`).toBe(c.blocks);
      expect(r.errors.length, `errors for "${c.name}"`).toBe(c.errors);
    });
  }
});
