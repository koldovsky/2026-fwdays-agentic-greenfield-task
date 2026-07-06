// @kamerton/db — minimal `requests` row helpers (S2 `intake` tasks.md 1.6).
// Plain better-sqlite3 (synchronous), no ORM — same discipline as
// bookings.ts/leads.ts: `RETURNING *` on insert, explicit update helpers
// returning the changed-row count. These are the only two ways this slice
// writes a `requests` row (field updates vs. conversation-state moves) —
// mirroring FR-INTAKE-02's field-ownership split at the reducer layer
// (lib/src/intake/state-machine.ts, owned by a parallel slice), not
// re-implemented here.

import type Database from "better-sqlite3";
import type { RequestFormat, RequestGoalTag, RequestState } from "./schema.ts";

/**
 * Mirrors `@kamerton/lib/src/intake/state-machine.ts`'s `OfferedSlot` shape
 * (Kyiv wall-clock `{start,end}`) WITHOUT importing `@kamerton/lib` —
 * `packages/db` gains no new cross-package dependency just for this one
 * structural shape (S4 `booking-hitl` design.md Decision 4 item 2: "serves
 * BOTH origins of 'slots currently offered to this lead'" — the agent's
 * `offer_slots` event and the administrator's "Propose another time"
 * slots). Kept in sync by hand; a mismatch would surface immediately as a
 * `lib/`-side type error at the one real call site (`packages/bot`), which
 * imports both packages already.
 */
export interface OfferedSlot {
  start: string;
  end: string;
}

export interface InsertRequestInput {
  leadId: number;
  /** Denormalized from `leads.telegram_chat_id` at creation time (design.md
   *  Decision 4) so later slices can message a lead by joining only on
   *  `requests`. */
  telegramChatId: string;
  /** Defaults to `'greeting'` via the column's own DB default when omitted. */
  state?: RequestState;
}

export interface RequestRow {
  id: number;
  lead_id: number;
  telegram_chat_id: string;
  state: RequestState;
  student_name: string | null;
  student_age: number | null;
  format: RequestFormat | null;
  goal_tag: RequestGoalTag | null;
  goal_text: string | null;
  tastes: string | null;
  dream_song: string | null;
  experience: string | null;
  comfort: string | null;
  preferred_weekdays: string | null;
  preferred_time_range: string | null;
  created_at: string;
  /** S4 `booking-hitl` design.md Decision 4 item 2. Raw JSON text (or
   *  `NULL`) — the pure reducer never sees this string; use
   *  `parseOfferedSlots` at the read boundary, never `JSON.parse` directly
   *  (design.md Risks: a malformed/legacy value must never throw). */
  offered_slots: string | null;
}

/**
 * The subset of `requests` columns the intake profile fills in over the
 * `qualifying`/`profiling`/`collecting` states (FR-INTAKE-01..06) plus the
 * `amend_field` path (FR-INTAKE-07). Every key is optional — callers pass
 * only the fields they are actually saving/amending.
 */
export interface UpdateRequestFieldsInput {
  studentName?: string | null;
  studentAge?: number | null;
  format?: RequestFormat | null;
  goalTag?: RequestGoalTag | null;
  goalText?: string | null;
  tastes?: string | null;
  dreamSong?: string | null;
  experience?: string | null;
  comfort?: string | null;
  preferredWeekdays?: string | null;
  preferredTimeRange?: string | null;
  /** S4 `booking-hitl` design.md Decision 4 item 2. Serialized to JSON at
   *  this db-boundary write (see `updateRequestFields` below) — the pure
   *  reducer in `lib/` never sees the raw string; read it back via
   *  `parseOfferedSlots`, never `JSON.parse` directly. */
  offeredSlots?: OfferedSlot[] | null;
}

const FIELD_COLUMN_BY_KEY: Record<keyof UpdateRequestFieldsInput, string> = {
  studentName: "student_name",
  studentAge: "student_age",
  format: "format",
  goalTag: "goal_tag",
  goalText: "goal_text",
  tastes: "tastes",
  dreamSong: "dream_song",
  experience: "experience",
  comfort: "comfort",
  preferredWeekdays: "preferred_weekdays",
  preferredTimeRange: "preferred_time_range",
  offeredSlots: "offered_slots",
};

/**
 * Inserts one `requests` row and returns it as persisted (`RETURNING *`).
 * Leaves every profile field `NULL` and `state` at its DB default
 * (`'greeting'`) unless overridden — matching a brand-new conversation.
 */
export function insertRequest(db: Database.Database, input: InsertRequestInput): RequestRow {
  if (input.state === undefined) {
    return db
      .prepare(
        `INSERT INTO requests (lead_id, telegram_chat_id)
         VALUES (@lead_id, @telegram_chat_id)
         RETURNING *`,
      )
      .get({
        lead_id: input.leadId,
        telegram_chat_id: input.telegramChatId,
      }) as RequestRow;
  }

  return db
    .prepare(
      `INSERT INTO requests (lead_id, telegram_chat_id, state)
       VALUES (@lead_id, @telegram_chat_id, @state)
       RETURNING *`,
    )
    .get({
      lead_id: input.leadId,
      telegram_chat_id: input.telegramChatId,
      state: input.state,
    }) as RequestRow;
}

/**
 * Updates only the given profile fields on a `requests` row (a save or an
 * `amend_field` event, FR-INTAKE-02/07). No-op (returns 0) if `fields` is
 * empty. Returns the number of rows changed (0 if `id` does not exist).
 */
export function updateRequestFields(
  db: Database.Database,
  id: number,
  fields: UpdateRequestFieldsInput,
): number {
  const entries = Object.entries(fields).filter(([, value]) => value !== undefined) as Array<
    [keyof UpdateRequestFieldsInput, unknown]
  >;

  if (entries.length === 0) {
    return 0;
  }

  const setClause = entries
    .map(([key]) => {
      const column = FIELD_COLUMN_BY_KEY[key];
      return `${column} = @${column}`;
    })
    .join(", ");

  const params: Record<string, unknown> = { id };
  for (const [key, value] of entries) {
    const column = FIELD_COLUMN_BY_KEY[key];
    // `offeredSlots` is the one JSON-in-TEXT column (design.md Decision 4
    // item 2) — stringify at this db-boundary write, never inside `lib/`'s
    // pure reducer.
    params[column] = key === "offeredSlots" ? JSON.stringify(value ?? null) : (value ?? null);
  }

  const result = db.prepare(`UPDATE requests SET ${setClause} WHERE id = @id`).run(params);
  return result.changes;
}

/**
 * Moves a `requests` row to a new conversation state (Decision 1's
 * `transition()` result, persisted). Returns the number of rows changed
 * (0 if `id` does not exist).
 */
export function updateRequestState(db: Database.Database, id: number, state: RequestState): number {
  const result = db.prepare(`UPDATE requests SET state = ? WHERE id = ?`).run(state, id);
  return result.changes;
}

/**
 * Finds the most recently created `requests` row for a lead (FR-INTAKE-08:
 * resuming an in-progress conversation vs. starting a new one after a
 * terminal state). Returns `undefined` if the lead has no requests yet.
 */
export function findLatestRequestForLead(
  db: Database.Database,
  leadId: number,
): RequestRow | undefined {
  return db
    .prepare(`SELECT * FROM requests WHERE lead_id = ? ORDER BY id DESC LIMIT 1`)
    .get(leadId) as RequestRow | undefined;
}

/**
 * Defensive read-side parse of `RequestRow.offered_slots` (S4 `booking-hitl`
 * design.md Risks): `null` when the column is `NULL`; the exact array when
 * it holds valid JSON; `null` (never a thrown exception) when the value is
 * malformed/legacy-non-JSON — "no offered slots known" either way. Lives
 * here (`packages/db`), not `lib/`: design.md Decision 4 item 2's "parsed by
 * the CALLER — never inside `lib/`" means the pure reducer never sees a raw
 * string, not that `packages/db` itself may not own this defensive-parse
 * boundary.
 */
export function parseOfferedSlots(value: string | null): OfferedSlot[] | null {
  if (value === null) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(value);
    return (parsed as OfferedSlot[] | null) ?? null;
  } catch {
    return null;
  }
}
