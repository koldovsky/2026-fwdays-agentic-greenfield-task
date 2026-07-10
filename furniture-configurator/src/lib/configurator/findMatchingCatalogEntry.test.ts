import { describe, expect, it } from "vitest";
import { findMatchingCatalogEntry } from "./findMatchingCatalogEntry";
import type { CatalogEntryRecord, ConfigurationSelection } from "./types";

function makeSelection(
  overrides: Partial<ConfigurationSelection> = {},
): ConfigurationSelection {
  return {
    productTypeName: "Тумбочка",
    top: { sizeCm: 60 },
    bottom: { sizeCm: 60 },
    facade: {
      color: { id: 1, name: "Кашемір" },
      material: { id: 2, name: "МДФ" },
    },
    corpus: { material: { id: 3, name: "ЛДСП" } },
    hardware: [],
    ...overrides,
  };
}

const standardEntry: CatalogEntryRecord = {
  id: 100,
  sku: "TUMBA-STD-001",
  productTypeName: "Тумбочка",
  topSizeCm: 60,
  bottomSizeCm: 60,
  facadeColorId: 1,
  facadeMaterialId: 2,
  corpusMaterialId: 3,
  hardwareItemIds: [10, 20],
};

const matchingHardware = [
  { id: 10, sku: "HW-A", name: "A" },
  { id: 20, sku: "HW-B", name: "B" },
];

describe("findMatchingCatalogEntry", () => {
  it("finds an entry that matches on every dictionary ID, size, and hardware set", () => {
    const match = findMatchingCatalogEntry(
      makeSelection({ hardware: matchingHardware }),
      [standardEntry],
    );
    expect(match).toBe(standardEntry);
  });

  it("returns null when no entry matches", () => {
    const match = findMatchingCatalogEntry(
      makeSelection({ top: { sizeCm: 45 }, hardware: matchingHardware }),
      [standardEntry],
    );
    expect(match).toBeNull();
  });

  it("does not match on a same-looking color name with a different ID", () => {
    // Simulates a near-duplicate dictionary entry (e.g. "Кашемір" typo'd as
    // "Кишемір") ending up with a different ID than the catalog entry - the
    // match must be by ID, so this must NOT be treated as the same color.
    const selection = makeSelection({
      facade: {
        color: { id: 99, name: "Кашемір" },
        material: { id: 2, name: "МДФ" },
      },
      hardware: matchingHardware,
    });
    const match = findMatchingCatalogEntry(selection, [standardEntry]);
    expect(match).toBeNull();
  });

  it("does not match when the selection has different hardware than the catalog entry", () => {
    const selection = makeSelection({
      hardware: [{ id: 10, sku: "HW-A", name: "A" }],
    });
    const match = findMatchingCatalogEntry(selection, [standardEntry]);
    expect(match).toBeNull();
  });
});
