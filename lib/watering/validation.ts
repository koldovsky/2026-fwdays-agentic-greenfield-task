// Watering input validation (design D2, D3, D5). Owns the one validation
// decision of this slice — the OPTIONAL free-text note rule (D2: trim;
// empty/whitespace-only -> NULL; reject > NOTE_MAX_LEN, never truncate) — the
// watering date rule (via the shared lib/dates helpers, D3: default to today in
// Kiev, reject malformed/impossible/future), the FormData -> WateringInput mapper
// the log/edit actions and the eval consume, and the issue -> field-keyed
// Ukrainian message mapping. On failure echoes the raw submitted strings under
// `values` so the uncontrolled form repopulates after the React 19 reset
// (FR-SHELL-03). Never throws.
//
// @trace FR-WATER-01
// @trace FR-WATER-02
// @trace SC-1
// @trace SC-2
import { isAfterToday, todayInKiev } from "@/lib/dates";
import {
  fieldError,
  ok,
  type ActionResult,
  type FieldErrors,
} from "@/lib/forms/result";
import { uk } from "@/lib/i18n/uk";

/** The agreed upper bound for a watering note in characters (design D2 step 3). */
export const NOTE_MAX_LEN = 500;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Validated, normalized watering input ready for the service layer. */
export interface WateringInput {
  wateredOn: string;
  /** Trimmed note, or NULL when omitted/blank (design D2). */
  note: string | null;
}

/**
 * True when `iso` matches `YYYY-MM-DD` AND names a real calendar date — re-parse
 * and compare components so impossible dates that pass the regex (`2026-02-30`,
 * `2026-13-40`) are rejected (design D3).
 */
function isRealIsoDate(iso: string): boolean {
  if (!ISO_DATE.test(iso)) return false;
  const [y, m, d] = iso.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const probe = new Date(Date.UTC(y, m - 1, d));
  return (
    probe.getUTCFullYear() === y &&
    probe.getUTCMonth() === m - 1 &&
    probe.getUTCDate() === d
  );
}

/**
 * Map a raw FormData submission to a validated `WateringInput` or an inline-error
 * `ActionResult`. The watering date defaults to today in Kiev when omitted/blank,
 * must be a real `YYYY-MM-DD` calendar date, and must NOT be after today in
 * Europe/Kiev (SC-2). The note is OPTIONAL: trimmed; empty/whitespace-only ->
 * NULL; rejected (never truncated) when its trimmed length exceeds NOTE_MAX_LEN
 * (D2). On failure echoes the raw submitted strings under `values` so the form
 * repopulates (FR-SHELL-03). Never throws.
 *
 * `today` is injectable for deterministic tests; defaults to today in Kiev.
 */
export function validateWateringInput(
  formData: FormData,
  today: string = todayInKiev(),
): ActionResult<WateringInput> {
  const rawDate = String(formData.get("wateredOn") ?? "");
  const rawNote = String(formData.get("note") ?? "");

  const fieldErrors: FieldErrors = {};

  // The date is required, but an omitted/blank value defaults to today in Kiev
  // (FR-WATER-01) — only a present-but-wrong date is an error.
  let wateredOn = today;
  const trimmedDate = rawDate.trim();
  if (trimmedDate.length > 0) {
    if (!isRealIsoDate(trimmedDate)) {
      fieldErrors.wateredOn = uk.watering.fieldErrors.dateInvalid;
    } else if (isAfterToday(trimmedDate, today)) {
      fieldErrors.wateredOn = uk.watering.fieldErrors.dateFuture;
    } else {
      wateredOn = trimmedDate;
    }
  }

  // The note is OPTIONAL: trim, empty/whitespace-only -> NULL, bound at
  // NOTE_MAX_LEN after trimming; over-length is REJECTED inline (never truncated).
  const trimmedNote = rawNote.trim();
  let note: string | null = null;
  if (trimmedNote.length > 0) {
    if (trimmedNote.length > NOTE_MAX_LEN) {
      fieldErrors.note = uk.watering.fieldErrors.noteTooLong;
    } else {
      note = trimmedNote;
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return fieldError(fieldErrors, {
      wateredOn: rawDate,
      note: rawNote,
    });
  }

  return ok({ wateredOn, note });
}
