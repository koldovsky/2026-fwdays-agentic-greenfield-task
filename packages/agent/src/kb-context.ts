// @kamerton/agent — kb-context.ts (kb-learning design.md Decision 1).
//
// GREEN half (kb-learning tasks.md C.4). `readKnowledgeBaseText` is a
// synchronous, ENOENT-safe read of `knowledge/school.md` — the ONLY reader
// this package ever needs (design.md Decision 5: `packages/agent` reads,
// `apps/dashboard` writes, neither shares a runtime process with the
// other).
//
// PINNED CONTRACT (kb-learning tasks.md C.3, design.md Decision 1):
//   `readKnowledgeBaseText(path: string): string` — given an existing file's
//   path, returns its exact content, verbatim. Given a path that does not
//   exist (or is otherwise unreadable), returns `""` and NEVER throws (the
//   read side's failure mode is the deliberate mirror image of
//   `apps/dashboard/lib/kb-write.ts`'s write side, which fails LOUD — see
//   design.md Decision 5's own contrast: a soft read failure just means
//   every question degrades to the safe `log_question` promise path,
//   whereas a soft write failure would silently lose an administrator's
//   answer).

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Given an existing file's path, returns its exact content, verbatim. Given
 * a path that does not exist or cannot be read for any other reason (a
 * permissions error, a directory instead of a file, etc.), returns `""` and
 * NEVER throws.
 */
export function readKnowledgeBaseText(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

// The repo-root resolution `packages/bot/src/index.ts` already uses for its
// own `repoRoot` constant (`path.resolve(dirname(fileURLToPath(import.meta.url)),
// "../../..")`) — this module lives at the SAME depth
// (`packages/<pkg>/src/<file>.ts`), so the identical "../../.." walk lands
// on the repo root here too (design.md Decision 1's own wording, and the
// Risks section's "a single duplicated path.resolve(...) line" note).
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

/** The repo-root-resolved `knowledge/school.md` path — the loop's own
 *  per-turn KB read (tasks.md C.6/C.9's production call site) reads through
 *  this constant, never re-deriving `repoRoot` itself. */
export const DEFAULT_KNOWLEDGE_BASE_PATH: string = join(repoRoot, "knowledge", "school.md");
