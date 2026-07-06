// TYPED THROWING STUB — red state for booking-hitl tasks.md A.9/A.10. The
// types and `validatePreferences` signature below are the contract pinned
// by validate-preferences.test.ts; the body is implemented in A.10. No
// logic lives here yet — same "single Not-implemented throw" convention as
// S1's grid.ts/hold.ts red rounds.
//
// Framework-free pure core (TC-PURE-01): no I/O, no Date.now(), no
// linguistic inference (design.md Decision 2's sub-decision — "the model
// re-extracts a structured value into the tool call, code validates").
//
// CONTRACT (design.md Decision 2's sub-decision): rejects an empty
// `weekdays` array, an out-of-enum weekday (the tool schema's own enum is
// exactly `["Mon","Tue","Wed","Thu","Fri"]`), or `start >= end` — checked
// before `ports.slots.proposeSlots(...)` is ever called (defense in depth,
// the model cannot bypass this by ignoring its own schema).

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export interface PreferencesInput {
  weekdays: string[];
  timeWindow: { start: string; end: string };
}

export type PreferencesValidationResult =
  | { ok: true }
  | { ok: false; code: "EMPTY_WEEKDAYS" }
  | { ok: false; code: "INVALID_WEEKDAY"; weekday: string }
  | { ok: false; code: "INVALID_TIME_RANGE" };

/**
 * Pure, synchronous. See the file-level CONTRACT comment above for the
 * checks this function must implement (A.10).
 */
export function validatePreferences(input: PreferencesInput): PreferencesValidationResult {
  const { weekdays, timeWindow } = input;

  if (weekdays.length === 0) {
    return { ok: false, code: "EMPTY_WEEKDAYS" };
  }

  for (const weekday of weekdays) {
    if (!(WEEKDAYS as readonly string[]).includes(weekday)) {
      return { ok: false, code: "INVALID_WEEKDAY", weekday };
    }
  }

  if (timeWindow.start >= timeWindow.end) {
    return { ok: false, code: "INVALID_TIME_RANGE" };
  }

  return { ok: true };
}
