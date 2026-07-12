import type { Currency } from "@/types/invoice";
import type { SupplierProfile } from "@/types/supplier";

/**
 * Thrown when the supplier profile has no IBAN for the requested currency
 * (FR-BANK-01 defensive path). Message is user-facing per BC-UX-01.
 */
export class MissingIbanError extends Error {
  readonly currency: Currency;

  constructor(currency: Currency) {
    super(
      `Немає IBAN для валюти ${currency}. Додайте його в Налаштуваннях → профіль постачальника.`
    );
    this.name = "MissingIbanError";
    this.currency = currency;
  }
}

/**
 * Selects the IBAN matching the invoice currency from a supplier profile
 * (FR-BANK-01). Blank or whitespace-only IBANs count as missing.
 */
export function selectIban(
  profile: SupplierProfile,
  currency: Currency
): string {
  // Profiles originate in localStorage; a hand-edited record can lack the
  // field despite the type, and the spec requires MissingIbanError for
  // "no IBAN", not a raw TypeError.
  const raw: string | undefined =
    currency === "USD" ? profile.ibanUsd : profile.ibanEur;
  const iban = typeof raw === "string" ? raw.trim() : "";

  if (iban.length === 0) {
    throw new MissingIbanError(currency);
  }

  return iban;
}

/**
 * Placeholder names in docs/invoice-template.html owned by this module
 * (FR-BANK-03). The contract test asserts this set equals the template's
 * SUPPLIER_* placeholders exactly.
 */
export const SUPPLIER_BLOCK_KEYS = [
  "SUPPLIER_NAME_EN",
  "SUPPLIER_NAME_UA",
  "SUPPLIER_ADDRESS_EN",
  "SUPPLIER_ADDRESS_UA",
  "SUPPLIER_TAX_ID",
  "SUPPLIER_BANK",
  "SUPPLIER_SWIFT",
  "SUPPLIER_IBAN",
] as const;

export type SupplierBlockKey = (typeof SUPPLIER_BLOCK_KEYS)[number];

export type SupplierBlockVars = Readonly<Record<SupplierBlockKey, string>>;

/**
 * Builds the SUPPLIER section variables for document-render (FR-BANK-03):
 * bilingual name/address, tax id, bank name, SWIFT, and the IBAN resolved
 * for the invoice currency. Throws MissingIbanError when that IBAN is absent.
 */
export function buildSupplierBlock(
  profile: SupplierProfile,
  currency: Currency
): SupplierBlockVars {
  return Object.freeze({
    SUPPLIER_NAME_EN: profile.nameEn.trim(),
    SUPPLIER_NAME_UA: profile.nameUa.trim(),
    SUPPLIER_ADDRESS_EN: profile.addressEn.trim(),
    SUPPLIER_ADDRESS_UA: profile.addressUa.trim(),
    SUPPLIER_TAX_ID: profile.taxId.trim(),
    SUPPLIER_BANK: profile.bankName.trim(),
    SUPPLIER_SWIFT: profile.swift.trim(),
    SUPPLIER_IBAN: selectIban(profile, currency),
  });
}
