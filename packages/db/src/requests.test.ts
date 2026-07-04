import { describe, expect, it } from "vitest";
import { openDatabase } from "./index.ts";
import { insertLead } from "./leads.ts";
import {
  insertRequest,
  updateRequestFields,
  updateRequestState,
  findLatestRequestForLead,
} from "./requests.ts";

function seedLead(db: ReturnType<typeof openDatabase>, telegramUserId = "tg-request-tests") {
  return insertLead(db, { telegramUserId, telegramChatId: "chat-req" });
}

describe("insertRequest (TC-DATA-01)", () => {
  // @trace FR-INTAKE-08
  it("persists a request defaulting to state 'greeting'", () => {
    const db = openDatabase(":memory:");
    const lead = seedLead(db);

    const row = insertRequest(db, { leadId: lead.id, telegramChatId: lead.telegram_chat_id });

    expect(row.id).toBeGreaterThan(0);
    expect(row.lead_id).toBe(lead.id);
    expect(row.telegram_chat_id).toBe(lead.telegram_chat_id);
    expect(row.state).toBe("greeting");
    expect(row.student_name).toBeNull();
    expect(row.student_age).toBeNull();
    expect(row.created_at).toBeTruthy();

    const fromDb = db.prepare("SELECT * FROM requests WHERE id = ?").get(row.id);
    expect(fromDb).toEqual(row);

    db.close();
  });

  it("rejects a bogus initial state (same CHECK guard as raw SQL)", () => {
    const db = openDatabase(":memory:");
    const lead = seedLead(db);

    expect(() =>
      insertRequest(db, {
        leadId: lead.id,
        telegramChatId: lead.telegram_chat_id,
        // @ts-expect-error — deliberately bogus to exercise the CHECK constraint.
        state: "bogus",
      }),
    ).toThrow(/CHECK constraint failed/);

    db.close();
  });
});

describe("updateRequestFields (TC-DATA-01)", () => {
  // @trace FR-INTAKE-02, FR-INTAKE-07
  it("updates only the given fields and returns 1 row changed", () => {
    const db = openDatabase(":memory:");
    const lead = seedLead(db);
    const request = insertRequest(db, { leadId: lead.id, telegramChatId: lead.telegram_chat_id });

    const changes = updateRequestFields(db, request.id, {
      studentName: "Тарас",
      studentAge: 9,
      format: "individual",
    });

    expect(changes).toBe(1);
    const updated = db.prepare("SELECT * FROM requests WHERE id = ?").get(request.id) as {
      student_name: string;
      student_age: number;
      format: string;
    };
    expect(updated.student_name).toBe("Тарас");
    expect(updated.student_age).toBe(9);
    expect(updated.format).toBe("individual");

    db.close();
  });

  it("rejects a bogus format via the CHECK constraint", () => {
    const db = openDatabase(":memory:");
    const lead = seedLead(db);
    const request = insertRequest(db, { leadId: lead.id, telegramChatId: lead.telegram_chat_id });

    expect(() =>
      updateRequestFields(db, request.id, {
        // @ts-expect-error — deliberately bogus to exercise the CHECK constraint.
        format: "instrument",
      }),
    ).toThrow(/CHECK constraint failed/);

    db.close();
  });

  it("returns 0 changes for a nonexistent id, without throwing", () => {
    const db = openDatabase(":memory:");

    const changes = updateRequestFields(db, 999999, { studentName: "Хтось" });

    expect(changes).toBe(0);

    db.close();
  });
});

describe("updateRequestState (TC-DATA-01)", () => {
  // @trace FR-INTAKE-01..08
  it("moves a request to a new conversation state", () => {
    const db = openDatabase(":memory:");
    const lead = seedLead(db);
    const request = insertRequest(db, { leadId: lead.id, telegramChatId: lead.telegram_chat_id });

    const changes = updateRequestState(db, request.id, "qualifying");

    expect(changes).toBe(1);
    const updated = db.prepare("SELECT state FROM requests WHERE id = ?").get(request.id) as {
      state: string;
    };
    expect(updated.state).toBe("qualifying");

    db.close();
  });

  it("rejects a bogus target state via the CHECK constraint", () => {
    const db = openDatabase(":memory:");
    const lead = seedLead(db);
    const request = insertRequest(db, { leadId: lead.id, telegramChatId: lead.telegram_chat_id });

    expect(() =>
      // @ts-expect-error — deliberately bogus to exercise the CHECK constraint.
      updateRequestState(db, request.id, "bogus"),
    ).toThrow(/CHECK constraint failed/);

    db.close();
  });
});

describe("findLatestRequestForLead (TC-DATA-01)", () => {
  // @trace FR-INTAKE-08
  it("returns the most recently created request for a lead", () => {
    const db = openDatabase(":memory:");
    const lead = seedLead(db);
    insertRequest(db, { leadId: lead.id, telegramChatId: lead.telegram_chat_id });
    const second = insertRequest(db, { leadId: lead.id, telegramChatId: lead.telegram_chat_id });

    const latest = findLatestRequestForLead(db, lead.id);

    expect(latest).toEqual(second);

    db.close();
  });

  it("returns undefined when the lead has no requests", () => {
    const db = openDatabase(":memory:");
    const lead = seedLead(db);

    const latest = findLatestRequestForLead(db, lead.id);

    expect(latest).toBeUndefined();

    db.close();
  });
});
