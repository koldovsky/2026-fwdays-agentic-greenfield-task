// @kamerton/bot — `FakeTelegramTransport` (tasks.md 5.2, design.md
// Decision 5). TEST INFRASTRUCTURE, not the feature under test — fully
// working, unlike the throwing stubs elsewhere in this slice (`pipeline.ts`):
// records every `sendChatAction`/`sendMessage` call, in order, on one shared
// timeline so `pipeline.test.ts` can assert exact outbound call ordering
// (ack-before-reply, NFR-UX-01) and simulate a Telegram-send failure
// (NFR-REL-01). Mirrors `packages/agent`'s `FakeModelPort` and S1's
// `FakeCalendarPort`.

import type {
  ChatAction,
  InboundUpdate,
  SendMessageOptions,
  TelegramTransport,
} from "../telegram-transport.ts";

export type RecordedCall =
  | { kind: "sendChatAction"; chatId: string; action: ChatAction }
  | { kind: "sendMessage"; chatId: string; text: string; options?: SendMessageOptions };

export interface FakeTelegramTransportOptions {
  /** Simulate the first N `sendMessage` calls throwing (a Telegram-send
   *  failure, `@trace NFR-REL-01`, tasks.md 5.4's last bullet) before every
   *  subsequent call succeeds normally. The throwing call is still
   *  recorded in `calls` — a test can inspect exactly what was attempted,
   *  not just what eventually got through. Defaults to 0 (never fails). */
  sendMessageFailures?: number;
}

/**
 * A recording, optionally-failing `TelegramTransport` double. Construct with
 * `sendMessageFailures` to script a Telegram outage; every call (successful
 * or not) is appended to `calls`, in order, across BOTH methods on one
 * shared timeline — this is what makes the "sendChatAction always strictly
 * before sendMessage" assertion (tasks.md 5.4's first bullet) possible.
 */
export class FakeTelegramTransport implements TelegramTransport {
  readonly calls: RecordedCall[] = [];
  private handler: ((update: InboundUpdate) => Promise<void>) | undefined;
  private remainingSendMessageFailures: number;
  private sendMessageGate: Promise<void> | null = null;
  private releaseSendMessageGate: (() => void) | null = null;

  constructor(options: FakeTelegramTransportOptions = {}) {
    this.remainingSendMessageFailures = options.sendMessageFailures ?? 0;
  }

  async sendChatAction(chatId: string, action: ChatAction): Promise<void> {
    this.calls.push({ kind: "sendChatAction", chatId, action });
  }

  /** Test-only helper (review-gate finding #2, notification-drain
   *  re-entry/double-send): every subsequent `sendMessage` call blocks
   *  BEFORE being recorded in `calls`, until `releaseSendMessage()` is
   *  called — lets a test start a second `drainNotifications` call while a
   *  first one is still in flight, deterministically, without a real
   *  network delay or a `setTimeout` race. Not part of the
   *  `TelegramTransport` interface. */
  holdSendMessage(): void {
    this.sendMessageGate = new Promise<void>((resolve) => {
      this.releaseSendMessageGate = resolve;
    });
  }

  /** Releases every `sendMessage` call currently blocked by
   *  `holdSendMessage()`, and lifts the hold for any future call. */
  releaseSendMessage(): void {
    this.releaseSendMessageGate?.();
    this.sendMessageGate = null;
    this.releaseSendMessageGate = null;
  }

  async sendMessage(chatId: string, text: string, options?: SendMessageOptions): Promise<void> {
    if (this.sendMessageGate) await this.sendMessageGate;
    this.calls.push({ kind: "sendMessage", chatId, text, options });
    if (this.remainingSendMessageFailures > 0) {
      this.remainingSendMessageFailures -= 1;
      throw new Error("FakeTelegramTransport: simulated Telegram send failure");
    }
  }

  onMessage(handler: (update: InboundUpdate) => Promise<void>): void {
    this.handler = handler;
  }

  /** Test-only helper: simulate grammY delivering an inbound update to
   *  whatever handler production wiring registered via `onMessage()`. NOT
   *  used by `pipeline.test.ts` itself (tasks.md 5.4's tests call
   *  `handleUpdate()` directly, per this slice's pinned contract — see
   *  `pipeline.ts`'s header) — kept here so a later wiring test (tasks.md
   *  5.6, out of this pass's scope) has a seam to simulate a raw grammY
   *  update without a live chat. */
  async simulateUpdate(update: InboundUpdate): Promise<void> {
    if (this.handler === undefined) {
      throw new Error(
        "FakeTelegramTransport: simulateUpdate() called before onMessage() registered a handler",
      );
    }
    await this.handler(update);
  }

  /** Convenience projection for order-only assertions (tasks.md 5.4's
   *  first bullet: "sendChatAction is always the first call recorded ...
   *  strictly before sendMessage"). */
  get callKinds(): Array<RecordedCall["kind"]> {
    return this.calls.map((call) => call.kind);
  }

  /** Every `sendMessage` call's `text`, in order — including calls that
   *  then threw (a test asserting on the Telegram-send-failure path needs
   *  to see the failed attempt's text too, not just the retry's). */
  get sentTexts(): string[] {
    return this.calls
      .filter((call): call is Extract<RecordedCall, { kind: "sendMessage" }> => call.kind === "sendMessage")
      .map((call) => call.text);
  }
}
