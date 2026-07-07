// booking-hitl tasks.md E.1 (RED): the bot's notification-outbox drain
// (design.md Decision 1: "the bot's `packages/bot/src/index.ts` gains a
// short-interval timer... that drains deliverable rows, calls
// `transport.sendMessage`, and marks each row `delivered` or `failed`. A
// `failed` row is retried on the next tick"). `notification-drain.ts` is a
// typed throwing stub today — every case below is expected to FAIL against
// that stub (the `Not implemented` throw propagating out of
// `await drainNotifications(...)`), which is red for the right reason: the
// feature does not exist yet, not a false negative. Real in-memory SQLite
// (`openDatabase(":memory:")`, same convention as `packages/db`'s own
// `notifications.test.ts`) + the existing `FakeTelegramTransport`
// (`pipeline.test.ts`'s own fixture) — never a live Telegram chat.

import { describe, expect, it } from "vitest";
import {
  openDatabase,
  insertBooking,
  insertNotification,
  type NotificationRow,
} from "@kamerton/db";
import { FakeTelegramTransport } from "./testing/fake-telegram-transport.ts";
import { drainNotifications } from "./notification-drain.ts";

/** Every case seeds its own fresh `:memory:` DB + its own booking row (the
 *  `notifications.booking_id` FK requires one to exist) — no test leaks
 *  state into another, same discipline as `pipeline.test.ts`. */
function seedBooking(db: ReturnType<typeof openDatabase>, calendarEventId = "evt-drain-1") {
  return insertBooking(db, {
    slotStart: "2026-07-14T17:00",
    slotEnd: "2026-07-14T18:00",
    status: "pending",
    calendarEventId,
  });
}

function readNotification(db: ReturnType<typeof openDatabase>, id: number): NotificationRow {
  return db.prepare("SELECT * FROM notifications WHERE id = ?").get(id) as NotificationRow;
}

describe("drainNotifications (booking-hitl design.md Decision 1)", () => {
  // @trace FR-HITL-02, @trace NFR-REL-01
  it("sends payload.text for every pending/failed row and marks each delivered", async () => {
    const db = openDatabase(":memory:");
    const transport = new FakeTelegramTransport();
    const booking = seedBooking(db);

    const confirmed = insertNotification(db, {
      bookingId: booking.id,
      telegramChatId: "chat-confirmed",
      kind: "confirmed",
      payload: JSON.stringify({ text: "Заняття підтверджено 🎵" }),
    });
    const declined = insertNotification(db, {
      bookingId: booking.id,
      telegramChatId: "chat-declined",
      kind: "declined",
      payload: JSON.stringify({ text: "На жаль, цей час нам не підходить." }),
    });

    const result = await drainNotifications(db, transport);

    expect(result).toEqual({ delivered: 2, failed: 0 });
    expect(transport.sentTexts).toEqual(
      expect.arrayContaining(["Заняття підтверджено 🎵", "На жаль, цей час нам не підходить."]),
    );

    const confirmedRow = readNotification(db, confirmed.id);
    expect(confirmedRow.delivery_status).toBe("delivered");
    expect(confirmedRow.delivered_at).not.toBeNull();

    const declinedRow = readNotification(db, declined.id);
    expect(declinedRow.delivery_status).toBe("delivered");
    expect(declinedRow.delivered_at).not.toBeNull();

    db.close();
  });

  // @trace FR-HITL-02
  it("includes payload.buttons via SendMessageOptions for a proposed_again row", async () => {
    const db = openDatabase(":memory:");
    const transport = new FakeTelegramTransport();
    const booking = seedBooking(db);

    const buttons = [
      [{ text: "14.07.2026 о 17:00", data: "slot:0" }],
      [{ text: "15.07.2026 о 18:00", data: "slot:1" }],
    ];
    insertNotification(db, {
      bookingId: booking.id,
      telegramChatId: "chat-reproposed",
      kind: "proposed_again",
      payload: JSON.stringify({
        text: "На жаль, попередній час не підійшов, тож ми пропонуємо інший.",
        buttons,
      }),
    });

    await drainNotifications(db, transport);

    const sendMessageCall = transport.calls.find(
      (call) => call.kind === "sendMessage" && call.chatId === "chat-reproposed",
    );
    expect(sendMessageCall).toBeDefined();
    expect(sendMessageCall?.kind === "sendMessage" ? sendMessageCall.options?.buttons : undefined).toEqual(
      buttons,
    );
  });

  // @trace NFR-REL-01
  it("marks a row failed without throwing out of drainNotifications when the transport rejects", async () => {
    const db = openDatabase(":memory:");
    const transport = new FakeTelegramTransport({ sendMessageFailures: 1 });
    const booking = seedBooking(db);

    const notification = insertNotification(db, {
      bookingId: booking.id,
      telegramChatId: "chat-failing",
      kind: "confirmed",
      payload: JSON.stringify({ text: "Заняття підтверджено 🎵" }),
    });

    // The whole point of this case: drainNotifications resolves, it never
    // rejects even though the underlying transport call threw.
    await expect(drainNotifications(db, transport)).resolves.toEqual({ delivered: 0, failed: 1 });

    const row = readNotification(db, notification.id);
    expect(row.delivery_status).toBe("failed");
    expect(row.delivery_status).not.toBe("pending");
    expect(row.delivered_at).toBeNull();
  });

  // @trace NFR-REL-01
  it("retries a failed row on the next drainNotifications call and marks it delivered once the send succeeds", async () => {
    const db = openDatabase(":memory:");
    const transport = new FakeTelegramTransport({ sendMessageFailures: 1 });
    const booking = seedBooking(db);

    const notification = insertNotification(db, {
      bookingId: booking.id,
      telegramChatId: "chat-retry",
      kind: "confirmed",
      payload: JSON.stringify({ text: "Заняття підтверджено 🎵" }),
    });

    await drainNotifications(db, transport); // fails once, row -> 'failed'
    expect(readNotification(db, notification.id).delivery_status).toBe("failed");

    const result = await drainNotifications(db, transport); // no more scripted failures
    expect(result).toEqual({ delivered: 1, failed: 0 });

    const row = readNotification(db, notification.id);
    expect(row.delivery_status).toBe("delivered");
    expect(row.delivered_at).not.toBeNull();
  });

  // @trace FR-HITL-02, @trace NFR-REL-01
  it("never resends an already-delivered row on a second drainNotifications call", async () => {
    const db = openDatabase(":memory:");
    const transport = new FakeTelegramTransport();
    const booking = seedBooking(db);

    insertNotification(db, {
      bookingId: booking.id,
      telegramChatId: "chat-once",
      kind: "confirmed",
      payload: JSON.stringify({ text: "Заняття підтверджено 🎵" }),
    });

    const first = await drainNotifications(db, transport);
    expect(first).toEqual({ delivered: 1, failed: 0 });

    const sendMessageCountAfterFirst = transport.calls.filter((c) => c.kind === "sendMessage").length;

    const second = await drainNotifications(db, transport);
    expect(second).toEqual({ delivered: 0, failed: 0 });

    const sendMessageCountAfterSecond = transport.calls.filter((c) => c.kind === "sendMessage").length;
    expect(sendMessageCountAfterSecond).toBe(sendMessageCountAfterFirst);
  });

  // @trace FR-HITL-02
  it("mixed batch: only the deliverable row is sent, the already-delivered row is skipped", async () => {
    const db = openDatabase(":memory:");
    const transport = new FakeTelegramTransport();
    const booking = seedBooking(db);

    insertNotification(db, {
      bookingId: booking.id,
      telegramChatId: "chat-already-delivered",
      kind: "confirmed",
      payload: JSON.stringify({ text: "Перше повідомлення" }),
    });
    await drainNotifications(db, transport); // delivers the first row

    const second = insertNotification(db, {
      bookingId: booking.id,
      telegramChatId: "chat-newly-deliverable",
      kind: "declined",
      payload: JSON.stringify({ text: "Друге повідомлення" }),
    });

    const result = await drainNotifications(db, transport);

    expect(result).toEqual({ delivered: 1, failed: 0 });
    expect(transport.sentTexts.filter((text) => text === "Перше повідомлення")).toHaveLength(1);
    expect(transport.sentTexts.filter((text) => text === "Друге повідомлення")).toHaveLength(1);

    const secondRow = readNotification(db, second.id);
    expect(secondRow.delivery_status).toBe("delivered");
  });

  // ---------------------------------------------------------------------
  // Review-gate finding #2 [MAJOR]: setInterval re-entry -> duplicate sends
  // (packages/bot/src/notification-drain.ts / index.ts). `index.ts` fires
  // `drainNotifications` on a plain `setInterval` without awaiting the
  // previous tick — if one tick's `transport.sendMessage` calls take longer
  // than the interval, a second tick's `findDeliverableNotifications` sees
  // the SAME still-`pending` row (nothing marks a row "claimed" until its
  // own send resolves) and sends it again. This pins the OBSERVABLE
  // contract at the `drainNotifications` level (not `createDrainRunner()`
  // or any other guard shape) — two overlapping calls sharing one DB must
  // never send the same deliverable row's `sendMessage` more than once,
  // whatever internal locking/claiming mechanism the green fix uses (an
  // in-flight in-memory lock, or an atomic "claim" UPDATE in the same
  // transaction as the SELECT). @trace NFR-REL-01
  // ---------------------------------------------------------------------
  describe("Review-gate finding #2: overlapping drainNotifications calls must not double-send (@trace NFR-REL-01)", () => {
    it("sends a still-pending row's payload.text exactly once even when a second drainNotifications call starts before the first one's sendMessage resolves", async () => {
      const db = openDatabase(":memory:");
      // A slow/controllable `sendMessage`: it blocks BEFORE being recorded,
      // until the test explicitly releases it — deterministically
      // simulating "the first tick is still mid-send when the next tick
      // fires" without any real timer.
      const transport = new FakeTelegramTransport();
      const booking = seedBooking(db, "evt-drain-guard");

      const notification = insertNotification(db, {
        bookingId: booking.id,
        telegramChatId: "chat-drain-guard",
        kind: "confirmed",
        payload: JSON.stringify({ text: "Заняття підтверджено 🎵" }),
      });

      transport.holdSendMessage();

      // Both calls are started back-to-back, synchronously, BEFORE either
      // one's `sendMessage` call resolves: `drainNotifications` runs
      // synchronously (SQLite reads are sync) up to its `await
      // transport.sendMessage(...)`, which itself blocks synchronously on
      // the held gate — so by the time control returns to this test after
      // the first call, the row is still 'pending' in the DB (nothing
      // claims it before the send resolves in today's implementation),
      // and the second call's own `findDeliverableNotifications` sees the
      // exact same deliverable row.
      const firstDrain = drainNotifications(db, transport);
      const secondDrain = drainNotifications(db, transport);

      transport.releaseSendMessage();

      const [firstResult, secondResult] = await Promise.all([firstDrain, secondDrain]);

      const sendMessageCallsForThisRow = transport.calls.filter(
        (call) => call.kind === "sendMessage" && call.chatId === "chat-drain-guard",
      );
      // Today's drain has no in-flight guard: BOTH calls fetch the same
      // still-'pending' row and BOTH call transport.sendMessage for it ->
      // this is 2, not 1.
      expect(sendMessageCallsForThisRow).toHaveLength(1);

      // Combined, the two overlapping calls must account for exactly one
      // real delivery of this one row — never two.
      expect(firstResult.delivered + secondResult.delivered).toBe(1);

      const row = readNotification(db, notification.id);
      expect(row.delivery_status).toBe("delivered");
      expect(row.delivered_at).not.toBeNull();

      db.close();
    });
  });
});
