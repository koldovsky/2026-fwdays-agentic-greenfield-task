import { z } from "zod";
import { uk } from "@/lib/i18n/uk";

/**
 * Employee directory boundary schema (FR-DIR-01, FR-DIR-03, TC-VALID-01).
 *
 * One canonical Zod schema drives both the client on-blur validation and the
 * server-action boundary, so the same rules and the same Ukrainian-first
 * messages apply in both places. The TypeScript type is inferred via `z.infer`
 * — never a hand-written parallel type (TC-TS-01). Framework-free: no `next/*`,
 * `react`, or DOM here, so it stays 100% unit-testable.
 *
 * Per-field messages come from the centralised i18n constants (uk canonical),
 * referenced here rather than hard-coded, so blur and server render identically.
 */

const m = uk.directory.errors;

/** Phone: optional leading "+" then 6–32 of digits, spaces, parens, hyphens. */
const PHONE_PATTERN = /^\+?[0-9 ()\-]{6,32}$/;
/** Telegram: leading "@" then 5–32 ASCII letters, digits, or underscores. */
const TELEGRAM_PATTERN = /^@[A-Za-z0-9_]{5,32}$/;

/** Coerce undefined/null to "" and trim, so a missing key fails the same rules
 *  as an empty string (yielding the localized required/length message, not the
 *  default "expected string"). */
function trimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** An optional free-text/format field treats "" (after trimming) as unset. */
function optionalText() {
  return z.preprocess(trimmedString, z.string()).transform((value) =>
    value.length === 0 ? undefined : value,
  );
}

export const employeeInputSchema = z.object({
  fullName: z.preprocess(
    trimmedString,
    z.string().min(1, m.fullNameRequired).max(120, m.fullNameTooLong),
  ),
  email: z.preprocess(
    trimmedString,
    z
      .string()
      .min(1, m.emailRequired)
      .min(3, m.emailTooShort)
      .max(254, m.emailTooLong)
      .pipe(z.email(m.emailInvalid)),
  ),
  role: optionalText()
    .pipe(z.string().max(80, m.roleTooLong).optional())
    .optional(),
  phone: optionalText()
    .pipe(
      z
        .string()
        .max(32, m.phoneTooLong)
        .regex(PHONE_PATTERN, m.phoneInvalid)
        .optional(),
    )
    .optional(),
  telegramHandle: optionalText()
    .pipe(z.string().regex(TELEGRAM_PATTERN, m.telegramInvalid).optional())
    .optional(),
});

/** The inferred input type — single source of truth, no parallel hand-written type. */
export type EmployeeInput = z.infer<typeof employeeInputSchema>;

/** The set of field names callers may key errors by. */
export type EmployeeFieldErrors = Partial<Record<keyof EmployeeInput, string>>;

/**
 * Pure mapping from a ZodError to the first specific message per top-level
 * field. Used by the server action to return inline field errors and (later)
 * by the client to render them under each field.
 */
export function toFieldErrors(error: z.ZodError): EmployeeFieldErrors {
  const fieldErrors: EmployeeFieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field !== "string") continue;
    if (
      field === "fullName" ||
      field === "email" ||
      field === "role" ||
      field === "phone" ||
      field === "telegramHandle"
    ) {
      if (fieldErrors[field] === undefined) {
        fieldErrors[field] = issue.message;
      }
    }
  }
  return fieldErrors;
}
