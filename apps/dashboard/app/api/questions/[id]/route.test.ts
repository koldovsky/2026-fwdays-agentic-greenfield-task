// Test-first (RED): POST /api/questions/:id is STILL the typed throwing
// stub — every test below is expected to FAIL against it (the awaited
// `POST(...)` call rejects before any assertion on `response` can run) for
// the right reason until the GREEN pass (kb-learning tasks.md E.3)
// implements the real five-step handler (design.md Decision 5). `@trace
// FR-KB-03`, `@trace NFR-REL-01`.
//
// Real SQLite (a temp file via `KAMERTON_DB_PATH`) + a real fixture
// `school.md` file (a temp file via `KAMERTON_KB_PATH`, this RED pass's own
// pinned env var name, see `route.ts`'s own header) — never a mocked
// filesystem or a mocked `better-sqlite3`, same discipline as every other
// route test in this app.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { insertLead, insertQuestion, openDatabase, type QuestionRow } from "@kamerton/db";
import { MAX_ANSWER_LENGTH } from "@kamerton/lib/src/kb/validate-answer.ts";
import { serializeKbEntry } from "@kamerton/lib/src/kb/serialize-entry.ts";
import { POST } from "./route.ts";

function answerUrl(id: number | string): string {
  return `http://127.0.0.1:3000/api/questions/${id}`;
}

function paramsFor(id: number | string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id: String(id) }) };
}

function postAnswer(id: number | string, body: unknown): Promise<Response> {
  return POST(
    new Request(answerUrl(id), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    paramsFor(id),
  );
}

describe("POST /api/questions/:id (kb-learning tasks.md E.3, design.md Decision 5, @trace FR-KB-03, @trace NFR-REL-01)", () => {
  let dbDir: string;
  let dbPath: string;
  let kbDir: string;
  let kbPath: string;
  let previousDbPathEnv: string | undefined;
  let previousKbPathEnv: string | undefined;
  const PRIOR_KB_CONTENT =
    "# База знань\n\n## Формат занять\n\nІндивідуальні заняття по 45 хв.\n";

  beforeEach(() => {
    dbDir = mkdtempSync(path.join(tmpdir(), "kamerton-dashboard-answer-db-"));
    dbPath = path.join(dbDir, "kamerton.db");
    previousDbPathEnv = process.env.KAMERTON_DB_PATH;
    process.env.KAMERTON_DB_PATH = dbPath;

    kbDir = mkdtempSync(path.join(tmpdir(), "kamerton-dashboard-answer-kb-"));
    kbPath = path.join(kbDir, "school.md");
    writeFileSync(kbPath, PRIOR_KB_CONTENT);
    previousKbPathEnv = process.env.KAMERTON_KB_PATH;
    process.env.KAMERTON_KB_PATH = kbPath;
  });

  afterEach(() => {
    if (previousDbPathEnv === undefined) delete process.env.KAMERTON_DB_PATH;
    else process.env.KAMERTON_DB_PATH = previousDbPathEnv;
    if (previousKbPathEnv === undefined) delete process.env.KAMERTON_KB_PATH;
    else process.env.KAMERTON_KB_PATH = previousKbPathEnv;
    rmSync(dbDir, { recursive: true, force: true });
    rmSync(kbDir, { recursive: true, force: true });
  });

  function seedOpenQuestion(text: string): QuestionRow {
    const db = openDatabase(dbPath);
    try {
      const lead = insertLead(db, {
        telegramUserId: `tg-user-${Math.random().toString(36).slice(2)}`,
        telegramChatId: "tg-chat-answer",
      });
      return insertQuestion(db, {
        leadId: lead.id,
        telegramChatId: "tg-chat-answer",
        text,
        answerSource: "unanswered",
      });
    } finally {
      db.close();
    }
  }

  function seedAlreadyAnsweredQuestion(text: string): QuestionRow {
    const db = openDatabase(dbPath);
    try {
      const lead = insertLead(db, {
        telegramUserId: `tg-user-${Math.random().toString(36).slice(2)}`,
        telegramChatId: "tg-chat-stale",
      });
      const question = insertQuestion(db, {
        leadId: lead.id,
        telegramChatId: "tg-chat-stale",
        text,
        answerSource: "unanswered",
      });
      db.prepare(
        `UPDATE questions
         SET status = 'answered', admin_answer = 'Стара відповідь.',
             answered_at = '2026-06-30T09:00:00.000Z', delivery_status = 'delivered'
         WHERE id = ?`,
      ).run(question.id);
      return readQuestion(question.id);
    } finally {
      db.close();
    }
  }

  function readQuestion(id: number): QuestionRow {
    const db = openDatabase(dbPath);
    try {
      return db.prepare(`SELECT * FROM questions WHERE id = ?`).get(id) as QuestionRow;
    } finally {
      db.close();
    }
  }

  function readKbFile(): string {
    return readFileSync(kbPath, "utf8");
  }

  // -----------------------------------------------------------------------
  // Happy path
  // -----------------------------------------------------------------------
  it("appends the entry to the fixture file and marks the question answered, delivery_status stays 'pending'", async () => {
    const question = seedOpenQuestion("чи є у вас парковка?");
    const answer = "Так, біля входу є безкоштовна парковка.";

    const response = await postAnswer(question.id, { answer });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("applied");

    const expectedEntry = serializeKbEntry({ question: question.text, answer });
    expect(readKbFile()).toBe(PRIOR_KB_CONTENT + expectedEntry);

    const after = readQuestion(question.id);
    expect(after.status).toBe("answered");
    expect(after.admin_answer).toBe(answer);
    expect(after.answered_at).not.toBeNull();
    expect(after.delivery_status).toBe("pending");
  });

  // -----------------------------------------------------------------------
  // Empty answer
  // -----------------------------------------------------------------------
  it("rejects an empty answer inline (400), nothing appended, question stays open", async () => {
    const question = seedOpenQuestion("чи є у вас парковка?");

    const response = await postAnswer(question.id, { answer: "   " });

    expect(response.status).toBe(400);
    expect(response.status).not.toBe(500);
    const body = await response.json();
    expect(body.status).toBe("invalid");
    expect(body.code).toBe("EMPTY");

    expect(readKbFile()).toBe(PRIOR_KB_CONTENT);
    const after = readQuestion(question.id);
    expect(after.status).toBe("open");
    expect(after.admin_answer).toBeNull();
  });

  // -----------------------------------------------------------------------
  // Oversized answer
  // -----------------------------------------------------------------------
  it("rejects a 3,501-character answer inline (400), naming the 3,500-character limit, nothing appended", async () => {
    const question = seedOpenQuestion("яка вартість занять?");
    const oversizedAnswer = "а".repeat(MAX_ANSWER_LENGTH + 1);
    expect(oversizedAnswer).toHaveLength(3501);

    const response = await postAnswer(question.id, { answer: oversizedAnswer });

    expect(response.status).toBe(400);
    expect(response.status).not.toBe(500);
    const body = await response.json();
    expect(body.status).toBe("invalid");
    expect(body.code).toBe("TOO_LONG");
    expect(String(body.message ?? "") + String(body.maxLength ?? "")).toMatch(/3[.,]?500/);

    expect(readKbFile()).toBe(PRIOR_KB_CONTENT);
    const after = readQuestion(question.id);
    expect(after.status).toBe("open");
  });

  // -----------------------------------------------------------------------
  // Heading-like answer line
  // -----------------------------------------------------------------------
  it("escapes a heading-like answer line on append, yielding exactly one well-formed new entry", async () => {
    const question = seedOpenQuestion("яка вартість занять?");
    const answer = "Ціна індивідуального заняття 500 грн.\n# Нова тема\nДодаткова інформація.";

    const response = await postAnswer(question.id, { answer });

    expect(response.status).toBe(200);

    const contentAfter = readKbFile();
    // Escaped: the raw heading marker line is never present un-escaped.
    expect(contentAfter).not.toContain("\n# Нова тема\n");
    expect(contentAfter).toContain("\\# Нова тема");

    // Exactly one well-formed entry was added: the fixture's own prior
    // heading count (2: "# База знань" + "## Формат занять") plus exactly
    // ONE new "## <question>" heading — the escaped "# Нова тема" line must
    // NOT count as a real heading.
    const headingLines = contentAfter.match(/^#{1,6}\s/gm) ?? [];
    expect(headingLines).toHaveLength(3);
  });

  // -----------------------------------------------------------------------
  // Stale submit
  // -----------------------------------------------------------------------
  it("is a no-op for a stale submit on an already-answered question: file byte-identical, row unchanged, no delivery state touched", async () => {
    const question = seedAlreadyAnsweredQuestion("чи є у вас парковка?");
    const kbBefore = readKbFile();

    const response = await postAnswer(question.id, { answer: "Нова відповідь від адміністраторки." });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("stale");

    expect(readKbFile()).toBe(kbBefore);
    const after = readQuestion(question.id);
    expect(after.status).toBe(question.status);
    expect(after.admin_answer).toBe(question.admin_answer);
    expect(after.answered_at).toBe(question.answered_at);
    expect(after.delivery_status).toBe(question.delivery_status);
  });

  // -----------------------------------------------------------------------
  // Simulated append failure
  // -----------------------------------------------------------------------
  it("surfaces an inline error naming the failure (never a raw 500) when the KB append fails; the question stays open", async () => {
    // Point KAMERTON_KB_PATH at a path whose directory does not exist —
    // simulates "unwritable"/"missing file" (design.md Decision 5 step 4 /
    // baseline spec's own "school.md append failure" scenario).
    process.env.KAMERTON_KB_PATH = path.join(kbDir, "missing-subdir", "school.md");
    const question = seedOpenQuestion("чи є у вас парковка?");

    const response = await postAnswer(question.id, { answer: "Так, є." });

    expect(response.status).not.toBe(500);
    const body = await response.json();
    expect(typeof body.error === "string" || typeof body.message === "string").toBe(true);

    const after = readQuestion(question.id);
    expect(after.status).toBe("open");
    expect(after.admin_answer).toBeNull();
    expect(after.delivery_status).toBe("pending");
  });
});
