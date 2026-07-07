// Test-first (RED): GET /api/questions is STILL the typed throwing stub —
// every test below is expected to FAIL against it (the awaited `GET(...)`
// call rejects before any assertion on `response` can even run) for the
// right reason until the GREEN pass (kb-learning tasks.md E.2) wires in the
// real `findOpenInboxQuestions`-backed handler. `@trace FR-KB-02`.
//
// Real SQLite (a temp file via `KAMERTON_DB_PATH`), same idiom as
// `app/api/decisions/[requestId]/route.test.ts`.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { insertLead, insertQuestion, openDatabase, type QuestionRow } from "@kamerton/db";
import { GET } from "./route.ts";

describe("GET /api/questions (kb-learning tasks.md E.2, design.md Decision 2, @trace FR-KB-02)", () => {
  let dbDir: string;
  let dbPath: string;
  let previousDbPathEnv: string | undefined;

  beforeEach(() => {
    dbDir = mkdtempSync(path.join(tmpdir(), "kamerton-dashboard-questions-"));
    dbPath = path.join(dbDir, "kamerton.db");
    previousDbPathEnv = process.env.KAMERTON_DB_PATH;
    process.env.KAMERTON_DB_PATH = dbPath;
  });

  afterEach(() => {
    if (previousDbPathEnv === undefined) delete process.env.KAMERTON_DB_PATH;
    else process.env.KAMERTON_DB_PATH = previousDbPathEnv;
    rmSync(dbDir, { recursive: true, force: true });
  });

  function seedLead(suffix: string): number {
    const db = openDatabase(dbPath);
    try {
      const lead = insertLead(db, {
        telegramUserId: `tg-user-${suffix}`,
        telegramChatId: `tg-chat-${suffix}`,
      });
      return lead.id;
    } finally {
      db.close();
    }
  }

  it("returns [] (never an error) when there are no open questions", async () => {
    const response = await GET(new Request("http://127.0.0.1:3000/api/questions"));

    expect(response.status).toBe(200);
    const body = (await response.json()) as unknown;
    expect(body).toEqual([]);
  });

  it("returns the open-inbox list as JSON, newest-first (created_at DESC), excluding kb rows and answered+delivered rows", async () => {
    const leadId = seedLead("q1");
    const db = openDatabase(dbPath);
    try {
      const q1 = insertQuestion(db, {
        leadId,
        telegramChatId: "tg-chat-q1",
        text: "чи є у вас парковка?",
        answerSource: "unanswered",
      });
      const q2 = insertQuestion(db, {
        leadId,
        telegramChatId: "tg-chat-q1",
        text: "скільки коштує заняття?",
        answerSource: "unanswered",
      });
      const q3 = insertQuestion(db, {
        leadId,
        telegramChatId: "tg-chat-q1",
        text: "чи можна групове заняття?",
        answerSource: "unanswered",
      });
      // Distinct `created_at` via a manual UPDATE — rows inserted
      // back-to-back in one test process can otherwise share the same
      // second-resolution DB-default timestamp; this test asserts on
      // ORDER, never on real wall-clock timing.
      db.prepare(`UPDATE questions SET created_at = ? WHERE id = ?`).run(
        "2026-07-01T10:00:00.000Z",
        q1.id,
      );
      db.prepare(`UPDATE questions SET created_at = ? WHERE id = ?`).run(
        "2026-07-01T11:00:00.000Z",
        q2.id,
      );
      db.prepare(`UPDATE questions SET created_at = ? WHERE id = ?`).run(
        "2026-07-01T12:00:00.000Z",
        q3.id,
      );

      // Excluded from the inbox: an `answer_source='kb'` row, and an
      // `answered`+`delivered` row (design.md Decision 2's visibility
      // rule) — pinned here too, not just in
      // `packages/db/src/questions.test.ts`, since this route is the
      // contract the UI actually reads.
      insertQuestion(db, {
        leadId,
        telegramChatId: "tg-chat-q1",
        text: "як проходять заняття?",
        answerSource: "kb",
      });
      const delivered = insertQuestion(db, {
        leadId,
        telegramChatId: "tg-chat-q1",
        text: "вже відповіли і доставлено",
        answerSource: "unanswered",
      });
      db.prepare(
        `UPDATE questions SET status = 'answered', delivery_status = 'delivered', admin_answer = 'ok', answered_at = '2026-07-01T09:00:00.000Z' WHERE id = ?`,
      ).run(delivered.id);
    } finally {
      db.close();
    }

    const response = await GET(new Request("http://127.0.0.1:3000/api/questions"));

    expect(response.status).toBe(200);
    const body = (await response.json()) as QuestionRow[];
    expect(body.map((row) => row.text)).toEqual([
      "чи можна групове заняття?",
      "скільки коштує заняття?",
      "чи є у вас парковка?",
    ]);
  });
});
