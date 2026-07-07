// apps/dashboard/lib — appendKbEntry (kb-learning tasks.md E.1, design.md
// Decision 5 step 4 / Decision 5's pure/impure split, `@trace FR-KB-03`).
//
// TYPED THROWING STUB — RED phase. Real behavior lands in the GREEN pass: a
// thin `fs.appendFileSync(filePath, entry)` call (or a read-modify-write if
// a trailing-newline invariant needs preserving) — see
// `apps/dashboard/app/api/questions/[id]/route.ts`'s own header comment for
// how the answer-handler route calls this ONE function, in this exact
// signature, as step 4 of its five-step ordering (design.md Decision 5).
//
// CONTRACT pinned by `kb-write.test.ts`:
//   - appends `entry` VERBATIM to the file at `filePath`, preserving
//     whatever content the file already had (never truncates, never
//     rewrites earlier bytes).
//   - throws a REAL filesystem error (e.g. Node's own `ENOENT`) when
//     `filePath`'s directory does not exist — "not writable" per the
//     baseline spec's own "school.md append failure" scenario. The caller
//     (the route) is responsible for catching this and returning the
//     deterministic inline error; this function itself never swallows a
//     failure (contrast with the READ side,
//     `packages/agent/src/kb-context.ts`'s `readKnowledgeBaseText`, which
//     fails SOFT — design.md Decision 5's own "mirror image" note).
//
// This is the ONLY place in the whole diff allowed to WRITE
// `knowledge/school.md` (review-gate finding I.1(b)) — `packages/agent`/
// `packages/bot` only ever read it (Decision 1).

import { appendFileSync } from "node:fs";

export function appendKbEntry(filePath: string, entry: string): void {
  appendFileSync(filePath, entry);
}
