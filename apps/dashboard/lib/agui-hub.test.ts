// Test-first (red): apps/dashboard/lib/agui-hub.ts's `publish`/`subscribe`/
// `subscriberCount` are typed throwing stubs (dashboard tasks.md §5.1's red
// half) — every test below is expected to FAIL against the stub, for the
// right reason (the stub's synchronous throw propagating out of a direct
// call), until §5.1's green half implements the real in-memory pub/sub. Same
// convention as packages/bot/src/pipeline.test.ts's own red round: calls are
// made directly, never wrapped in try/catch or `expect(...).toThrow()` — a
// thrown error IS "red for the right reason" here, and Vitest reports it as
// a single failed test, not a crashed run.

import { describe, expect, it } from "vitest";
import { publish, subscribe, subscriberCount } from "./agui-hub.ts";
import type { AguiEvent } from "@kamerton/lib/src/agui/events.ts";

function runStarted(threadId: string, runId: string): AguiEvent {
  return { type: "RUN_STARTED", threadId, runId };
}

describe("agui-hub (apps/dashboard/lib/agui-hub.ts, dashboard tasks.md §5.1)", () => {
  // @trace TC-PROTO-01
  it("fans one published event out to all current subscribers, in order", () => {
    const receivedA: AguiEvent[] = [];
    const receivedB: AguiEvent[] = [];
    const unsubscribeA = subscribe((event) => receivedA.push(event));
    const unsubscribeB = subscribe((event) => receivedB.push(event));

    const event = runStarted("tg-chat-1", "run-1");
    publish(event);

    expect(receivedA).toEqual([event]);
    expect(receivedB).toEqual([event]);

    // Module-singleton hub (agui-hub.ts's own header comment): every test
    // in this file shares the SAME subscriber list, so cleanup here is
    // required for the "subscriber count" test below to observe a correct
    // starting count, not a test isolation gap this file leaves for others.
    unsubscribeA();
    unsubscribeB();
  });

  // @trace TC-PROTO-01
  it("delivers multiple published events to a subscriber in publish order", () => {
    const received: AguiEvent[] = [];
    const unsubscribe = subscribe((event) => received.push(event));

    const first = runStarted("tg-chat-1", "run-1");
    const second: AguiEvent = { type: "RUN_FINISHED", threadId: "tg-chat-1", runId: "run-1" };
    publish(first);
    publish(second);

    expect(received).toEqual([first, second]);

    unsubscribe();
  });

  // @trace TC-PROTO-01
  it("an unsubscribed subscriber receives nothing further", () => {
    const received: AguiEvent[] = [];
    const unsubscribe = subscribe((event) => received.push(event));

    publish(runStarted("tg-chat-1", "run-1"));
    unsubscribe();
    publish(runStarted("tg-chat-1", "run-2"));

    expect(received).toHaveLength(1);
  });

  // @trace NFR-LOCAL-01
  it("publishing with zero subscribers does not throw", () => {
    publish(runStarted("tg-chat-1", "run-1"));
  });

  // Leak-test seam for dashboard tasks.md §5.4 (SSE-disconnect unsubscribe):
  // subscriber count must be observable and must drop back to 0 once every
  // subscriber unsubscribes.
  it("subscriber count is observable and drops to 0 after every subscriber unsubscribes", () => {
    expect(subscriberCount()).toBe(0);
    const unsubscribeA = subscribe(() => {});
    expect(subscriberCount()).toBe(1);
    const unsubscribeB = subscribe(() => {});
    expect(subscriberCount()).toBe(2);
    unsubscribeA();
    expect(subscriberCount()).toBe(1);
    unsubscribeB();
    expect(subscriberCount()).toBe(0);
  });

  // CodeRabbit finding: one throwing listener (e.g. a broken SSE write after a
  // client disconnect) must not block delivery to the rest, nor propagate to
  // the caller (the ingest/leads/decisions routes call publish() with no
  // try/catch — an unguarded throw would 500 the request).
  it("isolates a throwing listener: siblings still receive the event and publish never throws", () => {
    const received: AguiEvent[] = [];
    const unsubBad = subscribe(() => {
      throw new Error("broken SSE stream write");
    });
    const unsubGood = subscribe((event) => received.push(event));

    const event = runStarted("tg-chat-1", "run-1");
    expect(() => publish(event)).not.toThrow();
    expect(received).toEqual([event]);

    unsubBad();
    unsubGood();
  });
});
