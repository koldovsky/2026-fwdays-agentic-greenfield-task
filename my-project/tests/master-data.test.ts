import { describe, expect, it } from "vitest";
import { addSupplier, updateMaterialSettings } from "@/lib/master-data";
import { seedData } from "@/lib/seed";

describe("supplier master data", () => {
  // @trace FR-14 FR-38
  it("adds a validated supplier without mutating the input", () => {
    const next = addSupplier(seedData, { supplierId: "sup_new", companyName: "Карпатська сталь", contactName: "Олена Коваль", email: "office@example.com", phone: "+380501234567", leadTimeDays: 3, rating: 4.5 });
    expect(next.suppliers.at(-1)?.companyName).toBe("Карпатська сталь");
    expect(seedData.suppliers).toHaveLength(2);
  });

  // @trace FR-14
  it("rejects duplicate identifiers and invalid ratings", () => {
    expect(() => addSupplier(seedData, { ...seedData.suppliers[0] })).toThrow(/ідентифікатор/i);
    expect(() => addSupplier(seedData, { ...seedData.suppliers[0], supplierId: "sup_new", rating: 6 })).toThrow(/рейтинг/i);
  });

  // @trace FR-14
  it("rejects blank required fields and invalid lead time", () => {
    expect(() => addSupplier(seedData, { ...seedData.suppliers[0], supplierId: "sup_blank", companyName: " " })).toThrow(/обов’язкові/i);
    expect(() => addSupplier(seedData, { ...seedData.suppliers[0], supplierId: "sup_lead", leadTimeDays: 1.5 })).toThrow(/цілим/i);
  });
});

describe("inventory master data", () => {
  // @trace FR-16 FR-17 FR-38
  it("updates reorder level and stock state without mutating the input", () => {
    const next = updateMaterialSettings(seedData, "mat_201", 75, "quality_inspection");
    expect(next.rawMaterials[0]).toMatchObject({ reorderLevel: 75, stockType: "quality_inspection" });
    expect(seedData.rawMaterials[0]).toMatchObject({ reorderLevel: 50, stockType: "unrestricted" });
  });

  // @trace FR-17 FR-39
  it("rejects unknown materials and negative thresholds", () => {
    expect(() => updateMaterialSettings(seedData, "missing", 1, "blocked")).toThrow(/не знайдено/i);
    expect(() => updateMaterialSettings(seedData, "mat_201", -1, "blocked")).toThrow(/від’ємним/i);
  });
});

// @trace FR-14, FR-16, FR-17, FR-38, FR-39
