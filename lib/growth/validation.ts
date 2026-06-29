// Growth measurement input validation (design D2, D3, D5). Owns the load-bearing
// `parseHeightCm` pure function (the most-tested unit of this slice), the date
// rule (via the shared lib/dates helpers), the FormData -> GrowthInput mapper the
// log/edit actions and the eval consume, and the issue -> field-keyed Ukrainian
// message mapping. On failure echoes the raw submitted strings under `values` so
// the uncontrolled form repopulates after the React 19 reset (FR-SHELL-03).
// Never throws.
//
// @trace FR-GROWTH-01
// @trace FR-GROWTH-05
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

/** The agreed upper bound for a measurement height in cm (design D2 step 7). */
export const HEIGHT_MAX_CM = 1000;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
// After normalizing a comma to a dot: an integer part (>=1 digit) and an
// OPTIONAL single decimal part. A leading separator (`.5`), trailing separator
// (`12.`), or any sign is rejected by this shape (design D2 step 4).
const NUMERIC_SHAPE = /^\d+(\.\d+)?$/;

/** Validated, normalized growth-measurement input ready for the service layer. */
export interface GrowthInput {
  heightCm: number;
  measuredOn: string;
}

/**
 * The load-bearing height-parse rule (design D2). Returns the parsed number on
 * success, or `null` on ANY rejection (a thin signal the mapper turns into a
 * field-keyed Ukrainian message). Applies the decidable rules in order:
 *
 * 1. Trim; a blank/whitespace-only value is rejected.
 * 2. At most one separator, dot OR comma. Any grouping/thousands separator or
 *    more than one separator (`1,000`, `12.5.5`, `1 200,5`) is treated as
 *    non-numeric and rejected — never silently reinterpreted (design R1).
 * 3. Normalize a single comma to a dot (Ukrainian decimal separator).
 * 4. Numeric shape `^\d+(\.\d+)?$` — a digit is required before the separator.
 * 5. At most one decimal place (reject `12.55` / `12,555`).
 * 6. Strictly greater than 0.
 * 7. At most HEIGHT_MAX_CM (1000) cm.
 */
export function parseHeightCm(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;

  // Reject any whitespace inside (e.g. "1 200") as non-numeric.
  if (/\s/.test(trimmed)) return null;

  // At most one separator total, dot OR comma. Count both kinds together so
  // mixed/multiple separators (`12.5.5`, `1,000.5`) are rejected.
  const separatorCount = (trimmed.match(/[.,]/g) ?? []).length;
  if (separatorCount > 1) return null;

  // Normalize a single comma to a dot.
  const normalized = trimmed.replace(",", ".");

  if (!NUMERIC_SHAPE.test(normalized)) return null;

  // Inspect the decimal part of the LITERAL input (design D2 step 5). A single
  // trailing zero is accepted (`12.50` -> 12.5), but three+ fractional digits is
  // the canonical thousands-grouping shape (`1,000` -> `1.000`) and is rejected
  // as ambiguous/non-numeric (design R1) rather than read as 1.0.
  const dotIndex = normalized.indexOf(".");
  if (dotIndex !== -1) {
    const fraction = normalized.slice(dotIndex + 1);
    if (fraction.length > 2) return null;
  }

  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;

  // At most one decimal place of PRECISION — a trailing zero collapses
  // numerically (`12.50` -> 12.5), but a genuine second decimal digit
  // (`12.55`) is over-precision and rejected (design D2 step 5).
  if (Math.round(value * 10) / 10 !== value) return null;

  if (value <= 0) return null;
  if (value > HEIGHT_MAX_CM) return null;

  return value;
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
 * Map a raw FormData submission to a validated `GrowthInput` or an inline-error
 * `ActionResult`. The height is required and parsed via `parseHeightCm`; the
 * measurement date defaults to today in Kiev when omitted/blank, must be a real
 * `YYYY-MM-DD` calendar date, and must NOT be after today in Europe/Kiev (SC-2).
 * On failure echoes the raw submitted strings under `values` so the form
 * repopulates (FR-SHELL-03). Never throws.
 *
 * `today` is injectable for deterministic tests; defaults to today in Kiev.
 */
export function validateMeasurementInput(
  formData: FormData,
  today: string = todayInKiev(),
): ActionResult<GrowthInput> {
  const rawHeight = String(formData.get("heightCm") ?? "");
  const rawDate = String(formData.get("measuredOn") ?? "");

  const fieldErrors: FieldErrors = {};

  const heightCm = parseHeightCm(rawHeight);
  if (heightCm == null) {
    fieldErrors.heightCm = uk.growth.fieldErrors.heightInvalid;
  }

  // The date is required, but an omitted/blank value defaults to today in Kiev
  // (FR-GROWTH-01) — only a present-but-wrong date is an error.
  let measuredOn = today;
  const trimmedDate = rawDate.trim();
  if (trimmedDate.length > 0) {
    if (!isRealIsoDate(trimmedDate)) {
      fieldErrors.measuredOn = uk.growth.fieldErrors.dateInvalid;
    } else if (isAfterToday(trimmedDate, today)) {
      fieldErrors.measuredOn = uk.growth.fieldErrors.dateFuture;
    } else {
      measuredOn = trimmedDate;
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return fieldError(fieldErrors, {
      heightCm: rawHeight,
      measuredOn: rawDate,
    });
  }

  return ok({ heightCm: heightCm as number, measuredOn });
}
