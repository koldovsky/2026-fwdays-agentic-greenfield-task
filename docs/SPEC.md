# Focus Blocks — Specification (SDD)

## 1. Problem
People plan their day in their head or in messy notes. There is no quick way to
jot the day down in plain text and immediately see: whether blocks overlap, how
much total focus time there is, and where the gaps are.

## 2. Solution (one sentence)
A web utility that parses a plain-text day plan into structured time blocks,
validates them, and visualizes a timeline plus metrics.

## 3. Input format (grammar)
One block = one line:

```
<HH:MM>-<HH:MM> <label>
```

- 24-hour time, with or without a leading zero: `9:00` == `09:00`.
- Range separator: a dash `-` (with or without surrounding spaces).
- Label — any text after the time (edges trimmed).
- Empty lines and lines starting with `#` are ignored (comments).

## 4. Validation rules (these define correctness)
Every parsed block / set of blocks must satisfy:

| ID   | Rule                                                            | Error type |
|------|-----------------------------------------------------------------|------------|
| R1   | Line matches the grammar                                        | parse      |
| R2   | Hours 0-23, minutes 0-59                                        | parse      |
| R3   | End strictly later than start (no zero/negative-length blocks)  | parse      |
| R4   | Blocks do not overlap each other                                | overlap    |
| R5   | Blocks are returned sorted by start time                        | (behavior) |

## 5. Output (function contracts)
```ts
type Block = { start: number; end: number; label: string };   // minutes from 00:00
type ParseError = { line: number; input: string; message: string };
type ParseResult = { blocks: Block[]; errors: ParseError[] };

parseDay(text: string): ParseResult            // R1-R3, sorts (R5)
findOverlaps(blocks: Block[]): [Block,Block][]  // R4
summarize(blocks: Block[]): {
  totalFocusMinutes: number;                   // sum of durations
  gaps: { start: number; end: number }[];      // gaps between blocks
}
```

## 6. Examples (basis for tests and evals)
Input:
```
9:00-10:30 deep work
# break
10:30 - 11:00 email
11:00-10:00 mistake
```
Expectations:
- 2 valid blocks (deep work, email), sorted.
- 1 parse error on line 4 (R3: end earlier than start).
- Comment and empty lines ignored.
- totalFocusMinutes = 90 + 30 = 120.

## 7. Out of scope (deliberately NOT doing)
- Crossing midnight (blocks that span past 00:00).
- Server persistence / database.
- Authentication, multi-user.
- Time zones.

## 8. Definition of Done
- [ ] All examples from section 6 pass as tests.
- [ ] The edge-case eval set is green.
- [ ] `npm run build` (Next.js) succeeds.
- [ ] The UI shows the timeline, metrics, and errors with line numbers.
- [ ] A separate maker != checker review pass has been performed.
