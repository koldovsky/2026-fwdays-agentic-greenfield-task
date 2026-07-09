// pipeline.ts conversation-history plumbing (root fix for the experienceComfort
// loop). Written FIRST (red): across two free-text turns on the same request,
// `handleUpdate` must PERSIST each turn (the lead's message + the reply the
// lead saw) and REPLAY the prior turns to the model on the next turn — so a
// two-fact field the lead answers one fact at a time (experience, then
// comfort) is finally collectable, instead of the model re-asking forever
// because it never sees the earlier answer.

import { describe, expect, it } from "vitest";
import {
  openDatabase,
  insertLead,
  insertRequest,
  updateRequestFields,
  updateRequestState,
} from "@kamerton/db";
import { FakeModelPort, textResponse, toolUseResponse } from "@kamerton/agent/src/testing/fake-model-port.ts";
import { FakeCalendarPort } from "@kamerton/lib/src/slots/fake-calendar.ts";
import { FakeTelegramTransport } from "./testing/fake-telegram-transport.ts";
import { handleUpdate, type HandleUpdateDeps } from "./pipeline.ts";
import type { InboundTextUpdate } from "./telegram-transport.ts";

function textUpdate(text: string): InboundTextUpdate {
  return {
    type: "text",
    telegramUserId: "tg-user-1",
    telegramChatId: "tg-chat-1",
    telegramDisplayName: "Тестова Лідка",
    text,
  };
}

/** Seeds an EXISTING lead whose request is already mid-profiling and waiting
 *  on the two-fact experience/comfort field — the exact spot the live loop
 *  bug reproduced. */
function seedProfilingRequest(db: ReturnType<typeof openDatabase>) {
  const lead = insertLead(db, { telegramUserId: "tg-user-1", telegramChatId: "tg-chat-1" });
  const request = insertRequest(db, { leadId: lead.id, telegramChatId: "tg-chat-1" });
  updateRequestFields(db, request.id, {
    studentName: "Саша",
    studentAge: 9,
    format: "individual",
    goalTag: "hobby",
    goalText: "",
    tastes: "поп",
  });
  updateRequestState(db, request.id, "profiling");
  return request.id;
}

describe("handleUpdate conversation history (experienceComfort loop fix)", () => {
  it("persists each turn and replays prior turns to the model on the next turn", async () => {
    const db = openDatabase(":memory:");
    seedProfilingRequest(db);

    const ASK_COMFORT = "Зрозуміло. А наскільки Саші комфортно співати?";
    const model = new FakeModelPort([
      // Turn 1 ("Немає"): the model has only one fact, replies asking for the
      // second (no tool call — the field needs both).
      textResponse(ASK_COMFORT),
      // Turn 2 ("Соромиться"): with turn 1 replayed, the model now has BOTH
      // facts and can finally record them.
      toolUseResponse("save_experience_comfort", { experience: "Немає", comfort: "Соромиться" }),
    ]);
    const deps: HandleUpdateDeps = {
      transport: new FakeTelegramTransport(),
      db,
      model,
      calendar: new FakeCalendarPort(),
    };

    await handleUpdate(textUpdate("Немає"), deps);
    await handleUpdate(textUpdate("Соромиться"), deps);

    // The turn-2 model call must carry the full prior transcript before the
    // current message.
    expect(model.calls[1]?.messages).toEqual([
      { role: "user", content: "Немає" },
      { role: "assistant", content: ASK_COMFORT },
      { role: "user", content: "Соромиться" },
    ]);
  });
});
