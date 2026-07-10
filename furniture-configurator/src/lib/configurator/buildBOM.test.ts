import { describe, expect, it } from "vitest";
import { buildBOM, type BuildBOMPartSpecs } from "./buildBOM";
import type { ConfigurationSelection } from "./types";

const partSpecs: BuildBOMPartSpecs = {
  top: {
    partRole: "TOP",
    allowsCustomSize: true,
    minCm: 30,
    maxCm: 80,
    standardSizesCm: [40, 60],
  },
  bottom: {
    partRole: "BOTTOM",
    allowsCustomSize: true,
    minCm: 30,
    maxCm: 80,
    standardSizesCm: [40, 60],
  },
};

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
    hardware: [{ id: 4, sku: "HW-HANDLE-CHROME", name: "Ручка хром" }],
    ...overrides,
  };
}

describe("buildBOM", () => {
  it("produces a full BOM for a fully valid selection", () => {
    const result = buildBOM(makeSelection(), partSpecs);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.bom.map((c) => c.partRole)).toEqual([
        "TOP",
        "BOTTOM",
        "FACADE",
        "CORPUS",
        "HARDWARE",
      ]);
      expect(result.bom[0].sku).toBe("TOP-60");
      expect(result.bom.find((c) => c.partRole === "HARDWARE")?.sku).toBe(
        "HW-HANDLE-CHROME",
      );
    }
  });

  it("blocks BOM generation when the top size is invalid", () => {
    const result = buildBOM(
      makeSelection({ top: { sizeCm: 15 } }),
      partSpecs,
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].partRole).toBe("TOP");
    }
  });

  it("surfaces errors for both top and bottom when both are invalid", () => {
    const result = buildBOM(
      makeSelection({ top: { sizeCm: 15 }, bottom: { sizeCm: 200 } }),
      partSpecs,
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.map((e) => e.partRole).sort()).toEqual([
        "BOTTOM",
        "TOP",
      ]);
    }
  });
});
