// Auto-propose on profile completion (flow fix). Written FIRST (red): the turn
// that collects the LAST field (time range) advances the conversation to
// `proposing`, but the model only calls the save tool — it does NOT propose.
// Before this fix the conversation dead-ended on the "we'll come back with a
// proposal" closing copy and no slots ever arrived (the live-bot deadlock
// "and what do I do next?"). `handleUpdate` must, on entering `proposing`,
// immediately run one more agent turn so `propose_slots` fires and the ranked
// slots are offered in this same inbound message — with the slot-offer copy
// and tappable chips, not the closing copy.

import { describe, expect, it } from "vitest";
import {
  openDatabase,
  insertLead,
  insertRequest,
  updateRequestFields,
  updateRequestState,
  findLatestRequestForLead,
} from "@kamerton/db";
import { FakeModelPort, toolUseResponse } from "@kamerton/agent/src/testing/fake-model-port.ts";
import { FakeCalendarPort } from "@kamerton/lib/src/slots/fake-calendar.ts";
import { FakeTelegramTransport } from "./testing/fake-telegram-transport.ts";
import { handleUpdate, type HandleUpdateDeps } from "./pipeline.ts";
import type { InboundTextUpdate } from "./telegram-transport.ts";
import { SLOTS_OFFER_COPY } from "./copy.ts";

function textUpdate(text: string): InboundTextUpdate {
  return { type: "text", telegramUserId: "tg-user-1", telegramChatId: "tg-chat-1", telegramDisplayName: "Лідка", text };
}

/** Seeds a lead whose request is in `collecting`, with the whole profile plus
 *  preferred weekdays already set — only the time range is still missing, so
 *  the next answer completes the profile and enters `proposing`. */
function seedCollectingRequest(db: ReturnType<typeof openDatabase>) {
  const lead = insertLead(db, { telegramUserId: "tg-user-1", telegramChatId: "tg-chat-1" });
  const request = insertRequest(db, { leadId: lead.id, telegramChatId: "tg-chat-1" });
  updateRequestFields(db, request.id, {
    studentName: "Оксана",
    studentAge: 9,
    format: "individual",
    goalTag: "hobby",
    goalText: "",
    tastes: "поп",
    experience: "немає",
    comfort: "трохи хвилюється",
    preferredWeekdays: "вівторок, четвер",
  });
  updateRequestState(db, request.id, "collecting");
  return lead.id;
}

describe("handleUpdate auto-propose on profile completion", () => {
  it("proposes ranked slots in the SAME turn that completes the profile, with slot chips and the slot-offer copy", async () => {
    const db = openDatabase(":memory:");
    const leadId = seedCollectingRequest(db);
    const transport = new FakeTelegramTransport();
    const model = new FakeModelPort([
      toolUseResponse("save_time_range", { timeRange: "після 16:00" }), // completes profile -> proposing
      toolUseResponse("propose_slots", { weekdays: ["Tue", "Thu"], timeWindow: { start: "09:00", end: "20:00" } }),
    ]);
    const deps: HandleUpdateDeps = { transport, db, model, calendar: new FakeCalendarPort() };

    await handleUpdate(textUpdate("після 16:00"), deps);

    // The pipeline made a SECOND agent call (the auto-propose turn).
    expect(model.callCount).toBe(2);

    // Slots were proposed and persisted — no dead-end.
    const request = findLatestRequestForLead(db, leadId)!;
    expect(request.state).toBe("proposing");
    expect(request.offered_slots).not.toBeNull();

    // The lead's final message is the slot-offer copy WITH tappable chips —
    // never the "we'll come back" closing copy.
    const lastSend = transport.calls.filter((c) => c.kind === "sendMessage").at(-1)!;
    expect(lastSend.kind).toBe("sendMessage");
    if (lastSend.kind === "sendMessage") {
      expect(lastSend.text).toBe(SLOTS_OFFER_COPY);
      expect(lastSend.options?.buttons?.length).toBeGreaterThan(0);
    }
  });
});
