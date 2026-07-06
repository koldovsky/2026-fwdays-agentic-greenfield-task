import { describe, expect, it } from "vitest";
import { openDatabase } from "./index.ts";
import { insertLead } from "./leads.ts";
import {
  insertRequest,
  updateRequestFields,
  updateRequestState,
  findLatestRequestForLead,
  parseOfferedSlots,
  type RequestRow,
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

// --- S4 booking-hitl Stage B (RED): requests.offered_slots (tasks.md B.9,
// design.md Decision 4 item 2 / Risks). `offeredSlots` is TYPE-ONLY on
// `UpdateRequestFieldsInput` today (not yet mapped in
// `FIELD_COLUMN_BY_KEY`/the `UPDATE`) and `parseOfferedSlots` is a typed
// throwing stub — every case below fails today for that reason, then goes
// green once B.10 lands.

describe("offeredSlots (booking-hitl design.md Decision 4 item 2)", () => {
  // @trace FR-HITL-02
  it("persists offeredSlots as a JSON array into offered_slots", () => {
    const db = openDatabase(":memory:");
    const lead = seedLead(db, "tg-offered-slots-1");
    const request = insertRequest(db, { leadId: lead.id, telegramChatId: lead.telegram_chat_id });

    const offeredSlots = [
      { start: "2026-07-14T17:00", end: "2026-07-14T18:00" },
      { start: "2026-07-15T10:00", end: "2026-07-15T11:00" },
    ];

    updateRequestFields(db, request.id, { offeredSlots });

    const updated = db.prepare("SELECT * FROM requests WHERE id = ?").get(request.id) as RequestRow;
    expect(updated.offered_slots).toBe(JSON.stringify(offeredSlots));

    db.close();
  });

  // @trace FR-HITL-02
  it("round-trips the exact offeredSlots array through the RequestRow read path", () => {
    const db = openDatabase(":memory:");
    const lead = seedLead(db, "tg-offered-slots-2");
    const request = insertRequest(db, { leadId: lead.id, telegramChatId: lead.telegram_chat_id });
    const offeredSlots = [{ start: "2026-07-20T12:00", end: "2026-07-20T13:00" }];

    updateRequestFields(db, request.id, { offeredSlots });

    const reloaded = db.prepare("SELECT * FROM requests WHERE id = ?").get(request.id) as RequestRow;
    expect(parseOfferedSlots(reloaded.offered_slots)).toEqual(offeredSlots);

    db.close();
  });

  // @trace FR-HITL-02 — design.md Risks: a NULL offered_slots never throws
  // when read.
  it("parseOfferedSlots returns null for a NULL column value, never throwing", () => {
    const db = openDatabase(":memory:");
    const lead = seedLead(db, "tg-offered-slots-3");
    const request = insertRequest(db, { leadId: lead.id, telegramChatId: lead.telegram_chat_id });

    const row = db.prepare("SELECT * FROM requests WHERE id = ?").get(request.id) as RequestRow;
    expect(row.offered_slots).toBeNull();
    expect(() => parseOfferedSlots(row.offered_slots)).not.toThrow();
    expect(parseOfferedSlots(row.offered_slots)).toBeNull();

    db.close();
  });

  // @trace FR-HITL-02 — design.md Risks: malformed/legacy JSON is "no
  // offered slots known", never a thrown exception.
  it("parseOfferedSlots treats malformed JSON as no offered slots, never throwing", () => {
    expect(() => parseOfferedSlots("not-json{")).not.toThrow();
    expect(parseOfferedSlots("not-json{")).toBeNull();
  });
});
