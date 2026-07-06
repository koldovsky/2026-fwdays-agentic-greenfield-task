// @kamerton/bot — the AG-UI publisher seam (dashboard tasks.md §4.1,
// design.md Decision 1 of the `dashboard` change): the injected port
// `pipeline.ts` will call at each run/text/state boundary of one
// `handleUpdate()` turn, mirroring the `ModelPort`/`CalendarPort` seam
// pattern already used in this codebase. REAL, trivial code — not a
// throwing stub — because there is no meaningful "behaviour to fake" for a
// plain discriminated-union type plus a no-op default (same precedent as
// `apology.ts`/`copy.ts`'s plain-constant red rounds).
//
// Wire shapes verified against `context7`'s `/ag-ui-protocol/ag-ui` docs
// (design.md's "AG-UI event contract" section) — UPPER_SNAKE `type`
// discriminant, `threadId` a per-conversation id (this codebase uses the
// Telegram chat id so concurrent conversations stay separable), `runId` any
// per-turn unique string (shape-only asserted by tests, never an exact
// value, so a real implementation is free to use `crypto.randomUUID()` or
// similar without breaking a pinned constant).
//
// `STATE_DELTA.delta` reuses `@kamerton/lib/src/dashboard/json-patch.ts`'s
// `JsonPatchOp` shape — never a duplicate type, per TC-PURE-01's "no ad hoc
// re-implementation" rule.

import type { JsonPatchOp } from "@kamerton/lib/src/dashboard/json-patch.ts";

/** The AG-UI-shaped events this bot process can publish for one
 *  `handleUpdate()` turn — see this file's header comment for the exact
 *  wire-shape source (design.md's AG-UI event contract, itself sourced from
 *  `/ag-ui-protocol/ag-ui`'s own event vocabulary). */
export type AguiEvent =
  | { type: "RUN_STARTED"; threadId: string; runId: string }
  | { type: "RUN_FINISHED"; threadId: string; runId: string }
  | { type: "RUN_ERROR"; threadId: string; message: string }
  | { type: "TEXT_MESSAGE_START"; messageId: string; threadId: string }
  | { type: "TEXT_MESSAGE_CONTENT"; messageId: string; delta: string }
  | { type: "TEXT_MESSAGE_END"; messageId: string }
  | { type: "STATE_SNAPSHOT"; threadId: string; snapshot: unknown }
  | { type: "STATE_DELTA"; threadId: string; delta: JsonPatchOp[] }
  | { type: "CUSTOM"; name: "BOOKING_PENDING"; value: unknown };

/**
 * The injected port `pipeline.ts`'s `handleUpdate()` publishes AG-UI events
 * through (design.md Decision 1) — the same seam pattern `ModelPort`/
 * `CalendarPort` already use in this package. A concrete production
 * implementation (a later task, dashboard tasks.md §4.4) POSTs each event to
 * the Next dashboard's `/api/agui/ingest` route when `AGUI_INGEST_URL` is
 * configured; `noopAguiPublisher` (below) is used whenever it is not, so a
 * bot process run without a dashboard listening behaves identically to the
 * already-archived S2 pipeline.
 */
export interface AguiPublisher {
  publish(event: AguiEvent): Promise<void>;
}

/**
 * The no-op default (design.md Decision 1) — used whenever no dashboard is
 * configured to receive events. Resolves without throwing and without any
 * side effect, so a bot process run without `AGUI_INGEST_URL` set behaves
 * EXACTLY like "no publisher configured" for S2's own already-archived
 * pipeline tests (the regression guard `pipeline.test.ts` pins).
 */
export const noopAguiPublisher: AguiPublisher = {
  async publish(): Promise<void> {
    // Intentionally empty: no I/O, no state, nothing to await.
  },
};
