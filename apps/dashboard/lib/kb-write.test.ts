// Test-first (RED): `apps/dashboard/lib/kb-write.ts`'s `appendKbEntry` is
// STILL the typed throwing stub from this pass — every test below is
// expected to FAIL against the stub for the right reason until the GREEN
// pass (kb-learning tasks.md E.1) implements the real `fs.appendFileSync`
// call. `@trace FR-KB-03`.
//
// Real tmp-dir fixture file (no mocking of `node:fs`) — mirrors this
// codebase's own "real I/O over a temp resource, never a mocked adapter"
// convention (e.g. every `route.test.ts` in this app uses a real temp
// SQLite file, never a mocked `better-sqlite3`).

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { appendKbEntry } from "./kb-write.ts";

describe("appendKbEntry (kb-learning tasks.md E.1, design.md Decision 5 step 4, @trace FR-KB-03)", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "kamerton-kb-write-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("appends the exact entry text to an existing file, preserving prior content", () => {
    const filePath = path.join(dir, "school.md");
    const priorContent =
      "# База знань\n\n## Формат занять\n\nІндивідуальні заняття по 45 хв.\n";
    writeFileSync(filePath, priorContent);

    const entry = "\n## Чи є парковка?\n\nТак, біля входу є безкоштовна парковка.\n";
    appendKbEntry(filePath, entry);

    const contentAfter = readFileSync(filePath, "utf8");
    expect(contentAfter).toBe(priorContent + entry);
  });

  it("throws a real filesystem error (never silently swallowed) when the target path's directory does not exist", () => {
    const filePath = path.join(dir, "does-not-exist", "school.md");
    const entry = "\n## Питання\n\nВідповідь.\n";

    // Pins the ACTUAL error class Node's own `fs.appendFileSync` raises for
    // a missing directory (`ENOENT`) — a bare "not implemented" stub throw
    // would trivially satisfy a weaker `.toThrow()` assertion without ever
    // proving the real fs-failure contract, so this deliberately checks the
    // thrown message names the real failure, not the stub's own message.
    expect(() => appendKbEntry(filePath, entry)).toThrow(/ENOENT/);

    // Never actually created a file at a phantom path (nothing silently
    // written elsewhere, nothing to clean up).
    expect(() => readFileSync(filePath, "utf8")).toThrow();
  });
});
