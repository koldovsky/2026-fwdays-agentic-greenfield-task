import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { SupplierProfile } from "@/types/supplier";
import {
  buildSupplierBlock,
  MissingIbanError,
  SUPPLIER_BLOCK_KEYS,
  selectIban,
} from "./supplier-block";

// Synthetic fixture: documentation bank code 399622, sequential account
// bodies — deliberately not checksum-valid real accounts (NFR-SEC-01).
const PROFILE: SupplierProfile = {
  id: "profile-1",
  label: "Основний",
  nameEn: "Taras Shevchenko, Private Entrepreneur",
  nameUa: "ФОП Шевченко Тарас Григорович",
  addressEn: "1 Khreshchatyk St, Kyiv, 01001, Ukraine",
  addressUa: "вул. Хрещатик, 1, Київ, 01001, Україна",
  taxId: "1234567890",
  bankName: "JSC Universal Bank",
  swift: "UNJSUAUKXXX",
  ibanUsd: "UA003996220000000000000000001",
  ibanEur: "UA003996220000000000000000002",
  createdAt: "2026-07-10T00:00:00.000Z",
  updatedAt: "2026-07-10T00:00:00.000Z",
};

// @trace FR-BANK-01
describe("selectIban", () => {
  it("returns the USD IBAN for USD invoices (FR-BANK-01)", () => {
    expect(selectIban(PROFILE, "USD")).toBe(PROFILE.ibanUsd);
  });

  it("returns the EUR IBAN for EUR invoices (FR-BANK-01)", () => {
    expect(selectIban(PROFILE, "EUR")).toBe(PROFILE.ibanEur);
  });

  it("trims surrounding whitespace from the stored IBAN", () => {
    const spaced = { ...PROFILE, ibanUsd: `  ${PROFILE.ibanUsd}  ` };
    expect(selectIban(spaced, "USD")).toBe(PROFILE.ibanUsd);
  });

  it("throws MissingIbanError naming USD when the USD IBAN is blank", () => {
    const noUsd = { ...PROFILE, ibanUsd: "   " };
    expect(() => selectIban(noUsd, "USD")).toThrowError(MissingIbanError);
    expect(() => selectIban(noUsd, "USD")).toThrowError(/USD/);
  });

  it("throws MissingIbanError naming EUR when the EUR IBAN is empty", () => {
    const noEur = { ...PROFILE, ibanEur: "" };
    try {
      selectIban(noEur, "EUR");
      expect.unreachable("selectIban must throw for a missing EUR IBAN");
    } catch (error) {
      expect(error).toBeInstanceOf(MissingIbanError);
      expect((error as MissingIbanError).currency).toBe("EUR");
      expect((error as MissingIbanError).message).toContain("EUR");
    }
  });

  it("throws MissingIbanError, not TypeError, when the field is absent in stored data", () => {
    const corrupted = {
      ...PROFILE,
      ibanUsd: undefined as unknown as string,
    };
    expect(() => selectIban(corrupted, "USD")).toThrowError(MissingIbanError);
  });
});

// @trace FR-BANK-03
describe("buildSupplierBlock", () => {
  it("contains exactly the eight SUPPLIER_* keys (FR-BANK-03)", () => {
    const block = buildSupplierBlock(PROFILE, "USD");
    expect(Object.keys(block).sort()).toEqual([...SUPPLIER_BLOCK_KEYS].sort());
  });

  it("maps profile fields to placeholders with the currency-selected IBAN", () => {
    const block = buildSupplierBlock(PROFILE, "EUR");
    expect(block.SUPPLIER_NAME_EN).toBe(PROFILE.nameEn);
    expect(block.SUPPLIER_NAME_UA).toBe(PROFILE.nameUa);
    expect(block.SUPPLIER_ADDRESS_EN).toBe(PROFILE.addressEn);
    expect(block.SUPPLIER_ADDRESS_UA).toBe(PROFILE.addressUa);
    expect(block.SUPPLIER_TAX_ID).toBe(PROFILE.taxId);
    expect(block.SUPPLIER_BANK).toBe(PROFILE.bankName);
    expect(block.SUPPLIER_SWIFT).toBe(PROFILE.swift);
    expect(block.SUPPLIER_IBAN).toBe(PROFILE.ibanEur);
  });

  it("trims whitespace-padded profile fields", () => {
    const padded = { ...PROFILE, bankName: "  JSC Universal Bank  " };
    expect(buildSupplierBlock(padded, "USD").SUPPLIER_BANK).toBe(
      "JSC Universal Bank"
    );
  });

  it("throws MissingIbanError instead of producing a partial block", () => {
    const noEur = { ...PROFILE, ibanEur: "" };
    expect(() => buildSupplierBlock(noEur, "EUR")).toThrowError(
      MissingIbanError
    );
  });

  it("returns a frozen map", () => {
    const block = buildSupplierBlock(PROFILE, "USD");
    expect(Object.isFrozen(block)).toBe(true);
  });
});

describe("template contract", () => {
  it("covers every SUPPLIER_* placeholder in docs/invoice-template.html", () => {
    const template = readFileSync(
      join(process.cwd(), "docs", "invoice-template.html"),
      "utf8"
    );
    const placeholders = new Set(
      Array.from(template.matchAll(/\{\{(SUPPLIER_[A-Z_]+)\}\}/g)).map(
        (match) => match[1]
      )
    );

    // Bidirectional: a key set drifting in either direction fails here.
    expect([...placeholders].sort()).toEqual([...SUPPLIER_BLOCK_KEYS].sort());
  });
});
