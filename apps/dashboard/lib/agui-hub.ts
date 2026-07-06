// apps/dashboard — the in-memory AG-UI pub/sub hub (dashboard tasks.md
// §5.1, design.md Decision 1: "a single process, single teacher
// (NFR-LOCAL-01) — no cross-process durability is needed"). The Next
// server's ingest route (§5.3) calls `publish()` for every AG-UI event the
// bot POSTs it; the SSE stream route (§5.4) calls `subscribe()` once per
// connected dashboard tab and forwards whatever it receives, unsubscribing
// on client disconnect.
//
// TYPED THROWING STUB — red state for Stage C of this slice. The shape below
// (a MODULE-LEVEL singleton, not a factory/class) is the contract pinned by
// `agui-hub.test.ts`: every import of this module anywhere in one Node
// process shares the SAME subscriber list, exactly like a real Next.js dev
// server keeps ONE module instance per route-handler process — this is a
// deliberate choice (documented here per tasks.md §5.1's "your call, document
// it"), not an accident of the throwing-stub state. The body is implemented
// once `agui-hub.test.ts` is confirmed red.

import type { AguiEvent } from "@kamerton/bot/src/agui-publisher.ts";

export type AguiEventListener = (event: AguiEvent) => void;

/**
 * Fans `event` out to every currently-subscribed listener, in subscription
 * order. A publish with zero subscribers is a no-op — it must never throw
 * (a bot POSTing an event before any dashboard tab has connected is the
 * normal startup case, not an error).
 */
export function publish(event: AguiEvent): void {
  throw new Error("apps/dashboard/lib/agui-hub.ts: publish() not implemented");
}

/**
 * Registers `onEvent` to receive every future `publish()`ed event, in
 * publish order, until the returned unsubscribe function is called. Calling
 * the returned function more than once is a no-op (never throws).
 */
export function subscribe(onEvent: AguiEventListener): () => void {
  throw new Error("apps/dashboard/lib/agui-hub.ts: subscribe() not implemented");
}

/**
 * The number of currently-active subscribers — test-only introspection
 * (dashboard tasks.md §5.4's SSE-disconnect leak test asserts this drops to
 * 0 after the stream route unsubscribes on client abort), but cheap and
 * side-effect-free enough to expose unconditionally rather than gating it
 * behind a test-only build flag.
 */
export function subscriberCount(): number {
  throw new Error("apps/dashboard/lib/agui-hub.ts: subscriberCount() not implemented");
}
