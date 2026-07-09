// @kamerton/db — `messages` row helper tests (conversation-history slice).
// Written FIRST (red) from the contract these helpers must satisfy, before
// their implementation in messages.ts. The `messages` table is the
// short-term conversation transcript the agent loop replays each turn so the
// model can accumulate facts a lead gives across several terse turns (the
// experienceComfort loop bug) and never re-greet a field it already asked —
// the root fix for the "no conversation history" deferred TODO in
// packages/agent/src/loop.ts.

import { describe, it, expect } from "vitest";
import { openDatabase } from "./index.ts";
import { insertLead } from "./leads.ts";
import { insertRequest } from "./requests.ts";
import {
  insertMessage,
  findRecentMessagesForRequest,
  findMessagesForRequest,
  type MessageRow,
} from "./messages.ts";

function seedRequest(db: ReturnType<typeof openDatabase>): number {
  const lead = insertLead(db, { telegramUserId: "u1", telegramChatId: "c1" });
  const request = insertRequest(db, { leadId: lead.id, telegramChatId: "c1" });
  return request.id;
}

describe("messages row helpers", () => {
  it("inserts a message and returns it as persisted", () => {
    const db = openDatabase(":memory:");
    const requestId = seedRequest(db);

    const row = insertMessage(db, { requestId, role: "user", content: "Саша" });

    expect(row.id).toBeGreaterThan(0);
    expect(row.request_id).toBe(requestId);
    expect(row.role).toBe("user");
    expect(row.content).toBe("Саша");
    expect(typeof row.created_at).toBe("string");
  });

  it("returns recent messages oldest-first (chronological), ready to replay", () => {
    const db = openDatabase(":memory:");
    const requestId = seedRequest(db);

    insertMessage(db, { requestId, role: "assistant", content: "Як звати учня?" });
    insertMessage(db, { requestId, role: "user", content: "Саша" });
    insertMessage(db, { requestId, role: "assistant", content: "Скільки років?" });

    const rows = findRecentMessagesForRequest(db, requestId, 10);

    expect(rows.map((r: MessageRow) => [r.role, r.content])).toEqual([
      ["assistant", "Як звати учня?"],
      ["user", "Саша"],
      ["assistant", "Скільки років?"],
    ]);
  });

  it("findMessagesForRequest returns the FULL transcript oldest-first, unbounded", () => {
    const db = openDatabase(":memory:");
    const requestId = seedRequest(db);
    for (let i = 1; i <= 7; i++) {
      insertMessage(db, { requestId, role: i % 2 ? "user" : "assistant", content: `m${i}` });
    }
    const rows = findMessagesForRequest(db, requestId);
    expect(rows.map((r: MessageRow) => r.content)).toEqual(["m1", "m2", "m3", "m4", "m5", "m6", "m7"]);
  });

  it("caps to the last `limit` messages, still oldest-first", () => {
    const db = openDatabase(":memory:");
    const requestId = seedRequest(db);

    for (let i = 1; i <= 5; i++) {
      insertMessage(db, { requestId, role: "user", content: `m${i}` });
    }

    const rows = findRecentMessagesForRequest(db, requestId, 2);

    expect(rows.map((r) => r.content)).toEqual(["m4", "m5"]);
  });

  it("scopes messages to their own request", () => {
    const db = openDatabase(":memory:");
    const a = seedRequest(db);
    const leadB = insertLead(db, { telegramUserId: "u2", telegramChatId: "c2" });
    const b = insertRequest(db, { leadId: leadB.id, telegramChatId: "c2" }).id;

    insertMessage(db, { requestId: a, role: "user", content: "A" });
    insertMessage(db, { requestId: b, role: "user", content: "B" });

    expect(findRecentMessagesForRequest(db, a, 10).map((r) => r.content)).toEqual(["A"]);
    expect(findRecentMessagesForRequest(db, b, 10).map((r) => r.content)).toEqual(["B"]);
  });

  it("cascade-deletes a lead's transcript when the lead is deleted (NFR-PRIV-02)", () => {
    const db = openDatabase(":memory:");
    const lead = insertLead(db, { telegramUserId: "u3", telegramChatId: "c3" });
    const requestId = insertRequest(db, { leadId: lead.id, telegramChatId: "c3" }).id;
    insertMessage(db, { requestId, role: "user", content: "секрет" });

    db.prepare("DELETE FROM leads WHERE id = ?").run(lead.id);

    expect(findRecentMessagesForRequest(db, requestId, 10)).toEqual([]);
  });
});
