import { describe, expect, it } from "vitest";
import { executeProduction, productionPreview, validateProduction } from "@/lib/manufacturing";
import { seedData } from "@/lib/seed";

const productionReady = () => {
  const data = structuredClone(seedData);
  data.rawMaterials.forEach((item) => { item.stockType = "unrestricted"; });
  return data;
};

describe("production planning", () => {
  // @trace FR-29 FR-30
  it("previews every BOM requirement using decimal factors", () => {
    expect(productionPreview(seedData, "prd_301", 10).map(({ materialId, required }) => ({ materialId, required }))).toEqual([
      { materialId: "mat_201", required: 15 },
      { materialId: "mat_202", required: 2.5 },
    ]);
  });

  // @trace FR-31 FR-34
  it("returns material-specific quality, blocked, and shortage messages", () => {
    expect(validateProduction(seedData, "prd_301", 10)).toContain("на контролі якості");
    const blocked = productionReady();
    blocked.rawMaterials[0].stockType = "blocked";
    expect(validateProduction(blocked, "prd_301", 10)).toContain("заблоковано");
    const short = productionReady();
    short.rawMaterials[0].quantityInStock = 1;
    expect(validateProduction(short, "prd_301", 10)).toContain("Не вистачає 14.00 кг");
  });

  // @trace FR-30 FR-31
  it.each([["missing", 1], ["prd_301", 0], ["prd_301", -1]] as const)("rejects invalid product or quantity", (productId, quantity) => {
    expect(() => productionPreview(seedData, productId, quantity)).toThrow(/Оберіть продукт/i);
  });

  // @trace FR-29 FR-30 FR-39
  it("rejects a BOM that references a missing material", () => {
    const data = structuredClone(seedData);
    data.boms[0].materials[0].materialId = "missing";
    expect(() => productionPreview(data, "prd_301", 1)).toThrow("Матеріал missing відсутній");
  });
});

describe("production execution", () => {
  // @trace FR-32 FR-33
  it("atomically consumes inputs, produces output, and appends movements", () => {
    const ready = productionReady();
    const next = executeProduction(ready, "prd_301", 10, "usr_001");
    expect(next.rawMaterials.map((item) => item.quantityInStock)).toEqual([135, 42.5, 12]);
    expect(next.finishedGoods[0].quantityInStock).toBe(90);
    expect(next.stockMovements.slice(-3).map((item) => item.reason)).toEqual(["Списання у виробництво", "Списання у виробництво", "Завершення виробничого замовлення"]);
    expect(ready.finishedGoods[0].quantityInStock).toBe(80);
  });

  // @trace FR-31 FR-34
  it("rejects an invalid run without changing the input graph", () => {
    const before = structuredClone(seedData);
    expect(() => executeProduction(seedData, "prd_301", 10, "usr_001")).toThrow(/контролі якості/i);
    expect(seedData).toEqual(before);
  });
});

// @trace FR-29, FR-30, FR-31, FR-32, FR-33, FR-34
