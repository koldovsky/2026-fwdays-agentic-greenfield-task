// Test-first (RED): POST /api/questions/:id/retry is STILL the typed
// throwing stub — every test below is expected to FAIL against it (the
// awaited `POST(...)` call rejects before any assertion on `response` can
// run) for the right reason until the GREEN pass (kb-learning tasks.md E.4)
// implements the real `retryQuestionDelivery`-backed handler. `@trace
// FR-KB-04`.
//
// Real SQLite (a temp file via `KAMERTON_DB_PATH`), same idiom as every
// other route test in this app.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { insertLead, insertQuestion, openDatabase, type QuestionRow } from "@kamerton/db";
import { POST } from "./route.ts";

function retryUrl(id: number | string): string {
  return `http://127.0.0.1:3000/api/questions/${id}/retry`;
}

function paramsFor(id: number | string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id: String(id) }) };
}

function postRetry(id: number | string): Promise<Response> {
  return POST(new Request(retryUrl(id), { method: "POST" }), paramsFor(id));
}

describe("POST /api/questions/:id/retry (kb-learning tasks.md E.4, design.md Decision 2, @trace FR-KB-04)", () => {
  let dbDir: string;
  let dbPath: string;
  let previousDbPathEnv: string | undefined;

  beforeEach(() => {
    dbDir = mkdtempSync(path.join(tmpdir(), "kamerton-dashboard-questions-retry-"));
    dbPath = path.join(dbDir, "kamerton.db");
    previousDbPathEnv = process.env.KAMERTON_DB_PATH;
    process.env.KAMERTON_DB_PATH = dbPath;
  });

  afterEach(() => {
    if (previousDbPathEnv === undefined) delete process.env.KAMERTON_DB_PATH;
    else process.env.KAMERTON_DB_PATH = previousDbPathEnv;
    rmSync(dbDir, { recursive: true, force: true });
  });

  function seedQuestion(overrides: {
    status: "open" | "answered";
    deliveryStatus: "pending" | "delivered" | "failed";
  }): QuestionRow {
    const db = openDatabase(dbPath);
    try {
      const lead = insertLead(db, {
        telegramUserId: `tg-user-${Math.random().toString(36).slice(2)}`,
        telegramChatId: "tg-chat-retry",
      });
      const question = insertQuestion(db, {
        leadId: lead.id,
        telegramChatId: "tg-chat-retry",
        text: "чи є у вас парковка?",
        answerSource: "unanswered",
      });
      if (overrides.status === "answered") {
        db.prepare(
          `UPDATE questions
           SET status = 'answered', admin_answer = 'Так, є.',
               answered_at = '2026-07-01T09:00:00.000Z', delivery_status = ?
           WHERE id = ?`,
        ).run(overrides.deliveryStatus, question.id);
      } else {
        db.prepare(`UPDATE questions SET delivery_status = ? WHERE id = ?`).run(
          overrides.deliveryStatus,
          question.id,
        );
      }
      return db.prepare(`SELECT * FROM questions WHERE id = ?`).get(question.id) as QuestionRow;
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

  it("flips an answered+failed row's delivery_status to 'pending'", async () => {
    const question = seedQuestion({ status: "answered", deliveryStatus: "failed" });

    const response = await postRetry(question.id);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("applied");
    expect(readQuestion(question.id).delivery_status).toBe("pending");
  });

  it("is an untouched no-op for an already-pending row (a stale click)", async () => {
    const question = seedQuestion({ status: "answered", deliveryStatus: "pending" });

    const response = await postRetry(question.id);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("stale");
    const after = readQuestion(question.id);
    expect(after.delivery_status).toBe("pending");
    expect(after.status).toBe("answered");
  });

  it("is an untouched no-op for an already-delivered row (a stale click)", async () => {
    const question = seedQuestion({ status: "answered", deliveryStatus: "delivered" });

    const response = await postRetry(question.id);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("stale");
    expect(readQuestion(question.id).delivery_status).toBe("delivered");
  });

  it("rejects/no-ops a still-open question — never eligible for retry, delivery_status never touched", async () => {
    const question = seedQuestion({ status: "open", deliveryStatus: "pending" });

    const response = await postRetry(question.id);

    expect(response.status).not.toBe(500);
    const body = await response.json();
    expect(body.status).not.toBe("applied");
    const after = readQuestion(question.id);
    expect(after.status).toBe("open");
    expect(after.delivery_status).toBe("pending");
  });
});
