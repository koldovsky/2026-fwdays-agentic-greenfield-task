/**
 * Money model (FR-CALC-03, FR-CALC-04).
 *
 * All monetary values are integer minor units (cents), branded as `Cents`.
 * The user enters unit price and quantity; line amounts and the invoice
 * total are derived by multiplication and summation. Every stored amount is
 * an exact integer of cents; the one transient float is the guarded
 * `Math.round((total × percent) / 100)` inside `prepaymentSplit` (design D1
 * risk note). USD and EUR behave identically (2 decimal places).
 */

import { type ValidationError, validationError } from "./validation";

/** Integer minor units (cents). Construct via `toCents` or `centsFromInput`. */
export type Cents = number & { readonly __brand: "cents" };

const CENTS_PER_UNIT = 100;
const FRACTION_DIGITS = 2;
const PERCENT_MAX = 100;

/** FR-CALC-04: prepayment percentage defaults to 50 when the user sets none. */
export const DEFAULT_PREPAYMENT_PERCENT = 50;

/**
 * Largest total whose `total × percent` product stays a safe integer for any
 * percent ≤ 100, keeping `prepaymentSplit` rounding exact.
 */
const MAX_SPLITTABLE_TOTAL = Math.floor(Number.MAX_SAFE_INTEGER / PERCENT_MAX);

/** en-US grouping gives the document-wide `1,234.56` format (both EN and UA lines). */
const wholeUnitsFormatter = new Intl.NumberFormat("en-US", {
  useGrouping: true,
});

/** Amount text: optional `1,234`-style grouping, dot decimal, max 2 dp. */
const AMOUNT_PATTERN = /^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?$/;

function brand(value: number): Cents {
  return value as Cents;
}

/**
 * Brands a raw number that is already an exact, non-negative integer count
 * of cents (e.g. a value loaded from the register).
 */
export function toCents(value: number): Cents {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(
      `Cents must be a non-negative safe integer, received ${value}`
    );
  }
  return brand(value);
}

/**
 * Parses a user-entered amount (e.g. `"650"`, `"650.5"`, `"11,050.00"`)
 * into cents without any floating-point arithmetic.
 */
export function centsFromInput(input: string): Cents | ValidationError {
  const trimmed = input.trim();
  if (trimmed === "") {
    return validationError("Amount is required");
  }
  if (!AMOUNT_PATTERN.test(trimmed)) {
    return validationError(
      "Amount must be a non-negative number with at most two decimal places, like 1,234.56"
    );
  }
  const [wholePart, fractionPart = ""] = trimmed.replaceAll(",", "").split(".");
  const wholeUnits = Number.parseInt(wholePart, 10);
  const fractionCents = Number.parseInt(
    fractionPart.padEnd(FRACTION_DIGITS, "0") || "0",
    10
  );
  const cents = wholeUnits * CENTS_PER_UNIT + fractionCents;
  if (!Number.isSafeInteger(cents)) {
    return validationError("Amount is too large");
  }
  return brand(cents);
}

/**
 * Line amount = unit price × quantity (FR-CALC-03). Quantity must be a
 * non-negative integer so the product stays an exact integer of cents.
 */
export function lineAmount(unitPriceCents: Cents, quantity: number): Cents {
  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    throw new Error(
      `Quantity must be a non-negative integer, received ${quantity}`
    );
  }
  const amount = unitPriceCents * quantity;
  if (!Number.isSafeInteger(amount)) {
    throw new Error(
      `Line amount ${unitPriceCents} × ${quantity} exceeds the safe integer range`
    );
  }
  return brand(amount);
}

/** Invoice total = sum of line amounts (FR-CALC-03). */
export function invoiceTotal(lineAmounts: readonly Cents[]): Cents {
  let total = 0;
  for (const amount of lineAmounts) {
    total += amount;
  }
  if (!Number.isSafeInteger(total)) {
    throw new Error("Invoice total exceeds the safe integer range");
  }
  return brand(total);
}

export interface PrepaymentSplit {
  readonly prepayment: Cents;
  readonly balance: Cents;
}

/**
 * Prepayment split (FR-CALC-04): `prepayment = round(total × pct / 100)`,
 * `balance = total − prepayment`, so `prepayment + balance === total`
 * holds exactly for every input by construction.
 */
export function prepaymentSplit(total: Cents, percent: number): PrepaymentSplit {
  if (!Number.isFinite(percent) || percent < 0 || percent > PERCENT_MAX) {
    throw new Error(
      `Prepayment percent must be between 0 and ${PERCENT_MAX}, received ${percent}`
    );
  }
  if (total > MAX_SPLITTABLE_TOTAL) {
    throw new Error(
      `Total ${total} exceeds the range where the prepayment split stays exact`
    );
  }
  const prepayment = brand(Math.round((total * percent) / PERCENT_MAX));
  const balance = brand(total - prepayment);
  return { prepayment, balance };
}

/**
 * Formats cents as `1,234.56` (FR-CALC-03) using integer decomposition —
 * the cents value is never converted to a fractional float.
 */
export function formatAmount(amount: Cents): string {
  const fractionCents = amount % CENTS_PER_UNIT;
  // Subtracting the remainder first keeps the division exact: a safe-integer
  // multiple of 100 divided by 100 is itself an exactly-representable integer.
  const wholeUnits = (amount - fractionCents) / CENTS_PER_UNIT;
  const whole = wholeUnitsFormatter.format(wholeUnits);
  const fraction = String(fractionCents).padStart(FRACTION_DIGITS, "0");
  return `${whole}.${fraction}`;
}
