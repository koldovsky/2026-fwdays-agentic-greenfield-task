// Plant input validation (design D2, D3, D4). Owns SPECIES_DEFAULT (the single
// source of truth, mirrored by the Drizzle column default) and the FormData ->
// ActionResult mapper the add/edit actions and the eval consume. Maps every
// failure to a field-keyed Ukrainian message and echoes the raw submitted
// values so the uncontrolled form repopulates after the React 19 reset.
//
// @trace FR-PLANT-01
// @trace FR-PLANT-02
// @trace FR-PLANT-03
// @trace SC-1
// @trace SC-2
import { fieldError, ok, type ActionResult, type FieldErrors } from "@/lib/forms/result";
import { uk } from "@/lib/i18n/uk";
import { isAfterToday, todayInKiev } from "@/lib/plants/date";

/**
 * Canonical species default (design D2). Stored as the Ukrainian display string
 * because species is user-editable free text shown verbatim (NFR-LOC-01). This
 * constant is BOTH the Drizzle column `.default(...)` and the form prefill, so
 * a no-species insert and a prefilled form agree exactly (design R3).
 */
export const SPECIES_DEFAULT = "Грошове дерево (Crassula ovata)";

export const NAME_MAX = 200;
export const SPECIES_MAX = 200;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Validated, normalized plant input ready for the service/queries layer. */
export interface PlantInput {
  name: string;
  species: string;
  acquiredDate: string | null;
}

/**
 * True when `iso` matches `YYYY-MM-DD` AND names a real calendar date — re-parse
 * and compare components so impossible dates that pass the regex (2026-02-30)
 * are rejected (design D3).
 */
function isRealIsoDate(iso: string): boolean {
  if (!ISO_DATE.test(iso)) return false;
  const [y, m, d] = iso.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  // Construct in UTC purely to validate the component arithmetic (no display
  // use, so no timezone drift): the round-trip must reproduce the same parts.
  const probe = new Date(Date.UTC(y, m - 1, d));
  return (
    probe.getUTCFullYear() === y &&
    probe.getUTCMonth() === m - 1 &&
    probe.getUTCDate() === d
  );
}

/**
 * Map a raw FormData submission to a validated `PlantInput` or an inline-error
 * `ActionResult`. Trims the name; defaults a blank/omitted species to
 * SPECIES_DEFAULT; treats a blank/omitted acquired date as null; rejects a
 * future/malformed acquired date. On failure, echoes the raw submitted strings
 * under `values` so the form repopulates (FR-SHELL-03). Never throws.
 *
 * `today` is injectable for deterministic tests; defaults to today in Kiev.
 */
export function validatePlantInput(
  formData: FormData,
  today: string = todayInKiev(),
): ActionResult<PlantInput> {
  const rawName = String(formData.get("name") ?? "");
  const rawSpecies = String(formData.get("species") ?? "");
  const rawAcquiredDate = String(formData.get("acquiredDate") ?? "");

  const fieldErrors: FieldErrors = {};

  const name = rawName.trim();
  if (name.length === 0) {
    fieldErrors.name = uk.plants.fieldErrors.nameRequired;
  } else if (name.length > NAME_MAX) {
    fieldErrors.name = uk.plants.fieldErrors.nameTooLong;
  }

  // Trim species consistently with name: a blank-after-trim species falls back
  // to SPECIES_DEFAULT, and a non-blank species is stored trimmed (the length
  // bound therefore measures the actually-stored value, never spurious padding).
  const trimmedSpecies = rawSpecies.trim();
  const species = trimmedSpecies.length === 0 ? SPECIES_DEFAULT : trimmedSpecies;
  if (species.length > SPECIES_MAX) {
    fieldErrors.species = uk.plants.fieldErrors.speciesTooLong;
  }

  let acquiredDate: string | null = null;
  const trimmedDate = rawAcquiredDate.trim();
  if (trimmedDate.length > 0) {
    if (!isRealIsoDate(trimmedDate)) {
      fieldErrors.acquiredDate = uk.plants.fieldErrors.acquiredDateInvalid;
    } else if (isAfterToday(trimmedDate, today)) {
      fieldErrors.acquiredDate = uk.plants.fieldErrors.acquiredDateFuture;
    } else {
      acquiredDate = trimmedDate;
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return fieldError(fieldErrors, {
      name: rawName,
      species: rawSpecies,
      acquiredDate: rawAcquiredDate,
    });
  }

  return ok({ name, species, acquiredDate });
}
