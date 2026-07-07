// kb-learning tasks.md A.3 (RED): `questions` row helpers (design.md
// Decision 4 / Decision 2's closing note). Real in-memory SQLite, same
// discipline as notifications.test.ts — every case below throws at the
// first `insertQuestion`/etc. call today (questions.ts is a typed throwing
// stub), which is the correct RED reason: the feature does not exist yet,
// not a false negative.

import { describe, expect, it } from "vitest";
import { openDatabase } from "./index.ts";
import { insertLead } from "./leads.ts";
import { insertRequest } from "./requests.ts";
import {
  insertQuestion,
  findOpenInboxQuestions,
  findQuestionById,
  markQuestionAnswered,
  retryQuestionDelivery,
  markQuestionDeliveryStatus,
  findDeliverableQuestions,
  type QuestionRow,
} from "./questions.ts";

function seedLeadAndRequest(db: ReturnType<typeof openDatabase>) {
  const lead = insertLead(db, {
    telegramUserId: "tg-kb-questions-1",
    telegramChatId: "chat-kb-questions-1",
  });
  const request = insertRequest(db, {
    leadId: lead.id,
    telegramChatId: lead.telegram_chat_id,
  });
  return { lead, request };
}

describe("insertQuestion (kb-learning design.md Decision 4)", () => {
  // @trace FR-KB-01
  it("persists and round-trips every column, defaulting status/delivery_status", () => {
    const db = openDatabase(":memory:");
    const { lead, request } = seedLeadAndRequest(db);

    const row = insertQuestion(db, {
      leadId: lead.id,
      requestId: request.id,
      telegramChatId: lead.telegram_chat_id,
      text: "Скільки коштує заняття?",
      answerSource: "unanswered",
    });

    expect(row.id).toBeGreaterThan(0);
    expect(row.lead_id).toBe(lead.id);
    expect(row.request_id).toBe(request.id);
    expect(row.telegram_chat_id).toBe(lead.telegram_chat_id);
    expect(row.text).toBe("Скільки коштує заняття?");
    expect(row.answer_source).toBe("unanswered");
    expect(row.status).toBe("open");
    expect(row.admin_answer).toBeNull();
    expect(row.answered_at).toBeNull();
    expect(row.delivery_status).toBe("pending");
    expect(row.created_at).toBeTruthy();

    const fromDb = db.prepare("SELECT * FROM questions WHERE id = ?").get(row.id);
    expect(fromDb).toEqual(row);

    db.close();
  });

  // @trace FR-KB-01
  it("persists a row with a null request_id when omitted", () => {
    const db = openDatabase(":memory:");
    const { lead } = seedLeadAndRequest(db);

    const row = insertQuestion(db, {
      leadId: lead.id,
      telegramChatId: lead.telegram_chat_id,
      text: "Скільки триває заняття?",
      answerSource: "kb",
    });

    expect(row.request_id).toBeNull();
    expect(row.answer_source).toBe("kb");
    expect(row.status).toBe("open");
    expect(row.delivery_status).toBe("pending");

    db.close();
  });
});

describe("findOpenInboxQuestions (design.md Decision 2's closing note, @trace FR-KB-02)", () => {
  it("includes open/answered+failed/answered+pending rows, excludes kb and answered+delivered rows, newest first", () => {
    const db = openDatabase(":memory:");
    const { lead } = seedLeadAndRequest(db);

    const openRow = insertQuestion(db, {
      leadId: lead.id,
      telegramChatId: lead.telegram_chat_id,
      text: "open question",
      answerSource: "unanswered",
    });

    const answeredFailedRow = insertQuestion(db, {
      leadId: lead.id,
      telegramChatId: lead.telegram_chat_id,
      text: "answered but delivery failed",
      answerSource: "unanswered",
    });
    markQuestionAnswered(db, answeredFailedRow.id, "Відповідь адміністраторки");
    markQuestionDeliveryStatus(db, answeredFailedRow.id, "failed");

    const answeredPendingRow = insertQuestion(db, {
      leadId: lead.id,
      telegramChatId: lead.telegram_chat_id,
      text: "answered, delivery still pending",
      answerSource: "unanswered",
    });
    markQuestionAnswered(db, answeredPendingRow.id, "Відповідь адміністраторки 2");

    const kbRow = insertQuestion(db, {
      leadId: lead.id,
      telegramChatId: lead.telegram_chat_id,
      text: "already answered from the KB",
      answerSource: "kb",
    });

    const answeredDeliveredRow = insertQuestion(db, {
      leadId: lead.id,
      telegramChatId: lead.telegram_chat_id,
      text: "answered and delivered — done",
      answerSource: "unanswered",
    });
    markQuestionAnswered(db, answeredDeliveredRow.id, "Відповідь адміністраторки 3");
    markQuestionDeliveryStatus(db, answeredDeliveredRow.id, "delivered");

    const inbox = findOpenInboxQuestions(db);
    const inboxIds = inbox.map((row) => row.id);

    expect(inboxIds).toContain(openRow.id);
    expect(inboxIds).toContain(answeredFailedRow.id);
    expect(inboxIds).toContain(answeredPendingRow.id);
    expect(inboxIds).not.toContain(kbRow.id);
    expect(inboxIds).not.toContain(answeredDeliveredRow.id);

    // newest-first (created_at DESC): insertion order above was
    // open, answeredFailed, answeredPending — so DESC by created_at should
    // yield answeredPending, answeredFailed, open (kb/delivered excluded).
    expect(inboxIds).toEqual([answeredPendingRow.id, answeredFailedRow.id, openRow.id]);

    db.close();
  });

  it("returns [] when there is nothing open (never throws)", () => {
    const db = openDatabase(":memory:");
    expect(findOpenInboxQuestions(db)).toEqual([]);
    db.close();
  });
});

describe("findQuestionById", () => {
  it("returns the row by id, undefined when it does not exist", () => {
    const db = openDatabase(":memory:");
    const { lead } = seedLeadAndRequest(db);
    const row = insertQuestion(db, {
      leadId: lead.id,
      telegramChatId: lead.telegram_chat_id,
      text: "hello",
      answerSource: "unanswered",
    });

    const found = findQuestionById(db, row.id);
    expect(found).toEqual(row);

    expect(findQuestionById(db, 999999)).toBeUndefined();

    db.close();
  });
});

describe("markQuestionAnswered (guarded WHERE status='open', @trace FR-KB-03)", () => {
  it("answers an open question, setting admin_answer/answered_at, leaving delivery_status pending", () => {
    const db = openDatabase(":memory:");
    const { lead } = seedLeadAndRequest(db);
    const row = insertQuestion(db, {
      leadId: lead.id,
      telegramChatId: lead.telegram_chat_id,
      text: "Скільки коштує заняття?",
      answerSource: "unanswered",
    });

    const changed = markQuestionAnswered(db, row.id, "1200 грн за заняття.");
    expect(changed).toBe(1);

    const updated = findQuestionById(db, row.id) as QuestionRow;
    expect(updated.status).toBe("answered");
    expect(updated.admin_answer).toBe("1200 грн за заняття.");
    expect(updated.answered_at).toBeTruthy();
    expect(updated.delivery_status).toBe("pending");

    db.close();
  });

  it("is idempotent: calling it again on the now-answered row is a no-op", () => {
    const db = openDatabase(":memory:");
    const { lead } = seedLeadAndRequest(db);
    const row = insertQuestion(db, {
      leadId: lead.id,
      telegramChatId: lead.telegram_chat_id,
      text: "Скільки коштує заняття?",
      answerSource: "unanswered",
    });

    markQuestionAnswered(db, row.id, "1200 грн за заняття.");
    const beforeRetry = findQuestionById(db, row.id) as QuestionRow;

    const changedAgain = markQuestionAnswered(db, row.id, "Зовсім інша відповідь");
    expect(changedAgain).toBe(0);

    const afterRetry = findQuestionById(db, row.id) as QuestionRow;
    expect(afterRetry).toEqual(beforeRetry);
    expect(afterRetry.admin_answer).toBe("1200 грн за заняття.");

    db.close();
  });

  it("returns 0 for a nonexistent id, without throwing", () => {
    const db = openDatabase(":memory:");
    expect(markQuestionAnswered(db, 999999, "x")).toBe(0);
    db.close();
  });
});

describe("retryQuestionDelivery (design.md Decision 2's named fork, @trace FR-KB-04)", () => {
  it("flips an answered+failed row back to pending", () => {
    const db = openDatabase(":memory:");
    const { lead } = seedLeadAndRequest(db);
    const row = insertQuestion(db, {
      leadId: lead.id,
      telegramChatId: lead.telegram_chat_id,
      text: "Скільки коштує заняття?",
      answerSource: "unanswered",
    });
    markQuestionAnswered(db, row.id, "1200 грн.");
    markQuestionDeliveryStatus(db, row.id, "failed");

    const changed = retryQuestionDelivery(db, row.id);
    expect(changed).toBe(1);

    const updated = findQuestionById(db, row.id) as QuestionRow;
    expect(updated.delivery_status).toBe("pending");

    db.close();
  });

  it("is a no-op against an answered+pending row", () => {
    const db = openDatabase(":memory:");
    const { lead } = seedLeadAndRequest(db);
    const row = insertQuestion(db, {
      leadId: lead.id,
      telegramChatId: lead.telegram_chat_id,
      text: "Скільки коштує заняття?",
      answerSource: "unanswered",
    });
    markQuestionAnswered(db, row.id, "1200 грн.");

    const changed = retryQuestionDelivery(db, row.id);
    expect(changed).toBe(0);

    const updated = findQuestionById(db, row.id) as QuestionRow;
    expect(updated.delivery_status).toBe("pending");

    db.close();
  });

  it("is a no-op against an answered+delivered row", () => {
    const db = openDatabase(":memory:");
    const { lead } = seedLeadAndRequest(db);
    const row = insertQuestion(db, {
      leadId: lead.id,
      telegramChatId: lead.telegram_chat_id,
      text: "Скільки коштує заняття?",
      answerSource: "unanswered",
    });
    markQuestionAnswered(db, row.id, "1200 грн.");
    markQuestionDeliveryStatus(db, row.id, "delivered");

    const changed = retryQuestionDelivery(db, row.id);
    expect(changed).toBe(0);

    const updated = findQuestionById(db, row.id) as QuestionRow;
    expect(updated.delivery_status).toBe("delivered");

    db.close();
  });

  it("is a no-op against an open question (never answered)", () => {
    const db = openDatabase(":memory:");
    const { lead } = seedLeadAndRequest(db);
    const row = insertQuestion(db, {
      leadId: lead.id,
      telegramChatId: lead.telegram_chat_id,
      text: "Скільки коштує заняття?",
      answerSource: "unanswered",
    });

    const changed = retryQuestionDelivery(db, row.id);
    expect(changed).toBe(0);

    const updated = findQuestionById(db, row.id) as QuestionRow;
    expect(updated.status).toBe("open");
    expect(updated.delivery_status).toBe("pending");

    db.close();
  });
});

describe("markQuestionDeliveryStatus (guarded WHERE status='answered')", () => {
  it("flips exactly one answered row's delivery_status, siblings untouched", () => {
    const db = openDatabase(":memory:");
    const { lead } = seedLeadAndRequest(db);
    const a = insertQuestion(db, {
      leadId: lead.id,
      telegramChatId: lead.telegram_chat_id,
      text: "question a",
      answerSource: "unanswered",
    });
    const b = insertQuestion(db, {
      leadId: lead.id,
      telegramChatId: lead.telegram_chat_id,
      text: "question b",
      answerSource: "unanswered",
    });
    markQuestionAnswered(db, a.id, "answer a");
    markQuestionAnswered(db, b.id, "answer b");

    const changed = markQuestionDeliveryStatus(db, a.id, "delivered");
    expect(changed).toBe(1);

    const rowA = findQuestionById(db, a.id) as QuestionRow;
    expect(rowA.delivery_status).toBe("delivered");

    const rowB = findQuestionById(db, b.id) as QuestionRow;
    expect(rowB.delivery_status).toBe("pending");

    db.close();
  });

  it("is a no-op against an open (not yet answered) row", () => {
    const db = openDatabase(":memory:");
    const { lead } = seedLeadAndRequest(db);
    const row = insertQuestion(db, {
      leadId: lead.id,
      telegramChatId: lead.telegram_chat_id,
      text: "question",
      answerSource: "unanswered",
    });

    const changed = markQuestionDeliveryStatus(db, row.id, "delivered");
    expect(changed).toBe(0);

    const updated = findQuestionById(db, row.id) as QuestionRow;
    expect(updated.status).toBe("open");
    expect(updated.delivery_status).toBe("pending");

    db.close();
  });
});

describe("findDeliverableQuestions (design.md Decision 2's pending-only query, @trace FR-KB-04)", () => {
  it("returns only answered+pending rows, oldest first (id ASC)", () => {
    const db = openDatabase(":memory:");
    const { lead } = seedLeadAndRequest(db);

    const a = insertQuestion(db, {
      leadId: lead.id,
      telegramChatId: lead.telegram_chat_id,
      text: "a",
      answerSource: "unanswered",
    });
    const b = insertQuestion(db, {
      leadId: lead.id,
      telegramChatId: lead.telegram_chat_id,
      text: "b",
      answerSource: "unanswered",
    });
    const c = insertQuestion(db, {
      leadId: lead.id,
      telegramChatId: lead.telegram_chat_id,
      text: "c",
      answerSource: "unanswered",
    });
    const openRow = insertQuestion(db, {
      leadId: lead.id,
      telegramChatId: lead.telegram_chat_id,
      text: "still open",
      answerSource: "unanswered",
    });

    markQuestionAnswered(db, a.id, "answer a");
    markQuestionAnswered(db, b.id, "answer b");
    markQuestionAnswered(db, c.id, "answer c");
    // b is delivered — never a candidate again.
    markQuestionDeliveryStatus(db, b.id, "delivered");

    const deliverable = findDeliverableQuestions(db);
    expect(deliverable.map((row) => row.id)).toEqual([a.id, c.id]);
    expect(deliverable.map((row) => row.id)).not.toContain(openRow.id);

    db.close();
  });

  // Regression pin for design.md Decision 2's explicit S4-auto-retry
  // divergence: a `failed` row must NEVER be selected by
  // `findDeliverableQuestions` — only `retryQuestionDelivery` (an explicit
  // admin action) may put it back in this queue.
  it("NEVER returns a failed row, even across multiple calls", () => {
    const db = openDatabase(":memory:");
    const { lead } = seedLeadAndRequest(db);

    const failedRow = insertQuestion(db, {
      leadId: lead.id,
      telegramChatId: lead.telegram_chat_id,
      text: "delivery keeps failing",
      answerSource: "unanswered",
    });
    markQuestionAnswered(db, failedRow.id, "answer");
    markQuestionDeliveryStatus(db, failedRow.id, "failed");

    expect(findDeliverableQuestions(db).map((row) => row.id)).not.toContain(failedRow.id);
    // calling it again (simulating a second drain tick) still excludes it —
    // there is no auto-retry hidden anywhere in this query.
    expect(findDeliverableQuestions(db).map((row) => row.id)).not.toContain(failedRow.id);

    db.close();
  });
});
