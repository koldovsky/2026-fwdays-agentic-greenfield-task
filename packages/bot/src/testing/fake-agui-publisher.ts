// @kamerton/bot — `FakeAguiPublisher` (dashboard tasks.md §4.2, design.md
// Decision 5). TEST INFRASTRUCTURE, not the feature under test — fully
// working, mirroring `fake-telegram-transport.ts`'s own "recording double"
// style (and `FakeModelPort`/`FakeCalendarPort` from the sibling packages):
// records every published `AguiEvent` in order, on one shared timeline, so
// `pipeline.test.ts` can assert exact event ordering once `handleUpdate()`
// actually publishes (dashboard tasks.md §4.3's GREEN half — not wired yet).

import type { AguiEvent, AguiPublisher } from "../agui-publisher.ts";

/**
 * A recording `AguiPublisher` double. Every `publish()` call is appended to
 * `events`, in order — never dropped, never reordered — so a test can
 * assert the full run-boundary/text/state event sequence one `handleUpdate()`
 * turn is expected to produce.
 */
export class FakeAguiPublisher implements AguiPublisher {
  readonly events: AguiEvent[] = [];

  async publish(event: AguiEvent): Promise<void> {
    this.events.push(event);
  }

  /** Convenience projection for order-only assertions (mirrors
   *  `FakeTelegramTransport.callKinds`). */
  get eventTypes(): Array<AguiEvent["type"]> {
    return this.events.map((event) => event.type);
  }
}
