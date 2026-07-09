import { parseTime } from "./time";

export type Block = { start: number; end: number; label: string };
export type ParseError = { line: number; input: string; message: string };
export type ParseResult = { blocks: Block[]; errors: ParseError[] };

// Line: "9:00-10:30 label" or "9:00 - 10:30 label". Time, dash, time, then label.
const LINE_RE = /^\s*(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\s+(.+?)\s*$/;

/** R1-R3 + sorting (R5). Comments (#) and empty lines are ignored. */
export function parseDay(text: string): ParseResult {
  const blocks: Block[] = [];
  const errors: ParseError[] = [];

  text.split("\n").forEach((rawLine, i) => {
    const line = i + 1;
    const trimmed = rawLine.trim();
    if (trimmed === "" || trimmed.startsWith("#")) return; // comment/empty

    const m = trimmed.match(LINE_RE);
    if (!m) {
      errors.push({ line, input: rawLine, message: "line does not match format 'HH:MM-HH:MM label'" });
      return;
    }

    try {
      const start = parseTime(m[1]); // R2
      const end = parseTime(m[2]);   // R2
      const label = m[3].trim();
      if (end <= start) { // R3
        errors.push({ line, input: rawLine, message: "end must be later than start" });
        return;
      }
      blocks.push({ start, end, label });
    } catch (e) {
      errors.push({ line, input: rawLine, message: (e as Error).message });
    }
  });

  blocks.sort((a, b) => a.start - b.start); // R5
  return { blocks, errors };
}

/** R4: all pairs of overlapping blocks. Expects a sorted array.
 *  Compare every pair: one long block can cover several NON-adjacent ones. */
export function findOverlaps(blocks: Block[]): [Block, Block][] {
  const out: [Block, Block][] = [];
  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      // sorted by start, so j.start >= i.start; overlap if j starts before i ends
      if (blocks[j].start < blocks[i].end) out.push([blocks[i], blocks[j]]);
    }
  }
  return out;
}

/** Total focus time and gaps between adjacent blocks. */
export function summarize(blocks: Block[]): {
  totalFocusMinutes: number;
  gaps: { start: number; end: number }[];
} {
  const totalFocusMinutes = blocks.reduce((sum, b) => sum + (b.end - b.start), 0);
  const gaps: { start: number; end: number }[] = [];
  for (let i = 0; i < blocks.length - 1; i++) {
    if (blocks[i + 1].start > blocks[i].end) {
      gaps.push({ start: blocks[i].end, end: blocks[i + 1].start });
    }
  }
  return { totalFocusMinutes, gaps };
}
