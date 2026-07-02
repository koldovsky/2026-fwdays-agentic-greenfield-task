import { describe, expect, it } from "vitest";
import { movementLedger } from "@/lib/ledger";
import { seedData } from "@/lib/seed";

describe("movement ledger", () => {
  // @trace FR-35
  it("returns newest-first rows with resolved item and actor names", () => {
    const rows = movementLedger(seedData);
    expect(rows.map((row) => row.movementId)).toEqual(["mvt_602", "mvt_603", "mvt_601"]);
    expect(rows[0]).toMatchObject({ itemName: "Загартований сталевий прут 20 мм", itemTypeLabel: "Сировина", actorName: "Адміністратор тестової системи" });
  });

  // @trace FR-35 FR-36
  it("does not mutate the stored movement sequence or expose mutable source records", () => {
    const originalOrder = seedData.stockMovements.map((item) => item.movementId);
    const rows = movementLedger(seedData);
    rows[0].quantity = 999;
    expect(seedData.stockMovements.map((item) => item.movementId)).toEqual(originalOrder);
    expect(seedData.stockMovements.find((item) => item.movementId === rows[0].movementId)?.quantity).not.toBe(999);
  });

  // @trace FR-35
  it("falls back to stable identifiers when referenced display data is unavailable", () => {
    const data = structuredClone(seedData);
    data.stockMovements = [{ ...data.stockMovements[0], movementId: "mvt_unknown", itemId: "missing_item", userId: "missing_user" }];
    expect(movementLedger(data)[0]).toMatchObject({ itemName: "missing_item", actorName: "missing_user" });
  });
});

// @trace FR-35, FR-36
