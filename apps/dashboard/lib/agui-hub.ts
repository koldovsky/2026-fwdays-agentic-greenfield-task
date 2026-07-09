// apps/dashboard — the in-memory AG-UI pub/sub hub (dashboard tasks.md
// §5.1, design.md Decision 1: "a single process, single teacher
// (NFR-LOCAL-01) — no cross-process durability is needed"). The Next
// server's ingest route (§5.3) calls `publish()` for every AG-UI event the
// bot POSTs it; the SSE stream route (§5.4) calls `subscribe()` once per
// connected dashboard tab and forwards whatever it receives, unsubscribing
// on client disconnect.
//
// The shape below (a MODULE-LEVEL singleton, not a factory/class) is the
// contract pinned by `agui-hub.test.ts`: every import of this module
// anywhere in one Node process shares the SAME subscriber list, exactly
// like a real Next.js dev server keeps ONE module instance per
// route-handler process — this is a deliberate choice (documented here per
// tasks.md §5.1's "your call, document it"), not an accident.

import type { AguiEvent } from "@kamerton/lib/src/agui/events.ts";

export type AguiEventListener = (event: AguiEvent) => void;

// The subscriber list is pinned to `globalThis` under a global-registry
// Symbol, NOT a plain module-level `const`. Reason (live-bot bug, 2026-07-09):
// a plain `const listeners = new Set()` is shared only among importers of the
// SAME module instance — true in one test process, but NOT under Next dev
// (Turbopack, Next 16), which bundles the ingest route (`publish`) and the SSE
// stream route (`subscribe`) into SEPARATE module graphs. Each then got its
// OWN `listeners` Set, so events the bot POSTed to /api/agui/ingest were
// published into a Set no stream subscriber was in — the "Розмови" live feed
// stayed empty even though ingest returned 200 and the SSE stream was open.
// A `Symbol.for(...)`-keyed slot on `globalThis` is process-global regardless
// of how many times the module is instantiated, so every route handler shares
// one subscriber list. (Integration tests still pass — one process, one
// globalThis.)
const LISTENERS_KEY = Symbol.for("kamerton.dashboard.agui-hub.listeners");
type HubGlobal = typeof globalThis & { [LISTENERS_KEY]?: Set<AguiEventListener> };

function listeners(): Set<AguiEventListener> {
  const g = globalThis as HubGlobal;
  g[LISTENERS_KEY] ??= new Set<AguiEventListener>();
  return g[LISTENERS_KEY];
}

/**
 * Fans `event` out to every currently-subscribed listener, in subscription
 * order. A publish with zero subscribers is a no-op — it must never throw
 * (a bot POSTing an event before any dashboard tab has connected is the
 * normal startup case, not an error).
 */
export function publish(event: AguiEvent): void {
  for (const listener of listeners()) {
    listener(event);
  }
}

/**
 * Registers `onEvent` to receive every future `publish()`ed event, in
 * publish order, until the returned unsubscribe function is called. Calling
 * the returned function more than once is a no-op (never throws).
 */
export function subscribe(onEvent: AguiEventListener): () => void {
  listeners().add(onEvent);
  let unsubscribed = false;
  return () => {
    if (unsubscribed) return;
    unsubscribed = true;
    listeners().delete(onEvent);
  };
}

/**
 * The number of currently-active subscribers — test-only introspection
 * (dashboard tasks.md §5.4's SSE-disconnect leak test asserts this drops to
 * 0 after the stream route unsubscribes on client abort), but cheap and
 * side-effect-free enough to expose unconditionally rather than gating it
 * behind a test-only build flag.
 */
export function subscriberCount(): number {
  return listeners().size;
}
