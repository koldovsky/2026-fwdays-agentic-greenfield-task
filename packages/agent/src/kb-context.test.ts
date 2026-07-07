// Test-first (red -> green): kb-learning tasks.md C.3 (design.md Decision 1).
//
// `readKnowledgeBaseText(path)` is a TYPED THROWING STUB (kb-context.ts)
// until tasks.md C.4's green half implements the real ENOENT-safe read.
// Every assertion below is expected to FAIL against the stub, for the right
// reason (the stub's own "not implemented yet" throw propagating out of the
// call), until C.4 lands — same convention as `loop.test.ts`'s own red round
// before `runIntakeTurn` was implemented.
//
// Real filesystem I/O against a real tmp-dir fixture file (no mocking of
// `node:fs`) — mirrors `apps/dashboard/lib/kb-write.test.ts`'s own "a real
// tmp-dir fixture file" convention (kb-learning tasks.md E.1).
import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readKnowledgeBaseText } from "./kb-context.ts";

describe("readKnowledgeBaseText (kb-learning design.md Decision 1)", () => {
  // @trace FR-KB-03
  it("returns a fixture file's exact content, verbatim, when given its path", () => {
    const dir = mkdtempSync(join(tmpdir(), "kamerton-kb-context-"));
    const filePath = join(dir, "school.md");
    const content =
      "# Kamerton — школа вокалу\n\n## Індивідуальні заняття\n\n45 хвилин, 600 грн.\n";
    writeFileSync(filePath, content, "utf8");

    try {
      expect(readKnowledgeBaseText(filePath)).toBe(content);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // @trace FR-KB-03
  it('returns "" (never throws) when the path does not exist — design.md Decision 1\'s "fails soft" read-side contrast with the write side', () => {
    const dir = mkdtempSync(join(tmpdir(), "kamerton-kb-context-missing-"));
    const missingPath = join(dir, "does-not-exist", "school.md");

    try {
      expect(() => readKnowledgeBaseText(missingPath)).not.toThrow();
      expect(readKnowledgeBaseText(missingPath)).toBe("");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
