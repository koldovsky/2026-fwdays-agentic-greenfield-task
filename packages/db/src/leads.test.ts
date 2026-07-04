import { describe, expect, it } from "vitest";
import { openDatabase } from "./index.ts";
import { insertLead, findLeadByTelegramUserId } from "./leads.ts";

describe("insertLead (TC-DATA-01)", () => {
  // @trace FR-INTAKE-01
  it("persists a lead and returns it with id/created_at populated", () => {
    const db = openDatabase(":memory:");

    const row = insertLead(db, {
      telegramUserId: "tg-100",
      telegramChatId: "chat-100",
      telegramDisplayName: "Оксана",
    });

    expect(row.id).toBeGreaterThan(0);
    expect(row.telegram_user_id).toBe("tg-100");
    expect(row.telegram_chat_id).toBe("chat-100");
    expect(row.telegram_display_name).toBe("Оксана");
    expect(row.created_at).toBeTruthy();

    const fromDb = db.prepare("SELECT * FROM leads WHERE id = ?").get(row.id);
    expect(fromDb).toEqual(row);

    db.close();
  });

  it("defaults telegram_display_name to null when omitted", () => {
    const db = openDatabase(":memory:");

    const row = insertLead(db, {
      telegramUserId: "tg-101",
      telegramChatId: "chat-101",
    });

    expect(row.telegram_display_name).toBeNull();

    db.close();
  });

  it("rejects a duplicate telegram_user_id (same guard as raw SQL)", () => {
    const db = openDatabase(":memory:");

    insertLead(db, { telegramUserId: "tg-dup", telegramChatId: "chat-a" });

    expect(() => insertLead(db, { telegramUserId: "tg-dup", telegramChatId: "chat-b" })).toThrow(
      /UNIQUE constraint failed/,
    );

    db.close();
  });
});

describe("findLeadByTelegramUserId (TC-DATA-01)", () => {
  // @trace FR-INTAKE-08
  it("finds a previously-inserted lead by its telegram_user_id", () => {
    const db = openDatabase(":memory:");
    const inserted = insertLead(db, { telegramUserId: "tg-200", telegramChatId: "chat-200" });

    const found = findLeadByTelegramUserId(db, "tg-200");

    expect(found).toEqual(inserted);

    db.close();
  });

  it("returns undefined for an unknown telegram_user_id", () => {
    const db = openDatabase(":memory:");

    const found = findLeadByTelegramUserId(db, "does-not-exist");

    expect(found).toBeUndefined();

    db.close();
  });
});
